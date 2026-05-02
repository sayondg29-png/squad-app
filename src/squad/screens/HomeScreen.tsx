import { useSquad } from "../context/SquadContext";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { StatusPicker } from "../components/StatusPicker";
import { timeAgo } from "../lib/format";
import { Sparkles, Users, Zap } from "lucide-react";

export function HomeScreen() {
  const { members, meId, squadName } = useSquad();
  const me = members.find(m => m.id === meId)!;
  const here = members.filter(m => m.status.kind === "here").length;
  const otw = members.filter(m => m.status.kind === "otw").length;

  return (
    <div className="space-y-6 float-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl gradient-card border border-border p-6 shadow-card">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
            <Sparkles size={14} /> Tonight's Squad
          </div>
          <h2 className="font-display text-2xl font-bold mt-1">{squadName}</h2>
          <p className="text-sm text-muted-foreground mt-1">{members.length} members · {here} here · {otw} on the way</p>

          <div className="mt-5 flex items-center gap-3 p-3 rounded-2xl bg-background/40 border border-border/60">
            <Avatar member={me} size={48} ring />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Your status</p>
              <div className="mt-1"><StatusBadge status={me.status} /></div>
            </div>
            <StatusPicker
              member={me}
              trigger={<button className="text-xs px-3 py-2 rounded-xl gradient-primary text-white font-semibold tap-scale shadow-glow">Update</button>}
            />
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Squad size" value={String(members.length)} accent />
        <StatCard icon={Zap} label="Live now" value={`${here + otw}`} />
      </div>

      {/* Members */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Squad members</h3>
          <span className="text-xs text-muted-foreground">Live status</span>
        </div>
        <div className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl gradient-card border border-border shadow-card hover:border-accent/40 transition-colors tap-scale">
              <Avatar member={m} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{m.name}</p>
                  {m.isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-bold uppercase">You</span>}
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <StatusBadge status={m.status} />
                  <span className="text-[11px] text-muted-foreground">{timeAgo(m.status.updatedAt)}</span>
                </div>
                {m.status.note && (
                  <p className="mt-1.5 text-xs text-foreground/80 italic line-clamp-2">"{m.status.note}"</p>
                )}
              </div>
              <StatusPicker member={m} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border gradient-card p-4 shadow-card">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? "gradient-primary text-white shadow-glow" : "bg-secondary text-accent"}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-display font-bold mt-3">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
