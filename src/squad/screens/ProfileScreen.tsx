import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { Avatar } from "../components/Avatar";
import { LogOut } from "lucide-react";

export function ProfileScreen() {
  const { profile, squad, members, user, signOut } = useApp();
  const [stats, setStats] = useState({ lateMin: 0, paid: 0 });

  useEffect(() => {
    if (!squad || !user) return;
    (async () => {
      const [{ data: la }, { data: ex }] = await Promise.all([
        supabase.from("late_events").select("minutes").eq("squad_id", squad.id).eq("user_id", user.id),
        supabase.from("expenses").select("amount").eq("squad_id", squad.id).eq("paid_by", user.id),
      ]);
      setStats({
        lateMin: (la ?? []).reduce((s,r) => s + r.minutes, 0),
        paid: (ex ?? []).reduce((s,r) => s + Number(r.amount), 0),
      });
    })();
  }, [squad?.id, user?.id]);

  if (!profile) return null;
  return (
    <div className="px-5 pt-6 pb-28">
      <div className="flex flex-col items-center text-center">
        <Avatar choice={profile.avatar_choice} size={96} />
        <h1 className="mt-4 text-2xl font-bold text-white">{profile.name}</h1>
        <p className="text-[#888]">Age {profile.age}</p>
        {profile.bio && <p className="mt-3 text-white max-w-xs">{profile.bio}</p>}
        {squad && <p className="mt-2 text-[#00E5FF]">{squad.emoji} {squad.name}</p>}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2">
        <Stat label="Late min" value={stats.lateMin.toString()} />
        <Stat label="Paid" value={`$${stats.paid.toFixed(0)}`} />
        <Stat label="Members" value={members.length.toString()} />
      </div>

      <button onClick={signOut}
        className="mt-10 w-full py-3 rounded-xl border-2 border-[#E74C3C] text-[#E74C3C] font-semibold tap-scale flex items-center justify-center gap-2">
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] p-3 text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-[#888]">{label}</p>
    </div>
  );
}
