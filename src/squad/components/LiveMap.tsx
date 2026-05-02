import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../lib/auth";
import { Loader2, Navigation, ShieldOff, MapPin } from "lucide-react";
import { toast } from "sonner";

type StatusKind = "idle" | "here" | "otw" | "late" | "not_coming";

interface LocationRow {
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
}
interface MemberInfo {
  user_id: string;
  display_name: string;
  avatar_color: string;
  status: StatusKind;
}

export function LiveMap({ squadId }: { squadId: string }) {
  const { user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const watchIdRef = useRef<number | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, MemberInfo>>({});
  const [locations, setLocations] = useState<Record<string, LocationRow>>({});
  const [myStatus, setMyStatus] = useState<StatusKind>("idle");
  const [sharing, setSharing] = useState(false);

  // Fetch Mapbox token via edge function
  useEffect(() => {
    supabase.functions.invoke("get-mapbox-token")
      .then(({ data, error }) => {
        if (error || !data?.token) {
          setTokenError(error?.message || "Failed to load map token");
          return;
        }
        setToken(data.token);
      });
  }, []);

  // Load members + their statuses
  const loadMembers = async () => {
    const { data: rows } = await supabase
      .from("squad_members")
      .select("user_id, profiles:user_id(display_name, avatar_color)")
      .eq("squad_id", squadId);
    const { data: statuses } = await supabase
      .from("member_status").select("user_id, kind").eq("squad_id", squadId);
    const statusMap = Object.fromEntries((statuses || []).map((s: any) => [s.user_id, s.kind]));
    const map: Record<string, MemberInfo> = {};
    (rows || []).forEach((r: any) => {
      map[r.user_id] = {
        user_id: r.user_id,
        display_name: r.profiles?.display_name || "Friend",
        avatar_color: r.profiles?.avatar_color || "#1A1AFF",
        status: statusMap[r.user_id] || "idle",
      };
    });
    setMembers(map);
    setMyStatus(statusMap[user!.id] || "idle");
  };

  const loadLocations = async () => {
    const { data } = await supabase
      .from("live_locations").select("user_id, lat, lng, updated_at")
      .eq("squad_id", squadId);
    setLocations(Object.fromEntries((data || []).map((d: any) => [d.user_id, d])));
  };

  useEffect(() => {
    loadMembers(); loadLocations();

    const ch = supabase.channel(`squad-${squadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_locations", filter: `squad_id=eq.${squadId}` },
        () => loadLocations())
      .on("postgres_changes", { event: "*", schema: "public", table: "member_status", filter: `squad_id=eq.${squadId}` },
        () => loadMembers())
      .on("postgres_changes", { event: "*", schema: "public", table: "squad_members", filter: `squad_id=eq.${squadId}` },
        () => loadMembers())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [squadId, user?.id]);

  // Init map
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [0, 20],
      zoom: 1.5,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, [token]);

  // Render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const presentIds = new Set<string>();
    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    Object.values(locations).forEach(loc => {
      const m = members[loc.user_id];
      if (!m) return;
      presentIds.add(loc.user_id);
      const isMe = loc.user_id === user?.id;
      const initials = m.display_name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();

      let marker = markersRef.current[loc.user_id];
      if (!marker) {
        const el = document.createElement("div");
        el.className = "squad-marker";
        el.style.cssText = `
          width: 40px; height: 40px; border-radius: 50%;
          background: ${m.avatar_color}; color: white; font-weight: 700;
          font-family: Poppins, sans-serif; font-size: 13px;
          display: flex; align-items: center; justify-content: center;
          border: 3px solid ${isMe ? "#00E5FF" : "#1A1AFF"};
          box-shadow: 0 4px 14px rgba(0, 229, 255, 0.4);
          cursor: pointer;
        `;
        el.textContent = initials;
        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div style="font-family:Poppins;color:#111;font-weight:600">${m.display_name}${isMe ? " (you)" : ""}</div>
             <div style="font-family:Poppins;color:#555;font-size:11px">${m.status.toUpperCase()}</div>`
          ))
          .addTo(map);
        markersRef.current[loc.user_id] = marker;
      } else {
        marker.setLngLat([loc.lng, loc.lat]);
      }
      bounds.extend([loc.lng, loc.lat]);
      hasBounds = true;
    });

    // Cleanup stale
    Object.keys(markersRef.current).forEach(id => {
      if (!presentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    if (hasBounds) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 800 });
    }
  }, [locations, members, user?.id]);

  // Update my status (and start/stop sharing)
  const setStatus = async (kind: StatusKind) => {
    const { error } = await supabase.from("member_status")
      .upsert({ squad_id: squadId, user_id: user!.id, kind }, { onConflict: "squad_id,user_id" });
    if (error) { toast.error(error.message); return; }
    setMyStatus(kind);
    if (kind !== "otw") {
      stopSharing();
      // Remove location row
      await supabase.from("live_locations")
        .delete().eq("squad_id", squadId).eq("user_id", user!.id);
    }
  };

  const startSharing = () => {
    if (myStatus !== "otw") {
      toast.error('Set status to "On My Way" first');
      return;
    }
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setSharing(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        await supabase.from("live_locations").upsert({
          squad_id: squadId,
          user_id: user!.id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }, { onConflict: "squad_id,user_id" });
      },
      (err) => { toast.error(err.message); setSharing(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  };

  useEffect(() => () => stopSharing(), []);

  if (tokenError) return (
    <div className="rounded-2xl border border-destructive/40 p-6 text-center text-sm text-destructive">
      {tokenError}
    </div>
  );
  if (!token) return (
    <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-accent" /></div>
  );

  const memberList = Object.values(members);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border border-border shadow-card relative" style={{ height: 380 }}>
        <div ref={mapContainer} className="absolute inset-0" />
      </div>

      <div className="rounded-2xl border border-border gradient-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Your status</p>
          {myStatus === "otw" && (
            <button
              onClick={() => sharing ? stopSharing() : startSharing()}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border tap-scale ${sharing ? "border-destructive/50 text-destructive" : "border-success/50 text-success"}`}
            >
              <span className="inline-flex items-center gap-1.5">
                {sharing ? <><ShieldOff size={12}/> Stop sharing</> : <><Navigation size={12}/> Share location</>}
              </span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {(["idle","otw","here","late","not_coming"] as StatusKind[]).map(k => (
            <button key={k} onClick={() => setStatus(k)}
              className={`text-[10px] py-2 rounded-lg font-semibold tap-scale border ${
                myStatus === k ? "gradient-primary text-white border-transparent" : "border-border text-muted-foreground hover:text-foreground"
              }`}>
              {k === "otw" ? "OTW" : k === "not_coming" ? "Out" : k.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <MapPin size={12} className="mt-0.5 shrink-0 text-accent"/>
          Location is only shared while you're <strong>On My Way</strong>, and only your squad can see it.
        </p>
      </div>

      <div className="rounded-2xl border border-border gradient-card p-4">
        <p className="text-sm font-semibold mb-3">Squad ({memberList.length})</p>
        <div className="space-y-2">
          {memberList.map(m => {
            const loc = locations[m.user_id];
            const initials = m.display_name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={m.user_id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: m.avatar_color }}>{initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.display_name}{m.user_id === user?.id ? " (you)" : ""}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {loc ? `📍 Live · ${new Date(loc.updated_at).toLocaleTimeString()}` : "No location"}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-md bg-secondary text-foreground font-semibold">
                  {m.status === "otw" ? "OTW" : m.status === "not_coming" ? "Out" : m.status.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}