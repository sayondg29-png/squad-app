import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "../lib/AppContext";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "../components/Avatar";

type Expense = { id: string; name: string; amount: number; paid_by: string; split_with: string[]; created_at: string };

export function ExpensesScreen() {
  const { squad, members, user } = useApp();
  const [list, setList] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!squad) return;
    const { data } = await supabase.from("expenses").select("*").eq("squad_id", squad.id).order("created_at", { ascending: false });
    setList((data as Expense[]) ?? []);
  };
  useEffect(() => { load(); }, [squad?.id]);

  // realtime
  useEffect(() => {
    if (!squad) return;
    const ch = supabase.channel(`exp-${squad.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `squad_id=eq.${squad.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [squad?.id]);

  // balances
  const balances: Record<string, number> = {};
  members.forEach(m => balances[m.id] = 0);
  list.forEach(e => {
    const split = e.split_with.length > 0 ? e.split_with : members.map(m => m.id);
    const each = Number(e.amount) / split.length;
    if (balances[e.paid_by] !== undefined) balances[e.paid_by] += Number(e.amount);
    split.forEach(uid => { if (balances[uid] !== undefined) balances[uid] -= each; });
  });

  if (!squad) return null;
  return (
    <div className="px-5 pt-6 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Expenses</h1>
        <button onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#1A1AFF] text-white text-sm font-semibold tap-scale flex items-center gap-1">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {list.length === 0 ? (
          <div className="rounded-2xl bg-[#1E1E3F] border border-[#2a2a4a] p-8 text-center text-[#888]">
            <div className="text-5xl mb-3">💸</div>
            No expenses yet — add your first one!
          </div>
        ) : list.map(e => {
          const payer = members.find(m => m.id === e.paid_by)?.name ?? "Someone";
          const date = new Date(e.created_at).toLocaleDateString();
          return (
            <div key={e.id} className="rounded-xl bg-[#1E1E3F] border border-[#2a2a4a] p-4 flex justify-between items-center">
              <div>
                <p className="text-white font-medium">{e.name}</p>
                <p className="text-xs text-[#888]">Paid by {payer} · {date}</p>
              </div>
              <p className="text-[#00E5FF] font-bold">${Number(e.amount).toFixed(2)}</p>
            </div>
          );
        })}
      </div>

      <h3 className="mt-8 text-sm text-[#888] uppercase tracking-wider">Who Owes What</h3>
      <div className="mt-3 space-y-2">
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
              <p className="font-bold" style={{ color }}>{b > 0 ? "+" : ""}${Math.abs(b).toFixed(2)}</p>
              {Math.abs(b) > 0.01 && (
                <button onClick={() => toast.success("Marked as settled!")} className="text-xs px-2 py-1 rounded-lg bg-[#1A1AFF] text-white tap-scale">Settle</button>
              )}
            </div>
          );
        })}
      </div>

      {open && <AddExpense onClose={() => setOpen(false)} onSaved={load} />}
    </div>
  );
}

function AddExpense({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { squad, members, user } = useApp();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(user?.id ?? "");
  const [split, setSplit] = useState<string[]>(members.map(m => m.id));
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setSplit(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);

  const save = async () => {
    if (!name.trim() || !amount || !paidBy || split.length === 0 || !squad || !user) {
      toast.error("Fill all fields"); return;
    }
    setBusy(true);
    const { error } = await supabase.from("expenses").insert({
      squad_id: squad.id, name: name.trim(), amount: Number(amount),
      paid_by: paidBy, split_with: split, created_by: user.id,
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="w-full max-w-md mx-auto bg-[#0D0D2B] border-t border-[#2a2a4a] rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Add Expense</h2>
          <button onClick={onClose}><X className="text-white" /></button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Expense name"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
          <input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,""))} inputMode="decimal" placeholder="Total amount"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white placeholder:text-[#888]" />
          <select value={paidBy} onChange={e=>setPaidBy(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a3a] border border-[#2a2a4a] text-white">
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div>
            <p className="text-sm text-[#888] mb-2">Split with</p>
            <div className="space-y-2">
              {members.map(m => (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a1a3a] border border-[#2a2a4a]">
                  <input type="checkbox" checked={split.includes(m.id)} onChange={()=>toggle(m.id)} className="w-4 h-4 accent-[#1A1AFF]" />
                  <span className="text-white">{m.name}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={busy} className="w-full py-3 rounded-xl bg-[#1A1AFF] text-white font-semibold tap-scale disabled:opacity-60 flex items-center justify-center gap-2">
            {busy && <Loader2 size={18} className="animate-spin"/>} Save Expense
          </button>
        </div>
      </div>
    </div>
  );
}
