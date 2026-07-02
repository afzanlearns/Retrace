"use client";

import { useState, useCallback } from "react";
import { GitCompare, ArrowRight } from "lucide-react";
import { Button } from "./Button";
import { DiffFileRow } from "./DiffFileRow";
import { CodeDiffPanel } from "./CodeDiffPanel";
import { getGitService } from "@/workers/git-service";
import type { CommitData, DiffFile } from "@/workers/types";

interface CompareViewProps {
  commits: CommitData[];
}

export function CompareView({ commits }: CompareViewProps) {
  const [baseIndex, setBaseIndex] = useState<number | null>(null);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [diffFiles, setDiffFiles] = useState<DiffFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCompare = useCallback(async () => {
    if (
      baseIndex === null ||
      compareIndex === null ||
      baseIndex === compareIndex
    )
      return;

    const baseSha = commits[baseIndex].sha;
    const compareSha = commits[compareIndex].sha;

    setLoading(true);
    setError(null);

    try {
      const service = getGitService();
      const files = await service.getDiff(compareSha, baseSha);
      setDiffFiles(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compare");
    } finally {
      setLoading(false);
    }
  }, [baseIndex, compareIndex, commits]);

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-text-tertiary font-medium block mb-1">
            Base (older)
          </label>
          <select
            value={baseIndex ?? ""}
            onChange={(e) => {
              setBaseIndex(e.target.value ? Number(e.target.value) : null);
              setDiffFiles(null);
            }}
            className="w-full text-sm bg-surface border border-border rounded-md px-3 py-2 text-text-primary"
          >
            <option value="">Select commit...</option>
            {commits.map((c, i) => (
              <option key={c.sha} value={i}>
                {c.sha.slice(0, 7)} - {c.message.slice(0, 40)}
              </option>
            ))}
          </select>
        </div>
        <ArrowRight className="w-5 h-5 text-text-tertiary mt-6" />
        <div className="flex-1">
          <label className="text-xs text-text-tertiary font-medium block mb-1">
            Compare (newer)
          </label>
          <select
            value={compareIndex ?? ""}
            onChange={(e) => {
              setCompareIndex(e.target.value ? Number(e.target.value) : null);
              setDiffFiles(null);
            }}
            className="w-full text-sm bg-surface border border-border rounded-md px-3 py-2 text-text-primary"
          >
            <option value="">Select commit...</option>
            {commits.map((c, i) => (
              <option key={c.sha} value={i}>
                {c.sha.slice(0, 7)} - {c.message.slice(0, 40)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        onClick={runCompare}
        disabled={
          baseIndex === null ||
          compareIndex === null ||
          baseIndex === compareIndex
        }
        className="w-full"
        leftIcon={<GitCompare className="w-4 h-4" />}
      >
        Compare
      </Button>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-sm text-danger text-center">{error}</div>
      )}

      {diffFiles && diffFiles.length > 0 && (
        <div className="space-y-4">
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-surface-secondary/50 border-b border-border">
              <p className="text-sm font-medium text-text-primary">
                Changed Files ({diffFiles.length})
              </p>
            </div>
            <div className="divide-y divide-border">
              {diffFiles.map((file) => (
                <DiffFileRow
                  key={file.filename}
                  filename={file.filename}
                  additions={file.additions}
                  deletions={file.deletions}
                />
              ))}
            </div>
          </div>
          {diffFiles
            .filter((f) => !f.binary)
            .map((file) => (
              <CodeDiffPanel
                key={file.filename}
                lines={file.hunks.flatMap((h) => h.lines)}
                fileName={file.filename}
              />
            ))}
        </div>
      )}

      {diffFiles && diffFiles.length === 0 && (
        <p className="text-sm text-text-tertiary text-center py-4">
          No differences between these commits
        </p>
      )}
    </div>
  );
}
