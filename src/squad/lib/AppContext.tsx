import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";

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

  const processPendingJoin = useCallback(async (p: Profile | null): Promise<Profile | null> => {
    if (!p) return p;
    let pending: string | null = null;
    try { pending = localStorage.getItem("pendingSquadId"); } catch {}
    if (!pending) return p;
    const { data: sq } = await supabase.from("squads").select("id,members").eq("id", pending).maybeSingle();
    if (!sq) {
      try { localStorage.removeItem("pendingSquadId"); } catch {}
      toast.error("Squad not found");
      return p;
    }
    if ((sq.members as string[]).includes(p.id)) {
      try { localStorage.removeItem("pendingSquadId"); } catch {}
      toast.success("You are already in this squad! 😄");
      if (p.squad_id !== sq.id) {
        await supabase.from("profiles").update({ squad_id: sq.id }).eq("id", p.id);
        const { data: refreshed } = await supabase.from("profiles").select("*").eq("id", p.id).maybeSingle();
        setProfile((refreshed as Profile) ?? p);
        return (refreshed as Profile) ?? p;
      }
      return p;
    }
    const { error } = await supabase.rpc("join_squad_by_id", { _squad_id: pending });
    try { localStorage.removeItem("pendingSquadId"); } catch {}
    if (error) { toast.error(error.message); return p; }
    toast.success("Joined squad! 🎉");
    const { data: refreshed } = await supabase.from("profiles").select("*").eq("id", p.id).maybeSingle();
    setProfile((refreshed as Profile) ?? p);
    return (refreshed as Profile) ?? p;
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
          let p = await loadProfile(s.user.id);
          p = await processPendingJoin(p);
          await loadSquad(p?.squad_id ?? null);
          setLoading(false);
        }, 0);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        let p = await loadProfile(data.session.user.id);
        p = await processPendingJoin(p);
        await loadSquad(p?.squad_id ?? null);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile, loadSquad, processPendingJoin]);

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
      let p = await loadProfile(session.user.id);
      p = await processPendingJoin(p);
      await loadSquad(p?.squad_id ?? null);
    }
  }, [session, loadProfile, loadSquad, processPendingJoin]);

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
