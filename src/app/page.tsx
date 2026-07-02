"use client";

import { ArrowRight, FolderOpen, Shield, Lock, CloudOff, Clock, Columns, Shuffle, Play, GitBranch, Zap, Globe } from "lucide-react";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { FAQAccordion } from "@/components/FAQAccordion";
import { RetraceLogo } from "@/lib/logo";
import { isFileSystemAccessSupported, pickRepository } from "@/lib/browser";
import { useState } from "react";
import { useRouter } from "next/navigation";

const FEATURES = [
  { icon: Clock, title: "Visual Timeline", description: "Interactive timeline, every commit a milestone." },
  { icon: Columns, title: "File Changes", description: "Inspect diffs with a beautiful viewer." },
  { icon: Shuffle, title: "Compare Any Two Points", description: "Select any two commits, side-by-side." },
  { icon: Play, title: "Replay Mode", description: "Watch the project build itself over time." },
  { icon: GitBranch, title: "Branch Explorer", description: "Visualize branches and merges." },
  { icon: Zap, title: "Fast & Local", description: "All processing local, code never leaves your browser." },
];

const FAQ_ITEMS_LEFT = [
  {
    question: "Is my code uploaded anywhere?",
    answer: "No. All processing happens locally in your browser. Your repositories never leave your device. Retrace uses the File System Access API to read your local Git folder directly — nothing is transmitted over the network.",
  },
  {
    question: "Which browsers are supported?",
    answer: "Chromium-based browsers only (Chrome, Edge, Arc) due to the File System Access API requirement. Safari and Firefox support may come in the future.",
  },
  {
    question: "Can I use it with private repositories?",
    answer: "Yes. Retrace reads local folders directly — there's no concept of 'private' vs 'public' since nothing is transmitted anywhere. Your code stays on your machine.",
  },
];

const FAQ_ITEMS_RIGHT = [
  {
    question: "Does it work with large repositories?",
    answer: "Yes. Git parsing runs in a background Web Worker so the UI never freezes. The commit list is virtualized for smooth scrolling even with 1,000+ commits. Initial indexing may take a few seconds, but subsequent opens are fast thanks to local caching.",
  },
  {
    question: "Can I export my timeline or data?",
    answer: "Not yet, but it's on the roadmap. We're planning to add export options in a future update.",
  },
  {
    question: "Is it free?",
    answer: "Yes, Retrace is fully free and open source.",
  },
];

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [browserSupported] = useState(isFileSystemAccessSupported);

  const handleOpenRepo = async () => {
    if (!browserSupported) {
      alert("Retrace requires a Chromium-based browser (Chrome, Edge, or Arc). Please switch to a supported browser.");
      return;
    }
    const handle = await pickRepository();
    if (handle) {
      router.push("/app");
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RetraceLogo size={22} />
            <span className="font-bold text-base tracking-tight">Retrace</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-text-primary transition-colors">How it works</a>
            <a href="#faq" className="hover:text-text-primary transition-colors">FAQ</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">GitHub</a>
          </div>
          <Button onClick={handleOpenRepo} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Open Repository
          </Button>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="default" className="mb-5">
              <span className="w-2 h-2 rounded-full bg-success mr-2 inline-block" />
              Your code. Your history. Stay local.
            </Badge>
            <h1 className="text-[40px] leading-[1.1] font-bold tracking-tight text-text-primary mb-5">
              Time travel through your codebase.
            </h1>
            <p className="text-base text-text-secondary leading-relaxed max-w-md mb-8">
              Open any local Git repository and scrub through its commit history like a video timeline. View diffs, compare commits, and explore your project&apos;s evolution — entirely in your browser, entirely offline.
            </p>
            <div className="flex items-center gap-3 mb-10">
              <Button onClick={handleOpenRepo} leftIcon={<FolderOpen className="w-4 h-4" />}>
                Open Repository
              </Button>
              <Button variant="secondary" leftIcon={<GithubIcon className="w-4 h-4" />}>
                View on GitHub
              </Button>
            </div>
            <div className="flex items-center gap-6 text-xs text-text-tertiary">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> 100% Local</span>
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Private &amp; Secure</span>
              <span className="flex items-center gap-1.5"><CloudOff className="w-3.5 h-3.5" /> No Uploads</span>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-surface">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-secondary/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-danger/70" />
                  <div className="w-3 h-3 rounded-full bg-[#EAB308]/70" />
                  <div className="w-3 h-3 rounded-full bg-success/70" />
                </div>
                <span className="text-[11px] text-text-tertiary font-mono mx-auto">
                  my-portfolio · main · 187 commits
                </span>
                <div className="w-14" />
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between px-1">
                  {["Initial commit", "Add hero section", "Dark mode", "Refactor UI", "Latest"].map((label, i) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${i === 3 ? "bg-accent ring-2 ring-accent/30" : "bg-border"}`} />
                      <span className={`text-[10px] ${i === 3 ? "text-accent font-medium" : "text-text-tertiary"}`}>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="border border-border rounded-lg p-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      {["src/index.ts", "src/app.tsx", "src/components/Hero.tsx", "styles/main.css"].map((f) => (
                        <div key={f} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-text-secondary flex-1 truncate">{f}</span>
                          <span className="text-success">+12</span>
                          <span className="text-danger">-4</span>
                          <div className="w-12 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                            <div className="h-full w-3/4 bg-success rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="w-px bg-border" />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-text-primary">Add hero section with animations</p>
                        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
                          <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-accent">JK</span>
                          </div>
                          <span>Jane Kim</span>
                          <span>· 2 days ago</span>
                        </div>
                      </div>
                      <a href="#" className="block text-xs text-accent font-medium hover:underline mt-2">View all changes →</a>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`flex-1 h-14 rounded-md ${i === 4 ? "ring-2 ring-accent" : ""} bg-surface-secondary border border-border`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border bg-surface-secondary/50">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-[32px] leading-[1.2] font-bold tracking-tight text-text-primary mb-3">
              Everything you need to understand your project
            </h2>
            <p className="text-text-secondary text-base max-w-lg mx-auto">
              Explore your repository&apos;s history with powerful tools designed for developers.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-surface border border-border rounded-xl p-6 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1.5">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <p className="text-eyebrow text-accent mb-3">How it works</p>
            <h2 className="text-[32px] leading-[1.2] font-bold tracking-tight text-text-primary">
              Explore your repository in 3 simple steps
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              {[
                { num: 1, title: "Open your repository", desc: "Choose a local Git repo, everything stays local." },
                { num: 2, title: "We analyze the history", desc: "Parses commits, files, and changes instantly in your browser." },
                { num: 3, title: "Explore & time travel", desc: "Navigate the timeline, inspect changes, compare commits, replay history." },
              ].map(({ num, title, desc }) => (
                <div key={num} className="flex gap-5">
                  <div className="w-10 h-10 rounded-full bg-dark-surface text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {num}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">{title}</h3>
                    <p className="text-sm text-text-secondary">{desc}</p>
                  </div>
                </div>
              ))}
              <div className="bg-surface-secondary border border-border rounded-xl p-5 flex items-start gap-3">
                <Lock className="w-5 h-5 text-text-tertiary mt-0.5" />
                <p className="text-sm text-text-secondary">
                  Your data never leaves your device. It&apos;s private, secure, and 100% yours.
                </p>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-secondary/50">
                  <span className="text-xs font-mono text-text-tertiary">‹› my-portfolio · main · 187 commits</span>
                  <div className="flex gap-2">
                    <span className="text-xs px-3 py-1 rounded-md bg-surface border border-border text-text-secondary">Compare</span>
                    <span className="text-xs px-3 py-1 rounded-md bg-surface border border-border text-text-secondary">Replay</span>
                    <span className="text-xs px-2 py-1 rounded-md bg-surface border border-border text-text-secondary">⋯</span>
                  </div>
                </div>
                <div className="flex">
                  <div className="w-1/3 border-r border-border p-3 space-y-2">
                    {["feat: add hero section", "fix: header alignment", "refactor: utils", "Initial commit"].map((msg) => (
                      <div key={msg} className="p-2 rounded-md bg-surface-secondary/50 text-xs font-mono text-text-secondary truncate">
                        {msg}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 p-4">
                    <div className="border border-border rounded-md overflow-hidden font-mono text-xs">
                      {["-    return <div>Old hero</div>", "+    return <div>New hero</div>"].map((l, i) => (
                        <div key={i} className={`px-3 py-1 ${i === 0 ? "bg-[#FEE2E2]/50" : "bg-[#DCFCE7]/50"}`}>
                          <span className="text-text-tertiary mr-3">{i + 1}</span>
                          <span className={i === 0 ? "text-danger" : "text-success"}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-border bg-surface-secondary/50">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-[32px] leading-[1.2] font-bold tracking-tight text-text-primary mb-3">
              Frequently asked questions
            </h2>
            <p className="text-text-secondary text-base">
              Everything you need to know about Retrace.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <FAQAccordion items={FAQ_ITEMS_LEFT} />
            <FAQAccordion items={FAQ_ITEMS_RIGHT} />
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <div className="bg-dark-surface rounded-2xl p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              Ready to explore your code history?
            </h2>
            <Button onClick={handleOpenRepo} className="bg-white text-dark-surface hover:bg-white/90" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open Repository
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <RetraceLogo size={20} />
                <span className="font-bold text-sm">Retrace</span>
              </div>
              <p className="text-xs text-text-tertiary mb-4">Time travel through your codebase.</p>
              <div className="flex gap-3">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-text-primary transition-colors" aria-label="GitHub">
                  <GithubIcon className="w-4 h-4" />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-text-primary transition-colors" aria-label="Twitter / X">
                  <TwitterIcon className="w-4 h-4" />
                </a>
                <a href="#" className="text-text-tertiary hover:text-text-primary transition-colors" aria-label="Website">
                  <Globe className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-text-primary mb-4 uppercase tracking-wider">Product</h4>
              <div className="space-y-3 text-sm text-text-secondary">
                <a href="#features" className="block hover:text-text-primary">Features</a>
                <a href="#how-it-works" className="block hover:text-text-primary">How it works</a>
                <a href="#faq" className="block hover:text-text-primary">FAQ</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-text-primary mb-4 uppercase tracking-wider">Resources</h4>
              <div className="space-y-3 text-sm text-text-secondary">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="block hover:text-text-primary">GitHub</a>
                <a href="#" className="block hover:text-text-primary">Privacy</a>
                <a href="#" className="block hover:text-text-primary">Terms</a>
              </div>
            </div>
            <div className="bg-dark-surface rounded-xl p-6">
              <h3 className="text-base font-semibold text-white mb-2">Ready to explore your code history?</h3>
              <Button onClick={handleOpenRepo} className="bg-white text-dark-surface hover:bg-white/90 mt-2" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Open Repository
              </Button>
            </div>
          </div>
          <div className="border-t border-border mt-10 pt-6 text-center text-xs text-text-tertiary">
            &copy; {new Date().getFullYear()} Retrace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
