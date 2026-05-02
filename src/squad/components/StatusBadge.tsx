import type { SquadStatus } from "../lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, Navigation, Clock, XCircle, CircleDashed } from "lucide-react";

const map = {
  here:       { label: "I'm Here",     cls: "bg-success/15 text-success border-success/30",       Icon: CheckCircle2 },
  otw:        { label: "On My Way",    cls: "bg-info/15 text-info border-info/30",                Icon: Navigation },
  late:       { label: "Running Late", cls: "bg-warning/15 text-warning border-warning/30",       Icon: Clock },
  not_coming: { label: "Not Coming",   cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
  idle:       { label: "No status",    cls: "bg-muted text-muted-foreground border-border",       Icon: CircleDashed },
} as const;

export function StatusBadge({ status, className }: { status: SquadStatus; className?: string }) {
  const m = map[status.kind];
  const Icon = m.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", m.cls, className)}>
      <Icon size={13} />
      {m.label}
      {status.kind === "otw" && status.etaMinutes ? ` · ${status.etaMinutes}m` : ""}
    </span>
  );
}
