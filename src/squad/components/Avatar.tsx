import { initialsOf } from "../lib/avatar";
import type { Member } from "../lib/types";
import { cn } from "@/lib/utils";

interface Props {
  member: Pick<Member, "name" | "color" | "avatarDataUrl">;
  size?: number;
  className?: string;
  ring?: boolean;
}

export function Avatar({ member, size = 44, className, ring }: Props) {
  const style: React.CSSProperties = {
    width: size, height: size,
    background: member.avatarDataUrl ? undefined : member.color,
    fontSize: Math.round(size * 0.38),
  };
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 overflow-hidden",
        ring && "ring-2 ring-accent ring-offset-2 ring-offset-background",
        className,
      )}
      style={style}
      aria-label={member.name}
    >
      {member.avatarDataUrl
        ? <img src={member.avatarDataUrl} alt={member.name} className="w-full h-full object-cover" />
        : <span>{initialsOf(member.name)}</span>}
    </div>
  );
}
