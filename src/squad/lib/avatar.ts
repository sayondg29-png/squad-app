const palette = [
  "240 100% 60%", "187 100% 50%", "320 90% 60%", "28 100% 58%",
  "142 70% 50%", "265 90% 65%", "12 95% 60%", "190 80% 55%",
  "60 95% 55%", "0 85% 60%",
];

export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${palette[h % palette.length]})`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
