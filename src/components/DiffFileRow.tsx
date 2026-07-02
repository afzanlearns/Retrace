import { truncateMiddle } from "@/lib/utils";

interface DiffFileRowProps {
  filename: string;
  additions: number;
  deletions: number;
}

export function DiffFileRow({ filename, additions, deletions }: DiffFileRowProps) {
  const total = additions + deletions;
  const addPercent = total > 0 ? (additions / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1.5 px-3 hover:bg-surface-secondary rounded-md transition-colors cursor-pointer group">
      <span className="font-mono text-sm text-text-primary flex-1 truncate">
        {truncateMiddle(filename, 60)}
      </span>
      <span className="text-xs font-medium text-success tabular-nums">
        +{additions}
      </span>
      <span className="text-xs font-medium text-danger tabular-nums">
        -{deletions}
      </span>
      <div className="w-20 h-1.5 bg-surface-secondary rounded-full overflow-hidden flex-shrink-0">
        <div
          className="h-full rounded-full"
          style={{
            width: `${addPercent}%`,
            backgroundColor: "var(--color-success, #16A34A)",
          }}
        />
        <div
          className="h-full rounded-full -mt-1.5"
          style={{
            width: `${100 - addPercent}%`,
            marginLeft: `${addPercent}%`,
            backgroundColor: "var(--color-danger, #DC2626)",
          }}
        />
      </div>
    </div>
  );
}
