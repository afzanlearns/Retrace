"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CommitData } from "@/workers/types";

interface RepoContextType {
  handle: FileSystemDirectoryHandle | null;
  repoId: string | null;
  repoName: string;
  commits: CommitData[];
  headSha: string;
  setRepo: (
    handle: FileSystemDirectoryHandle,
    repoId: string,
    name: string
  ) => void;
  setCommits: (commits: CommitData[], headSha: string) => void;
  clearRepo: () => void;
}

const RepoContext = createContext<RepoContextType>({
  handle: null,
  repoId: null,
  repoName: "",
  commits: [],
  headSha: "",
  setRepo: () => {},
  setCommits: () => {},
  clearRepo: () => {},
});

export function RepoProvider({ children }: { children: ReactNode }) {
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [repoId, setRepoId] = useState<string | null>(null);
  const [repoName, setRepoName] = useState("");
  const [commits, setCommitsState] = useState<CommitData[]>([]);
  const [headSha, setHeadSha] = useState("");

  const setRepo = useCallback(
    (h: FileSystemDirectoryHandle, id: string, name: string) => {
      setHandle(h);
      setRepoId(id);
      setRepoName(name);
    },
    []
  );

  const setCommits = useCallback(
    (c: CommitData[], sha: string) => {
      setCommitsState(c);
      setHeadSha(sha);
    },
    []
  );

  const clearRepo = useCallback(() => {
    setHandle(null);
    setRepoId(null);
    setRepoName("");
    setCommitsState([]);
    setHeadSha("");
  }, []);

  return (
    <RepoContext.Provider
      value={{
        handle,
        repoId,
        repoName,
        commits,
        headSha,
        setRepo,
        setCommits,
        clearRepo,
      }}
    >
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  return useContext(RepoContext);
}
