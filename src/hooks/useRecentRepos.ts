"use client";

import { useState, useEffect, useCallback } from "react";
import { getRecentRepos, removeRecentRepo, type RecentRepo } from "@/lib/db";

export function useRecentRepos() {
  const [repos, setRepos] = useState<RecentRepo[]>([]);

  useEffect(() => {
    getRecentRepos().then(setRepos);
  }, []);

  const removeRepo = useCallback(async (id: string) => {
    await removeRecentRepo(id);
    setRepos((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    const updated = await getRecentRepos();
    setRepos(updated);
  }, []);

  return { repos, removeRepo, refresh };
}
