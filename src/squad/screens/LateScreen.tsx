import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { Avatar } from "../components/Avatar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Late = { id: string; user_id: string; minutes: number; event_name: string; note: string | null; created_at: string };

export function LateScreen() {
  const { squad, members, user } = useApp();
  const [list, setList] = useState<Late[]>([]);
  const [tab, setTab] = useState<"board" | "log">("board");

  const load = async () => {
    if (!squad) return;
    const { data, error } = await supabase.from("late_events").select("*").eq("squad_id", squad.id).order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
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
  const topId = totals[0]?.total > 0 ? totals[0].id : null;

  if (!squad) return null;

  return (
    <div className="px-5 pt-6 pb-28">
      <h1 className="text-2xl font-bold text-white">Late-O-Meter</h1>

      <div className="mt-4 flex bg-[#1E1E3F] border border-[#2a2a4a] rounded-xl p-1">
        <button onClick={() => setTab("board")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold tap-scale ${tab === "board" ? "bg-[#1A1AFF] text-white" : "text-[#888]"}`}>
          Leaderboard
        </button>
        <button onClick={() => setTab("log")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold tap-scale ${tab === "log" ? "bg-[#1A1AFF] text-white" : "text-[#888]"}`}>
          Log Late
        </button>
      </div>

      {tab === "board" && (
        <>
          <div className="mt-5 space-y-2">
            {list.length === 0 ? (
              <div className="rounded-2xl bg-[#1E1E3F] border border-[#2a2a4a] p-8 text-center text-[#888]">
                <div className="text-5xl mb-3">🏆</div>
                No late incidents yet — your squad is punctual! 😇
              </div>
            ) : totals.map((m, i) => {
              let badge = "Working On It 😅"; let color = "#F39C12";
              if (m.total === 0) { badge = "Always On Time 😇"; color = "#00FF88"; }
              else if (m.id === topId) { badge = "Chronically Late 😴"; color = "#E74C3C"; }
              return (
                <div key={m.id} className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-3 flex items-center gap-3">
                  <span className="text-[#888] font-bold w-6">#{i+1}</span>
                  <Avatar choice={m.avatar_choice} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{m.name}</p>
                    <span className="text-xs" style={{ color }}>{badge}</span>
                  </div>
                  <p className="text-[#00E5FF] font-bold">{m.total} min</p>
                </div>
              );
            })}
          </div>

          {list.length > 0 && (
            <>
              <h3 className="mt-8 text-sm text-[#888] uppercase tracking-wider">Recent</h3>
              <div className="mt-3 space-y-2">
                {list.slice(0, 10).map(l => {
                  const who = members.find(m => m.id === l.user_id)?.name ?? "Someone";
                  return (
                    <div key={l.id} className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-3">
                      <p className="text-white text-sm"><b>{who}</b> — {l.minutes} min late to {l.event_name}</p>
                      {l.note && <p className="text-xs text-[#888] mt-1">"{l.note}"</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {tab === "log" && <LogForm onSaved={() => { load(); setTab("board"); }} />}
    </div>
  );
}

function LogForm({ onSaved }: { onSaved: () => void }) {
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
    toast.success("Logged!");
    setMinutes(""); setEvent(""); setNote("");
    setBusy(false);
    onSaved();
  };

  return (
    <div className="mt-5 space-y-3">
      <select value={who} onChange={e=>setWho(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] text-white">
        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <input value={minutes} onChange={e=>setMinutes(e.target.value.replace(/\D/g,""))} inputMode="numeric" placeholder="How many minutes?"
        className="w-full px-4 py-3 rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
      <input value={event} onChange={e=>setEvent(e.target.value)} placeholder="Where were they late to?"
        className="w-full px-4 py-3 rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a funny reason..."
        className="w-full px-4 py-3 rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
      <button onClick={save} disabled={busy} className="w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale disabled:opacity-60 flex items-center justify-center gap-2">
        {busy && <Loader2 size={18} className="animate-spin"/>} Submit
      </button>
    </div>
  );
}
