export const AVATARS = [
  { color: "#E74C3C", emoji: "🔥" },
  { color: "#F39C12", emoji: "⚡" },
  { color: "#F1C40F", emoji: "🌟" },
  { color: "#00FF88", emoji: "🌿" },
  { color: "#1ABC9C", emoji: "🌊" },
  { color: "#1A1AFF", emoji: "🚀" },
  { color: "#9B59B6", emoji: "🌙" },
  { color: "#FF4FA3", emoji: "💖" },
] as const;

export function getAvatar(choice: string | null | undefined) {
  const i = Number(choice ?? 0);
  return AVATARS[i] ?? AVATARS[0];
}
