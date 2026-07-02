function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const COLORS = [
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#D97706",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#65A30D",
];

function generatePattern(
  hash: number
): { cells: boolean[]; primaryColor: string; secondaryColor: string } {
  const primaryColor = COLORS[hash % COLORS.length];
  const secondaryColor = COLORS[(hash + 3) % COLORS.length];
  const cells: boolean[] = [];
  const seed = hash;
  for (let i = 0; i < 25; i++) {
    cells.push(Boolean((seed >> (i % 31)) & 1));
  }
  return { cells, primaryColor, secondaryColor };
}

export function Identicon({
  name,
  size = 24,
}: {
  name: string;
  size?: number;
}) {
  const hash = hashString(name);
  const { cells, primaryColor, secondaryColor } = generatePattern(hash);
  const cellSize = size / 5;
  const padding = 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ borderRadius: "50%" }}
    >
      <rect width={size} height={size} fill={primaryColor} rx={size / 2} />
      {cells.map((filled, i) => {
        if (!filled) return null;
        const x = (i % 5) * cellSize + padding;
        const y = Math.floor(i / 5) * cellSize + padding;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cellSize - padding * 2}
            height={cellSize - padding * 2}
            rx={1}
            fill={secondaryColor}
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
}
