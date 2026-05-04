import { useApp } from "../lib/AppContext";
import { Plus, Link2 } from "lucide-react";

export function WelcomeScreen({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const { profile } = useApp();
  const cards = [
    { e: "📍", t: "Live Location" },
    { e: "💸", t: "Expense Splitter" },
    { e: "🏆", t: "Late-O-Meter" },
    { e: "✅", t: "Check-In" },
  ];
  return (
    <div className="min-h-dvh max-w-md mx-auto px-6 py-10 bg-[#0D0D2B]">
      <h1 className="text-3xl font-bold text-white leading-tight">Hey {profile?.name},<br/>Welcome to Squad!</h1>
      <div className="mt-8 grid grid-cols-2 gap-3">
        {cards.map(c => (
          <div key={c.t} className="rounded-2xl bg-[#1a1a3a] border border-[#2a2a4a] p-4 text-center">
            <div className="text-3xl">{c.e}</div>
            <p className="mt-2 text-sm text-white font-medium">{c.t}</p>
          </div>
        ))}
      </div>
      <h3 className="mt-10 text-white font-semibold text-lg">Ready to get started?</h3>
      <div className="mt-4 space-y-3">
        <button onClick={onCreate} className="w-full py-4 rounded-2xl bg-[#1A1AFF] text-white font-semibold tap-scale flex items-center justify-center gap-2">
          <Plus size={20} /> Create a Squad
        </button>
        <button onClick={onJoin} className="w-full py-4 rounded-2xl bg-transparent border-2 border-[#1A1AFF] text-[#1A1AFF] font-semibold tap-scale flex items-center justify-center gap-2">
          <Link2 size={20} /> Join a Squad
        </button>
      </div>
    </div>
  );
}
