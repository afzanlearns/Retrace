import type {
  WorkerInMessage,
  WorkerOutMessage,
  CommitData,
  DiffFile,
  BranchData,
  FileTreeEntry,
  WorkerProgress,
} from "./types";

export type WorkerStatus = "idle" | "initializing" | "ready" | "working" | "error";

type Listener = (msg: WorkerOutMessage) => void;

/** Milliseconds to wait for a worker response before rejecting. */
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Message types that carry a requestId correlation field so we can route
 * responses back to the correct pending promise even when multiple requests
 * are in flight (e.g. getDiff + getFileTree fired simultaneously on commit
 * selection).
 */
type RequestId = string;

// Augmented message shapes that include an optional requestId used internally
// between the service and the worker. The worker echoes the id back in its
// response so we can correlate it.
type TaggedWorkerInMessage = WorkerInMessage & { requestId?: RequestId };
type TaggedWorkerOutMessage = WorkerOutMessage & { requestId?: RequestId };

interface PendingRequest {
  resolve: (msg: WorkerOutMessage) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class GitService {
  private worker: Worker | null = null;
  private status: WorkerStatus = "idle";
  private listeners = new Set<Listener>();
  private pending = new Map<RequestId, PendingRequest>();
  private _onProgress: ((progress: WorkerProgress) => void) | null = null;

  // Special key used for the "init" handshake which has no requestId
  private static INIT_KEY = "__init__";

  constructor() {}

  get workerStatus(): WorkerStatus {
    return this.status;
  }

  set onProgress(cb: ((progress: WorkerProgress) => void) | null) {
    this._onProgress = cb;
  }

  private handleMessage = (msg: TaggedWorkerOutMessage) => {
    this.listeners.forEach((fn) => fn(msg));

    if (msg.type === "commitProgress") {
      this._onProgress?.(msg.progress);
      return;
    }

    // Determine which pending request this response belongs to
    const key = msg.requestId ?? GitService.INIT_KEY;
    const entry = this.pending.get(key);

    if (!entry) {
      // No pending request for this correlation id — ignore (stale response)
      console.warn("[GitService] Received response with no matching pending request:", msg.type, key);
      return;
    }

    clearTimeout(entry.timer);
    this.pending.delete(key);

    if (msg.type === "error") {
      this.status = "error";
      entry.reject(new Error((msg as { message: string }).message));
    } else {
      this.status = "ready";
      entry.resolve(msg);
    }
  };

  private sendRequest(
    msg: WorkerInMessage,
    key: RequestId
  ): Promise<WorkerOutMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(key)) {
          this.pending.delete(key);
          reject(
            new Error(
              `Worker request timed out after ${REQUEST_TIMEOUT_MS / 1000}s (type: ${msg.type}). ` +
              `Try selecting the commit again.`
            )
          );
        }
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(key, { resolve, reject, timer });

      const tagged: TaggedWorkerInMessage =
        key === GitService.INIT_KEY ? msg : { ...msg, requestId: key };
      this.worker?.postMessage(tagged);
    });
  }

  private nextId(): RequestId {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async init(handle: FileSystemDirectoryHandle): Promise<void> {
    // Cancel any pending requests from a previous session
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error("Worker reinitialized"));
    }
    this.pending.clear();

    if (this.worker) {
      this.worker.terminate();
    }

    this.status = "initializing";
    this.worker = new Worker(new URL("./git.worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (ev: MessageEvent) => {
      this.handleMessage(ev.data);
    };
    this.worker.onerror = (err) => {
      this.status = "error";
      const entry = this.pending.get(GitService.INIT_KEY);
      if (entry) {
        clearTimeout(entry.timer);
        this.pending.delete(GitService.INIT_KEY);
        entry.reject(new Error(`Worker error: ${err.message}`));
      }
    };

    const msg: WorkerInMessage = { type: "init", handle };
    await this.sendRequest(msg, GitService.INIT_KEY);
  }

  async walkCommits(repoId: string, sinceSha?: string): Promise<CommitData[]> {
    this.status = "working";
    const id = this.nextId();
    const msg: WorkerInMessage = { type: "walkCommits", repoId, sinceSha };
    const result = await this.sendRequest(msg, id);
    if (result.type === "commits") {
      return result.commits;
    }
    throw new Error("Unexpected response from worker");
  }

  async getDiff(
    commitSha: string,
    parentSha?: string
  ): Promise<DiffFile[]> {
    this.status = "working";
    const id = this.nextId();
    const msg: WorkerInMessage = { type: "getDiff", commitSha, parentSha };
    const result = await this.sendRequest(msg, id);
    if (result.type === "diff") {
      return result.files;
    }
    throw new Error("Unexpected response from worker");
  }

  async listBranches(): Promise<BranchData[]> {
    this.status = "working";
    const id = this.nextId();
    const msg: WorkerInMessage = { type: "listBranches" };
    const result = await this.sendRequest(msg, id);
    if (result.type === "branches") {
      return result.branches;
    }
    throw new Error("Unexpected response from worker");
  }

  async getCommit(sha: string): Promise<CommitData> {
    this.status = "working";
    const id = this.nextId();
    const msg: WorkerInMessage = { type: "getCommit", sha };
    const result = await this.sendRequest(msg, id);
    if (result.type === "commitDetail") {
      return result.commit;
    }
    throw new Error("Unexpected response from worker");
  }

  async getFileTree(commitSha: string): Promise<FileTreeEntry[]> {
    this.status = "working";
    const id = this.nextId();
    const msg: WorkerInMessage = { type: "getFileTree", commitSha };
    const result = await this.sendRequest(msg, id);
    if (result.type === "fileTree") {
      return result.tree;
    }
    throw new Error("Unexpected response from worker");
  }

  async serveCommit(
    commitSha: string
  ): Promise<{ path: string; content: number[] }[]> {
    this.status = "working";
    const id = this.nextId();
    const msg: WorkerInMessage = { type: "serveCommit", commitSha };
    const result = await this.sendRequest(msg, id);
    if (result.type === "serveFiles") {
      return result.files;
    }
    throw new Error("Unexpected response from worker");
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  destroy(): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error("GitService destroyed"));
    }
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
    this.listeners.clear();
    this.status = "idle";
    this._onProgress = null;
  }
}

let globalService: GitService | null = null;

export function getGitService(): GitService {
  if (!globalService) {
    globalService = new GitService();
  }
  return globalService;
}

export function destroyGitService(): void {
  if (globalService) {
    globalService.destroy();
    globalService = null;
  }
}
