"use client";

import { useState, useCallback, useRef } from "react";
import { getGitService } from "@/workers/git-service";
import type { DiffFile } from "@/workers/types";

export function useDiff() {
  const [diffFiles, setDiffFiles] = useState<DiffFile[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, DiffFile[]>>(new Map());

  const loadDiff = useCallback(
    async (commitSha: string, parentSha?: string) => {
      const cacheKey = `${commitSha}:${parentSha || ""}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setDiffFiles(cached);
        return cached;
      }

      setDiffLoading(true);
      setDiffError(null);

      try {
        const service = getGitService();
        const files = await service.getDiff(commitSha, parentSha);
        cacheRef.current.set(cacheKey, files);
        setDiffFiles(files);
        return files;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setDiffError(message);
        return null;
      } finally {
        setDiffLoading(false);
      }
    },
    []
  );

  const clearDiff = useCallback(() => {
    setDiffFiles(null);
    setDiffError(null);
    setDiffLoading(false);
  }, []);

  return {
    diffFiles,
    diffLoading,
    diffError,
    loadDiff,
    clearDiff,
  };
}
