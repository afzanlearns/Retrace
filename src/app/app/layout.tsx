"use client";

import { type ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  Sun,
  Moon,
  HelpCircle,
  Trash2,
  ChevronDown,
  Shield,
  Lock,
  Zap,
  Clock,
} from "lucide-react";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { RepoProvider, useRepo } from "@/lib/repo-context";
import { Button } from "@/components/Button";
import { RetraceLogo } from "@/lib/logo";
import { pickRepository } from "@/lib/browser";
import { useRecentRepos } from "@/hooks/useRecentRepos";
import { formatRelativeTime } from "@/lib/utils";
import { addRecentRepo } from "@/lib/db";

function AppShellContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { repos, removeRepo, refresh } = useRecentRepos();
  const { setRepo } = useRepo();

  const handleOpenRepo = useCallback(async () => {
    const handle = await pickRepository();
    if (handle) {
      const repoId = `${handle.name}_${Date.now()}`;
      setRepo(handle, repoId, handle.name);

      await addRecentRepo({
        id: repoId,
        name: handle.name,
        path: handle.name,
        lastOpened: Date.now(),
        commitCount: 0,
        handle,
      });

      refresh();
      router.push("/app/workspace");
    }
  }, [router, setRepo, refresh]);

  const handleSelectRecentRepo = useCallback(
    async (repo: (typeof repos)[0]) => {
      if (repo.handle) {
        try {
          const permission = await repo.handle.requestPermission({
            mode: "read",
          });
          if (permission === "granted") {
            setRepo(repo.handle, repo.id, repo.name);
            router.push("/app/workspace");
            return;
          }
        } catch {}
      }
      await pickRepository();
    },
    [router, setRepo]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-[280px] flex-shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <RetraceLogo size={20} />
            <span className="font-bold text-sm tracking-tight">Retrace</span>
          </div>
          <Button
            onClick={handleOpenRepo}
            className="w-full justify-between"
            leftIcon={<FolderOpen className="w-4 h-4" />}
            rightIcon={<ChevronDown className="w-4 h-4" />}
          >
            Open Repository
          </Button>
        </div>

        <div className="p-3 border-b border-border">
          <p className="text-eyebrow text-text-tertiary mb-2 px-2">
            Recent Repos
          </p>
          {repos.length === 0 ? (
            <p className="text-xs text-text-tertiary px-2">
              No repositories opened yet. Your recent repositories will appear
              here.
            </p>
          ) : (
            <div className="space-y-1">
              {repos.slice(0, 5).map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => handleSelectRecentRepo(repo)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface-secondary cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {repo.name}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      {formatRelativeTime(repo.lastOpened)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRepo(repo.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger transition-all"
                    aria-label={`Remove ${repo.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 p-3 space-y-2">
          {[
            {
              icon: Shield,
              title: "100% Local",
              desc: "Your code never leaves your machine.",
            },
            {
              icon: Lock,
              title: "Private & Secure",
              desc: "All data stays on your device.",
            },
            {
              icon: Zap,
              title: "Blazing Fast",
              desc: "Navigate history instantly.",
            },
            {
              icon: Clock,
              title: "All History",
              desc: "Explore every commit and change.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-2.5 px-2 py-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-primary">{title}</p>
                <p className="text-[11px] text-text-tertiary">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button variant="icon" aria-label="View on GitHub">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </Button>
            <Button variant="icon" aria-label="About">
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <RepoProvider>
        <AppShellContent>{children}</AppShellContent>
      </RepoProvider>
    </ThemeProvider>
  );
}
