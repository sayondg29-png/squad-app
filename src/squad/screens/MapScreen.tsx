import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { getAvatar } from "../lib/avatars";
import { Locate, Users } from "lucide-react";

const sb = supabase as any;

// Fix default marker icon paths
(L.Icon.Default as any).mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

type LiveLoc = {
  user_id: string;
  squad_id: string;
  event_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  is_sharing: boolean;
  last_updated: string;
};

type Meeting = {
  id: string;
  squad_id: string;
  event_name: string;
  status: "active" | "ended";
  event_members: string[];
  meeting_time: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
};

type Checkin = { user_id: string; status: string; minutes: number | null };

const STATUS_META: Record<string, { label: string; color: string }> = {
  here: { label: "I'm Here", color: "#00FF88" },
  otw: { label: "On My Way", color: "#1A1AFF" },
  late: { label: "Running Late", color: "#F39C12" },
  not_coming: { label: "Not Coming", color: "#E74C3C" },
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtDistance(km: number) {
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000)} m`;
}

function fmtAgoMins(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  return `${m} min${m === 1 ? "" : "s"} ago`;
}

export function MapScreen() {
  const { squad, members, user } = useApp();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [locations, setLocations] = useState<LiveLoc[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [tick, setTick] = useState(0); // forces re-render every interval
  const mapRef = useRef<L.Map | null>(null);
  const memberMarkersRef = useRef<Record<string, L.Marker>>({});
  const memberLinesRef = useRef<Record<string, L.Polyline>>({}); // member -> destination
  const trailLinesRef = useRef<Record<string, L.Polyline>>({});  // movement trail
  const trailCoordsRef = useRef<Record<string, [number, number][]>>({});
  const destMarkerRef = useRef<L.Marker | null>(null);

  // Determine active event for current user
  const activeEvent = useMemo(() => {
    if (!user) return null;
    return meetings.find(m => m.status === "active" && (m.event_members ?? []).includes(user.id)) ?? null;
  }, [meetings, user]);

  const activeMemberIds = useMemo(() => {
    return activeEvent?.event_members ?? [];
  }, [activeEvent]);

  // Load meetings
  useEffect(() => {
    if (!squad) return;
    (async () => {
      const { data } = await sb.from("meetings").select("*").eq("squad_id", squad.id).eq("status", "active").order("created_at", { ascending: false });
      setMeetings((data as Meeting[]) ?? []);
    })();
  }, [squad?.id]);

  // Load live locations + realtime
  useEffect(() => {
    if (!squad) return;
    const load = async () => {
      const { data } = await sb.from("live_locations").select("*").eq("squad_id", squad.id);
      setLocations((data as LiveLoc[]) ?? []);
    };
    load();
    const ch = sb.channel(`liveloc-${squad.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_locations", filter: `squad_id=eq.${squad.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings", filter: `squad_id=eq.${squad.id}` }, async () => {
        const { data } = await sb.from("meetings").select("*").eq("squad_id", squad.id).eq("status", "active").order("created_at", { ascending: false });
        setMeetings((data as Meeting[]) ?? []);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "checkins", filter: `squad_id=eq.${squad.id}` }, async () => {
        const { data } = await sb.from("checkins").select("user_id,status,minutes").eq("squad_id", squad.id);
        setCheckins((data as Checkin[]) ?? []);
      })
      .subscribe();
    sb.from("checkins").select("user_id,status,minutes").eq("squad_id", squad.id).then(({ data }: any) => setCheckins((data as Checkin[]) ?? []));
    return () => { sb.removeChannel(ch); };
  }, [squad?.id]);

  // Init map
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("squad-map", { zoomControl: false, attributionControl: true })
      .setView([23.6850, 90.3563], 13);
    L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openstreetmap.org/">OpenStreetMap</a>',
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Tick every 5s for distance panel + every 10s for opacity refresh
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(i);
  }, []);

  // Visible locations: members of active event, sharing
  const visibleLocs = useMemo(() => {
    return locations.filter(l => {
      if (!l.is_sharing) return false;
      if (!activeEvent) {
        // No active event — show only the user themselves
        return l.user_id === user?.id;
      }
      return activeMemberIds.includes(l.user_id);
    });
  }, [locations, activeEvent, activeMemberIds, user?.id]);

  // Update markers / trails
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    visibleLocs.forEach(loc => {
      seen.add(loc.user_id);
      const member = members.find(m => m.id === loc.user_id);
      if (!member) return;
      const av = getAvatar(member.avatar_choice);
      const stale = (Date.now() - new Date(loc.last_updated).getTime()) > 30_000;
      const opacity = stale ? 0.4 : 1;
      const subText = stale ? `Last seen ${fmtAgoMins(loc.last_updated)}` : "";

      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;opacity:${opacity};transform:translate(-50%,-100%);">
          <div style="width:42px;height:42px;border-radius:50%;background:${av.color};display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);">${av.emoji}</div>
          <div style="margin-top:4px;padding:2px 8px;border-radius:8px;background:#0D0D2B;color:#fff;font-size:11px;font-weight:600;white-space:nowrap;border:1px solid #2a2a4a;">${member.name}</div>
          ${subText ? `<div style="margin-top:2px;padding:1px 6px;border-radius:6px;background:#0D0D2B;color:#888;font-size:9px;white-space:nowrap;">${subText}</div>` : ""}
        </div>`;
      const icon = L.divIcon({ html, className: "squad-marker", iconSize: [0, 0] });

      const existing = memberMarkersRef.current[loc.user_id];
      if (existing) {
        existing.setLatLng([loc.latitude, loc.longitude]);
        existing.setIcon(icon);
      } else {
        const marker = L.marker([loc.latitude, loc.longitude], { icon }).addTo(map);
        memberMarkersRef.current[loc.user_id] = marker;
      }

      // Trail
      const trail = trailCoordsRef.current[loc.user_id] ?? [];
      const last = trail[trail.length - 1];
      if (!last || last[0] !== loc.latitude || last[1] !== loc.longitude) {
        trail.push([loc.latitude, loc.longitude]);
        if (trail.length > 20) trail.shift();
        trailCoordsRef.current[loc.user_id] = trail;
      }
      const tline = trailLinesRef.current[loc.user_id];
      if (tline) {
        tline.setLatLngs(trail);
      } else if (trail.length > 1) {
        const pl = L.polyline(trail, { color: av.color, opacity: 0.35, dashArray: "4", weight: 2 }).addTo(map);
        trailLinesRef.current[loc.user_id] = pl;
      }

      // Line to destination
      if (activeEvent?.location_lat != null && activeEvent?.location_lng != null) {
        const coords: L.LatLngExpression[] = [[loc.latitude, loc.longitude], [activeEvent.location_lat, activeEvent.location_lng]];
        const ln = memberLinesRef.current[loc.user_id];
        if (ln) {
          ln.setLatLngs(coords);
        } else {
          const pl = L.polyline(coords, { color: av.color, dashArray: "6,8", weight: 2, opacity: 0.7 }).addTo(map);
          memberLinesRef.current[loc.user_id] = pl;
        }
      } else if (memberLinesRef.current[loc.user_id]) {
        map.removeLayer(memberLinesRef.current[loc.user_id]);
        delete memberLinesRef.current[loc.user_id];
      }
    });

    // Remove markers/trails for users no longer sharing
    Object.keys(memberMarkersRef.current).forEach(uid => {
      if (!seen.has(uid)) {
        map.removeLayer(memberMarkersRef.current[uid]);
        delete memberMarkersRef.current[uid];
        if (trailLinesRef.current[uid]) { map.removeLayer(trailLinesRef.current[uid]); delete trailLinesRef.current[uid]; }
        delete trailCoordsRef.current[uid];
        if (memberLinesRef.current[uid]) { map.removeLayer(memberLinesRef.current[uid]); delete memberLinesRef.current[uid]; }
      }
    });

    // Destination marker
    if (activeEvent?.location_lat != null && activeEvent?.location_lng != null) {
      const pos: L.LatLngExpression = [activeEvent.location_lat, activeEvent.location_lng];
      const popup = `<b>${activeEvent.event_name}</b>${activeEvent.meeting_time ? `<br/>${activeEvent.meeting_time}` : ""}${activeEvent.location_name ? `<br/>${activeEvent.location_name}` : ""}`;
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng(pos);
        destMarkerRef.current.bindPopup(popup);
      } else {
        const m = L.marker(pos).addTo(map).bindPopup(popup);
        destMarkerRef.current = m;
      }
    } else if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
  }, [visibleLocs, members, activeEvent, tick]);

  // Locate me
  const locateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 16); },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  if (!squad) return null;

  const sharingCount = visibleLocs.length;
  const totalEventMembers = activeEvent ? activeMemberIds.length : 0;

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 76px)" }}>
      {/* Header */}
      <div className="px-4 py-3 bg-[#0D0D2B] border-b border-[#2a2a4a] flex items-center justify-between gap-3">
        <div className="min-w-0">
          {activeEvent ? (
            <>
              <p className="text-white font-bold text-sm truncate">{activeEvent.event_name}</p>
              {activeEvent.meeting_time && <p className="text-[#00E5FF] text-xs">{activeEvent.meeting_time}</p>}
            </>
          ) : (
            <p className="text-[#888] text-sm">No active event — create one in Expenses</p>
          )}
        </div>
        {activeEvent && (
          <div className="flex items-center gap-1 text-[#00E5FF] text-xs shrink-0">
            <Users size={14} /> {sharingCount} of {totalEventMembers} sharing
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <div id="squad-map" className="absolute inset-0 z-0" style={{ background: "#0D0D2B" }} />
        <button onClick={locateMe}
          className="absolute top-3 right-3 z-[400] p-2.5 rounded-full bg-[#1A1AFF] text-white shadow-lg tap-scale">
          <Locate size={18} />
        </button>
      </div>

      {/* Distance & ETA panel */}
      {activeEvent && (
        <div className="bg-[#0D0D2B] border-t border-[#2a2a4a] px-3 py-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {activeMemberIds.map(uid => {
              const m = members.find(x => x.id === uid);
              if (!m) return null;
              const av = getAvatar(m.avatar_choice);
              const loc = locations.find(l => l.user_id === uid && l.is_sharing);
              const ci = checkins.find(c => c.user_id === uid);
              const meta = ci ? STATUS_META[ci.status] : null;
              const stale = loc ? (Date.now() - new Date(loc.last_updated).getTime()) > 30_000 : true;
              let distLabel = "";
              let etaLabel = "";
              if (loc && !stale && activeEvent.location_lat != null && activeEvent.location_lng != null) {
                const km = haversineKm(loc.latitude, loc.longitude, activeEvent.location_lat, activeEvent.location_lng);
                distLabel = fmtDistance(km);
                etaLabel = `~${Math.max(1, Math.round(km / 0.083))} mins away`;
              }
              return (
                <div key={uid} className="shrink-0 w-36 rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full flex items-center justify-center shrink-0"
                      style={{ width: 32, height: 32, background: av.color, fontSize: 18 }}>{av.emoji}</div>
                    <p className="text-white text-xs font-semibold truncate">{m.name}</p>
                  </div>
                  {meta && (
                    <p className="mt-1 text-[10px] font-semibold" style={{ color: meta.color }}>{meta.label}</p>
                  )}
                  {loc && !stale ? (
                    <>
                      {distLabel && <p className="text-[11px] text-[#00E5FF] mt-0.5">{distLabel}</p>}
                      {etaLabel && <p className="text-[10px] text-[#888]">{etaLabel}</p>}
                    </>
                  ) : (
                    <p className="text-[10px] text-[#888] mt-0.5">Offline</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}