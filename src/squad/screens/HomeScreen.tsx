import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { Avatar } from "../components/Avatar";

type Activity = { id: string; type: "expense" | "late"; text: string; at: string };

export function HomeScreen() {
  const { squad, members } = useApp();
  const [acts, setActs] = useState<Activity[]>([]);

  useEffect(() => {
    if (!squad) return;
    (async () => {
      const [{ data: ex }, { data: la }] = await Promise.all([
        supabase.from("expenses").select("id,name,amount,created_at,paid_by").eq("squad_id", squad.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("late_events").select("id,event_name,minutes,created_at,user_id").eq("squad_id", squad.id).order("created_at", { ascending: false }).limit(10),
      ]);
      const nameOf = (uid: string) => members.find(m => m.id === uid)?.name ?? "Someone";
      const a: Activity[] = [
        ...(ex ?? []).map(e => ({ id: e.id, type: "expense" as const, text: `${nameOf(e.paid_by)} paid $${Number(e.amount).toFixed(2)} for ${e.name}`, at: e.created_at })),
        ...(la ?? []).map(l => ({ id: l.id, type: "late" as const, text: `${nameOf(l.user_id)} was ${l.minutes}min late to ${l.event_name}`, at: l.created_at })),
      ].sort((x,y) => y.at.localeCompare(x.at));
      setActs(a);
    })();
  }, [squad?.id, members]);

  if (!squad) return null;
  return (
    <div className="px-5 pt-6 pb-28">
      <div className="flex items-center gap-3">
        <div className="text-4xl">{squad.emoji}</div>
        <div>
          <p className="text-xs text-[#888] uppercase tracking-widest">Squad</p>
          <h1 className="text-2xl font-bold text-white">{squad.name}</h1>
        </div>
      </div>

      <h3 className="mt-8 text-sm text-[#888] uppercase tracking-wider">Members</h3>
      <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {members.map(m => (
          <div key={m.id} className="flex flex-col items-center gap-1 shrink-0 w-16">
            <Avatar choice={m.avatar_choice} size={56} />
            <p className="text-xs text-white truncate w-full text-center">{m.name}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-8 text-sm text-[#888] uppercase tracking-wider">Recent activity</h3>
      <div className="mt-3 space-y-2">
        {acts.length === 0 ? (
          <div className="rounded-2xl bg-[#1a1a3a] border border-[#2a2a4a] p-6 text-center text-[#888]">
            Your squad story starts here! Add an expense or log a late incident 🎉
          </div>
        ) : acts.map(a => (
          <div key={a.id} className="rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] p-4 text-white text-sm">
            <span className="mr-2">{a.type === "expense" ? "💸" : "🏆"}</span>{a.text}
          </div>
        ))}
      </div>
    </div>
  );
}
