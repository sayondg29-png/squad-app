import { useState, ReactNode } from "react";
import { Home, MapIcon, Receipt, Trophy, User, Bell, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSquad } from "../context/SquadContext";

export type ScreenId = "home" | "map" | "expenses" | "late" | "profile";

const TABS: { id: ScreenId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "late", label: "Late-O-Meter", icon: Trophy },
  { id: "profile", label: "Profile", icon: User },
];

export function AppShell({
  active, onChange, onFab, children,
}: {
  active: ScreenId;
  onChange: (s: ScreenId) => void;
  onFab?: () => void;
  children: ReactNode;
}) {
  const { squadName } = useSquad();
  return (
    <div className="min-h-dvh max-w-md mx-auto relative pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/60">
        <div className="flex items-center justify-between px-5 h-16">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Squad</p>
            <h1 className="font-display font-semibold leading-tight truncate max-w-[220px]">{squadName}</h1>
          </div>
          <button className="relative w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center tap-scale hover:border-accent/50 transition-colors" aria-label="Notifications">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent shadow-cyan" />
          </button>
        </div>
      </header>

      <main className="px-5 pt-5">{children}</main>

      {/* FAB */}
      {onFab && (
        <button
          onClick={onFab}
          aria-label="Quick add"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-14 h-14 rounded-full gradient-primary shadow-glow flex items-center justify-center text-white tap-scale hover:scale-105 transition-transform"
          style={{ marginLeft: "min(0px, calc((100vw - 28rem) / -2))" }}
        >
          <Plus size={26} />
        </button>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-md mx-auto px-3 pb-3 pt-2 pointer-events-auto">
          <div className="glass border border-border/60 rounded-3xl shadow-card flex items-center justify-around px-2 py-2">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = id === active;
              return (
                <button
                  key={id}
                  onClick={() => onChange(id)}
                  className="relative flex-1 flex flex-col items-center gap-0.5 py-2 tap-scale group"
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-2xl transition-all",
                      isActive ? "gradient-primary shadow-glow text-white" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <Icon size={isActive ? 20 : 19} />
                  </span>
                  <span className={cn("text-[10px] font-medium leading-none transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
