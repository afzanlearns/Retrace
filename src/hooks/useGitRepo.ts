"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  getGitService,
  destroyGitService,
  type WorkerStatus,
} from "@/workers/git-service";
import type { CommitData, WorkerProgress } from "@/workers/types";
import { addRecentRepo } from "@/lib/db";
import { requestPermission } from "@/lib/browser";

export interface RepoState {
  name: string;
  path: string;
  repoId: string;
  commits: CommitData[];
  headSha: string;
  status: WorkerStatus;
  progress: WorkerProgress | null;
  error: string | null;
}

export function useGitRepo() {
  const [state, setState] = useState<RepoState>({
    name: "",
    path: "",
    repoId: "",
    commits: [],
    headSha: "",
    status: "idle",
    progress: null,
    error: null,
  });
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    return () => {
      destroyGitService();
    };
  }, []);

  const openRepo = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      const service = getGitService();
      handleRef.current = handle;

      setState((prev) => ({
        ...prev,
        name: handle.name,
        path: handle.name,
        status: "initializing",
        error: null,
      }));

      try {
        const permission = await requestPermission(handle);
        if (permission !== "granted") {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: "Permission denied to access the repository folder.",
          }));
          return;
        }

        service.onProgress = (progress: WorkerProgress) => {
          setState((prev) => ({ ...prev, progress }));
        };

        await service.init(handle);

        const repoId = `${handle.name}_${Date.now()}`;

        setState((prev) => ({ ...prev, repoId, status: "working", progress: null }));

        const commits = await service.walkCommits(repoId);

        const headSha =
          commits.length > 0 ? commits[0].sha : "";

        await addRecentRepo({
          id: repoId,
          name: handle.name,
          path: handle.name,
          lastOpened: Date.now(),
          commitCount: commits.length,
          handle,
        });

        setState((prev) => ({
          ...prev,
          commits,
          headSha,
          status: "ready",
          progress: null,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState((prev) => ({ ...prev, status: "error", error: message }));
      }
    },
    []
  );

  const refreshCommits = useCallback(async () => {
    if (!handleRef.current || !state.repoId) return;

    const service = getGitService();
    setState((prev) => ({ ...prev, status: "working", error: null }));

    try {
      const permission = await requestPermission(handleRef.current);
      if (permission !== "granted") {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Permission denied.",
        }));
        return;
      }

      const commits = await service.walkCommits(state.repoId, state.headSha);
      const headSha = commits.length > 0 ? commits[0].sha : state.headSha;

      setState((prev) => ({
        ...prev,
        commits: [...commits, ...prev.commits],
        headSha,
        status: "ready",
        progress: null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, status: "error", error: message }));
    }
  }, [state.repoId, state.headSha]);

  const clearRepo = useCallback(() => {
    destroyGitService();
    handleRef.current = null;
    setState({
      name: "",
      path: "",
      repoId: "",
      commits: [],
      headSha: "",
      status: "idle",
      progress: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    openRepo,
    refreshCommits,
    clearRepo,
  };
}
