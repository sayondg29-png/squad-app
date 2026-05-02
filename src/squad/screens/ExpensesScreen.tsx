import { useMemo, useState } from "react";
import { useBalances, useSquad } from "../context/SquadContext";
import { Avatar } from "../components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "../components/EmptyState";
import { fmtMoney, timeAgo } from "../lib/format";
import { Receipt, Plus, ArrowRight, Wallet } from "lucide-react";
import { toast } from "sonner";

export function ExpensesScreen({ openAddOnMount }: { openAddOnMount?: boolean }) {
  const { members, expenses, meId } = useSquad();
  const { net, debts } = useBalances();
  const memberById = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);

  return (
    <div className="space-y-6 float-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Expenses</h2>
          <p className="text-xs text-muted-foreground">Split it. Track it. Settle it.</p>
        </div>
        <AddExpenseDialog defaultOpen={openAddOnMount} />
      </div>

      {/* Balances */}
      <section>
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Wallet size={16} className="text-accent" /> Balances</h3>
        <div className="space-y-2">
          {members.map(m => {
            const v = net[m.id] || 0;
            const positive = v > 0.01, negative = v < -0.01;
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border gradient-card p-3">
                <Avatar member={m} size={38} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {positive ? "is owed" : negative ? "owes" : "all settled"}
                  </p>
                </div>
                <span className={`font-display font-bold tabular-nums ${positive ? "text-success" : negative ? "text-destructive" : "text-muted-foreground"}`}>
                  {positive ? "+" : negative ? "−" : ""}{fmtMoney(Math.abs(v))}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Debts */}
      {debts.length > 0 && (
        <section>
          <h3 className="font-display font-semibold mb-3">Who pays who</h3>
          <div className="space-y-2">
            {debts.map((d, i) => <DebtRow key={i} debt={d} />)}
          </div>
        </section>
      )}

      {/* Expense list */}
      <section>
        <h3 className="font-display font-semibold mb-3">Recent expenses</h3>
        {expenses.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses yet" message="Add the first one and start splitting." />
        ) : (
          <div className="space-y-2">
            {expenses.map(e => {
              const payer = memberById[e.paidBy];
              return (
                <div key={e.id} className="rounded-2xl border border-border gradient-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {payer?.name.split(" ")[0]} paid · split {e.splitWith.length} ways · {timeAgo(e.createdAt)}
                      </p>
                    </div>
                    <span className="font-display font-bold text-lg">{fmtMoney(e.amount)}</span>
                  </div>
                  <div className="mt-3 flex items-center -space-x-2">
                    {e.splitWith.slice(0, 6).map(id => memberById[id] && (
                      <Avatar key={id} member={memberById[id]} size={24} className="ring-2 ring-card" />
                    ))}
                    {e.splitWith.length > 6 && (
                      <span className="ml-3 text-xs text-muted-foreground">+{e.splitWith.length - 6}</span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">{fmtMoney(e.amount / e.splitWith.length)} each</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function DebtRow({ debt }: { debt: { fromId: string; toId: string; amount: number } }) {
  const { members, settle } = useSquad();
  const from = members.find(m => m.id === debt.fromId)!;
  const to = members.find(m => m.id === debt.toId)!;
  return (
    <div className="rounded-2xl border border-border gradient-card p-3 flex items-center gap-3">
      <Avatar member={from} size={32} />
      <ArrowRight size={14} className="text-muted-foreground" />
      <Avatar member={to} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{from.name.split(" ")[0]}</span>{" "}
          owes <span className="font-semibold">{to.name.split(" ")[0]}</span>
        </p>
        <p className="text-destructive font-display font-bold tabular-nums">{fmtMoney(debt.amount)}</p>
      </div>
      <Button
        size="sm"
        className="gradient-primary text-white shadow-glow border-0 hover:opacity-90"
        onClick={() => { settle(debt.fromId, debt.toId, debt.amount); toast.success("Marked as settled"); }}
      >
        Settle Up
      </Button>
    </div>
  );
}

function AddExpenseDialog({ defaultOpen }: { defaultOpen?: boolean }) {
  const { members, addExpense, meId } = useSquad();
  const [open, setOpen] = useState(!!defaultOpen);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(meId);
  const [splitWith, setSplitWith] = useState<string[]>(members.map(m => m.id));

  const toggle = (id: string) => setSplitWith(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const submit = () => {
    const amt = parseFloat(amount);
    if (!name.trim() || !amt || amt <= 0 || splitWith.length === 0) {
      toast.error("Fill all fields and pick at least one friend"); return;
    }
    addExpense({ name: name.trim(), amount: amt, paidBy, splitWith });
    toast.success("Expense added");
    setName(""); setAmount(""); setSplitWith(members.map(m => m.id)); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-white border-0 shadow-glow hover:opacity-90">
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">New Expense</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ex-name">Expense name</Label>
            <Input id="ex-name" value={name} onChange={e => setName(e.target.value)} placeholder="Pizza, Uber, Drinks…" />
          </div>
          <div>
            <Label htmlFor="ex-amt">Total amount ($)</Label>
            <Input id="ex-amt" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Who paid?</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Split with</Label>
            <div className="mt-2 grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {members.map(m => (
                <label key={m.id} className="flex items-center gap-3 p-2 rounded-xl border border-border hover:border-accent/50 transition-colors cursor-pointer">
                  <Checkbox checked={splitWith.includes(m.id)} onCheckedChange={() => toggle(m.id)} />
                  <Avatar member={m} size={28} />
                  <span className="text-sm font-medium">{m.name}</span>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={submit} className="w-full gradient-primary text-white border-0 shadow-glow hover:opacity-90">Add expense</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
