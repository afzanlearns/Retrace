# Retrace

**Scrub through your git history like a video timeline — entirely in your browser, with your code never leaving your machine.**

Retrace lets you open a local Git repository and explore its commit history visually: drag a timeline scrubber to jump between commits, inspect diffs with a proper side-by-side viewer, and (where the project structure allows it) preview a live rendering of what the site looked like at any point in its history. No uploads, no server, no account.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Status: In development](https://img.shields.io/badge/status-in%20development-orange.svg)

---

## Why

Most tools for exploring git history assume you're comfortable with `git log -p`, `git diff`, and mentally reconstructing what a project looked like at a given point in time. That's fine for a terminal, but it's not how most people *think* about a project's history — as a story that unfolds over time, not a list of hashes.

Retrace treats commit history as a timeline you scrub through, not a log you read. Select a point, see the diff. Hit play, watch the project evolve. Compare two arbitrary points and see exactly what changed between them.

## How it works

Retrace is a **static, client-only web app** — there is no backend. It uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) to read a local repository folder directly from the browser, and [isomorphic-git](https://isomorphic-git.org/) to parse the `.git` directory's objects — commits, trees, blobs, branches — entirely client-side.

```
┌─────────────────────────────────────────────────────────┐
│                        Your browser                      │
│                                                            │
│  Local folder  ──▶  File System Access API                │
│                          │                                │
│                          ▼                                │
│                   Web Worker (isomorphic-git)              │
│                          │                                │
│                          ▼                                │
│              Parsed commits / diffs / branches             │
│                          │                                │
│              ┌───────────┴───────────┐                    │
│              ▼                       ▼                    │
│         IndexedDB cache        React UI (Next.js)          │
│      (recent repos, commit                                 │
│       cache, settings)                                      │
└─────────────────────────────────────────────────────────┘
```

Nothing above that box exists. There's no API, no server, no network request involving your code at any point.

### Key design decisions

- **Git parsing runs in a Web Worker**, not the main thread — so scrubbing through a 2,000-commit history doesn't freeze the UI. Parsed results are streamed back incrementally and the commit list is virtualized to stay smooth regardless of history size.
- **IndexedDB caches parsed history per-repo**, keyed against the current HEAD, so reopening a repository you've already indexed doesn't re-walk the entire commit history — only what's changed since last time.
- **Live preview is capability-detected, not assumed.** Rendering an arbitrary npm project's dev server entirely in-browser (à la WebContainers) is a much bigger problem than parsing git objects, and faking it would be dishonest. Retrace detects whether a commit is statically servable (plain HTML/CSS/JS, no required build step) and renders a real live preview for those; everything else falls back cleanly to the diff view, with the limitation stated plainly in the UI rather than hidden.
- **All local data is genuinely deletable.** "Your code never leaves your device" is a hollow claim if the cache silently outlives your intent to delete it — so clearing a repo's data (or wiping everything) actually drops the IndexedDB records, verified by test, not just hidden from the list.

## Features

- **Visual timeline** — a scrubber with per-commit markers and a filmstrip of thumbnails; drag to jump anywhere in history
- **Split view diffs** — before/after comparison of a commit, live-rendered where possible
- **Unified diff view** — line-level, syntax-aware, with insertion/deletion stats per file
- **Replay mode** — autoplay through the timeline at 1x/2x/4x, with loop support
- **Compare any two commits** — not just parent → child
- **Branch explorer** — see branches, their head commits, and how they relate to the current branch
- **Fully local** — nothing is uploaded, no account, no tracking
- **Dark mode**

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, static export — no server runtime) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS, custom design tokens |
| Git parsing | isomorphic-git, running in a Web Worker |
| Local storage | IndexedDB via `idb` |
| List virtualization | react-window |
| Icons | lucide-react |

## Getting started

```bash
git clone https://github.com/afzanlearns/Retrace.git
cd retrace
npm install
npm run dev
```

Then open `http://localhost:3000` in a Chromium-based browser (Chrome, Edge, or Arc — see [Browser support](#browser-support) below) and click **Open Repository**.

## Browser support

Retrace depends on the File System Access API, which is currently Chromium-only. It runs in Chrome, Edge, and Arc. Firefox and Safari don't yet implement this API — if you open Retrace in an unsupported browser, you'll see a clear message rather than a silent failure. Broader support is on the roadmap once the API's availability improves.

## Roadmap

- [ ] Clone directly from a GitHub URL (currently: open a local folder or a ZIP export)
- [ ] Export a timeline as a shareable artifact
- [ ] Full commit-graph visualization in Branch Explorer
- [ ] In-browser dev server support (WebContainers-style) for live preview of build-step projects, beyond the current static-only preview scope

## Project status

Built in three phases: (1) app shell, marketing page, repository-opening flow; (2) the git parsing engine and core commit history / diff experience; (3) live preview, replay mode, branch explorer, and polish. See [`retrace-build-prompt.md`](./retrace-build-prompt.md) for the full internal build spec.

## License

MIT
