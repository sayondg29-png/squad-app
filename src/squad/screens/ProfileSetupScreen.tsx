import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { AVATARS } from "../lib/avatars";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function ProfileSetupScreen() {
  const { user, refreshProfile } = useApp();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("Name is required");
    const a = parseInt(age, 10);
    if (!a || a < 13 || a > 99) return toast.error("Age must be between 13 and 99");
    if (avatar === null) return toast.error("Pick an avatar");
    if (!user) return;

    setBusy(true);
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      name: name.trim(),
      age: a,
      bio: bio.trim() || null,
      avatar_choice: String(avatar),
      squad_id: null,
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    await refreshProfile();
  };

  return (
    <div className="min-h-dvh max-w-md mx-auto px-6 py-10 bg-[#0D0D2B]">
      <h1 className="text-3xl font-bold text-white">Create Your Profile</h1>
      <p className="text-[#888888] mt-1">Your squad will see this</p>

      <div className="mt-8 space-y-4">
        <input value={name} onChange={e => setName(e.target.value)} maxLength={40}
          placeholder="What do you want to be called?"
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
        <input value={age} onChange={e => setAge(e.target.value.replace(/\D/g,""))} inputMode="numeric" maxLength={2}
          placeholder="Your age"
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
        <textarea value={bio} onChange={e => setBio(e.target.value.slice(0,150))} rows={3}
          placeholder="Tell your squad something about you..."
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888] resize-none" />
        <p className="text-right text-xs text-[#888]">{bio.length}/150</p>
      </div>

      <div className="mt-6">
        <h3 className="text-white font-semibold mb-3">Pick Your Avatar</h3>
        <div className="grid grid-cols-4 gap-3">
          {AVATARS.map((av, i) => (
            <button key={i} onClick={() => setAvatar(i)}
              className={`aspect-square rounded-full flex items-center justify-center text-3xl tap-scale transition-all ${avatar === i ? "ring-4 ring-white scale-105" : ""}`}
              style={{ background: av.color }}>
              {av.emoji}
            </button>
          ))}
        </div>
      </div>

      <button onClick={submit} disabled={busy}
        className="mt-10 w-full py-4 rounded-2xl bg-[#1A1AFF] text-white font-semibold tap-scale disabled:opacity-60 flex items-center justify-center gap-2">
        {busy && <Loader2 size={18} className="animate-spin" />}
        Create Profile
      </button>
    </div>
  );
}
