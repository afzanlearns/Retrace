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

export class GitService {
  private worker: Worker | null = null;
  private status: WorkerStatus = "idle";
  private listeners = new Set<Listener>();
  private pendingResolve: ((value: WorkerOutMessage) => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;
  private _onProgress: ((progress: WorkerProgress) => void) | null = null;

  constructor() {}

  get workerStatus(): WorkerStatus {
    return this.status;
  }

  set onProgress(cb: ((progress: WorkerProgress) => void) | null) {
    this._onProgress = cb;
  }

  private handleMessage = (msg: WorkerOutMessage) => {
    this.listeners.forEach((fn) => fn(msg));

    switch (msg.type) {
      case "ready":
        this.status = "ready";
        if (this.pendingResolve) {
          this.pendingResolve(msg);
          this.pendingResolve = null;
          this.pendingReject = null;
        }
        break;

      case "commits":
      case "diff":
      case "branches":
      case "commitDetail":
      case "fileTree":
        if (this.pendingResolve) {
          this.pendingResolve(msg);
          this.pendingResolve = null;
          this.pendingReject = null;
        }
        this.status = "ready";
        break;

      case "commitProgress":
        this._onProgress?.(msg.progress);
        break;

      case "error":
        if (this.pendingReject) {
          this.pendingReject(new Error(msg.message));
          this.pendingResolve = null;
          this.pendingReject = null;
        }
        this.status = "error";
        break;
    }
  };

  private waitForMessage(): Promise<WorkerOutMessage> {
    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
    });
  }

  async init(handle: FileSystemDirectoryHandle): Promise<void> {
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
      if (this.pendingReject) {
        this.pendingReject(new Error(`Worker error: ${err.message}`));
      }
    };

    const msg: WorkerInMessage = { type: "init", handle };
    this.worker.postMessage(msg);
    await this.waitForMessage();
  }

  async walkCommits(repoId: string, sinceSha?: string): Promise<CommitData[]> {
    this.status = "working";
    const msg: WorkerInMessage = { type: "walkCommits", repoId, sinceSha };
    this.worker?.postMessage(msg);
    const result = await this.waitForMessage();
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
    const msg: WorkerInMessage = { type: "getDiff", commitSha, parentSha };
    this.worker?.postMessage(msg);
    const result = await this.waitForMessage();
    if (result.type === "diff") {
      return result.files;
    }
    throw new Error("Unexpected response from worker");
  }

  async listBranches(): Promise<BranchData[]> {
    this.status = "working";
    const msg: WorkerInMessage = { type: "listBranches" };
    this.worker?.postMessage(msg);
    const result = await this.waitForMessage();
    if (result.type === "branches") {
      return result.branches;
    }
    throw new Error("Unexpected response from worker");
  }

  async getCommit(sha: string): Promise<CommitData> {
    this.status = "working";
    const msg: WorkerInMessage = { type: "getCommit", sha };
    this.worker?.postMessage(msg);
    const result = await this.waitForMessage();
    if (result.type === "commitDetail") {
      return result.commit;
    }
    throw new Error("Unexpected response from worker");
  }

  async getFileTree(commitSha: string): Promise<FileTreeEntry[]> {
    this.status = "working";
    const msg: WorkerInMessage = { type: "getFileTree", commitSha };
    this.worker?.postMessage(msg);
    const result = await this.waitForMessage();
    if (result.type === "fileTree") {
      return result.tree;
    }
    throw new Error("Unexpected response from worker");
  }

  async serveCommit(
    commitSha: string
  ): Promise<{ path: string; content: number[] }[]> {
    this.status = "working";
    const msg: WorkerInMessage = { type: "serveCommit", commitSha };
    this.worker?.postMessage(msg);
    const result = await this.waitForMessage();
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
