import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Expense, LateLog, Member, Settlement, SquadStatus } from "../lib/types";
import { colorForName } from "../lib/avatar";

interface SquadState {
  squadName: string;
  members: Member[];
  expenses: Expense[];
  lateLogs: LateLog[];
  settlements: Settlement[];
  meId: string;
  setStatus: (memberId: string, status: SquadStatus) => void;
  setMyAvatar: (dataUrl: string | undefined) => void;
  addExpense: (e: Omit<Expense, "id" | "createdAt">) => void;
  addLateLog: (l: Omit<LateLog, "id" | "createdAt">) => void;
  settle: (fromId: string, toId: string, amount: number) => void;
}

const STORAGE_KEY = "squad-state-v1";

const seedMembers = (): Member[] => {
  const names = ["You (Alex)", "Jordan Lee", "Priya Shah", "Sam Rivera", "Mika Tanaka", "Diego Santos"];
  return names.map((name, i) => ({
    id: `m_${i}`,
    name,
    color: colorForName(name),
    isMe: i === 0,
    status: { kind: i === 0 ? "here" : (["otw", "late", "not_coming", "here", "idle"] as const)[i % 5], etaMinutes: i === 1 ? 12 : undefined, updatedAt: Date.now() - i * 1000 * 60 * 7 },
  }));
};

const seedExpenses = (m: Member[]): Expense[] => [
  { id: "e1", name: "Pizza Night", amount: 48, paidBy: m[1].id, splitWith: [m[0].id, m[1].id, m[2].id, m[3].id], createdAt: Date.now() - 86400000 },
  { id: "e2", name: "Uber to Rooftop", amount: 22.5, paidBy: m[0].id, splitWith: [m[0].id, m[2].id, m[4].id], createdAt: Date.now() - 3600000 * 6 },
];
const seedLate = (m: Member[]): LateLog[] => [
  { id: "l1", memberId: m[3].id, minutes: 35, event: "Brunch", note: "Said 'leaving in 5'", createdAt: Date.now() - 86400000 * 2 },
  { id: "l2", memberId: m[3].id, minutes: 22, event: "Movie", createdAt: Date.now() - 86400000 },
  { id: "l3", memberId: m[2].id, minutes: 8, event: "Coffee", createdAt: Date.now() - 3600000 * 4 },
  { id: "l4", memberId: m[5].id, minutes: 50, event: "Game Night", note: "Got lost", createdAt: Date.now() - 86400000 * 3 },
];

const Ctx = createContext<SquadState | null>(null);

export function SquadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const members = seedMembers();
    return {
      squadName: "The Usual Suspects",
      members,
      expenses: seedExpenses(members),
      lateLogs: seedLate(members),
      settlements: [] as Settlement[],
      meId: members[0].id,
    };
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const value = useMemo<SquadState>(() => ({
    ...state,
    setStatus: (id, status) => setState((s: any) => ({
      ...s,
      members: s.members.map((m: Member) => m.id === id ? { ...m, status: { ...status, updatedAt: Date.now() } } : m),
    })),
    setMyAvatar: (dataUrl) => setState((s: any) => ({
      ...s,
      members: s.members.map((m: Member) => m.id === s.meId ? { ...m, avatarDataUrl: dataUrl } : m),
    })),
    addExpense: (e) => setState((s: any) => ({
      ...s,
      expenses: [{ ...e, id: `e_${Date.now()}`, createdAt: Date.now() }, ...s.expenses],
    })),
    addLateLog: (l) => setState((s: any) => ({
      ...s,
      lateLogs: [{ ...l, id: `l_${Date.now()}`, createdAt: Date.now() }, ...s.lateLogs],
    })),
    settle: (fromId, toId, amount) => setState((s: any) => ({
      ...s,
      settlements: [...s.settlements, { id: `s_${Date.now()}`, fromId, toId, amount, createdAt: Date.now() }],
    })),
  }), [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSquad() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSquad must be used within SquadProvider");
  return v;
}

export function useBalances() {
  const { members, expenses, settlements } = useSquad();
  const net: Record<string, number> = Object.fromEntries(members.map(m => [m.id, 0]));
  for (const e of expenses) {
    const share = e.amount / e.splitWith.length;
    net[e.paidBy] = (net[e.paidBy] || 0) + e.amount;
    for (const id of e.splitWith) net[id] = (net[id] || 0) - share;
  }
  for (const s of settlements) {
    net[s.fromId] += s.amount;
    net[s.toId] -= s.amount;
  }
  // Build simplified pairwise debts: each negative person owes positive people
  const creditors = members.filter(m => (net[m.id] || 0) > 0.01).map(m => ({ id: m.id, amt: net[m.id] }));
  const debtors = members.filter(m => (net[m.id] || 0) < -0.01).map(m => ({ id: m.id, amt: -net[m.id] }));
  const debts: { fromId: string; toId: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    debts.push({ fromId: debtors[i].id, toId: creditors[j].id, amount: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  return { net, debts };
}
