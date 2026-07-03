"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { CommitData } from "@/workers/types";
import { ConsentModal } from "@/components/ConsentModal";
import { pickRepository } from "@/lib/browser";
import { addRecentRepo } from "@/lib/db";

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
  /**
   * Shows the in-app consent modal, then opens the native directory picker.
   * On success, calls setRepo and navigates. Returns the handle or null.
   */
  requestAccess: () => Promise<FileSystemDirectoryHandle | null>;
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
  requestAccess: async () => null,
});

export function RepoProvider({ children }: { children: ReactNode }) {
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [repoId, setRepoId] = useState<string | null>(null);
  const [repoName, setRepoName] = useState("");
  const [commits, setCommitsState] = useState<CommitData[]>([]);
  const [headSha, setHeadSha] = useState("");

  // Consent modal state
  const [consentOpen, setConsentOpen] = useState(false);
  const resolveRef = useRef<((h: FileSystemDirectoryHandle | null) => void) | null>(null);

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

  /**
   * Shows the consent modal and resolves with the chosen handle (or null).
   */
  const requestAccess = useCallback((): Promise<FileSystemDirectoryHandle | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConsentOpen(true);
    });
  }, []);

  const handleGrant = useCallback(async () => {
    setConsentOpen(false);
    try {
      const picked = await pickRepository();
      if (picked) {
        const name = picked.name;
        // Sanity-check: reject names that look like browser UI labels
        if (!name || /^ctrl\s*\+/i.test(name)) {
          resolveRef.current?.(null);
          return;
        }
        const id = `${name}_${Date.now()}`;
        setRepo(picked, id, name);
        await addRecentRepo({
          id,
          name,
          path: name,
          lastOpened: Date.now(),
          commitCount: 0,
          handle: picked,
        });
      }
      resolveRef.current?.(picked);
    } catch {
      resolveRef.current?.(null);
    }
    resolveRef.current = null;
  }, [setRepo]);

  const handleCancel = useCallback(() => {
    setConsentOpen(false);
    resolveRef.current?.(null);
    resolveRef.current = null;
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
        requestAccess,
      }}
    >
      {children}
      <ConsentModal
        open={consentOpen}
        onGrant={handleGrant}
        onCancel={handleCancel}
      />
    </RepoContext.Provider>
  );
}

export function useRepo() {
  return useContext(RepoContext);
}
