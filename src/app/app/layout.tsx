"use client";

import {
  createContext,
  useContext,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  Trash2,
  ChevronDown,
  Shield,
  Lock,
  Zap,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { RepoProvider, useRepo } from "@/lib/repo-context";
import { Button } from "@/components/Button";
import { useRecentRepos } from "@/hooks/useRecentRepos";
import { formatRelativeTime } from "@/lib/utils";

const SidebarContext = createContext<{
  collapsed: boolean;
  toggle: () => void;
}>({ collapsed: false, toggle: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

function AppShellContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  useTheme();
  const { repos, removeRepo } = useRecentRepos();
  const { setRepo, requestAccess } = useRepo();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleOpenRepo = useCallback(async () => {
    const handle = await requestAccess();
    if (handle) {
      router.push("/app/workspace");
    }
  }, [router, requestAccess]);

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
      // Permission not cached — go through consent flow
      const handle = await requestAccess();
      if (handle) {
        router.push("/app/workspace");
      }
    },
    [router, setRepo, requestAccess]
  );

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  return (
    <SidebarContext.Provider
      value={{ collapsed: sidebarCollapsed, toggle: toggleSidebar }}
    >
      <div className="flex h-screen overflow-hidden bg-background relative">
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/45 z-30 md:hidden transition-opacity duration-200"
            onClick={toggleSidebar}
          />
        )}
        <aside
          className={`${
            sidebarCollapsed
              ? "w-0 overflow-hidden"
              : "fixed inset-y-0 left-0 w-[280px] z-40 shadow-xl md:relative md:w-[280px] md:shadow-none"
          } flex-shrink-0 border-r border-border bg-surface flex flex-col transition-all duration-200`}
        >
          <div className="p-4 border-b border-border">
            <Link
              href="/"
              className="flex items-center gap-2 mb-4 no-underline text-text-primary hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            >
              <span className="font-bold text-sm tracking-tight">Retrace</span>
            </Link>
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
                <div
                  key={repo.id}
                  onClick={() => handleSelectRecentRepo(repo)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectRecentRepo(repo);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface-secondary cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                    className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger transition-all flex-shrink-0"
                    aria-label={`Remove ${repo.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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

        <div className="p-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
          <a
            href="https://github.com/afzanlearns/Retrace"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button
              variant="secondary"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3.5 h-3.5 text-text-secondary"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </Button>
          </a>
          <Button
            variant="icon"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="flex-shrink-0 text-text-primary hover:text-accent hover:border-accent/30"
          >
            <PanelLeftClose className="w-4.5 h-4.5" />
          </Button>
        </div>
      </aside>
      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center text-text-primary hover:text-accent hover:bg-surface-secondary rounded-r-lg transition-all duration-200 z-50 border border-l-0 border-border bg-surface shadow-sm cursor-pointer"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
      </div>
    </SidebarContext.Provider>
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
