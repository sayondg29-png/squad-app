import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { Avatar } from "../components/Avatar";
import { Copy, LogOut, Loader2, X, Share2, Users } from "lucide-react";
import { SquadDetailsScreen } from "./SquadDetailsScreen";
import { toast } from "sonner";
import { useLocationSharing } from "../lib/LocationSharing";

type Activity = { id: string; type: "expense" | "late"; text: string; at: string };
type Checkin = { user_id: string; status: string; minutes: number | null; updated_at: string };

const STATUS_META: Record<string, { label: string; color: string; emoji: string }> = {
  here: { label: "I'm Here", color: "#00FF88", emoji: "✅" },
  otw: { label: "On My Way", color: "#1A1AFF", emoji: "🚗" },
  late: { label: "Running Late", color: "#F39C12", emoji: "⏰" },
  not_coming: { label: "Not Coming", color: "#E74C3C", emoji: "❌" },
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export function HomeScreen() {
  const { squad, members, user, profile, refreshProfile } = useApp();
  const { isSharing, start: startLoc, stop: stopLoc } = useLocationSharing();
  const [acts, setActs] = useState<Activity[]>([]);
  const [copied, setCopied] = useState(false);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [otwMin, setOtwMin] = useState("");
  const [lateMin, setLateMin] = useState("");
  const [showSquad, setShowSquad] = useState(false);
  const [confirmStopShare, setConfirmStopShare] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  // Find active event the current user is a member of (most recent)
  useEffect(() => {
    if (!squad || !user) { setActiveEventId(null); return; }
    (async () => {
      const { data } = await supabase
        .from("meetings")
        .select("id,event_members,status,created_at")
        .eq("squad_id", squad.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      const ev = (data ?? []).find((m: any) => (m.event_members ?? []).includes(user.id));
      setActiveEventId(ev?.id ?? null);
    })();
  }, [squad?.id, user?.id]);

  const inviteLink = squad ? `https://squad-app-blue.vercel.app/join/${squad.id}` : "";

  useEffect(() => {
    if (!squad) return;
    (async () => {
      const [{ data: ex }, { data: la }] = await Promise.all([
        supabase.from("expenses").select("id,name,amount,created_at,paid_by").eq("squad_id", squad.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("late_events").select("id,event_name,minutes,created_at,user_id").eq("squad_id", squad.id).order("created_at", { ascending: false }).limit(5),
      ]);
      const nameOf = (uid: string) => members.find(m => m.id === uid)?.name ?? "Someone";
      const a: Activity[] = [
        ...(ex ?? []).map(e => ({ id: e.id, type: "expense" as const, text: `${nameOf(e.paid_by)} paid BDT ${Number(e.amount).toFixed(2)} for ${e.name}`, at: e.created_at })),
        ...(la ?? []).map(l => ({ id: l.id, type: "late" as const, text: `${nameOf(l.user_id)} was ${l.minutes}min late to ${l.event_name}`, at: l.created_at })),
      ].sort((x,y) => y.at.localeCompare(x.at)).slice(0, 5);
      setActs(a);
    })();
  }, [squad?.id, members]);

  const loadCheckins = async () => {
    if (!squad) return;
    const { data } = await supabase.from("checkins").select("user_id,status,minutes,updated_at").eq("squad_id", squad.id);
    setCheckins((data as Checkin[]) ?? []);
  };

  useEffect(() => { loadCheckins(); }, [squad?.id]);

  useEffect(() => {
    if (!squad) return;
    const ch = supabase.channel(`ci-${squad.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "checkins", filter: `squad_id=eq.${squad.id}` }, loadCheckins)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [squad?.id]);

  const setStatus = async (status: string, minutes: number | null) => {
    if (!squad || !user) return;
    // Trigger location sharing for OTW; stop for "here"
    if (status === "otw") {
      const ok = await startLoc(activeEventId);
      if (!ok) return; // Don't change status if denied
    } else if (status === "here") {
      await stopLoc();
    } else if (isSharing) {
      // Other statuses: stop sharing too
      await stopLoc();
    }
    const { error } = await supabase.from("checkins").upsert({
      squad_id: squad.id, user_id: user.id, status, minutes, updated_at: new Date().toISOString(),
    }, { onConflict: "squad_id,user_id" });
    if (error) toast.error(error.message);
    else { toast.success("Status updated!"); loadCheckins(); }
  };

  const copyCode = async () => {
    if (!squad) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!squad) return;
    const text = "Join my Squad on Squad App!";
    if (navigator.share) {
      try { await navigator.share({ title: "Squad App", text, url: inviteLink }); } catch {}
    } else {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Link copied!");
    }
  };

  const leaveSquad = async () => {
    if (!squad || !user) return;
    setLeaving(true);
    const newMembers = squad.members.filter(m => m !== user.id);
    const { error: e1 } = await supabase.from("squads").update({ members: newMembers }).eq("id", squad.id);
    if (e1) { toast.error(e1.message); setLeaving(false); return; }
    const { error: e2 } = await supabase.from("profiles").update({ squad_id: null }).eq("id", user.id);
    if (e2) { toast.error(e2.message); setLeaving(false); return; }
    await refreshProfile();
    setLeaving(false);
    setConfirmLeave(false);
  };

  if (!squad) return null;
  if (showSquad) return <SquadDetailsScreen onBack={() => setShowSquad(false)} />;
  const myCheckin = checkins.find(c => c.user_id === user?.id);

  return (
    <div className="px-5 pt-6 pb-28">
      {/* Live sharing indicator + manual stop */}
      {isSharing && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            onClick={() => setConfirmStopShare(true)}
            className="px-3 py-1.5 rounded-full bg-[#E74C3C] text-white text-xs font-semibold tap-scale">
            Stop Sharing Location
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0D0D2B] border border-[#00FF88]/40">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00FF88]"></span>
            </span>
            <span className="text-[11px] text-[#00FF88] font-semibold">Sharing Location</span>
          </div>
        </div>
      )}

      {/* Premium Squad Banner */}
      <div
        className="relative w-full overflow-hidden mb-5"
        style={{
          borderRadius: 16,
          padding: "20px 24px",
          background: "linear-gradient(135deg, #1A1AFF 0%, #7B2FFF 50%, #FF6B6B 100%)",
          boxShadow: "0 8px 32px rgba(26, 26, 255, 0.3)",
        }}
      >
        {/* Shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
          }}
        />
        <div className="relative flex items-center gap-4 z-10">
          <div style={{ fontSize: 52, lineHeight: 1 }}>{squad.emoji}</div>
          <div className="flex flex-col">
            <h1
              className="text-white"
              style={{
                fontSize: 24,
                fontWeight: 800,
                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                lineHeight: 1.2,
              }}
            >
              {squad.name}
            </h1>
            <p className="text-white mt-1" style={{ fontSize: 13, opacity: 0.85 }}>
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <h3 className="mt-6 text-sm text-[#888] uppercase tracking-wider">Members</h3>
      <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {members.map(m => (
          <div key={m.id} className="flex flex-col items-center gap-1 shrink-0 w-16">
            <Avatar choice={m.avatar_choice} size={56} />
            <p className="text-xs text-white truncate w-full text-center">{m.name}</p>
          </div>
        ))}
      </div>

      {/* Check-Ins */}
      <h3 className="mt-6 text-sm text-[#888] uppercase tracking-wider">Where is everyone?</h3>
      <div className="mt-3 rounded-2xl bg-[#1E1E3F] border border-[#2a2a4a] p-4 space-y-2">
        {members.map(m => {
          const c = checkins.find(x => x.user_id === m.id);
          const meta = c ? STATUS_META[c.status] : null;
          return (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar choice={m.avatar_choice} size={32} />
              <span className="text-white text-sm flex-1 truncate">{m.name}</span>
              {meta ? (
                <span className="text-xs font-semibold" style={{ color: meta.color }}>
                  {meta.emoji} {meta.label}{c?.minutes ? ` (${c.minutes}m)` : ""}
                </span>
              ) : (
                <span className="text-xs text-[#888]">Unknown</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setStatus("here", null)}
          className={`py-3 rounded-xl font-semibold tap-scale text-white ${myCheckin?.status === "here" ? "ring-2 ring-white" : ""}`}
          style={{ background: "#00FF88", color: "#0D0D2B" }}>✅ I'm Here</button>
        <button onClick={() => setStatus("not_coming", null)}
          className={`py-3 rounded-xl font-semibold tap-scale text-white ${myCheckin?.status === "not_coming" ? "ring-2 ring-white" : ""}`}
          style={{ background: "#E74C3C" }}>❌ Not Coming</button>
        <div className="flex gap-1">
          <input value={otwMin} onChange={e=>setOtwMin(e.target.value.replace(/\D/g,""))} placeholder="min" inputMode="numeric"
            className="w-12 px-2 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white text-sm text-center" />
          <button onClick={() => setStatus("otw", otwMin ? parseInt(otwMin,10) : null)}
            className={`flex-1 py-3 rounded-xl font-semibold tap-scale text-white ${myCheckin?.status === "otw" ? "ring-2 ring-white" : ""}`}
            style={{ background: "#1A1AFF" }}>🚗 On My Way</button>
        </div>
        <div className="flex gap-1">
          <input value={lateMin} onChange={e=>setLateMin(e.target.value.replace(/\D/g,""))} placeholder="min" inputMode="numeric"
            className="w-12 px-2 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white text-sm text-center" />
          <button onClick={() => setStatus("late", lateMin ? parseInt(lateMin,10) : null)}
            className={`flex-1 py-3 rounded-xl font-semibold tap-scale text-white ${myCheckin?.status === "late" ? "ring-2 ring-white" : ""}`}
            style={{ background: "#F39C12", color: "#0D0D2B" }}>⏰ Running Late</button>
        </div>
      </div>

      {/* Invite Link */}
      <div className="mt-6 rounded-2xl bg-[#1E1E3F] border-2 border-[#1A1AFF] p-5">
        <p className="text-xs text-[#888] uppercase tracking-widest text-center">Invite Link</p>
        <p className="mt-2 text-xs text-[#00E5FF] text-center break-all px-1">{inviteLink}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={copyCode}
            className="py-2 rounded-xl bg-[#1A1AFF] text-white text-sm font-semibold tap-scale flex items-center justify-center gap-2">
            <Copy size={14} /> {copied ? "Copied! ✅" : "Copy Link"}
          </button>
          <button onClick={shareLink}
            className="py-2 rounded-xl bg-[#00E5FF] text-[#0D0D2B] text-sm font-semibold tap-scale flex items-center justify-center gap-2">
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>

      {/* Squad Details Button */}
      <button onClick={() => setShowSquad(true)}
        className="mt-3 w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale flex items-center justify-center gap-2">
        <Users size={16} /> Squad
      </button>

      {/* Leave Squad */}
      <button onClick={() => setConfirmLeave(true)}
        className="mt-4 w-full py-3 rounded-xl border-2 border-[#E74C3C] text-[#E74C3C] font-semibold tap-scale flex items-center justify-center gap-2">
        <LogOut size={16} /> Leave Squad
      </button>

      {/* Activity */}
      <h3 className="mt-8 text-sm text-[#888] uppercase tracking-wider">Recent activity</h3>
      <div className="mt-3 space-y-2">
        {acts.length === 0 ? (
          <div className="rounded-2xl bg-[#1E1E3F] border border-[#2a2a4a] p-6 text-center text-[#888]">
            No activity yet — add an expense or log a late incident! 🎉
          </div>
        ) : acts.map(a => (
          <div key={a.id} className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-4 text-white text-sm flex justify-between gap-2">
            <span><span className="mr-2">{a.type === "expense" ? "💸" : "🏆"}</span>{a.text}</span>
            <span className="text-xs text-[#888] shrink-0">{timeAgo(a.at)}</span>
          </div>
        ))}
      </div>

      {confirmLeave && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6" onClick={() => setConfirmLeave(false)}>
          <div onClick={e=>e.stopPropagation()} className="w-full max-w-sm bg-[#0D0D2B] border border-[#2a2a4a] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-white">Leave squad?</h2>
              <button onClick={() => setConfirmLeave(false)}><X className="text-white" /></button>
            </div>
            <p className="text-[#888] text-sm">Are you sure you want to leave {squad.name}?</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmLeave(false)}
                className="flex-1 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white font-semibold tap-scale">Cancel</button>
              <button onClick={leaveSquad} disabled={leaving}
                className="flex-1 py-3 rounded-xl bg-[#E74C3C] text-white font-semibold tap-scale flex items-center justify-center gap-2 disabled:opacity-60">
                {leaving && <Loader2 size={16} className="animate-spin" />} Leave Squad
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmStopShare && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6" onClick={() => setConfirmStopShare(false)}>
          <div onClick={e=>e.stopPropagation()} className="w-full max-w-sm bg-[#0D0D2B] border border-[#2a2a4a] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">Stop sharing?</h2>
            <p className="text-[#888] text-sm mt-2">Are you sure you want to stop sharing your location?</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmStopShare(false)}
                className="flex-1 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white font-semibold tap-scale">Cancel</button>
              <button onClick={async () => { await stopLoc(); setConfirmStopShare(false); }}
                className="flex-1 py-3 rounded-xl bg-[#E74C3C] text-white font-semibold tap-scale">Stop Sharing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
