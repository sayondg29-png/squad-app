import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info, Sparkles, MapPin, Wallet, Clock, GraduationCap, Code2, Heart } from "lucide-react";

export function AboutDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Info size={18} className="text-accent" /> About Squad
          </DialogTitle>
        </DialogHeader>

        <section className="relative overflow-hidden rounded-2xl gradient-card border border-border p-5">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-wider">
              <Sparkles size={12} /> Tonight's Squad
            </div>
            <h3 className="font-display text-2xl font-bold mt-1">Squad</h3>
            <p className="text-xs text-muted-foreground mt-1 italic">
              Know where they are. Know who owes what.
            </p>
            <p className="text-sm mt-3 leading-relaxed">
              Squad is your group's command center — a mix between a group chat and a live hangout planner. Stop the "where are you?" texts and the awkward "who paid for the pizza?" math.
            </p>
          </div>
        </section>

        <div>
          <h4 className="font-display font-semibold text-sm mb-2 px-1">What it does</h4>
          <div className="space-y-2">
            <Feature icon={MapPin} title="Live status & map" desc="See who's here, on the way, or running late — at a glance." />
            <Feature icon={Wallet} title="Split expenses" desc="Track who paid and settle up with one tap." />
            <Feature icon={Clock} title="Late-O-Meter" desc="A friendly leaderboard for chronically late friends." />
          </div>
        </div>

        <section className="rounded-2xl border border-accent/30 bg-gradient-to-br from-primary/10 to-accent/5 p-5">
          <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-wider mb-3">
            <Code2 size={12} /> Built by
          </div>
          <h3 className="font-display text-xl font-bold">Sayon Das Gupta</h3>
          <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <GraduationCap size={14} className="mt-0.5 text-accent shrink-0" />
              <span>CSE Student at <span className="text-foreground font-semibold">CUET</span> (Chittagong University of Engineering & Technology)</span>
            </p>
            <p className="flex items-start gap-2">
              <Heart size={14} className="mt-0.5 text-accent shrink-0" />
              <span>Crafted with care for friends who are always 5 minutes away.</span>
            </p>
          </div>
        </section>

        <p className="text-center text-[11px] text-muted-foreground pt-1">
          Squad v1.0 · Made with 💙 in Bangladesh
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-3">
      <span className="w-9 h-9 rounded-xl gradient-primary text-white shadow-glow flex items-center justify-center shrink-0">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
