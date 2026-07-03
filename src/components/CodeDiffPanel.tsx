"use client";

import { classNames } from "@/lib/utils";

interface DiffLine {
  type: "added" | "removed" | "context";
  content: string;
  lineNumberOld: number | null;
  lineNumberNew: number | null;
}

interface CodeDiffPanelProps {
  lines: DiffLine[];
  fileName?: string;
}

export function CodeDiffPanel({ lines, fileName }: CodeDiffPanelProps) {
  if (!lines?.length) {
    return (
      <div className="p-6 text-center text-text-tertiary text-sm">
        No changes to display
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {fileName && (
        <div className="px-4 py-2 bg-surface-secondary border-b border-border text-sm font-mono text-text-secondary">
          {fileName}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[13px] leading-[1.6]">
          <tbody>
            {lines.map((line, i) => (
              <tr
                key={i}
                className={classNames(
                  line.type === "added" && "bg-[#DCFCE7]/50",
                  line.type === "removed" && "bg-[#FEE2E2]/50"
                )}
              >
                <td className="w-12 text-right text-text-tertiary select-none px-2 py-0 border-r border-border">
                  {line.lineNumberOld ?? ""}
                </td>
                <td className="w-12 text-right text-text-tertiary select-none px-2 py-0 border-r border-border">
                  {line.lineNumberNew ?? ""}
                </td>
                <td className="w-5 text-center select-none px-1 py-0 text-text-tertiary">
                  {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                </td>
                <td className="px-3 py-0 whitespace-pre text-text-primary">
                  {line.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
