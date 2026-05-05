import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";

const EMOJIS = ["🔥","⚡","🎯","🚀","👑","💎","🎮","🏆","🌙","🎉","💪","😎"];
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = () => Array.from({length:6}, () => CHARS[Math.floor(Math.random()*CHARS.length)]).join("").toUpperCase();

export function CreateSquadScreen({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { user, refreshProfile } = useApp();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; emoji: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("Squad name is required");
    if (!emoji) return toast.error("Pick an emoji");
    if (!user) return;
    setBusy(true);
    const c = code().toUpperCase();
    const { data, error } = await supabase.from("squads").insert({
      name: name.trim(), emoji, created_by: user.id, members: [user.id], invite_code: c,
    }).select().single();
    if (error || !data) { toast.error(error?.message || "Failed"); setBusy(false); return; }
    const { error: pErr } = await supabase.from("profiles").update({ squad_id: data.id }).eq("id", user.id);
    if (pErr) { toast.error(pErr.message); setBusy(false); return; }
    setDone({ name: data.name, emoji: data.emoji, code: data.invite_code });
    setBusy(false);
  };

  const copy = async () => {
    if (!done) return;
    await navigator.clipboard.writeText(done.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (done) {
    return (
      <div className="min-h-dvh max-w-md mx-auto px-6 py-10 bg-[#0D0D2B] flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-[#00FF88]/20 flex items-center justify-center">
          <Check size={48} className="text-[#00FF88]" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-[#00FF88]">Squad Created!</h1>
        <p className="mt-3 text-2xl text-white">{done.emoji} {done.name}</p>
        <div className="mt-8 w-full rounded-2xl bg-[#1a1a3a] border-2 border-[#1A1AFF] p-6">
          <p className="text-xs text-[#888] uppercase tracking-widest">Invite code</p>
          <p className="mt-2 text-4xl font-bold text-white tracking-[0.3em]">{done.code}</p>
        </div>
        <button onClick={copy} className="mt-4 py-3 px-6 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white tap-scale flex items-center gap-2">
          <Copy size={16} /> {copied ? "Copied!" : "Copy Code"}
        </button>
        <button onClick={async () => { await refreshProfile(); onDone(); }} className="mt-auto w-full py-4 rounded-2xl bg-[#1A1AFF] text-white font-semibold tap-scale">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh max-w-md mx-auto px-6 py-10 bg-[#0D0D2B]">
      <button onClick={onBack} className="text-[#888] flex items-center gap-1 mb-6 tap-scale"><ArrowLeft size={18}/> Back</button>
      <h1 className="text-3xl font-bold text-white">Create Your Squad</h1>
      <input value={name} onChange={e=>setName(e.target.value)} maxLength={30}
        placeholder="Give your squad a name..."
        className="mt-6 w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
      <h3 className="mt-6 text-white font-semibold mb-3">Pick a Squad Emoji</h3>
      <div className="grid grid-cols-4 gap-3">
        {EMOJIS.map(em => (
          <button key={em} onClick={() => setEmoji(em)}
            className={`aspect-square rounded-2xl text-3xl tap-scale transition-all ${emoji === em ? "bg-[#1A1AFF] ring-2 ring-white" : "bg-[#1a1a3a] border border-[#2a2a4a]"}`}>
            {em}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={busy} className="mt-8 w-full py-4 rounded-2xl bg-[#1A1AFF] text-white font-semibold tap-scale disabled:opacity-60 flex items-center justify-center gap-2">
        {busy && <Loader2 size={18} className="animate-spin"/>} Create Squad
      </button>
    </div>
  );
}
