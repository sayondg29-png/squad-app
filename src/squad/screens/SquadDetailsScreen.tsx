import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { Avatar } from "../components/Avatar";
import { ArrowLeft, Edit2, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const EMOJIS = ["🔥","⚡","🎯","🚀","👑","💎","🎮","🏆","🌙","🎉","💪","😎"];

export function SquadDetailsScreen({ onBack }: { onBack: () => void }) {
  const { squad, members, user, refreshSquad } = useApp();
  const [stats, setStats] = useState<{
    expenseCount: number; totalSpent: number;
    perUserLate: Record<string, number>; perUserPaid: Record<string, number>;
  }>({ expenseCount: 0, totalSpent: 0, perUserLate: {}, perUserPaid: {} });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!squad) return;
    (async () => {
      const [{ data: ex, count }, { data: la }] = await Promise.all([
        supabase.from("expenses").select("amount,paid_by", { count: "exact" }).eq("squad_id", squad.id),
        supabase.from("late_events").select("user_id,minutes").eq("squad_id", squad.id),
      ]);
      const perUserPaid: Record<string, number> = {};
      const perUserLate: Record<string, number> = {};
      let totalSpent = 0;
      (ex ?? []).forEach((r: any) => {
        totalSpent += Number(r.amount);
        perUserPaid[r.paid_by] = (perUserPaid[r.paid_by] ?? 0) + Number(r.amount);
      });
      (la ?? []).forEach((r: any) => {
        perUserLate[r.user_id] = (perUserLate[r.user_id] ?? 0) + Number(r.minutes);
      });
      setStats({ expenseCount: count ?? 0, totalSpent, perUserLate, perUserPaid });
    })();
  }, [squad?.id]);

  if (!squad) return null;
  const isCreator = user?.id === squad.created_by;

  const lateEntries = members.map(m => ({ id: m.id, name: m.name, total: stats.perUserLate[m.id] ?? 0 }));
  const mostLate = lateEntries.slice().sort((a,b) => b.total - a.total)[0];
  const mostPunctual = lateEntries.slice().sort((a,b) => a.total - b.total)[0];
  const created = new Date((squad as any).created_at ?? Date.now()).toLocaleDateString();

  return (
    <div className="min-h-dvh max-w-md mx-auto bg-[#0D0D2B] text-white px-5 pt-6 pb-10">
      <button onClick={onBack} className="text-[#888] flex items-center gap-1 mb-4 tap-scale"><ArrowLeft size={18}/> Back</button>
      <div className="text-center">
        <div className="text-6xl">{squad.emoji}</div>
        <h1 className="mt-2 text-2xl font-bold">{squad.name}</h1>
        <p className="text-[#888] text-sm">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        {isCreator && (
          <button onClick={() => setEditing(true)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1AFF] text-white text-sm tap-scale">
            <Edit2 size={14}/> Edit Squad
          </button>
        )}
      </div>

      <h3 className="mt-8 text-sm text-[#888] uppercase tracking-wider">Members</h3>
      <div className="mt-3 space-y-2">
        {members.map(m => (
          <div key={m.id} className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-3 flex items-center gap-3">
            <Avatar choice={m.avatar_choice} size={48} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{m.name}{m.age ? ` · ${m.age}` : ""}</p>
              {m.bio && <p className="text-xs text-[#888] truncate">{m.bio}</p>}
              <p className="text-xs mt-1">
                <span className="text-[#F39C12]">{stats.perUserLate[m.id] ?? 0} min late</span>
                <span className="text-[#888]"> · </span>
                <span className="text-[#00FF88]">BDT {(stats.perUserPaid[m.id] ?? 0).toFixed(0)} paid</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="mt-8 text-sm text-[#888] uppercase tracking-wider">Squad Stats</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Total Expenses" value={String(stats.expenseCount)} />
        <Stat label="Total Spent" value={`BDT ${stats.totalSpent.toFixed(0)}`} />
        <Stat label="Most Late" value={mostLate?.total ? mostLate.name : "—"} />
        <Stat label="Most Punctual" value={mostPunctual?.name ?? "—"} />
        <div className="col-span-2"><Stat label="Squad Created" value={created} /></div>
      </div>

      {editing && <EditSquad squad={squad} onClose={() => setEditing(false)} onSaved={refreshSquad} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-3 text-center">
      <p className="text-base font-bold text-white truncate">{value}</p>
      <p className="text-xs text-[#888] mt-1">{label}</p>
    </div>
  );
}

function EditSquad({ squad, onClose, onSaved }: { squad: any; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [name, setName] = useState(squad.name);
  const [emoji, setEmoji] = useState(squad.emoji);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim() || !emoji) return toast.error("Name and emoji required");
    setBusy(true);
    const { error } = await supabase.from("squads").update({ name: name.trim(), emoji }).eq("id", squad.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await onSaved();
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="w-full max-w-md mx-auto bg-[#0D0D2B] border-t border-[#2a2a4a] rounded-t-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Edit Squad</h2>
          <button onClick={onClose}><X className="text-white" /></button>
        </div>
        <input value={name} onChange={e=>setName(e.target.value)} maxLength={30}
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white" />
        <div className="mt-4 grid grid-cols-6 gap-2">
          {EMOJIS.map(em => (
            <button key={em} onClick={() => setEmoji(em)}
              className={`aspect-square rounded-xl text-2xl tap-scale ${emoji === em ? "bg-[#1A1AFF] ring-2 ring-white" : "bg-[#1a1a3a] border border-[#2a2a4a]"}`}>
              {em}
            </button>
          ))}
        </div>
        <button onClick={save} disabled={busy}
          className="mt-5 w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale flex items-center justify-center gap-2 disabled:opacity-60">
          {busy && <Loader2 size={18} className="animate-spin"/>} Save
        </button>
      </div>
    </div>
  );
}