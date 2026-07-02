"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, FolderOpen, Link, Upload, Lock, Search, HelpCircle, Menu } from "lucide-react";
import { Button } from "@/components/Button";
import { pickRepository } from "@/lib/browser";

export default function AppHome() {
  const router = useRouter();

  const handleOpenRepo = async () => {
    const handle = await pickRepository();
    if (handle) {
      router.push("/app/workspace");
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-end gap-2 px-6 py-3 border-b border-border">
        <span className="flex items-center gap-1.5 text-xs text-text-tertiary bg-surface-secondary border border-border rounded-md px-2.5 py-1.5">
          <Search className="w-3 h-3" />
          <span className="hidden sm:inline">Press </span>
          <kbd className="font-mono text-[10px] bg-surface border border-border rounded px-1 py-0.5">⌘K</kbd>
          <span className="hidden sm:inline"> to search</span>
        </span>
        <Button variant="icon" aria-label="Help">
          <HelpCircle className="w-4 h-4" />
        </Button>
        <Button variant="icon" aria-label="Menu">
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <svg
          width="160"
          height="120"
          viewBox="0 0 160 120"
          fill="none"
          className="mb-8 text-text-tertiary/40"
        >
          <path d="M30 100 L30 30 L70 30 L80 45 L130 45 L130 100 Z" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M60 30 L60 20 L100 20 L110 30" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="80" cy="65" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M80 73 L80 77" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M72 65 L80 65 L85 58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M100 40 C130 30 140 50 110 60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
          <circle cx="110" cy="60" r="2" fill="currentColor" />
          <circle cx="15" cy="60" r="8" fill="currentColor" opacity="0.3" />
          <circle cx="145" cy="50" r="10" fill="currentColor" opacity="0.15" />
        </svg>

        <h1 className="text-2xl font-bold text-text-primary mb-2">Open a repository to start</h1>
        <p className="text-sm text-text-secondary mb-10 max-w-md text-center">
          Select a local Git repository to travel through its history.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 max-w-2xl w-full mb-6">
          <button
            onClick={handleOpenRepo}
            className="border border-border rounded-xl p-5 text-left hover:bg-surface-secondary transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-accent" />
              </div>
              <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-accent transition-colors" />
            </div>
            <h3 className="font-semibold text-sm text-text-primary mb-1">Open Local Repository</h3>
            <p className="text-xs text-text-tertiary">Browse and open a repository from your computer.</p>
          </button>

          <div className="border border-border rounded-xl p-5 text-left opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-surface-secondary flex items-center justify-center">
                <Link className="w-5 h-5 text-text-tertiary" />
              </div>
              <span className="text-[10px] font-medium text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded">Coming soon</span>
            </div>
            <h3 className="font-semibold text-sm text-text-primary mb-1">Clone from GitHub</h3>
            <p className="text-xs text-text-tertiary">Clone a public repository directly in your browser.</p>
          </div>

          <div className="border border-border rounded-xl p-5 text-left opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-surface-secondary flex items-center justify-center">
                <Upload className="w-5 h-5 text-text-tertiary" />
              </div>
              <span className="text-[10px] font-medium text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded">Coming soon</span>
            </div>
            <h3 className="font-semibold text-sm text-text-primary mb-1">Open from ZIP</h3>
            <p className="text-xs text-text-tertiary">Select a repository ZIP file from your computer.</p>
          </div>
        </div>

        <div className="w-full max-w-2xl border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-surface-secondary/50 transition-colors cursor-pointer mb-8">
          <FolderOpen className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
          <p className="text-sm font-medium text-text-primary mb-1">
            Or drag and drop a folder or ZIP file here
          </p>
          <p className="text-xs text-text-tertiary">We&apos;ll handle the rest.</p>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <Lock className="w-3 h-3" />
          All processing happens locally. Your files never leave your device.
        </p>
      </div>
    </div>
  );
}
