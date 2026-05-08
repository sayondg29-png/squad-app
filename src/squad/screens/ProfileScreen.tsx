import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { Avatar } from "../components/Avatar";
import { LogOut, Edit2, X, Loader2 } from "lucide-react";
import { AVATARS } from "../lib/avatars";
import { toast } from "sonner";

export function ProfileScreen() {
  const { profile, squad, members, user, signOut, refreshProfile } = useApp();
  const [stats, setStats] = useState({ lateMin: 0, paid: 0, expensesCount: 0 });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!squad || !user) return;
    (async () => {
      const [{ data: la }, { data: ex }, { count }] = await Promise.all([
        supabase.from("late_events").select("minutes").eq("squad_id", squad.id).eq("user_id", user.id),
        supabase.from("expenses").select("amount").eq("squad_id", squad.id).eq("paid_by", user.id),
        supabase.from("expenses").select("*", { count: "exact", head: true }).eq("squad_id", squad.id),
      ]);
      setStats({
        lateMin: (la ?? []).reduce((s,r) => s + r.minutes, 0),
        paid: (ex ?? []).reduce((s,r) => s + Number(r.amount), 0),
        expensesCount: count ?? 0,
      });
    })();
  }, [squad?.id, user?.id]);

  if (!profile) return null;
  return (
    <div className="px-5 pt-6 pb-28">
      <div className="flex justify-end">
        <button onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white text-sm tap-scale">
          <Edit2 size={14}/> Edit Profile
        </button>
      </div>
      <div className="flex flex-col items-center text-center">
        <Avatar choice={profile.avatar_choice} size={96} />
        <h1 className="mt-4 text-2xl font-bold text-white">{profile.name}</h1>
        <p className="text-[#888]">Age {profile.age}</p>
        {profile.bio && <p className="mt-3 text-white max-w-xs">{profile.bio}</p>}
        {squad && <p className="mt-2 text-[#00E5FF]">{squad.emoji} {squad.name}</p>}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2">
        <Stat label="Total Min Late" value={stats.lateMin.toString()} />
        <Stat label="Total Paid" value={`BDT ${stats.paid.toFixed(0)}`} />
        <Stat label="Squad Members" value={members.length.toString()} />
        <Stat label="Expenses Logged" value={stats.expensesCount.toString()} />
      </div>

      <button onClick={signOut}
        className="mt-10 w-full py-3 rounded-xl border-2 border-[#E74C3C] text-[#E74C3C] font-semibold tap-scale flex items-center justify-center gap-2">
        <LogOut size={18} /> Sign Out
      </button>

      {editing && <EditProfile onClose={() => setEditing(false)} onSaved={refreshProfile} />}
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

function EditProfile({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const { profile, user } = useApp();
  const [name, setName] = useState(profile?.name ?? "");
  const [age, setAge] = useState(String(profile?.age ?? ""));
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatar, setAvatar] = useState<number>(parseInt(profile?.avatar_choice ?? "0", 10) || 0);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Name required");
    const a = parseInt(age, 10);
    if (!a || a < 13 || a > 99) return toast.error("Age must be 13–99");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      name: name.trim(), age: a, bio: bio.trim() || null, avatar_choice: String(avatar),
    }).eq("id", user.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await onSaved();
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="w-full max-w-md mx-auto bg-[#0D0D2B] border-t border-[#2a2a4a] rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          <button onClick={onClose}><X className="text-white" /></button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={e=>setName(e.target.value)} maxLength={40} placeholder="Name"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
          <input value={age} onChange={e=>setAge(e.target.value.replace(/\D/g,""))} inputMode="numeric" maxLength={2} placeholder="Age"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
          <textarea value={bio} onChange={e=>setBio(e.target.value.slice(0,150))} rows={3} placeholder="Bio"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888] resize-none" />
          <div>
            <p className="text-sm text-[#888] mb-2">Avatar</p>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((av, i) => (
                <button key={i} onClick={() => setAvatar(i)}
                  className={`aspect-square rounded-full flex items-center justify-center text-3xl tap-scale ${avatar === i ? "ring-4 ring-white scale-105" : ""}`}
                  style={{ background: av.color }}>
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={busy}
            className="w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 size={18} className="animate-spin"/>} Save
          </button>
        </div>
      </div>
    </div>
  );
}
