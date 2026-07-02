import git, { TREE, type WalkerIterate } from "isomorphic-git";
import { diffArrays } from "diff";
import { createFsAdapter } from "@/lib/fs-adapter";

interface CommitData {
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

interface DiffFile {
  filename: string;
  additions: number;
  deletions: number;
  binary: boolean;
  hunks: DiffHunk[];
}

interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: { type: "added" | "removed" | "context"; content: string; lineNumberOld: number | null; lineNumberNew: number | null }[];
}

interface BranchData {
  name: string;
  headSha: string;
  isCurrent: boolean;
}

interface FileTreeEntry {
  name: string;
  path: string;
  type: "blob" | "tree";
}

interface ServeFile {
  path: string;
  content: number[];
}

type WorkerInMessage =
  | { type: "init"; handle: FileSystemDirectoryHandle }
  | { type: "walkCommits"; repoId: string; sinceSha?: string }
  | { type: "getDiff"; commitSha: string; parentSha?: string }
  | { type: "listBranches" }
  | { type: "getCommit"; sha: string }
  | { type: "getFileTree"; commitSha: string }
  | { type: "serveCommit"; commitSha: string };

type WorkerOutMessage =
  | { type: "ready" }
  | { type: "commits"; commits: CommitData[]; total: number; headSha: string }
  | { type: "commitProgress"; progress: { current: number; total: number; message: string } }
  | { type: "diff"; files: DiffFile[]; commitSha: string }
  | { type: "branches"; branches: BranchData[] }
  | { type: "commitDetail"; commit: CommitData }
  | { type: "fileTree"; tree: FileTreeEntry[] }
  | { type: "serveFiles"; files: ServeFile[]; commitSha: string }
  | { type: "error"; message: string };

let fs: ReturnType<typeof createFsAdapter> | null = null;

function computeFileDiff(
  oldContent: string,
  newContent: string
): { hunks: DiffHunk[]; additions: number; deletions: number } {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const changes = diffArrays(oldLines, newLines);

  const hunks: DiffHunk[] = [];
  let additions = 0;
  let deletions = 0;
  let oldLineNum = 1;
  let newLineNum = 1;
  let currentHunk: DiffHunk | null = null;
  let contextCount = 0;

  for (const change of changes) {
    if (change.added) {
      if (!currentHunk) {
        const ctxBefore = Math.min(contextCount, 3);
        currentHunk = {
          oldStart: oldLineNum - ctxBefore,
          oldLines: 0,
          newStart: newLineNum - ctxBefore,
          newLines: 0,
          lines: [],
        };
        for (let i = 0; i < ctxBefore; i++) {
          currentHunk.lines.push({
            type: "context",
            content: oldLines[oldLineNum - ctxBefore + i - 1] || "",
            lineNumberOld: oldLineNum - ctxBefore + i,
            lineNumberNew: newLineNum - ctxBefore + i,
          });
        }
      }
      for (const line of change.value as string[]) {
        currentHunk.lines.push({
          type: "added",
          content: line,
          lineNumberOld: null,
          lineNumberNew: newLineNum,
        });
        newLineNum++;
        additions++;
      }
    } else if (change.removed) {
      if (!currentHunk) {
        const ctxBefore = Math.min(contextCount, 3);
        currentHunk = {
          oldStart: oldLineNum - ctxBefore,
          oldLines: 0,
          newStart: newLineNum - ctxBefore,
          newLines: 0,
          lines: [],
        };
        for (let i = 0; i < ctxBefore; i++) {
          currentHunk.lines.push({
            type: "context",
            content: oldLines[oldLineNum - ctxBefore + i - 1] || "",
            lineNumberOld: oldLineNum - ctxBefore + i,
            lineNumberNew: newLineNum - ctxBefore + i,
          });
        }
      }
      for (const line of change.value as string[]) {
        currentHunk.lines.push({
          type: "removed",
          content: line,
          lineNumberOld: oldLineNum,
          lineNumberNew: null,
        });
        oldLineNum++;
        deletions++;
      }
      if (!currentHunk) {
        currentHunk = {
          oldStart: oldLineNum,
          oldLines: 0,
          newStart: newLineNum,
          newLines: 0,
          lines: [],
        };
      }
    } else {
      contextCount = (change.value as string[]).length;
      if (currentHunk) {
        const ctxAfter = Math.min(contextCount, 3);
        const lines = (change.value as string[]).slice(0, ctxAfter);
        for (const line of lines) {
          currentHunk.lines.push({
            type: "context",
            content: line,
            lineNumberOld: oldLineNum,
            lineNumberNew: newLineNum,
          });
          oldLineNum++;
          newLineNum++;
        }
        currentHunk.oldLines =
          currentHunk.lines.filter(
            (l) => l.type === "removed" || l.type === "context"
          ).length;
        currentHunk.newLines =
          currentHunk.lines.filter(
            (l) => l.type === "added" || l.type === "context"
          ).length;
        hunks.push(currentHunk);
        currentHunk = null;

        oldLineNum += (change.value as string[]).length - ctxAfter;
        newLineNum += (change.value as string[]).length - ctxAfter;
      } else {
        oldLineNum += (change.value as string[]).length;
        newLineNum += (change.value as string[]).length;
      }
    }
  }

  if (currentHunk) {
    currentHunk.oldLines =
      currentHunk.lines.filter(
        (l) => l.type === "removed" || l.type === "context"
      ).length;
    currentHunk.newLines =
      currentHunk.lines.filter(
        (l) => l.type === "added" || l.type === "context"
      ).length;
    hunks.push(currentHunk);
  }

  return { hunks, additions, deletions };
}

function isBinaryContent(content: Uint8Array): boolean {
  const sample = content.slice(0, 8192);
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true;
  }
  return false;
}

async function computeCommitDiff(
  fsAdapter: ReturnType<typeof createFsAdapter>,
  parentSha: string,
  commitSha: string
): Promise<DiffFile[]> {
  const files: DiffFile[] = [];

  try {
    await git.walk({
      fs: fsAdapter,
      dir: "/",
      trees: [TREE({ ref: parentSha }), TREE({ ref: commitSha })],
      map: async (path, entries) => {
        const [parent, current] = entries;
        if (!parent && !current) return null;
        if (!parent) return { path, type: "added" };
        if (!current) return { path, type: "removed" };
        const parentContent = await parent.content();
        const currentContent = await current.content();
        if (
          parentContent &&
          currentContent &&
          parentContent.length === currentContent.length &&
          parentContent.every((val, idx) => val === currentContent[idx])
        ) {
          return null;
        }
        return { path, type: "modified" };
      },
      reduce: async (_parent: unknown, children: unknown[]) => {
        return children.filter(Boolean);
      },
      iterate: (async (walk, children) => {
        const results = [];
        for await (const child of children) {
          results.push(await walk(child));
        }
        return results;
      }) as WalkerIterate,
    }).then(async (changedFiles: unknown[]) => {
      for (const file of (changedFiles || []) as { path: string; type: string }[]) {
        if (!file) continue;

        if (file.type === "added") {
          try {
            const blob = await git.readBlob({
              fs: fsAdapter,
              dir: "/",
              oid: commitSha,
              filepath: file.path,
            });
            const binary = isBinaryContent(blob.blob);
            if (binary) {
              files.push({
                filename: file.path,
                additions: 1,
                deletions: 0,
                binary: true,
                hunks: [],
              });
            } else {
              const content = new TextDecoder().decode(blob.blob);
              const { hunks, additions } = computeFileDiff("", content);
              files.push({
                filename: file.path,
                additions,
                deletions: 0,
                binary: false,
                hunks,
              });
            }
          } catch {
            files.push({
              filename: file.path,
              additions: 1,
              deletions: 0,
              binary: true,
              hunks: [],
            });
          }
        } else if (file.type === "removed") {
          try {
            const blob = await git.readBlob({
              fs: fsAdapter,
              dir: "/",
              oid: parentSha,
              filepath: file.path,
            });
            const binary = isBinaryContent(blob.blob);
            if (binary) {
              files.push({
                filename: file.path,
                additions: 0,
                deletions: 1,
                binary: true,
                hunks: [],
              });
            } else {
              const content = new TextDecoder().decode(blob.blob);
              const { hunks, deletions } = computeFileDiff(content, "");
              files.push({
                filename: file.path,
                additions: 0,
                deletions,
                binary: false,
                hunks,
              });
            }
          } catch {
            files.push({
              filename: file.path,
              additions: 0,
              deletions: 1,
              binary: true,
              hunks: [],
            });
          }
        } else {
          try {
            const [parentBlob, currentBlob] = await Promise.all([
              git.readBlob({
                fs: fsAdapter,
                dir: "/",
                oid: parentSha,
                filepath: file.path,
              }),
              git.readBlob({
                fs: fsAdapter,
                dir: "/",
                oid: commitSha,
                filepath: file.path,
              }),
            ]);
            const binary =
              isBinaryContent(parentBlob.blob) ||
              isBinaryContent(currentBlob.blob);
            if (binary) {
              files.push({
                filename: file.path,
                additions: 1,
                deletions: 1,
                binary: true,
                hunks: [],
              });
            } else {
              const oldContent = new TextDecoder().decode(parentBlob.blob);
              const newContent = new TextDecoder().decode(currentBlob.blob);
              const { hunks, additions, deletions } = computeFileDiff(
                oldContent,
                newContent
              );
              files.push({
                filename: file.path,
                additions,
                deletions,
                binary: false,
                hunks,
              });
            }
          } catch {
            files.push({
              filename: file.path,
              additions: 1,
              deletions: 1,
              binary: true,
              hunks: [],
            });
          }
        }
      }
    });
  } catch {}

  return files;
}

function ensureSha(sha: unknown, label: string): string {
  if (typeof sha === "string") return sha;
  if (sha instanceof Uint8Array || Array.isArray(sha)) {
    const hex = Array.from(sha as Uint8Array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    console.warn(`SHA was not a string for ${label}, converted from buffer (${typeof sha})`);
    return hex;
  }
  console.error(`Unexpected SHA type for ${label}:`, typeof sha, sha);
  return String(sha);
}

function send(msg: WorkerOutMessage) {
  self.postMessage(msg);
}

async function walkCommits(
  fsAdapter: ReturnType<typeof createFsAdapter>,
  repoId: string,
  sinceSha?: string
): Promise<CommitData[]> {
  const commits: CommitData[] = [];

  const currentBranch = await git.currentBranch({
    fs: fsAdapter,
    dir: "/",
    fullname: false,
  });

  const logCommits = await git.log({
    fs: fsAdapter,
    dir: "/",
    ref: "HEAD",
  });

  let foundSince = !sinceSha;

  for (const logCommit of logCommits) {
    const sha = logCommit.oid;
    if (!foundSince && sha === sinceSha) {
      foundSince = true;
      continue;
    }
    if (!foundSince) continue;

    const commitData = logCommit.commit;

    let additions = 0;
    let deletions = 0;
    let changedFiles = 0;

    const ensureParentShas = (commitData.parent || []).map((p: unknown) =>
      ensureSha(p, `commit ${sha.slice(0, 7)} parent`)
    );

    if (ensureParentShas.length > 0) {
      try {
        const diffFiles = await computeCommitDiff(
          fsAdapter,
          ensureParentShas[0],
          sha
        );
        for (const f of diffFiles) {
          additions += f.additions;
          deletions += f.deletions;
          changedFiles++;
        }
      } catch {}
    }

    commits.push({
      sha: ensureSha(sha, `commit oid`),
      message: commitData.message.split("\n")[0] || commitData.message,
      author: commitData.author.name,
      authorEmail: commitData.author.email,
      timestamp: commitData.author.timestamp * 1000,
      parentShas: ensureParentShas,
      branch: currentBranch || "unknown",
      additions,
      deletions,
      changedFiles,
    });

    if (commits.length % 10 === 0) {
      send({
        type: "commitProgress",
        progress: {
          current: commits.length,
          total: logCommits.length,
          message: `Indexing commit ${commits.length} / ${logCommits.length}...`,
        },
      });
    }
  }

  send({
    type: "commitProgress",
    progress: {
      current: commits.length,
      total: commits.length,
      message: `Indexed ${commits.length} commits`,
    },
  });

  return commits;
}

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  try {
    switch (msg.type) {
      case "init": {
        fs = createFsAdapter(msg.handle);
        send({ type: "ready" });
        break;
      }

      case "walkCommits": {
        if (!fs) {
          send({ type: "error", message: "Not initialized" });
          return;
        }

        const commits = await walkCommits(fs, msg.repoId, msg.sinceSha);
        const headSha = commits.length > 0 ? commits[0].sha : "";

        send({ type: "commits", commits, total: commits.length, headSha });
        break;
      }

      case "getDiff": {
        if (!fs) {
          send({ type: "error", message: "Not initialized" });
          return;
        }

        const parentSha = msg.parentSha;

        if (parentSha) {
          const files = await computeCommitDiff(fs, parentSha, msg.commitSha);
          send({ type: "diff", files, commitSha: msg.commitSha });
        } else {
          const commit = await git.readCommit({
            fs,
            dir: "/",
            oid: msg.commitSha,
          });
          if (commit.commit.parent.length > 0) {
            const files = await computeCommitDiff(
              fs,
              commit.commit.parent[0],
              msg.commitSha
            );
            send({ type: "diff", files, commitSha: msg.commitSha });
          } else {
            send({ type: "diff", files: [], commitSha: msg.commitSha });
          }
        }
        break;
      }

      case "listBranches": {
        if (!fs) {
          send({ type: "error", message: "Not initialized" });
          return;
        }

        const branchNames = await git.listBranches({ fs, dir: "/" });
        const currentBranch = await git.currentBranch({
          fs,
          dir: "/",
          fullname: true,
        });

        const branches: BranchData[] = [];
        for (const name of branchNames) {
          const headSha = await git.resolveRef({
            fs,
            dir: "/",
            ref: `refs/heads/${name}`,
          });
          branches.push({
            name,
            headSha,
            isCurrent: name === currentBranch?.replace("refs/heads/", ""),
          });
        }

        send({ type: "branches", branches });
        break;
      }

      case "getCommit": {
        if (!fs) {
          send({ type: "error", message: "Not initialized" });
          return;
        }

        const commitResult = await git.readCommit({
          fs,
          dir: "/",
          oid: msg.sha,
        });
        const c = commitResult.commit;

        const currentBranch = await git.currentBranch({
          fs,
          dir: "/",
          fullname: false,
        });

        let additions = 0;
        let deletions = 0;
        let changedFiles = 0;

        if (c.parent.length > 0) {
          try {
            const diffFiles = await computeCommitDiff(
              fs,
              c.parent[0],
              msg.sha
            );
            for (const f of diffFiles) {
              additions += f.additions;
              deletions += f.deletions;
              changedFiles++;
            }
          } catch {}
        }

        const commitData: CommitData = {
          sha: msg.sha,
          message: c.message.split("\n")[0] || c.message,
          author: c.author.name,
          authorEmail: c.author.email,
          timestamp: c.author.timestamp * 1000,
          parentShas: c.parent,
          branch: currentBranch || "unknown",
          additions,
          deletions,
          changedFiles,
        };

        send({ type: "commitDetail", commit: commitData });
        break;
      }

      case "getFileTree": {
        if (!fs) {
          send({ type: "error", message: "Not initialized" });
          return;
        }

        const commit = await git.readCommit({ fs, dir: "/", oid: msg.commitSha });
        const tree = await git.readTree({ fs, dir: "/", oid: commit.commit.tree });

        const entries: FileTreeEntry[] = tree.tree
          .filter((e: { type: string }) => e.type === "blob" || e.type === "tree")
          .map((e: Record<string, unknown>) => ({
            name: String(e.path || "").split("/").pop() || String(e.path || ""),
            path: String(e.path || ""),
            type: (e.type === "tree" ? "tree" : "blob") as "blob" | "tree",
          }));

        entries.sort((a, b) => {
          if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

        send({ type: "fileTree", tree: entries });
        break;
      }

      case "serveCommit": {
        if (!fs) {
          send({ type: "error", message: "Not initialized" });
          return;
        }

        const serveCommit = await git.readCommit({ fs, dir: "/", oid: msg.commitSha });
        const serveTree = await git.readTree({ fs, dir: "/", oid: serveCommit.commit.tree });

        const serveFiles: ServeFile[] = [];
        const blobEntries = serveTree.tree.filter((e: { type: string }) => e.type === "blob");

        for (const entry of blobEntries) {
          try {
            const blob = await git.readBlob({
              fs,
              dir: "/",
              oid: msg.commitSha,
              filepath: entry.path,
            });
            serveFiles.push({
              path: entry.path,
              content: Array.from(blob.blob),
            });
          } catch {}
        }

        send({ type: "serveFiles", files: serveFiles, commitSha: msg.commitSha });
        break;
      }
    }
  } catch (err) {
    console.error("Worker error:", err);
    const message = err instanceof Error ? err.message : String(err);
    send({ type: "error", message });
  }
};

export {};
