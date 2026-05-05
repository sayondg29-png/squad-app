import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { ArrowLeft, Loader2 } from "lucide-react";

export function JoinSquadScreen({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { refreshProfile, user } = useApp();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 6) { setErr("Enter a 6-character code"); return; }
    setBusy(true); setErr("");
    const { data: sq } = await supabase.from("squads").select("id,name,members").eq("invite_code", c).maybeSingle();
    if (!sq) { setErr("Invalid code — double check and try again!"); setBusy(false); return; }
    if (user && (sq.members as string[]).includes(user.id)) {
      setErr("You are already in this squad!"); setBusy(false); return;
    }
    const { error } = await supabase.rpc("join_squad", { _code: c });
    if (error) { setErr("Invalid code — double check and try again!"); setBusy(false); return; }
    await refreshProfile();
    onDone();
  };

  return (
    <div className="min-h-dvh max-w-md mx-auto px-6 py-10 bg-[#0D0D2B]">
      <button onClick={onBack} className="text-[#888] flex items-center gap-1 mb-6 tap-scale"><ArrowLeft size={18}/> Back</button>
      <h1 className="text-3xl font-bold text-white">Join a Squad</h1>
      <p className="text-[#888888] mt-1">Enter the invite code from your friend</p>
      <input value={code} onChange={e=>{setCode(e.target.value.toUpperCase().slice(0,6)); setErr("");}}
        placeholder="Enter 6-digit code" maxLength={6}
        className="mt-10 w-full px-4 py-5 text-center rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#666] text-3xl font-bold tracking-[0.5em] uppercase" />
      {err && <p className="mt-3 text-sm text-[#E74C3C] text-center">{err}</p>}
      <button onClick={submit} disabled={busy || code.length !== 6}
        className="mt-8 w-full py-4 rounded-2xl bg-[#1A1AFF] text-white font-semibold tap-scale disabled:opacity-50 flex items-center justify-center gap-2">
        {busy && <Loader2 size={18} className="animate-spin"/>} Join Squad
      </button>
    </div>
  );
}
