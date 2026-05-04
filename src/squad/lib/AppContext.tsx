import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  name: string;
  age: number | null;
  bio: string | null;
  avatar_choice: string | null;
  squad_id: string | null;
};

export type Squad = {
  id: string;
  name: string;
  emoji: string;
  created_by: string;
  members: string[];
  invite_code: string;
};

type Ctx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  squad: Squad | null;
  members: Profile[];
  refreshProfile: () => Promise<void>;
  refreshSquad: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AppCtx = createContext<Ctx>({} as Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
    return (data as Profile) ?? null;
  }, []);

  const loadSquad = useCallback(async (squadId: string | null) => {
    if (!squadId) { setSquad(null); setMembers([]); return; }
    const { data } = await supabase.from("squads").select("*").eq("id", squadId).maybeSingle();
    setSquad((data as Squad) ?? null);
    if (data) {
      const { data: ms } = await supabase.from("profiles").select("*").in("id", (data as Squad).members);
      setMembers((ms as Profile[]) ?? []);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) { setProfile(null); setSquad(null); setMembers([]); setLoading(false); }
      else {
        setTimeout(async () => {
          const p = await loadProfile(s.user.id);
          await loadSquad(p?.squad_id ?? null);
          setLoading(false);
        }, 0);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const p = await loadProfile(data.session.user.id);
        await loadSquad(p?.squad_id ?? null);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile, loadSquad]);

  // Realtime sync
  useEffect(() => {
    if (!squad) return;
    const ch = supabase
      .channel(`squad-${squad.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "squads", filter: `id=eq.${squad.id}` },
        () => loadSquad(squad.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [squad?.id, loadSquad]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const p = await loadProfile(session.user.id);
      await loadSquad(p?.squad_id ?? null);
    }
  }, [session, loadProfile, loadSquad]);

  const refreshSquad = useCallback(async () => {
    await loadSquad(profile?.squad_id ?? null);
  }, [profile, loadSquad]);

  return (
    <AppCtx.Provider value={{
      session, user: session?.user ?? null, loading, profile, squad, members,
      refreshProfile, refreshSquad,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </AppCtx.Provider>
  );
}

export const useApp = () => useContext(AppCtx);
