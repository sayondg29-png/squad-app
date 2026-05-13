import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "./AppContext";
import { toast } from "sonner";

const sb = supabase as any;

type Ctx = {
  isSharing: boolean;
  start: (eventId: string | null) => Promise<boolean>;
  stop: () => Promise<void>;
};

const LocCtx = createContext<Ctx>({} as Ctx);

export function LocationSharingProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useApp();
  const [isSharing, setIsSharing] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const upsert = useCallback(async (pos: GeolocationPosition, eventId: string | null, sharing: boolean) => {
    if (!user || !profile?.squad_id) return;
    const payload = {
      user_id: user.id,
      squad_id: profile.squad_id,
      event_id: eventId,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
      speed: pos.coords.speed ?? null,
      heading: pos.coords.heading ?? null,
      is_sharing: sharing,
      last_updated: new Date().toISOString(),
    };
    await sb.from("live_locations").upsert(payload, { onConflict: "user_id" });
  }, [user, profile?.squad_id]);

  const stop = useCallback(async () => {
    if (watchIdRef.current !== null) {
      try { navigator.geolocation.clearWatch(watchIdRef.current); } catch {}
      watchIdRef.current = null;
    }
    setIsSharing(false);
    if (user) {
      await sb.from("live_locations").update({ is_sharing: false, last_updated: new Date().toISOString() }).eq("user_id", user.id);
    }
  }, [user]);

  const start = useCallback(async (eventId: string | null): Promise<boolean> => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported in this browser");
      return false;
    }
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await upsert(pos, eventId, true);
          setIsSharing(true);
          if (watchIdRef.current !== null) {
            try { navigator.geolocation.clearWatch(watchIdRef.current); } catch {}
          }
          watchIdRef.current = navigator.geolocation.watchPosition(
            (p) => { upsert(p, eventId, true); },
            (err) => { console.error("watchPosition error", err); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
          // Session-only first-use toast
          try {
            if (!sessionStorage.getItem("locShareWarned")) {
              sessionStorage.setItem("locShareWarned", "1");
              toast("Live location is now ON — uses battery & data. Tap I'm Here to stop.", { duration: 5000 });
            }
          } catch {}
          resolve(true);
        },
        (err) => {
          console.warn("Location denied/unavailable", err);
          toast.error("Location access is needed to share your live position with your squad — please enable it in browser settings");
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, [upsert]);

  // Cleanup on tab close / refresh
  useEffect(() => {
    const handler = () => {
      if (watchIdRef.current !== null) {
        try { navigator.geolocation.clearWatch(watchIdRef.current); } catch {}
      }
      if (user && isSharing) {
        try {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/live_locations?user_id=eq.${user.id}`;
          const body = JSON.stringify({ is_sharing: false, last_updated: new Date().toISOString() });
          // Best-effort: keepalive fetch
          fetch(url, {
            method: "PATCH",
            keepalive: true,
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              Prefer: "return=minimal",
            },
            body,
          }).catch(() => {});
          // Also try via supabase (may not complete during unload)
          sb.from("live_locations").update({ is_sharing: false }).eq("user_id", user.id);
        } catch {}
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [user, isSharing]);

  // Cleanup when user logs out / unmounts
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        try { navigator.geolocation.clearWatch(watchIdRef.current); } catch {}
        watchIdRef.current = null;
      }
    };
  }, []);

  return <LocCtx.Provider value={{ isSharing, start, stop }}>{children}</LocCtx.Provider>;
}

export const useLocationSharing = () => useContext(LocCtx);
