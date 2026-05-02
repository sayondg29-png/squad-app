import { useRef } from "react";
import { useSquad } from "../context/SquadContext";
import { Avatar } from "../components/Avatar";
import { AboutDialog } from "../components/AboutDialog";
import { Camera, LogOut, Shield, Bell, Users, Trash2, Info, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export function ProfileScreen() {
  const { members, meId, setMyAvatar, squadName } = useSquad();
  const me = members.find(m => m.id === meId)!;
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) { toast.error("Please pick a JPG or PNG"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => { setMyAvatar(reader.result as string); toast.success("Profile photo updated"); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 float-in">
      <section className="relative overflow-hidden rounded-3xl gradient-card border border-border p-6 text-center shadow-card">
        <div className="absolute inset-x-0 -top-16 h-32 gradient-primary opacity-30 blur-3xl" />
        <div className="relative inline-block">
          <Avatar member={me} size={128} ring />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Upload profile photo"
            className="absolute bottom-1 right-1 w-10 h-10 rounded-full gradient-primary text-white shadow-glow flex items-center justify-center tap-scale hover:scale-110 transition-transform"
          >
            <Camera size={18} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={e => onPick(e.target.files?.[0] || undefined)}
          />
        </div>
        <h2 className="font-display text-xl font-bold mt-4">{me.name}</h2>
        <p className="text-xs text-muted-foreground mt-1">Member of {squadName}</p>
        {me.avatarDataUrl && (
          <button
            onClick={() => { setMyAvatar(undefined); toast.success("Photo removed"); }}
            className="mt-3 inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 tap-scale"
          >
            <Trash2 size={12} /> Remove photo
          </button>
        )}
      </section>

      <section className="rounded-3xl border border-border gradient-card overflow-hidden">
        <Row icon={Users} label="Squad members" value={String(members.length)} />
        <Row icon={Bell} label="Notifications" value="On" />
        <Row icon={Shield} label="Privacy" value="Location: opt-in" />
        <AboutDialog
          trigger={
            <button className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/60 transition-colors border-b border-border/60 text-left">
              <span className="w-9 h-9 rounded-xl bg-secondary text-accent flex items-center justify-center"><Info size={16} /></span>
              <span className="flex-1 text-sm font-medium">About Squad</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          }
        />
        <button className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/60 transition-colors text-destructive font-semibold">
          <LogOut size={18} /> Leave Squad
        </button>
      </section>

      <p className="text-center text-[11px] text-muted-foreground">
        Squad v1.0 · Made by <span className="font-semibold text-foreground">Sayon Das Gupta</span> · CSE @ CUET
      </p>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-border/60 last:border-0">
      <span className="w-9 h-9 rounded-xl bg-secondary text-accent flex items-center justify-center"><Icon size={16} /></span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  );
}
