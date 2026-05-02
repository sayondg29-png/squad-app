import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Member, StatusKind } from "../lib/types";
import { useSquad } from "../context/SquadContext";
import { CheckCircle2, Navigation, Clock, XCircle, Pencil } from "lucide-react";

const opts: { kind: StatusKind; label: string; cls: string; Icon: typeof CheckCircle2 }[] = [
  { kind: "here", label: "I'm Here", cls: "border-success/50 hover:bg-success/10", Icon: CheckCircle2 },
  { kind: "otw", label: "On My Way", cls: "border-info/50 hover:bg-info/10", Icon: Navigation },
  { kind: "late", label: "Running Late", cls: "border-warning/50 hover:bg-warning/10", Icon: Clock },
  { kind: "not_coming", label: "Not Coming", cls: "border-destructive/50 hover:bg-destructive/10", Icon: XCircle },
];

export function StatusPicker({ member, trigger }: { member: Member; trigger?: React.ReactNode }) {
  const { setStatus } = useSquad();
  const [open, setOpen] = useState(false);
  const [eta, setEta] = useState(member.status.etaMinutes ?? 10);

  const choose = (kind: StatusKind) => {
    setStatus(member.id, { kind, etaMinutes: kind === "otw" ? eta : undefined, updatedAt: Date.now() });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button className="text-xs inline-flex items-center gap-1 text-accent hover:text-accent/80 tap-scale font-semibold">
            <Pencil size={12} /> Update
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Set status for {member.isMe ? "you" : member.name.split(" ")[0]}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {opts.map(({ kind, label, cls, Icon }) => (
            <button
              key={kind}
              onClick={() => choose(kind)}
              className={`rounded-2xl border bg-secondary/50 p-4 text-left tap-scale transition-colors ${cls}`}
            >
              <Icon size={20} className="mb-2" />
              <div className="font-semibold text-sm">{label}</div>
            </button>
          ))}
        </div>
        <div className="mt-2">
          <label className="text-xs text-muted-foreground">ETA (min) — for "On My Way"</label>
          <Input type="number" min={1} value={eta} onChange={e => setEta(Number(e.target.value) || 0)} className="mt-1" />
        </div>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </DialogContent>
    </Dialog>
  );
}
