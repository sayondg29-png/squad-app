import { Home, Receipt, Trophy, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "home" | "expenses" | "late" | "map" | "profile";
const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "late", label: "Late", icon: Trophy },
  { id: "map", label: "Map", icon: MapPin },
  { id: "profile", label: "Profile", icon: User },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30">
      <div className="max-w-md mx-auto px-3 pb-3 pt-2">
        <div className="bg-[#1a1a3a]/95 backdrop-blur border border-[#2a2a4a] rounded-3xl flex items-center justify-around px-2 py-2">
          {TABS.map(({ id, label, icon: Icon }) => {
            const a = id === active;
            return (
              <button key={id} onClick={() => onChange(id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 tap-scale">
                <Icon size={20} className={cn(a ? "text-[#1A1AFF]" : "text-[#888]")} />
                <span className={cn("text-[10px] font-medium", a ? "text-[#1A1AFF]" : "text-[#888]")}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
