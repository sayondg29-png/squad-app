import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, message, action }: {
  icon: LucideIcon; title: string; message: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-3xl border border-dashed border-border/60 gradient-card float-in">
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-4">
        <Icon className="text-white" size={28} />
      </div>
      <h3 className="font-display font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
