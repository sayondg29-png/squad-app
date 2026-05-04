import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { Avatar } from "../components/Avatar";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Late = { id: string; user_id: string; minutes: number; event_name: string; note: string | null; created_at: string };

export function LateScreen() {
  const { squad, members, user } = useApp();
  const [list, setList] = useState<Late[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!squad) return;
    const { data } = await supabase.from("late_events").select("*").eq("squad_id", squad.id).order("created_at", { ascending: false });
    setList((data as Late[]) ?? []);
  };
  useEffect(() => { load(); }, [squad?.id]);

  useEffect(() => {
    if (!squad) return;
    const ch = supabase.channel(`late-${squad.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "late_events", filter: `squad_id=eq.${squad.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [squad?.id]);

  const totals = members.map(m => ({
    ...m,
    total: list.filter(l => l.user_id === m.id).reduce((s,l) => s + l.minutes, 0),
  })).sort((a,b) => b.total - a.total);

  const mostLate = totals[0]?.total > 0 ? totals[0].id : null;

  if (!squad) return null;
  return (
    <div className="px-5 pt-6 pb-28">
      <h1 className="text-2xl font-bold text-white">Late-O-Meter</h1>

      <div className="mt-6 space-y-2">
        {totals.map((m, i) => (
          <div key={m.id} className="rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] p-3 flex items-center gap-3">
            <span className="text-[#888] font-bold w-6">#{i+1}</span>
            <Avatar choice={m.avatar_choice} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{m.name}</p>
              {m.id === mostLate && <span className="text-xs text-[#F39C12]">Chronically Late 😴</span>}
              {m.total === 0 && <span className="text-xs text-[#00FF88]">Always On Time 😇</span>}
            </div>
            <p className="text-[#00E5FF] font-bold">{m.total} min</p>
          </div>
        ))}
      </div>

      <h3 className="mt-8 text-sm text-[#888] uppercase tracking-wider">Recent</h3>
      <div className="mt-3 space-y-2">
        {list.length === 0 ? (
          <div className="rounded-2xl bg-[#1a1a3a] border border-[#2a2a4a] p-6 text-center text-[#888]">
            No late incidents yet — your squad is punctual! 😇
          </div>
        ) : list.map(l => {
          const who = members.find(m => m.id === l.user_id)?.name ?? "Someone";
          return (
            <div key={l.id} className="rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] p-3">
              <p className="text-white text-sm"><b>{who}</b> — {l.minutes} min late to {l.event_name}</p>
              {l.note && <p className="text-xs text-[#888] mt-1">"{l.note}"</p>}
            </div>
          );
        })}
      </div>

      <button onClick={() => setOpen(true)}
        className="fixed bottom-24 right-1/2 translate-x-[calc(50%+8.5rem)] w-14 h-14 rounded-full bg-[#1A1AFF] text-white flex items-center justify-center shadow-glow tap-scale z-20">
        <Plus size={26} />
      </button>

      {open && <AddLate onClose={() => setOpen(false)} onSaved={load} />}
    </div>
  );
}

function AddLate({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { squad, members, user } = useApp();
  const [who, setWho] = useState(members[0]?.id ?? "");
  const [minutes, setMinutes] = useState("");
  const [event, setEvent] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!who || !minutes || !event.trim() || !squad || !user) { toast.error("Fill all fields"); return; }
    setBusy(true);
    const { error } = await supabase.from("late_events").insert({
      squad_id: squad.id, user_id: who, minutes: parseInt(minutes,10),
      event_name: event.trim(), note: note.trim() || null, created_by: user.id,
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="w-full max-w-md mx-auto bg-[#0D0D2B] border-t border-[#2a2a4a] rounded-t-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Log Late</h2>
          <button onClick={onClose}><X className="text-white" /></button>
        </div>
        <div className="space-y-3">
          <select value={who} onChange={e=>setWho(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white">
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input value={minutes} onChange={e=>setMinutes(e.target.value.replace(/\D/g,""))} inputMode="numeric" placeholder="Minutes late"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
          <input value={event} onChange={e=>setEvent(e.target.value)} placeholder="Event name"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Funny note (optional)"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
          <button onClick={save} disabled={busy} className="w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale disabled:opacity-60 flex items-center justify-center gap-2">
            {busy && <Loader2 size={18} className="animate-spin"/>} Save
          </button>
        </div>
      </div>
    </div>
  );
}
