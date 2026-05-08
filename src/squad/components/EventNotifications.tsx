import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { Bell } from "lucide-react";

const sb = supabase as any;

type Note = { type: "added" | "kicked"; user_id: string; event_name: string; by?: string; at: string };
type Row = { id: string; squad_id: string; event_name: string; notifications: Note[]; seen_by: string[] };
type Pending = { meetingId: string; note: Note; adminName: string };

export function EventNotifications() {
  const { user, squad, members } = useApp();
  const [queue, setQueue] = useState<Pending[]>([]);

  useEffect(() => {
    if (!user || !squad) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await sb.from("meetings").select("id,squad_id,event_name,notifications,seen_by").eq("squad_id", squad.id);
      if (error || cancelled || !data) return;
      const pending: Pending[] = [];
      (data as Row[]).forEach(row => {
        const seen = row.seen_by ?? [];
        if (seen.includes(user.id)) return;
        (row.notifications ?? []).forEach(n => {
          if (n.user_id === user.id) {
            const adminName = members.find(m => m.id === n.by)?.name ?? "Admin";
            pending.push({ meetingId: row.id, note: n, adminName });
          }
        });
      });
      pending.sort((a, b) => a.note.at.localeCompare(b.note.at));
      setQueue(pending);
    })();
    return () => { cancelled = true; };
  }, [user?.id, squad?.id, members]);

  if (!queue.length || !user) return null;
  const current = queue[0];

  const dismiss = async () => {
    const { data } = await sb.from("meetings").select("seen_by").eq("id", current.meetingId).maybeSingle();
    const seen = (data?.seen_by ?? []) as string[];
    if (!seen.includes(user.id)) {
      await sb.from("meetings").update({ seen_by: [...seen, user.id] }).eq("id", current.meetingId);
    }
    setQueue(q => q.slice(1));
  };

  const isAdded = current.note.type === "added";
  const bg = isAdded ? "bg-[#00FF88]/15 border-[#00FF88]" : "bg-[#E74C3C]/15 border-[#E74C3C]";
  const accent = isAdded ? "#00FF88" : "#E74C3C";
  const text = isAdded
    ? <>You have been added to the event <b>{current.note.event_name}</b> by <b>{current.adminName}</b>!</>
    : <>You have been removed from the event <b>{current.note.event_name}</b>.</>;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-5">
      <div className={`w-full max-w-sm rounded-2xl border-2 ${bg} bg-[#1E1E3F] p-6 text-center`}>
        <Bell size={36} style={{ color: accent }} className="mx-auto mb-3" />
        <p className="text-white text-base leading-relaxed">{text}</p>
        <button onClick={dismiss}
          className="mt-5 w-full py-3 rounded-xl text-[#0D0D2B] font-bold tap-scale"
          style={{ background: accent }}>
          Got it
        </button>
      </div>
    </div>
  );
}