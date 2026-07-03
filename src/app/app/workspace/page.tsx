"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { List } from "react-window";
import {
  GitBranch,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Code2,
  Columns,
  Maximize2,
  Minimize2,
  Settings as SettingsIcon,
  FolderOpen,
  FileText,
  GitCompare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { DiffFileRow } from "@/components/DiffFileRow";
import { CodeDiffPanel } from "@/components/CodeDiffPanel";
import { TimelineScrubber } from "@/components/TimelineScrubber";
import { BranchExplorer } from "@/components/BranchExplorer";
import { FileTreeView } from "@/components/FileTreeView";
import { CompareView } from "@/components/CompareView";
import { useRepo } from "@/lib/repo-context";
import { useDiff } from "@/hooks/useDiff";

import { getGitService } from "@/workers/git-service";
import { formatRelativeTime } from "@/lib/utils";
import {
  isStaticServable,
  getEntryPoint,
  mimeTypeFromPath,
  createBlobUrl,
} from "@/lib/preview";
import { wipeDatabase } from "@/lib/db";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { CommitData, WorkerProgress } from "@/workers/types";

interface CommitRowData {
  commits: CommitData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function CommitRow({
  index,
  style,
  commits,
  selectedIndex,
  onSelect,
}: { index: number; style: React.CSSProperties; commits: CommitData[]; selectedIndex: number; onSelect: (index: number) => void }) {
  const commit = commits[index];
  const isSelected = index === selectedIndex;
  return (
    <div style={style}>
      <button
        onClick={() => onSelect(index)}
        className={`w-full text-left px-4 py-2.5 border-b border-border transition-colors relative ${
          isSelected ? "bg-accent/5" : "hover:bg-surface-secondary"
        }`}
        aria-current={isSelected ? "true" : undefined}
      >
        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />}
        <p className={`text-sm truncate ${isSelected ? "font-semibold text-accent" : "font-medium text-text-primary"}`}>
          {commit.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="mono">{commit.sha.slice(0, 7)}</Badge>
          <span className="text-xs text-text-tertiary">{formatRelativeTime(commit.timestamp)}</span>
        </div>
      </button>
    </div>
  );
}

export default function WorkspacePage() {
  const router = useRouter();
  const { handle, repoId, repoName, commits, setCommits, clearRepo } = useRepo();
  const { diffFiles, diffLoading, diffError, loadDiff } = useDiff();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "diff">("diff");
  const [activeTab, setActiveTab] = useState("history");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [previewFiles, setPreviewFiles] = useState<Map<string, string> | null>(null);
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [stats, setStats] = useState({
    commitCount: 0,
    branchCount: 0,
    contributorCount: 0,
  });
  const replayRef = useRef<number | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const commitsRef = useRef(commits);


  useEffect(() => {
    commitsRef.current = commits;
  });

  const selectedCommit = commits[selectedIndex];

  const loadBranches = useCallback(async () => {
    try {
      const service = getGitService();
      const branches = await service.listBranches();
      const currentCommits = commitsRef.current;
      const contributors = new Set<string>();
      currentCommits.forEach((c) => contributors.add(c.author));
      setStats({
        commitCount: currentCommits.length,
        branchCount: branches.length,
        contributorCount: contributors.size,
      });
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      if (!handle) {
        router.push("/app");
        return;
      }
      try {
        const service = getGitService();
        service.onProgress = (p: WorkerProgress) => {
          if (!cancelled) setProgress(p);
        };
        await service.init(handle);
        if (cancelled) return;
        const repoIdStr = repoId || `${handle.name}_${Date.now()}`;
        const result = await service.walkCommits(repoIdStr);
        if (cancelled) return;
        const headSha = result.length > 0 ? result[0].sha : "";
        setCommits(result, headSha);
        setStats((prev) => ({ ...prev, commitCount: result.length }));
        loadBranches();
      } catch (err) {
        console.error("Failed to load repository:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  async function checkPreview(sha: string) {
    try {
      const service = getGitService();
      const tree = await service.getFileTree(sha);
      const available = isStaticServable(tree);
      setPreviewAvailable(available);

      if (available && viewMode === "split") {
        const files = await service.serveCommit(sha);
        const urlMap = new Map<string, string>();
        for (const f of files) {
          const mime = mimeTypeFromPath(f.path);
          const uint8 = new Uint8Array(f.content);
          urlMap.set(f.path, createBlobUrl(uint8, mime));
        }
        setPreviewFiles(urlMap);
      }
    } catch {
      setPreviewAvailable(false);
    }
  }

  function getPreviewUrl(path: string): string | undefined {
    if (!previewFiles) return undefined;
    const direct = previewFiles.get(path);
    if (direct) return direct;
    for (const [key, value] of previewFiles) {
      if (key.endsWith(path) || key === path.replace(/^\//, "")) {
        return value;
      }
    }
    return undefined;
  }

  useEffect(() => {
    if (selectedCommit) {
      loadDiff(selectedCommit.sha, selectedCommit.parentShas?.[0]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      checkPreview(selectedCommit.sha);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommit?.sha]);

  useEffect(() => {
    if (isPlaying && commits.length > 1) {
      const speed = replaySpeed;
      replayRef.current = window.setInterval(() => {
        setSelectedIndex((prev) => {
          if (prev >= commits.length - 1) {
            if (loop) return 0;
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / speed);
    }
    return () => {
      if (replayRef.current !== null) {
        clearInterval(replayRef.current);
        replayRef.current = null;
      }
    };
  }, [isPlaying, replaySpeed, loop, commits.length]);

  useEffect(() => {
    return () => {
      if (previewFiles) {
        previewFiles.forEach((url) => URL.revokeObjectURL(url));
      }
    };
  }, [previewFiles]);

  useEffect(() => {
    if (!isImmersive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsImmersive(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isImmersive]);

  const currentCommit = selectedCommit;

  if (!handle) return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-text-primary mb-1">
            {progress?.message || "Loading repository..."}
          </p>
          {progress && (
            <p className="text-xs text-text-tertiary">
              {progress.current} / {progress.total}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-sm font-medium text-danger mb-2">Failed to load repository</p>
          <p className="text-xs text-text-tertiary mb-4">{error}</p>
          <Button onClick={() => router.push("/app")}>Go back</Button>
        </div>
      </div>
    );
  }

  if (!currentCommit) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <FolderOpen className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <p className="text-sm font-medium text-text-primary mb-2">No commits found</p>
          <p className="text-xs text-text-tertiary">This repository appears to have no commits.</p>
        </div>
      </div>
    );
  }

  const sidebarTabs = [
    { id: "history", icon: Clock, label: "Commit History" },
    { id: "branches", icon: GitBranch, label: "Branch Explorer" },
    { id: "files", icon: FileText, label: "File Tree" },
    { id: "compare", icon: GitCompare, label: "Compare" },
    { id: "settings", icon: SettingsIcon, label: "Settings" },
  ];

  if (isImmersive) {
    const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : null;
    const nextIndex = selectedIndex < commits.length - 1 ? selectedIndex + 1 : null;

    const previewPanel = (side: "before" | "after") => {
      const isBefore = side === "before";
      const src = previewAvailable && previewFiles
        ? getPreviewUrl(getEntryPoint(
            (Array.from(previewFiles.keys())).map((p) => ({
              name: p.split("/").pop() || p,
              path: p,
              type: "blob" as const,
            }))
          ) || "index.html")
        : undefined;

      return (
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary/50 border-b border-border flex-shrink-0">
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-danger/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#EAB308]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/70" />
            </div>
            <span className="text-[10px] text-text-tertiary font-mono mx-auto">
              {isBefore ? "Before This Commit" : "After This Commit"} — {repoName || "localhost"}
            </span>
          </div>
          {previewAvailable && previewFiles && src ? (
            <iframe
              ref={isBefore ? previewIframeRef : undefined}
              src={src}
              className="flex-1 bg-white w-full"
              title={`Live preview ${isBefore ? "before" : "after"} commit`}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-surface-secondary/30 text-text-tertiary text-xs">
              Live preview unavailable — requires a build step.
            </div>
          )}
        </div>
      );
    };

    return (
      <ErrorBoundary>
      <div className="flex flex-col flex-1 overflow-hidden bg-surface">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => prevIndex !== null && setSelectedIndex(prevIndex)}
              disabled={prevIndex === null}
              className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Previous commit"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => nextIndex !== null && setSelectedIndex(nextIndex)}
              disabled={nextIndex === null}
              className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Next commit"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-text-primary truncate max-w-[400px]">
              {currentCommit.message}
            </span>
            <Badge variant="mono">{currentCommit.sha.slice(0, 7)}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-text-tertiary tabular-nums">
              {selectedIndex + 1} / {commits.length}
            </span>
            <Button variant="icon" onClick={() => setIsImmersive(false)} aria-label="Exit immersive view">
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
          <div className="flex flex-col overflow-hidden md:border-r border-border">
            <p className="text-eyebrow text-text-tertiary px-3 pt-2 pb-1 flex-shrink-0">Before</p>
            <div className="flex-1 overflow-hidden border border-border rounded-lg mx-2 mb-2 flex flex-col">
              {previewPanel("before")}
            </div>
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-eyebrow text-text-tertiary px-3 pt-2 pb-1 flex-shrink-0">After</p>
            <div className="flex-1 overflow-hidden border border-border rounded-lg mx-2 mb-2 flex flex-col">
              {previewPanel("after")}
            </div>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      <aside className="w-full md:w-[300px] flex-shrink-0 border-b md:border-r border-border bg-surface flex flex-col overflow-hidden" role="navigation" aria-label="Workspace sidebar">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-xs tracking-tight">Retrace</span>
          </div>
          <button className="w-full flex items-center gap-2 text-left py-1.5 px-2 rounded-md hover:bg-surface-secondary transition-colors">
            <FolderOpen className="w-4 h-4 text-text-tertiary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{repoName || "Repository"}</p>
              <p className="text-xs text-text-tertiary truncate">{handle?.name || ""}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          </button>
          <div className="flex items-center justify-between mt-2 px-2">
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-text-tertiary" />
              <span className="text-xs font-medium text-text-primary">{commits[0]?.branch || "main"}</span>
              <ChevronDown className="w-3 h-3 text-text-tertiary" />
            </div>
            <span className="text-xs text-text-tertiary tabular-nums">{stats.commitCount} commits</span>
          </div>
        </div>

        <div className="flex gap-0.5 p-2 border-b border-border bg-surface-secondary/30" role="tablist" aria-label="Sidebar views">
          {sidebarTabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              role="tab"
              aria-selected={activeTab === id}
              aria-label={label}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-xs transition-colors ${
                activeTab === id ? "bg-accent text-white" : "text-text-tertiary hover:bg-surface-secondary"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
            </button>
          ))}
        </div>

        {activeTab === "history" && (
          <>
            <div className="p-3 border-b border-border">
              <p className="text-eyebrow text-text-tertiary mb-2">Commit History</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <List<CommitRowData>
                rowCount={commits.length}
                rowHeight={64}
                style={{ height: "100%", width: "100%" }}
                rowComponent={CommitRow}
                rowProps={{ commits, selectedIndex, onSelect: setSelectedIndex }}
              />
            </div>
            <div className="p-3 border-t border-border">
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                {[
                  { label: "Commits", value: String(stats.commitCount) },
                  { label: "Branches", value: String(stats.branchCount) },
                  { label: "Contributors", value: String(stats.contributorCount) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-lg font-bold text-text-primary">{value}</p>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="icon" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="icon" onClick={() => setSelectedIndex(0)} aria-label="Skip to start">
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button variant="icon" onClick={() => setSelectedIndex(commits.length - 1)} aria-label="Skip to end">
                  <SkipForward className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => setReplaySpeed(replaySpeed >= 4 ? 1 : replaySpeed * 2)}
                  className="px-2 py-1 text-xs font-mono text-text-secondary bg-surface-secondary border border-border rounded-md"
                  aria-label={`Speed: ${replaySpeed}x`}
                >
                  {replaySpeed}x
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === "branches" && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b border-border">
              <p className="text-eyebrow text-text-tertiary mb-2">Branches</p>
            </div>
            <BranchExplorer
              currentBranch={commits[0]?.branch || "main"}
              commits={commits}
              onSelectCommit={(sha) => {
                const idx = commits.findIndex((c) => c.sha === sha);
                if (idx >= 0) {
                  setSelectedIndex(idx);
                  setActiveTab("history");
                }
              }}
            />
          </div>
        )}

        {activeTab === "files" && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b border-border">
              <p className="text-eyebrow text-text-tertiary mb-2">File Tree</p>
            </div>
            {currentCommit && (
              <FileTreeView
                commitSha={currentCommit.sha}
                onSelectFile={(path) => {
                  const file = diffFiles?.find((f) => f.filename === path);
                  if (file) {
                    setViewMode("diff");
                  }
                }}
              />
            )}
          </div>
        )}

        {activeTab === "compare" && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b border-border">
              <p className="text-eyebrow text-text-tertiary mb-2">Compare Commits</p>
            </div>
            <CompareView commits={commits} />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-eyebrow text-text-tertiary">Settings</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">Autoplay</span>
                <button
                  onClick={() => setAutoplay(!autoplay)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    autoplay ? "bg-accent" : "bg-border"
                  }`}
                  aria-label="Toggle autoplay"
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    autoplay ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">Loop</span>
                <button
                  onClick={() => setLoop(!loop)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    loop ? "bg-accent" : "bg-border"
                  }`}
                  aria-label="Toggle loop"
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    loop ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            </div>
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-eyebrow text-text-tertiary">Data</p>
              <Button
                variant="secondary"
                className="w-full text-danger border-danger/30 hover:bg-danger/5"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={async () => {
                  if (window.confirm("Clear all local data for this repository? This cannot be undone.")) {
                    if (repoId) {
                      const { removeRecentRepo } = await import("@/lib/db");
                      await removeRecentRepo(repoId);
                    }
                    clearRepo();
                    router.push("/app");
                  }
                }}
              >
                Clear Repo Data
              </Button>
              <Button
                variant="secondary"
                className="w-full text-danger border-danger/30 hover:bg-danger/5"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={async () => {
                  if (window.confirm("Wipe all Retrace data? This will delete all cached repos and settings. This cannot be undone.")) {
                    await wipeDatabase();
                    clearRepo();
                    router.push("/app");
                  }
                }}
              >
                Wipe All Data
              </Button>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
          <div className="flex items-center gap-3 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate max-w-[300px]">
              {currentCommit.message}
            </p>
            <Badge variant="mono">{currentCommit.sha.slice(0, 7)}</Badge>
            <span className="text-xs text-text-tertiary whitespace-nowrap">
              {formatRelativeTime(currentCommit.timestamp)}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex bg-surface-secondary border border-border rounded-lg p-0.5" role="tablist" aria-label="View mode">
              <button
                onClick={() => setViewMode("split")}
                role="tab"
                aria-selected={viewMode === "split"}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "split" ? "bg-surface shadow-sm text-text-primary" : "text-text-tertiary"
                }`}
              >
                <Columns className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                Split View
              </button>
              <button
                onClick={() => setViewMode("diff")}
                role="tab"
                aria-selected={viewMode === "diff"}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "diff" ? "bg-surface shadow-sm text-text-primary" : "text-text-tertiary"
                }`}
              >
                <Code2 className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                Diff View
              </button>
            </div>

            {viewMode === "split" && previewAvailable && (
              <Button variant="icon" onClick={() => setIsImmersive(true)} aria-label="Expand split view">
                <Maximize2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {diffLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : diffError ? (
            <div className="text-center py-12">
              <p className="text-sm text-danger">{diffError}</p>
            </div>
          ) : diffFiles && diffFiles.length > 0 ? (
            viewMode === "split" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 h-full">
                <div className="md:border-r border-border md:pr-6">
                  <p className="text-eyebrow text-text-tertiary mb-3">Before This Commit</p>
                  <div className="border border-border rounded-lg overflow-hidden mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-surface-secondary/50 border-b border-border">
                      <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-danger/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EAB308]/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-success/70" />
                      </div>
                      <span className="text-[10px] text-text-tertiary font-mono mx-auto">{repoName || "localhost"}</span>
                    </div>
                    {previewAvailable && previewFiles ? (
                      <iframe
                        ref={previewIframeRef}
                        src={getPreviewUrl(getEntryPoint(
                          (Array.from(previewFiles.keys())).map((p) => ({
                            name: p.split("/").pop() || p,
                            path: p,
                            type: "blob" as const,
                          }))
                        ) || "index.html")}
                        className="w-full h-64 bg-white"
                        title="Live preview before commit"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    ) : (
                      <div className="bg-surface-secondary/30 p-8 flex items-center justify-center text-text-tertiary text-xs">
                        Live preview unavailable for this commit — requires a build step.
                      </div>
                    )}
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-eyebrow text-text-tertiary mb-2">Commit Message</p>
                    <p className="text-sm text-text-primary">
                      {currentCommit.parentShas?.length > 0
                        ? `Parent: ${currentCommit.parentShas[0]?.slice(0, 7)}`
                        : "Initial commit (no parent)"}
                    </p>
                  </div>
                </div>
                <div className="pl-6">
                  <p className="text-eyebrow text-text-tertiary mb-3">After This Commit</p>
                  <div className="border border-border rounded-lg overflow-hidden mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-surface-secondary/50 border-b border-border">
                      <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-danger/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EAB308]/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-success/70" />
                      </div>
                      <span className="text-[10px] text-text-tertiary font-mono mx-auto">{repoName || "localhost"}</span>
                    </div>
                    {previewAvailable && previewFiles ? (
                      <iframe
                        src={getPreviewUrl(getEntryPoint(
                          (Array.from(previewFiles.keys())).map((p) => ({
                            name: p.split("/").pop() || p,
                            path: p,
                            type: "blob" as const,
                          }))
                        ) || "index.html")}
                        className="w-full h-64 bg-white"
                        title="Live preview after commit"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    ) : (
                      <div className="bg-surface-secondary/30 p-8 flex items-center justify-center text-text-tertiary text-xs">
                        Live preview unavailable for this commit — requires a build step.
                      </div>
                    )}
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-eyebrow text-text-tertiary mb-2">Changed Files ({diffFiles.length})</p>
                    <div className="space-y-1">
                      {diffFiles.map((file) => (
                        <DiffFileRow key={file.filename} filename={file.filename} additions={file.additions} deletions={file.deletions} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-surface-secondary/50 border-b border-border">
                    <p className="text-sm font-medium text-text-primary">Changed Files ({diffFiles.length})</p>
                  </div>
                  <div className="divide-y divide-border">
                    {diffFiles.map((file) => (
                      <DiffFileRow key={file.filename} filename={file.filename} additions={file.additions} deletions={file.deletions} />
                    ))}
                  </div>
                </div>
                {diffFiles.map((file) =>
                  file.binary ? (
                    <div key={file.filename} className="border border-border rounded-lg p-6 text-center">
                      <p className="text-sm font-mono text-text-secondary mb-2">{file.filename}</p>
                      <p className="text-xs text-text-tertiary">Binary file changed</p>
                    </div>
                  ) : (
                    <CodeDiffPanel key={file.filename} lines={file.hunks.flatMap((h) => h.lines)} fileName={file.filename} />
                  )
                )}
              </div>
            )
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-text-tertiary">No changes in this commit</p>
            </div>
          )}
        </div>

        <TimelineScrubber
          commits={commits.map((c) => ({ sha: c.sha, message: c.message, timestamp: c.timestamp }))}
          currentIndex={selectedIndex}
          onSelect={setSelectedIndex}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          speed={replaySpeed}
          onSpeedChange={setReplaySpeed}
          loop={loop}
          onLoopChange={setLoop}
          autoplay={autoplay}
          onAutoplayChange={setAutoplay}
        />
      </div>
    </div>
    </ErrorBoundary>
  );
}
