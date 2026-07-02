"use client";

import { useState, useEffect } from "react";
import { GitBranch, GitCommitHorizontal } from "lucide-react";
import { Badge } from "./Badge";
import { getGitService } from "@/workers/git-service";
import { formatRelativeTime } from "@/lib/utils";
import type { BranchData, CommitData } from "@/workers/types";

interface BranchExplorerProps {
  currentBranch: string;
  commits: CommitData[];
  onSelectCommit: (sha: string) => void;
}

export function BranchExplorer({
  commits,
  onSelectCommit,
}: BranchExplorerProps) {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const service = getGitService();
        const result = await service.listBranches();
        if (!cancelled) setBranches(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load branches");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const commitMap = new Map(commits.map((c) => [c.sha, c]));

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-text-tertiary">
        Loading branches...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-danger">{error}</div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-text-tertiary">
        No branches found
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {branches.map((branch) => {
        const headCommit = commitMap.get(branch.headSha);
        return (
          <button
            key={branch.name}
            onClick={() => onSelectCommit(branch.headSha)}
            className="w-full text-left p-3 rounded-lg border border-border hover:bg-surface-secondary transition-colors"
          >
            <div className="flex items-center gap-2">
              {branch.isCurrent ? (
                <GitBranch className="w-4 h-4 text-accent" />
              ) : (
                <GitBranch className="w-4 h-4 text-text-tertiary" />
              )}
              <span
                className={`text-sm font-medium ${
                  branch.isCurrent ? "text-accent" : "text-text-primary"
                }`}
              >
                {branch.name}
              </span>
              {branch.isCurrent && (
                <Badge variant="default" className="ml-auto">
                  Current
                </Badge>
              )}
            </div>
            {headCommit && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-text-tertiary">
                <GitCommitHorizontal className="w-3 h-3" />
                <span className="font-mono">{branch.headSha.slice(0, 7)}</span>
                <span>{formatRelativeTime(headCommit.timestamp)}</span>
              </div>
            )}
            {headCommit && (
              <p className="mt-1 text-xs text-text-secondary truncate">
                {headCommit.message}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
