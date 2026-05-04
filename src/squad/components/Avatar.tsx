import { getAvatar } from "../lib/avatars";

export function Avatar({ choice, size = 40 }: { choice: string | null | undefined; size?: number }) {
  const av = getAvatar(choice);
  return (
    <div className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: av.color, fontSize: size * 0.55 }}>
      {av.emoji}
    </div>
  );
}
