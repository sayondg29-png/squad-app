import { useSquad } from "../context/SquadContext";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { MapPin, ShieldOff, Navigation } from "lucide-react";
import { useState } from "react";

export function MapScreen() {
  const { members } = useSquad();
  const [sharing, setSharing] = useState(true);

  // Pseudo-random but stable positions
  const positioned = members.map((m, i) => {
    const seed = m.id.charCodeAt(2) || i;
    const x = 15 + ((seed * 37) % 70);
    const y = 18 + ((seed * 53) % 60);
    return { m, x, y };
  });

  return (
    <div className="space-y-5 float-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Live Map</h2>
          <p className="text-xs text-muted-foreground">{sharing ? "Sharing your location" : "Location sharing paused"}</p>
        </div>
        <button
          onClick={() => setSharing(s => !s)}
          className={`text-xs font-semibold px-3 py-2 rounded-xl border tap-scale transition-colors ${sharing ? "border-destructive/50 text-destructive hover:bg-destructive/10" : "border-success/50 text-success hover:bg-success/10"}`}
        >
          <span className="inline-flex items-center gap-1.5">
            {sharing ? <><ShieldOff size={14}/> Stop Sharing</> : <><Navigation size={14}/> Share Location</>}
          </span>
        </button>
      </div>

      {/* Map canvas */}
      <div className="relative aspect-square rounded-3xl overflow-hidden border border-border shadow-card"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)/0.4) 1px, transparent 1px),linear-gradient(90deg,hsl(var(--border)/0.4) 1px, transparent 1px),radial-gradient(circle at 30% 20%,hsl(var(--primary)/0.25),transparent 60%),radial-gradient(circle at 75% 80%,hsl(var(--accent)/0.2),transparent 55%)",
          backgroundSize: "32px 32px, 32px 32px, 100% 100%, 100% 100%",
          backgroundColor: "hsl(var(--card))",
        }}>
        {/* Center marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full gradient-primary pulse-ring" />
          <span className="absolute mt-12 text-[10px] uppercase tracking-widest text-accent font-bold">Meetup</span>
        </div>
        {positioned.map(({ m, x, y }) => (
          <div key={m.id} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${x}%`, top: `${y}%` }}>
            <Avatar member={m} size={36} ring={m.isMe} />
            <span className="mt-1 text-[10px] font-semibold bg-background/80 backdrop-blur px-1.5 py-0.5 rounded">
              {m.name.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border gradient-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><MapPin size={16} className="text-accent" /> Nearby squad</div>
        <div className="mt-3 space-y-2">
          {members.filter(m => m.status.kind !== "not_coming").map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar member={m} size={32} />
              <span className="text-sm font-medium flex-1 truncate">{m.name}</span>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
