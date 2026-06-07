import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { Plus, X, Loader2, Calendar as CalIcon, Crown, Pencil, Check, Archive, Users, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "../components/Avatar";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const sb = supabase as any;

type Expense = {
  id: string;
  name: string;
  amount: number;
  paid_by: string;
  split_with: string[];
  created_at: string;
  created_by: string;
  meeting_id: string | null;
  expense_type: "split" | "personal";
  custom_amounts: Record<string, number>;
  settled_users: string[];
};

type NotificationEntry = {
  type: "added" | "kicked";
  user_id: string;
  event_name: string;
  by?: string;
  at: string;
};

type Meeting = {
  id: string;
  squad_id: string;
  event_name: string;
  description: string | null;
  date: string | null;
  created_by: string;
  status: "active" | "ended";
  created_at: string;
  event_members: string[];
  kicked_members: string[];
  notifications: NotificationEntry[];
  seen_by: string[];
  summaries_seen: string[];
  meeting_time?: string | null;
  location_name?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
};

const fmt = (n: number) => `BDT ${Number(n).toFixed(2)}`;

const VOYAGER_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const VOYAGER_ATTR = "&copy; OpenStreetMap contributors &copy; CARTO";

function destDivIcon(label: string) {
  const html = `
    <style>@keyframes squadPulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.6);opacity:0}}</style>
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div style="position:relative;width:54px;height:54px;">
        <div style="position:absolute;inset:0;border:2px solid #FF4444;border-radius:50%;animation:squadPulse 1.5s infinite;"></div>
        <div style="position:absolute;inset:0;border:2px solid #FF4444;border-radius:50%;animation:squadPulse 1.5s infinite;animation-delay:.75s;"></div>
        <div style="position:relative;width:54px;height:54px;border-radius:50%;background:#FF4444;display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 4px 12px rgba(0,0,0,.4);">📍</div>
      </div>
      <div style="background:#0D0D2B;color:#fff;border-radius:8px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;margin-top:4px;">${label}</div>
    </div>`;
  return L.divIcon({ html, className: "squad-dest-marker", iconSize: [0, 0] });
}

function LocationPickerModal({ initial, label, onClose, onConfirm }: {
  initial?: { lat: number; lng: number; name: string } | null;
  label: string;
  onClose: () => void;
  onConfirm: (lat: number, lng: number, name: string) => void;
}) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number; name: string } | null>(initial ?? null);
  const [loadingName, setLoadingName] = useState(false);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const center: [number, number] = initial ? [initial.lat, initial.lng] : [23.6850, 90.3563];
    const map = L.map(mapElRef.current, { zoomControl: true, attributionControl: true }).setView(center, 13);
    L.tileLayer(VOYAGER_TILES, { maxZoom: 20, subdomains: "abcd", attribution: VOYAGER_ATTR }).addTo(map);
    if (initial) {
      markerRef.current = L.marker([initial.lat, initial.lng], { icon: destDivIcon(label) }).addTo(map);
    }
    map.on("click", async (ev: L.LeafletMouseEvent) => {
      const { lat, lng } = ev.latlng;
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.marker([lat, lng], { icon: destDivIcon(label) }).addTo(map);
      setPicked({ lat, lng, name: "Fetching place…" });
      setLoadingName(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
        const json = await res.json();
        const name = json?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setPicked({ lat, lng, name });
      } catch {
        setPicked({ lat, lng, name: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      } finally {
        setLoadingName(false);
      }
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0" style={{ zIndex: 9999 }}>
      <div className="flex flex-col h-full w-full bg-[#0D0D2B]">
        <div className="flex items-center justify-between px-4 py-3 bg-[#0D0D2B] border-b border-[#2a2a4a]">
          <p className="text-white text-sm font-semibold">Tap anywhere on the map to set meeting spot</p>
          <button onClick={onClose} className="text-white p-1 tap-scale"><X size={22} /></button>
        </div>
        <div className="relative flex-1">
          <div ref={mapElRef} className="absolute inset-0" />
        </div>
        {picked && (
          <div className="bg-white px-4 py-3 border-t border-gray-200">
            <p className="text-gray-900 font-bold text-sm break-words">{loadingName ? "Fetching place…" : picked.name}</p>
            <button
              onClick={() => onConfirm(picked.lat, picked.lng, picked.name)}
              disabled={loadingName}
              className="mt-2 w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale disabled:opacity-60">
              Confirm This Location
            </button>
            <p className="text-center text-gray-500 text-xs mt-1">Tap anywhere else to change</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getSplitMap(e: Expense, fallbackMembers: string[]): Record<string, number> {
  if (e.expense_type === "personal") return { [e.paid_by]: Number(e.amount) };
  const ids = e.split_with?.length ? e.split_with : fallbackMembers;
  const total = Number(e.amount);
  const map: Record<string, number> = {};
  let assigned = 0;
  let unset: string[] = [];
  ids.forEach(id => {
    const v = e.custom_amounts?.[id];
    if (typeof v === "number") { map[id] = v; assigned += v; }
    else unset.push(id);
  });
  const remaining = Math.max(0, total - assigned);
  const each = unset.length ? remaining / unset.length : 0;
  unset.forEach(id => { map[id] = each; });
  return map;
}

export function ExpensesScreen() {
  const { squad, members, user } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [summaryMeetingId, setSummaryMeetingId] = useState<string | null>(null);
  const [manageMeetingId, setManageMeetingId] = useState<string | null>(null);
  const [forcedSummaryId, setForcedSummaryId] = useState<string | null>(null);
  const [locationMeetingId, setLocationMeetingId] = useState<string | null>(null);

  const memberIds = useMemo(() => members.map(m => m.id), [members]);

  const load = async () => {
    if (!squad) return;
    const [{ data: ex, error: e1 }, { data: mt, error: e2 }] = await Promise.all([
      sb.from("expenses").select("*").eq("squad_id", squad.id).order("created_at", { ascending: false }),
      sb.from("meetings").select("*").eq("squad_id", squad.id).order("created_at", { ascending: false }),
    ]);
    if (e1) toast.error("Couldn't load expenses");
    if (e2) toast.error("Couldn't load events");
    setExpenses((ex as Expense[]) ?? []);
    setMeetings((mt as Meeting[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [squad?.id]);

  useEffect(() => {
    if (!squad) return;
    const ch = sb.channel(`exp-mt-${squad.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `squad_id=eq.${squad.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings", filter: `squad_id=eq.${squad.id}` }, load)
      .subscribe();
    return () => { sb.removeChannel(ch); };
    // eslint-disable-next-line
  }, [squad?.id]);

  // Auto-show ended event summary to non-admin members who haven't seen it
  useEffect(() => {
    if (!user || forcedSummaryId || summaryMeetingId) return;
    const pending = meetings.find(m =>
      m.status === "ended" &&
      m.created_by !== user.id &&
      (m.event_members ?? []).includes(user.id) &&
      !(m.summaries_seen ?? []).includes(user.id)
    );
    if (pending) setForcedSummaryId(pending.id);
  }, [meetings, user, forcedSummaryId, summaryMeetingId]);

  // Visible (the current user is a member of) active meetings
  const visibleActive = useMemo(
    () => meetings.filter(m => m.status === "active" && (m.event_members ?? []).includes(user?.id ?? "")),
    [meetings, user]
  );
  const visibleEnded = useMemo(
    () => meetings.filter(m => m.status === "ended" && ((m.event_members ?? []).includes(user?.id ?? "") || m.created_by === user?.id)),
    [meetings, user]
  );

  // balances across ALL expenses (general view)
  const balances = useMemo(() => {
    const b: Record<string, number> = {};
    members.forEach(m => b[m.id] = 0);
    expenses.forEach(e => {
      if (e.expense_type === "personal") return;
      const split = getSplitMap(e, memberIds);
      if (b[e.paid_by] !== undefined) b[e.paid_by] += Number(e.amount);
      Object.entries(split).forEach(([uid, amt]) => {
        if (b[uid] !== undefined) {
          const isSettled = (e.settled_users ?? []).includes(uid);
          if (!isSettled) b[uid] -= amt;
          else if (uid === e.paid_by) {}
          else b[e.paid_by] -= amt;
        }
      });
    });
    return b;
  }, [expenses, members, memberIds]);

  if (!squad) return null;

  const generalExpenses = expenses.filter(e => !e.meeting_id);

  if (forcedSummaryId) {
    return <MeetingSummary meetingId={forcedSummaryId} onBack={() => setForcedSummaryId(null)} onArchived={() => { setForcedSummaryId(null); load(); }} forceMarkSeen />;
  }
  if (summaryMeetingId) {
    return <MeetingSummary meetingId={summaryMeetingId} onBack={() => setSummaryMeetingId(null)} onArchived={() => { setSummaryMeetingId(null); load(); }} />;
  }

  return (
    <div className="px-5 pt-6 pb-28">
      <h1 className="text-2xl font-bold text-white">Expenses</h1>

      {visibleActive.length > 0 && (
        <section className="mt-5">
          <h3 className="text-xs uppercase tracking-wider text-[#888] mb-2">Active Events</h3>
          <div className="space-y-2">
            {visibleActive.map(m => {
              const count = expenses.filter(e => e.meeting_id === m.id).length;
              const isCreator = m.created_by === user?.id;
              const memberCount = (m.event_members ?? []).length;
              return (
                <div key={m.id} className="rounded-2xl bg-[#1E1E3F] border border-[#00E5FF]/30 p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{m.event_name}</p>
                      <p className="text-xs text-[#888] mt-0.5">
                        {m.date ? new Date(m.date).toLocaleDateString() : "No date"} · {count} {count === 1 ? "expense" : "expenses"}
                      </p>
                      {m.description && <p className="text-xs text-[#aaa] mt-1">{m.description}</p>}
                    </div>
                    {isCreator && (
                      <button onClick={() => setSummaryMeetingId(m.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#E74C3C] text-white tap-scale shrink-0">End Event</button>
                    )}
                  </div>
                  {isCreator && (
                    <button onClick={() => setManageMeetingId(m.id)}
                      className="mt-3 w-full py-2 rounded-lg bg-[#1A1AFF]/30 border border-[#1A1AFF]/50 text-[#00E5FF] text-xs font-semibold tap-scale flex items-center justify-center gap-1.5">
                      <Users size={14} /> Manage Members ({memberCount})
                    </button>
                  )}
                  {(m.event_members ?? []).includes(user?.id ?? "") && (
                    <button onClick={() => setLocationMeetingId(m.id)}
                      className="mt-2 w-full py-2 rounded-lg bg-[#1A1AFF] text-white text-xs font-semibold tap-scale flex items-center justify-center gap-1.5">
                      📍 {m.location_name ? `${m.location_name.length > 30 ? m.location_name.slice(0, 30) + "…" : m.location_name} · Change` : "Set Meeting Location"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={() => setShowAddExpense(true)}
          className="py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale flex items-center justify-center gap-1.5 text-sm">
          <Plus size={16} /> Add Expense
        </button>
        <button onClick={() => setShowCreateMeeting(true)}
          className="py-3 rounded-xl bg-[#00E5FF] text-[#0D0D2B] font-semibold tap-scale flex items-center justify-center gap-1.5 text-sm">
          <CalIcon size={16} /> Create Event
        </button>
      </div>

      <section className="mt-6">
        <h3 className="text-xs uppercase tracking-wider text-[#888] mb-2">General Expenses</h3>
        {generalExpenses.length === 0 ? (
          <div className="rounded-2xl bg-[#1E1E3F] border border-[#2a2a4a] p-6 text-center text-[#888] text-sm">
            <div className="text-3xl mb-2">💸</div>No general expenses yet
          </div>
        ) : (
          <div className="space-y-2">
            {generalExpenses.map(e => <ExpenseCard key={e.id} e={e} onChanged={load} />)}
          </div>
        )}
      </section>

      {visibleActive.map(m => {
        const list = expenses.filter(e => e.meeting_id === m.id);
        if (list.length === 0) return null;
        return (
          <section key={m.id} className="mt-6">
            <h3 className="text-xs uppercase tracking-wider text-[#00E5FF] mb-2">{m.event_name} expenses</h3>
            <div className="space-y-2">
              {list.map(e => <ExpenseCard key={e.id} e={e} onChanged={load} />)}
            </div>
          </section>
        );
      })}

      <h3 className="mt-8 text-xs uppercase tracking-wider text-[#888]">Who Owes What</h3>
      <div className="mt-2 space-y-2">
        {members.map(m => {
          const b = balances[m.id] ?? 0;
          const isMe = m.id === user?.id;
          let label = "all settled"; let color = "#888";
          if (b > 0.01) { label = "gets back"; color = "#00FF88"; }
          else if (b < -0.01) { label = "owes"; color = "#E74C3C"; }
          return (
            <div key={m.id} className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-3 flex items-center gap-3">
              <Avatar choice={m.avatar_choice} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{m.name}{isMe ? " (you)" : ""}</p>
                <p className="text-xs" style={{ color }}>{label}</p>
              </div>
              <p className="font-bold text-sm" style={{ color }}>{b > 0 ? "+" : ""}{fmt(Math.abs(b))}</p>
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowPast(true)}
        className="mt-6 w-full py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-[#00E5FF] font-semibold tap-scale flex items-center justify-center gap-2">
        <Archive size={16} /> View Past Events ({visibleEnded.length})
      </button>

      {showAddExpense && <AddExpense meetings={visibleActive} onClose={() => setShowAddExpense(false)} onSaved={load} />}
      {showCreateMeeting && <CreateMeeting onClose={() => setShowCreateMeeting(false)} onSaved={load} />}
      {showPast && <PastMeetings meetings={visibleEnded} expenses={expenses} onClose={() => setShowPast(false)} onView={(id) => { setShowPast(false); setSummaryMeetingId(id); }} />}
      {manageMeetingId && (
        <ManageMembers meeting={meetings.find(m => m.id === manageMeetingId)!} onClose={() => setManageMeetingId(null)} onChanged={load} />
      )}
      {locationMeetingId && (() => {
        const mt = meetings.find(m => m.id === locationMeetingId);
        if (!mt) return null;
        const init = mt.location_lat != null && mt.location_lng != null
          ? { lat: mt.location_lat, lng: mt.location_lng, name: mt.location_name ?? "" }
          : null;
        return (
          <LocationPickerModal
            label={mt.event_name}
            initial={init}
            onClose={() => setLocationMeetingId(null)}
            onConfirm={async (lat, lng, n) => {
              const { error } = await sb.from("meetings")
                .update({ location_lat: lat, location_lng: lng, location_name: n })
                .eq("id", mt.id);
              if (error) { toast.error(error.message); return; }
              toast.success("Location updated for all members");
              setLocationMeetingId(null);
              load();
            }}
          />
        );
      })()}
    </div>
  );
}

function ExpenseCard({ e, onChanged }: { e: Expense; onChanged: () => void }) {
  const { members, user } = useApp();
  const [editOpen, setEditOpen] = useState(false);
  const isAdmin = e.created_by === user?.id;
  const payer = members.find(m => m.id === e.paid_by)?.name ?? "Someone";
  const date = new Date(e.created_at).toLocaleDateString();
  const splitMap = getSplitMap(e, members.map(m => m.id));
  const isPersonal = e.expense_type === "personal";

  return (
    <div className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-white font-medium flex items-center gap-1.5">
            {e.name} {isAdmin && <Crown size={14} className="text-[#F39C12]" />}
            {isPersonal && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#1A1AFF]/40 text-[#00E5FF]">Personal</span>}
          </p>
          <p className="text-xs text-[#888]">Paid by {payer} · {date}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[#00E5FF] font-bold whitespace-nowrap">{fmt(e.amount)}</p>
          {isAdmin && (
            <button onClick={() => setEditOpen(true)} className="text-[#888] hover:text-white tap-scale" aria-label="Edit">
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      {!isPersonal && (
        <div className="mt-3 pt-3 border-t border-[#2a2a4a] space-y-1.5">
          {Object.entries(splitMap).map(([uid, amt]) => {
            const m = members.find(x => x.id === uid);
            const settled = (e.settled_users ?? []).includes(uid);
            const isPayer = uid === e.paid_by;
            return (
              <div key={uid} className="flex items-center justify-between text-xs">
                <span className="text-[#aaa]">{m?.name ?? "Member"}{isPayer ? " (paid)" : ""}</span>
                <div className="flex items-center gap-2">
                  <span className={settled ? "text-[#888] line-through" : "text-white"}>{fmt(amt)}</span>
                  {!isPayer && isAdmin && (
                    <SettleButton expense={e} memberId={uid} amount={amt} settled={settled} onChanged={onChanged} />
                  )}
                  {!isPayer && !isAdmin && settled && <span className="text-[#888]">settled</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editOpen && <EditExpense e={e} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); onChanged(); }} />}
    </div>
  );
}

function SettleButton({ expense, memberId, amount, settled, onChanged }: { expense: Expense; memberId: string; amount: number; settled: boolean; onChanged: () => void }) {
  const { members } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = members.find(m => m.id === memberId)?.name ?? "Member";

  const apply = async (markSettled: boolean) => {
    setBusy(true);
    const current = expense.settled_users ?? [];
    const next = markSettled
      ? Array.from(new Set([...current, memberId]))
      : current.filter(x => x !== memberId);
    const { error } = await sb.from("expenses").update({ settled_users: next }).eq("id", expense.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setConfirm(false);
    toast.success(markSettled ? "Marked as paid" : "Settlement undone");
    onChanged();
  };

  if (settled) {
    return (
      <button onClick={() => apply(false)} disabled={busy}
        className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a3a] border border-[#2a2a4a] text-[#888] tap-scale">
        Undo
      </button>
    );
  }
  return (
    <>
      <button onClick={() => setConfirm(true)} className="text-[10px] px-2 py-0.5 rounded bg-[#00FF88] text-[#0D0D2B] font-semibold tap-scale">Settle</button>
      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirm(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-[#1E1E3F] border border-[#2a2a4a] p-5">
            <p className="text-white">Confirm <b>{name}</b> has paid their share of <b className="text-[#00E5FF]">{fmt(amount)}</b>?</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirm(false)} className="flex-1 py-2 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white tap-scale">Cancel</button>
              <button onClick={() => apply(true)} disabled={busy} className="flex-1 py-2 rounded-xl bg-[#00FF88] text-[#0D0D2B] font-semibold tap-scale disabled:opacity-60">Confirm Paid</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditExpense({ e, onClose, onSaved }: { e: Expense; onClose: () => void; onSaved: () => void }) {
  const { members } = useApp();
  const initial = getSplitMap(e, members.map(m => m.id));
  const [amount, setAmount] = useState(String(e.amount));
  const [custom, setCustom] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v.toFixed(2)]))
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const newAmount = Number(amount);
    if (!newAmount || newAmount <= 0) { toast.error("Invalid amount"); setBusy(false); return; }
    const customNum: Record<string, number> = {};
    Object.entries(custom).forEach(([k, v]) => { const n = Number(v); if (!isNaN(n)) customNum[k] = n; });
    const { error } = await sb.from("expenses").update({
      amount: newAmount,
      custom_amounts: customNum,
    }).eq("id", e.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    onSaved();
  };

  if (e.expense_type === "personal") {
    return (
      <Modal onClose={onClose} title="Edit Personal Expense">
        <input value={amount} onChange={ev => setAmount(ev.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal" className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white" />
        <button onClick={save} disabled={busy} className="mt-3 w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale disabled:opacity-60">Save</button>
      </Modal>
    );
  }

  const splitIds = e.split_with?.length ? e.split_with : members.map(m => m.id);
  return (
    <Modal onClose={onClose} title="Edit Expense">
      <label className="text-xs text-[#888]">Total amount</label>
      <input value={amount} onChange={ev => setAmount(ev.target.value.replace(/[^0-9.]/g, ""))}
        inputMode="decimal" className="mt-1 w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white" />
      <p className="text-xs text-[#888] mt-3 mb-1">Per-member amounts (BDT)</p>
      <div className="space-y-2">
        {splitIds.map(uid => {
          const m = members.find(x => x.id === uid);
          return (
            <div key={uid} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a1a3a] border border-[#2a2a4a]">
              <span className="text-white flex-1 text-sm">{m?.name ?? "Member"}</span>
              <input value={custom[uid] ?? ""} onChange={ev => setCustom(s => ({ ...s, [uid]: ev.target.value.replace(/[^0-9.]/g, "") }))}
                inputMode="decimal" className="w-24 px-2 py-1.5 rounded bg-[#0D0D2B] border border-[#2a2a4a] text-white text-right text-sm" />
            </div>
          );
        })}
      </div>
      <button onClick={save} disabled={busy} className="mt-4 w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale disabled:opacity-60 flex items-center justify-center gap-2">
        {busy && <Loader2 size={18} className="animate-spin" />} Save Changes
      </button>
    </Modal>
  );
}

function AddExpense({ meetings, onClose, onSaved }: { meetings: Meeting[]; onClose: () => void; onSaved: () => void }) {
  const { squad, members, user } = useApp();
  const [tab, setTab] = useState<"split" | "personal">("split");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(user?.id ?? "");
  const [meetingId, setMeetingId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Available split members depend on selected event (or all squad)
  const eligibleSplitIds = useMemo(() => {
    if (meetingId) {
      const ev = meetings.find(m => m.id === meetingId);
      return ev?.event_members ?? [];
    }
    return members.map(m => m.id);
  }, [meetingId, meetings, members]);

  const [split, setSplit] = useState<string[]>(members.map(m => m.id));

  useEffect(() => { setSplit(eligibleSplitIds); }, [meetingId, eligibleSplitIds.join(",")]); // eslint-disable-line

  const toggle = (id: string) => setSplit(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const save = async () => {
    if (!name.trim() || !amount || !squad || !user) { toast.error("Fill all fields"); return; }
    if (tab === "split" && (!paidBy || split.length === 0)) { toast.error("Pick payer & split members"); return; }
    setBusy(true);
    const payload: any = {
      squad_id: squad.id,
      name: name.trim(),
      amount: Number(amount),
      created_by: user.id,
      meeting_id: meetingId || null,
      expense_type: tab,
    };
    if (tab === "split") {
      payload.paid_by = paidBy;
      payload.split_with = split;
    } else {
      payload.paid_by = user.id;
      payload.split_with = [];
    }
    const { error } = await sb.from("expenses").insert(payload);
    if (error) { toast.error(error.message); setBusy(false); return; }
    onSaved(); onClose();
  };

  return (
    <Modal onClose={onClose} title="Add Expense">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#1a1a3a] mb-3">
        <button onClick={() => setTab("split")} className={`py-2 rounded-lg text-sm font-semibold tap-scale ${tab === "split" ? "bg-[#1A1AFF] text-white" : "text-[#888]"}`}>Split</button>
        <button onClick={() => setTab("personal")} className={`py-2 rounded-lg text-sm font-semibold tap-scale ${tab === "personal" ? "bg-[#1A1AFF] text-white" : "text-[#888]"}`}>Personal</button>
      </div>

      <label className="text-xs text-[#888]">Link to event</label>
      <select value={meetingId} onChange={ev => setMeetingId(ev.target.value)}
        className="mt-1 mb-3 w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white">
        <option value="">No Event (general)</option>
        {meetings.map(m => <option key={m.id} value={m.id}>{m.event_name}</option>)}
      </select>

      <div className="space-y-3">
        <input value={name} onChange={ev => setName(ev.target.value)} placeholder="Expense name"
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
        <input value={amount} onChange={ev => setAmount(ev.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Amount (BDT)"
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />

        {tab === "split" && (
          <>
            <select value={paidBy} onChange={ev => setPaidBy(ev.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white">
              {members.filter(m => eligibleSplitIds.includes(m.id)).map(m => <option key={m.id} value={m.id}>Paid by {m.name}</option>)}
            </select>
            <div>
              <p className="text-sm text-[#888] mb-2">Split with</p>
              <div className="space-y-2">
                {members.filter(m => eligibleSplitIds.includes(m.id)).map(m => (
                  <label key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a1a3a] border border-[#2a2a4a]">
                    <input type="checkbox" checked={split.includes(m.id)} onChange={() => toggle(m.id)} className="w-4 h-4 accent-[#1A1AFF]" />
                    <span className="text-white">{m.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <button onClick={save} disabled={busy}
          className="w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 size={18} className="animate-spin" />} Save Expense
        </button>
      </div>
    </Modal>
  );
}

function CreateMeeting({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { squad, user, members } = useApp();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [desc, setDesc] = useState("");
  const [selected, setSelected] = useState<string[]>(user ? [user.id] : []);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => {
    if (id === user?.id) return; // creator always included
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const save = async () => {
    if (!name.trim() || !squad || !user) { toast.error("Event name required"); return; }
    setBusy(true);
    const lat = locLat;
    const lng = locLng;
    const event_members = Array.from(new Set([...selected, user.id]));
    const { error } = await sb.from("meetings").insert({
      squad_id: squad.id, event_name: name.trim(), description: desc.trim() || null,
      date: date || null, created_by: user.id, status: "active",
      event_members,
      meeting_time: time || null,
      location_name: locationName.trim() || null,
      location_lat: lat, location_lng: lng,
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success("Event created");
    onSaved(); onClose();
  };

  return (
    <Modal onClose={onClose} title="Create Event">
      <div className="space-y-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="What is this event called?"
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white" />
        <div>
          <label className="text-xs text-[#888] uppercase tracking-wider">Meeting Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white" />
        </div>
        <div>
          <label className="text-xs text-[#888] uppercase tracking-wider">Meeting Location</label>
          <input value={locationName} readOnly
            placeholder="No location selected yet — tap the button to set on map"
            className="mt-1 w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
          <button type="button" onClick={() => setShowPicker(true)}
            className="mt-2 w-full text-white font-semibold tap-scale"
            style={{ background: "#1A1AFF", borderRadius: 10, padding: "12px" }}>
            📍 {locLat != null ? "Change Meeting Location" : "Set Meeting Location on Map"}
          </button>
          {locLat != null && locLng != null && (
            <div className="mt-2">
              <img
                src={`https://staticmap.openstreetmap.de/staticmap.php?center=${locLat},${locLng}&zoom=15&size=400x120&markers=${locLat},${locLng},red`}
                alt="Selected location"
                className="w-full rounded-lg border border-[#2a2a4a]" />
              <p className="text-xs text-[#888] mt-1 break-words">{locationName}</p>
            </div>
          )}
        </div>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" rows={2}
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
        <div>
          <p className="text-xs text-[#888] mb-2 uppercase tracking-wider">Select Event Members</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {members.map(m => {
              const isCreator = m.id === user?.id;
              const checked = selected.includes(m.id);
              return (
                <label key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a1a3a] border border-[#2a2a4a] ${isCreator ? "opacity-90" : ""}`}>
                  <input type="checkbox" checked={checked} disabled={isCreator} onChange={() => toggle(m.id)} className="w-4 h-4 accent-[#1A1AFF]" />
                  <Avatar choice={m.avatar_choice} size={28} />
                  <span className="text-white text-sm flex-1">{m.name}{isCreator ? " (you)" : ""}</span>
                </label>
              );
            })}
          </div>
        </div>
        <button onClick={save} disabled={busy}
          className="w-full py-3 rounded-xl bg-[#00E5FF] text-[#0D0D2B] font-semibold tap-scale disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 size={18} className="animate-spin" />} Create Event
        </button>
      </div>
      {showPicker && (
        <LocationPickerModal
          label={name || "Meeting"}
          initial={locLat != null && locLng != null ? { lat: locLat, lng: locLng, name: locationName } : null}
          onClose={() => setShowPicker(false)}
          onConfirm={(lat, lng, n) => {
            setLocLat(lat); setLocLng(lng); setLocationName(n);
            setShowPicker(false);
          }}
        />
      )}
    </Modal>
  );
}

function ManageMembers({ meeting, onClose, onChanged }: { meeting: Meeting; onClose: () => void; onChanged: () => void }) {
  const { members, user } = useApp();
  const [busy, setBusy] = useState(false);
  const [confirmKick, setConfirmKick] = useState<string | null>(null);

  const inEvent = (id: string) => (meeting.event_members ?? []).includes(id);

  const addMember = async (uid: string) => {
    setBusy(true);
    const next = Array.from(new Set([...(meeting.event_members ?? []), uid]));
    const note: NotificationEntry = { type: "added", user_id: uid, event_name: meeting.event_name, by: user?.id, at: new Date().toISOString() };
    const notifications = [...(meeting.notifications ?? []), note];
    const { error } = await sb.from("meetings").update({ event_members: next, notifications }).eq("id", meeting.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Member added");
    onChanged();
  };

  const kickMember = async (uid: string) => {
    setBusy(true);
    const next = (meeting.event_members ?? []).filter(x => x !== uid);
    const kicked = Array.from(new Set([...(meeting.kicked_members ?? []), uid]));
    const note: NotificationEntry = { type: "kicked", user_id: uid, event_name: meeting.event_name, by: user?.id, at: new Date().toISOString() };
    const notifications = [...(meeting.notifications ?? []), note];
    const { error } = await sb.from("meetings").update({ event_members: next, kicked_members: kicked, notifications }).eq("id", meeting.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setConfirmKick(null);
    toast.success("Member removed");
    onChanged();
  };

  const confirmName = members.find(m => m.id === confirmKick)?.name ?? "";

  return (
    <Modal onClose={onClose} title={`Manage: ${meeting.event_name}`}>
      <div className="space-y-2">
        {members.map(m => {
          const here = inEvent(m.id);
          const isMe = m.id === user?.id;
          return (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a]">
              <Avatar choice={m.avatar_choice} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{m.name}{isMe ? " (you)" : ""}</p>
                <p className="text-[10px]" style={{ color: here ? "#00FF88" : "#888" }}>
                  {here ? "✓ in event" : "− not in event"}
                </p>
              </div>
              {here ? (
                isMe ? <span className="text-[10px] text-[#888]">admin</span> : (
                  <button disabled={busy} onClick={() => setConfirmKick(m.id)}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-[#E74C3C] text-white font-semibold tap-scale flex items-center gap-1">
                    <UserMinus size={12} /> Kick Out
                  </button>
                )
              ) : (
                <button disabled={busy} onClick={() => addMember(m.id)}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-[#1A1AFF] text-white font-semibold tap-scale flex items-center gap-1">
                  <UserPlus size={12} /> Add
                </button>
              )}
            </div>
          );
        })}
      </div>

      {confirmKick && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirmKick(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-[#1E1E3F] border border-[#2a2a4a] p-5">
            <p className="text-white">Are you sure you want to remove <b>{confirmName}</b> from this event?</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmKick(null)} className="flex-1 py-2 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white tap-scale">Cancel</button>
              <button onClick={() => kickMember(confirmKick)} disabled={busy} className="flex-1 py-2 rounded-xl bg-[#E74C3C] text-white font-semibold tap-scale disabled:opacity-60">Remove</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function MeetingSummary({ meetingId, onBack, onArchived, forceMarkSeen }: { meetingId: string; onBack: () => void; onArchived: () => void; forceMarkSeen?: boolean }) {
  const { members, user } = useApp();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [list, setList] = useState<Expense[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const memberIds = members.map(m => m.id);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: ex }] = await Promise.all([
        sb.from("meetings").select("*").eq("id", meetingId).maybeSingle(),
        sb.from("expenses").select("*").eq("meeting_id", meetingId).order("created_at", { ascending: false }),
      ]);
      setMeeting(m as Meeting);
      setList((ex as Expense[]) ?? []);
    })();
  }, [meetingId]);

  const isCreator = meeting?.created_by === user?.id;
  const eventMemberSet = new Set(meeting?.event_members ?? []);
  const eventMembers = members.filter(m => eventMemberSet.has(m.id));
  const total = list.reduce((s, e) => s + Number(e.amount), 0);

  const perMember = eventMembers.map(m => {
    const personal = list.filter(e => e.expense_type === "personal" && e.paid_by === m.id).reduce((s, e) => s + Number(e.amount), 0);
    const splitShare = list.filter(e => e.expense_type === "split").reduce((s, e) => {
      const map = getSplitMap(e, memberIds);
      return s + (map[m.id] ?? 0);
    }, 0);
    return { m, personal, split: splitShare, total: personal + splitShare };
  });
  const avg = perMember.length ? perMember.reduce((s, x) => s + x.total, 0) / perMember.length : 0;

  const balances: Record<string, number> = {};
  eventMembers.forEach(m => balances[m.id] = 0);
  list.forEach(e => {
    if (e.expense_type === "personal") return;
    const split = getSplitMap(e, memberIds);
    if (balances[e.paid_by] !== undefined) balances[e.paid_by] += Number(e.amount);
    Object.entries(split).forEach(([uid, amt]) => {
      if ((e.settled_users ?? []).includes(uid)) return;
      if (balances[uid] !== undefined) balances[uid] -= amt;
    });
  });

  const endMeeting = async () => {
    setBusy(true);
    const { error } = await sb.from("meetings").update({ status: "ended" }).eq("id", meetingId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setConfirmEnd(false);
    setMeeting(prev => prev ? { ...prev, status: "ended" } : prev);
    toast.success("Event ended");
  };

  const closeAndMarkSeen = async () => {
    if (meeting && user && !(meeting.summaries_seen ?? []).includes(user.id)) {
      const next = Array.from(new Set([...(meeting.summaries_seen ?? []), user.id]));
      await sb.from("meetings").update({ summaries_seen: next }).eq("id", meeting.id);
    }
    onArchived();
  };

  if (!meeting) {
    return <div className="px-5 pt-6 pb-28 text-[#888]">Loading…</div>;
  }

  return (
    <div className="px-5 pt-6 pb-28">
      {!forceMarkSeen && <button onClick={onBack} className="text-[#00E5FF] text-sm mb-3 tap-scale">← Back</button>}
      <h1 className="text-2xl font-bold text-white">{meeting.event_name}</h1>
      <p className="text-sm text-[#888]">{meeting.date ? new Date(meeting.date).toLocaleDateString() : ""}</p>

      {meeting.status === "active" && isCreator && (
        <button onClick={() => setConfirmEnd(true)} className="mt-3 w-full py-2.5 rounded-xl bg-[#E74C3C] text-white font-semibold tap-scale">End Event</button>
      )}

      <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#1A1AFF] to-[#00E5FF] p-5 text-center">
        <p className="text-white/80 text-xs uppercase tracking-wider">Total Spending</p>
        <p className="text-white text-3xl font-bold mt-1">{fmt(total)}</p>
      </div>

      <h3 className="mt-6 text-xs uppercase tracking-wider text-[#888] mb-2">Per Member Breakdown</h3>
      <div className="space-y-2">
        {perMember.map(({ m, personal, split, total }) => {
          let badge = "Fair Share"; let color = "#00E5FF";
          if (total > avg + 0.01) { badge = "Most Generous 🏅"; color = "#00FF88"; }
          else if (total < avg - 0.01) { badge = "Light Spender"; color = "#888"; }
          return (
            <div key={m.id} className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-3 flex items-center gap-3">
              <Avatar choice={m.avatar_choice} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-[#888]">Personal {fmt(personal)} · Split {fmt(split)}</p>
                <p className="text-[10px] mt-0.5 font-semibold" style={{ color }}>{badge}</p>
              </div>
              <p className="text-white font-bold text-sm">{fmt(total)}</p>
            </div>
          );
        })}
      </div>

      <h3 className="mt-6 text-xs uppercase tracking-wider text-[#888] mb-2">Who Owes What</h3>
      <div className="space-y-2">
        {eventMembers.map(m => {
          const b = balances[m.id] ?? 0;
          let label = "all settled"; let color = "#888";
          if (b > 0.01) { label = "gets back"; color = "#00FF88"; }
          else if (b < -0.01) { label = "owes"; color = "#E74C3C"; }
          return (
            <div key={m.id} className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-3 flex items-center justify-between">
              <span className="text-white text-sm">{m.name}</span>
              <span className="text-sm font-bold" style={{ color }}>{label} {fmt(Math.abs(b))}</span>
            </div>
          );
        })}
      </div>

      <h3 className="mt-6 text-xs uppercase tracking-wider text-[#888] mb-2">Shared Expenses</h3>
      <div className="space-y-2">
        {list.filter(e => e.expense_type === "split").map(e => (
          <div key={e.id} className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-3 flex justify-between">
            <span className="text-white text-sm">{e.name}</span>
            <span className="text-[#00E5FF] font-bold text-sm">{fmt(e.amount)}</span>
          </div>
        ))}
        {list.filter(e => e.expense_type === "split").length === 0 && <p className="text-xs text-[#888]">None</p>}
      </div>

      <h3 className="mt-6 text-xs uppercase tracking-wider text-[#888] mb-2">Personal Expenses</h3>
      <div className="space-y-2">
        {list.filter(e => e.expense_type === "personal").map(e => {
          const who = members.find(x => x.id === e.paid_by)?.name ?? "Member";
          return (
            <div key={e.id} className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-3 flex justify-between">
              <span className="text-white text-sm">{e.name} <span className="text-[#888] text-xs">· {who}</span></span>
              <span className="text-[#00E5FF] font-bold text-sm">{fmt(e.amount)}</span>
            </div>
          );
        })}
        {list.filter(e => e.expense_type === "personal").length === 0 && <p className="text-xs text-[#888]">None</p>}
      </div>

      {meeting.status === "ended" && (
        <button onClick={closeAndMarkSeen} className="mt-6 w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale flex items-center justify-center gap-2">
          <Check size={16} /> Close Summary
        </button>
      )}

      {confirmEnd && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirmEnd(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-[#1E1E3F] border border-[#2a2a4a] p-5">
            <p className="text-white">End this event and view summary?</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmEnd(false)} className="flex-1 py-2 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white tap-scale">Cancel</button>
              <button onClick={endMeeting} disabled={busy} className="flex-1 py-2 rounded-xl bg-[#E74C3C] text-white font-semibold tap-scale disabled:opacity-60">End Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PastMeetings({ meetings, expenses, onClose, onView }: { meetings: Meeting[]; expenses: Expense[]; onClose: () => void; onView: (id: string) => void }) {
  return (
    <Modal onClose={onClose} title="Past Events">
      {meetings.length === 0 ? (
        <p className="text-[#888] text-sm text-center py-6">No past events yet</p>
      ) : (
        <div className="space-y-2">
          {meetings.map(m => {
            const count = expenses.filter(e => e.meeting_id === m.id).length;
            return (
              <button key={m.id} onClick={() => onView(m.id)}
                className="w-full text-left rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] p-3 tap-scale">
                <p className="text-white font-medium">{m.event_name}</p>
                <p className="text-xs text-[#888]">{m.date ? new Date(m.date).toLocaleDateString() : ""} · {count} expenses</p>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md mx-auto bg-[#0D0D2B] border-t sm:border border-[#2a2a4a] rounded-t-3xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="tap-scale"><X className="text-white" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
