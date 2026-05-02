import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../lib/auth";
import { AuthScreen } from "../screens/AuthScreen";
import { Loader2, Plus, LogIn, Users, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface SquadRow { id: string; name: string; invite_code: string; }

export function SquadGate({ children }: { children: (squadId: string) => ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [squads, setSquads] = useState<SquadRow[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem("squad_active_id"));
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setSquads(null); return; }
    refresh();
  }, [user?.id]);

  const refresh = async () => {
    const { data: memberships, error } = await supabase
      .from("squad_members").select("squad_id, squads(id, name, invite_code)")
      .eq("user_id", user!.id);
    if (error) { toast.error(error.message); return; }
    const list: SquadRow[] = (memberships || [])
      .map((r: any) => r.squads).filter(Boolean);
    setSquads(list);
    if (activeId && !list.find(s => s.id === activeId)) {
      setActiveId(null); localStorage.removeItem("squad_active_id");
    }
    if (!activeId && list.length === 1) {
      setActiveId(list[0].id); localStorage.setItem("squad_active_id", list[0].id);
    }
  };

  const createSquad = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const inviteCode = Array.from({ length: 6 }, () =>
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
      const { data, error } = await supabase.from("squads")
        .insert({ name: name.trim(), invite_code: inviteCode, created_by: user!.id })
        .select().single();
      if (error) throw error;
      const { error: mErr } = await supabase.from("squad_members")
        .insert({ squad_id: data.id, user_id: user!.id, role: "owner" });
      if (mErr) throw mErr;
      toast.success(`Squad created! Code: ${inviteCode}`);
      setName(""); setCreating(false);
      setActiveId(data.id); localStorage.setItem("squad_active_id", data.id);
      await refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const joinSquad = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    setBusy(true);
    try {
      const { data: squadId, error } = await supabase.rpc("find_squad_by_invite", { _code: c });
      if (error) throw error;
      if (!squadId) { toast.error("Invalid invite code"); return; }
      const { error: jErr } = await supabase.from("squad_members")
        .insert({ squad_id: squadId, user_id: user!.id, role: "member" });
      if (jErr && !jErr.message.includes("duplicate")) throw jErr;
      toast.success("Joined squad!");
      setCode(""); setJoining(false);
      setActiveId(squadId); localStorage.setItem("squad_active_id", squadId);
      await refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (authLoading) return <Centered><Loader2 className="animate-spin text-accent" /></Centered>;
  if (!user) return <AuthScreen />;
  if (squads === null) return <Centered><Loader2 className="animate-spin text-accent" /></Centered>;

  if (activeId) {
    const active = squads.find(s => s.id === activeId);
    return (
      <div className="space-y-4 float-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Live Map</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {active?.name}
              {active && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(active.invite_code);
                    setCopiedCode(active.invite_code);
                    setTimeout(() => setCopiedCode(null), 1500);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-accent font-mono text-[10px] tap-scale"
                >
                  {active.invite_code}
                  {copiedCode === active.invite_code ? <Check size={10}/> : <Copy size={10}/>}
                </button>
              )}
            </p>
          </div>
          <button
            onClick={() => { setActiveId(null); localStorage.removeItem("squad_active_id"); }}
            className="text-xs px-3 py-2 rounded-xl border border-border tap-scale hover:border-accent/50"
          >
            Switch
          </button>
        </div>
        {children(activeId)}
      </div>
    );
  }

  return (
    <div className="space-y-4 float-in">
      <h2 className="font-display text-xl font-bold">Your Squads</h2>
      {squads.length === 0 && (
        <div className="rounded-2xl border border-border gradient-card p-6 text-center">
          <Users className="mx-auto text-accent mb-2" />
          <p className="text-sm text-muted-foreground">No squads yet. Create one or join with a code.</p>
        </div>
      )}
      <div className="space-y-2">
        {squads.map(s => (
          <button
            key={s.id}
            onClick={() => { setActiveId(s.id); localStorage.setItem("squad_active_id", s.id); }}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border gradient-card tap-scale hover:border-accent/50 text-left"
          >
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-[11px] font-mono text-muted-foreground">Code: {s.invite_code}</p>
            </div>
            <span className="text-accent text-xs font-semibold">Open →</span>
          </button>
        ))}
      </div>

      {creating ? (
        <div className="space-y-2 p-4 rounded-2xl border border-border gradient-card">
          <input
            value={name} onChange={e => setName(e.target.value)} placeholder="Squad name"
            className="w-full px-3 py-2 rounded-xl bg-input border border-border outline-none focus:border-accent text-sm"
          />
          <div className="flex gap-2">
            <button onClick={createSquad} disabled={busy}
              className="flex-1 py-2 rounded-xl gradient-primary text-white font-semibold text-sm tap-scale disabled:opacity-50">
              Create
            </button>
            <button onClick={() => setCreating(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setCreating(true); setJoining(false); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-accent/40 text-accent font-semibold text-sm tap-scale">
          <Plus size={16} /> Create new squad
        </button>
      )}

      {joining ? (
        <div className="space-y-2 p-4 rounded-2xl border border-border gradient-card">
          <input
            value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Invite code (e.g. AB23XY)"
            maxLength={8}
            className="w-full px-3 py-2 rounded-xl bg-input border border-border outline-none focus:border-accent text-sm font-mono uppercase tracking-widest"
          />
          <div className="flex gap-2">
            <button onClick={joinSquad} disabled={busy}
              className="flex-1 py-2 rounded-xl gradient-primary text-white font-semibold text-sm tap-scale disabled:opacity-50">
              Join
            </button>
            <button onClick={() => setJoining(false)}
              className="px-4 py-2 rounded-xl border border-border text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setJoining(true); setCreating(false); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border text-foreground font-semibold text-sm tap-scale">
          <LogIn size={16} /> Join with invite code
        </button>
      )}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-center py-20">{children}</div>;
}