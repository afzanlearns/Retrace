export interface CommitData {
  sha: string;
  message: string;
  author: string;
  authorEmail: string;
  timestamp: number;
  parentShas: string[];
  branch: string;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface DiffFile {
  filename: string;
  additions: number;
  deletions: number;
  binary: boolean;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "added" | "removed" | "context";
  content: string;
  lineNumberOld: number | null;
  lineNumberNew: number | null;
}

export interface BranchData {
  name: string;
  headSha: string;
  isCurrent: boolean;
}

export interface WorkerProgress {
  current: number;
  total: number;
  message: string;
}

export interface FileTreeEntry {
  name: string;
  path: string;
  type: "blob" | "tree";
}

export interface ServeFile {
  path: string;
  content: number[];
}

export type WorkerInMessage =
  | { type: "init"; handle: FileSystemDirectoryHandle }
  | { type: "walkCommits"; repoId: string; sinceSha?: string }
  | { type: "getDiff"; commitSha: string; parentSha?: string }
  | { type: "listBranches" }
  | { type: "getCommit"; sha: string }
  | { type: "getFileTree"; commitSha: string }
  | { type: "serveCommit"; commitSha: string };

export type WorkerOutMessage =
  | { type: "ready" }
  | { type: "commits"; commits: CommitData[]; total: number; headSha: string }
  | { type: "commitProgress"; progress: WorkerProgress }
  | { type: "diff"; files: DiffFile[]; commitSha: string }
  | { type: "branches"; branches: BranchData[] }
  | { type: "commitDetail"; commit: CommitData }
  | { type: "fileTree"; tree: FileTreeEntry[] }
  | { type: "serveFiles"; files: ServeFile[]; commitSha: string }
  | { type: "error"; message: string };
