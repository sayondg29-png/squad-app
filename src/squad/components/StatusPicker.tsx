import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Member, StatusKind } from "../lib/types";
import { useSquad } from "../context/SquadContext";
import { CheckCircle2, Navigation, Clock, XCircle, Pencil } from "lucide-react";

const opts: { kind: StatusKind; label: string; cls: string; Icon: typeof CheckCircle2 }[] = [
  { kind: "here", label: "I'm Here", cls: "border-success/50 hover:bg-success/10", Icon: CheckCircle2 },
  { kind: "otw", label: "On My Way", cls: "border-info/50 hover:bg-info/10", Icon: Navigation },
  { kind: "late", label: "Running Late", cls: "border-warning/50 hover:bg-warning/10", Icon: Clock },
  { kind: "not_coming", label: "Not Coming", cls: "border-destructive/50 hover:bg-destructive/10", Icon: XCircle },
];

const quickNotes: Record<StatusKind, string[]> = {
  here: ["At the spot 🎉", "Grabbing a table", "Out front"],
  otw: ["Just left", "Parking now", "5 min away"],
  late: ["Stuck in traffic 🚗", "Running 15 late", "Sorry — almost out the door"],
  not_coming: ["Something came up", "Not feeling well", "Rain check 🙏"],
  idle: [],
};

export function StatusPicker({ member, trigger }: { member: Member; trigger?: React.ReactNode }) {
  const { setStatus } = useSquad();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<StatusKind>(member.status.kind === "idle" ? "otw" : member.status.kind);
  const [eta, setEta] = useState(member.status.etaMinutes ?? 10);
  const [note, setNote] = useState(member.status.note ?? "");

  const submit = () => {
    setStatus(member.id, {
      kind: selected,
      etaMinutes: selected === "otw" ? eta : undefined,
      note: note.trim() || undefined,
      updatedAt: Date.now(),
    });
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
              onClick={() => setSelected(kind)}
              className={`rounded-2xl border p-4 text-left tap-scale transition-colors ${cls} ${selected === kind ? "bg-secondary ring-2 ring-accent/60" : "bg-secondary/50"}`}
            >
              <Icon size={20} className="mb-2" />
              <div className="font-semibold text-sm">{label}</div>
            </button>
          ))}
        </div>
        {selected === "otw" && (
          <div className="mt-1">
            <label className="text-xs text-muted-foreground">ETA (minutes)</label>
            <Input type="number" min={1} value={eta} onChange={e => setEta(Number(e.target.value) || 0)} className="mt-1" />
          </div>
        )}
        <div className="mt-1">
          <label className="text-xs text-muted-foreground">Add a note (optional)</label>
          <Textarea
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 140))}
            placeholder="Stuck in traffic, grabbing snacks…"
            className="mt-1 resize-none"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickNotes[selected]?.map(q => (
              <button
                key={q}
                type="button"
                onClick={() => setNote(q)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-secondary/60 hover:border-accent/50 hover:text-accent tap-scale"
              >
                {q}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground text-right">{note.length}/140</p>
        </div>
        <div className="flex gap-2 mt-1">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="flex-1 gradient-primary text-white border-0 shadow-glow hover:opacity-90">
            Share update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
