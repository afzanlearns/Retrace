"use client";

import { useState, useEffect } from "react";
import { Folder, File, ChevronRight, ChevronDown } from "lucide-react";
import { getGitService } from "@/workers/git-service";

interface FileTreeEntry {
  name: string;
  path: string;
  type: "blob" | "tree";
}

interface TreeNode {
  name: string;
  path: string;
  type: "blob" | "tree";
  children: TreeNode[];
}

interface FileTreeViewProps {
  commitSha: string;
  onSelectFile: (path: string) => void;
}

function buildTree(entries: FileTreeEntry[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const entry of entries) {
    const parts = entry.path.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existing = currentLevel.find((n) => n.name === part);

      if (existing) {
        if (isLast) {
          existing.type = entry.type;
        }
        currentLevel = existing.children;
      } else {
        const node: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          type: isLast ? entry.type : "tree",
          children: [],
        };
        currentLevel.push(node);
        currentLevel = node.children;
      }
    }
  }

  return root;
}

function TreeNodeItem({
  node,
  depth,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  onSelectFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (node.type === "tree") {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-secondary text-xs text-text-secondary transition-colors"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
          )}
          <Folder className="w-3.5 h-3.5 text-accent/70 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && (
          <div>
            {node.children.map((child, i) => (
              <TreeNodeItem
                key={`${child.path}-${i}`}
                node={child}
                depth={depth + 1}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-secondary text-xs text-text-secondary transition-colors"
      style={{ paddingLeft: `${8 + depth * 16 + 16}px` }}
    >
      <File className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTreeView({
  commitSha,
  onSelectFile,
}: FileTreeViewProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const service = getGitService();
        const entries = await service.getFileTree(commitSha);
        if (!cancelled) setTree(buildTree(entries));
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load file tree");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [commitSha]);

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-text-tertiary">
        Loading file tree...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-danger">{error}</div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-text-tertiary">
        No files found
      </div>
    );
  }

  return (
    <div className="p-2 overflow-y-auto max-h-full">
      {tree.map((node, i) => (
        <TreeNodeItem
          key={`${node.path}-${i}`}
          node={node}
          depth={0}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}
