import { useMemo, useState } from "react";
import { useSquad } from "../context/SquadContext";
import { Avatar } from "../components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "../components/EmptyState";
import { Trophy, Crown, Clock, Flame } from "lucide-react";
import { toast } from "sonner";

function badgeFor(totalMin: number, count: number): { label: string; cls: string } {
  if (count === 0) return { label: "Always On Time", cls: "bg-success/15 text-success border-success/30" };
  if (totalMin >= 60) return { label: "Chronically Late", cls: "bg-destructive/15 text-destructive border-destructive/30" };
  if (totalMin >= 30) return { label: "Frequent Flyer", cls: "bg-warning/15 text-warning border-warning/30" };
  return { label: "Occasionally Tardy", cls: "bg-info/15 text-info border-info/30" };
}

export function LateScreen() {
  const { members, lateLogs } = useSquad();
  const [tab, setTab] = useState("board");

  const ranking = useMemo(() => {
    const totals = new Map<string, { total: number; count: number }>();
    members.forEach(m => totals.set(m.id, { total: 0, count: 0 }));
    lateLogs.forEach(l => {
      const t = totals.get(l.memberId)!;
      t.total += l.minutes; t.count += 1;
    });
    return members
      .map(m => ({ m, ...(totals.get(m.id) || { total: 0, count: 0 }) }))
      .sort((a, b) => b.total - a.total);
  }, [members, lateLogs]);

  return (
    <div className="space-y-5 float-in">
      <div>
        <h2 className="font-display text-xl font-bold">Late-O-Meter</h2>
        <p className="text-xs text-muted-foreground">Friendly accountability. Mostly friendly.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 w-full bg-secondary border border-border rounded-2xl">
          <TabsTrigger value="board" className="rounded-xl data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow">
            <Trophy size={14} className="mr-1.5" /> Leaderboard
          </TabsTrigger>
          <TabsTrigger value="log" className="rounded-xl data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow">
            <Clock size={14} className="mr-1.5" /> Log Late
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4 space-y-2">
          {ranking.every(r => r.total === 0) ? (
            <EmptyState icon={Trophy} title="Squeaky clean" message="No late incidents yet. Log one to start the leaderboard." />
          ) : ranking.map(({ m, total, count }, i) => {
            const b = badgeFor(total, count);
            const isTop = i === 0 && total > 0;
            return (
              <div key={m.id} className={`flex items-center gap-3 rounded-2xl border p-3 gradient-card ${isTop ? "border-accent/50 shadow-cyan" : "border-border"}`}>
                <div className="w-7 text-center font-display font-bold text-muted-foreground">
                  {isTop ? <Crown className="text-accent mx-auto" size={20} /> : `#${i + 1}`}
                </div>
                <Avatar member={m} size={42} ring={isTop} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{m.name}</p>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${b.cls}`}>
                    {isTop && <Flame size={10} />} {b.label}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold tabular-nums">{total}m</p>
                  <p className="text-[10px] text-muted-foreground">{count} {count === 1 ? "log" : "logs"}</p>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <LogLateForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LogLateForm() {
  const { members, addLateLog } = useSquad();
  const [memberId, setMemberId] = useState(members[1]?.id ?? members[0].id);
  const [minutes, setMinutes] = useState("15");
  const [event, setEvent] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    const min = parseInt(minutes, 10);
    if (!min || min <= 0 || !event.trim()) { toast.error("Add minutes and event name"); return; }
    addLateLog({ memberId, minutes: min, event: event.trim(), note: note.trim() || undefined });
    toast.success("Logged. The leaderboard remembers.");
    setMinutes("15"); setEvent(""); setNote("");
  };

  return (
    <div className="space-y-4 rounded-3xl border border-border gradient-card p-5">
      <div>
        <Label>Who was late?</Label>
        <Select value={memberId} onValueChange={setMemberId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="late-min">How many minutes late?</Label>
        <Input id="late-min" type="number" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="late-event">Event</Label>
        <Input id="late-event" value={event} onChange={e => setEvent(e.target.value)} placeholder="Brunch, Movie, Game Night…" />
      </div>
      <div>
        <Label htmlFor="late-note">Funny note (optional)</Label>
        <Textarea id="late-note" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Said 'leaving in 5'…" />
      </div>
      <Button onClick={submit} className="w-full gradient-primary text-white border-0 shadow-glow hover:opacity-90">
        Submit
      </Button>
    </div>
  );
}
