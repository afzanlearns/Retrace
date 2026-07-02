# Retrace — Full Build Specification for Coding Agent

## 0. Read this first

You are building **Retrace**, a 100% client-side, local-only web app that lets a
user open a local Git repository folder in the browser and "scrub" through its commit
history like a video timeline — viewing diffs, comparing commits, and (where possible)
seeing a live rendered preview of the project at any point in history.

**Hard constraints:**
- No backend server. No API routes that talk to a remote service. No file uploads anywhere.
- All git parsing happens in-browser against the user's local folder via the
  **File System Access API**.
- Any persistence (caching parsed commit data, user preferences, "recent repos" list)
  happens in **IndexedDB**, scoped entirely to the browser, never leaves the device.
- The user must be able to fully delete all locally stored data for a given repo (or all
  repos) from within the UI — this must actually wipe the IndexedDB records, not just hide
  them.
- This is a Chromium-only feature set (Chrome/Edge/Arc). The app must detect unsupported
  browsers and show a clear, friendly fallback message rather than silently failing.

Build this in **three phases**, described in full at the bottom of this document. Do not
skip ahead — each phase should be a working, deployable state of the app.

---

## 1. Tech stack

- **Next.js 14+ (App Router), statically exported** (`output: 'export'` in `next.config.js`).
  There is no server runtime — this is purely a static site that happens to be built with
  Next.js/React for component ergonomics and routing. Do not use server components that
  require a Node runtime, server actions, or API routes for core functionality.
- **TypeScript** throughout, strict mode on.
- **Tailwind CSS** for styling, using a custom design token setup (see Section 3).
- **isomorphic-git** (npm package) for in-browser git object parsing (reading commits,
  trees, blobs, diffs, branches) — it works against an in-memory or IndexedDB-backed
  filesystem shim. Pair it with **`@isomorphic-git/lightning-fs`** or a custom adapter that
  bridges the File System Access API `FileSystemDirectoryHandle` to the `fs` interface
  isomorphic-git expects. (If bridging directly proves too fragile, an acceptable fallback
  is to read the raw `.git` objects yourself off the FileSystemDirectoryHandle and feed them
  to isomorphic-git's lower-level plumbing functions — favor whichever integration path is
  more reliable in testing.)
- **idb** (small IndexedDB wrapper library) for local storage of cached commit metadata,
  diff caches, recent-repos list, and app settings.
- **react-window** or similar for virtualized long lists (commit list can be 1,000+ items).
- A **Web Worker** for git parsing/diffing so the main thread and UI never freeze on large
  repos.
- Icon set: **lucide-react** (matches the thin line-icon style described in the design
  section below).
- No CSS-in-JS, no component libraries like MUI — hand-build components with Tailwind to
  match the described design system exactly.

---

## 2. Information architecture / data model

### 2.1 Core concepts
- **Repository session**: a `FileSystemDirectoryHandle` the user has granted access to,
  identified by a stable-ish key (folder name + a hash of the first commit's SHA, since
  handles themselves can't be persisted across sessions in all browsers — see 2.3).
- **Commit**: parsed from `.git` — SHA, message, author name, author avatar (generate a
  deterministic identicon locally; do not fetch from Gravatar or any network service),
  timestamp, parent SHA(s), changed files with insertion/deletion counts.
- **Branch**: name, head SHA, whether it's the current branch.
- **Diff**: for a given commit (vs. its parent) or between two arbitrary commits — list of
  changed files, each with a unified diff / line-level before-after content.

### 2.2 IndexedDB schema (via `idb`)
Create a database `retrace` with object stores:
- `recentRepos` — `{ id, name, path (display only), lastOpened, commitCount }`
- `commitCache:<repoId>` — cached parsed commit list per repo, so re-opening a previously
  opened folder doesn't require re-walking the whole history (still re-validate against the
  current HEAD SHA and invalidate/refresh if it's changed).
- `settings` — theme preference, autoplay/loop defaults, etc.

### 2.3 Re-opening repos
`FileSystemDirectoryHandle` objects can be stored **directly** in IndexedDB in supporting
browsers (Chrome supports structured-clone of handles). Store the handle itself in
`recentRepos`, and on re-open, call `handle.requestPermission({ mode: 'read' })` to
re-request access before use. If permission is denied or the handle is stale, show the
"Recent repo — click to re-grant access" state rather than an error.

### 2.4 Deleting data
Provide a "Clear local data" action, scoped per-repo (deletes that repo's cache +
recent-repos entry + stored handle) and globally (wipes the entire `retrace`
IndexedDB database via `indexedDB.deleteDatabase`). Confirm with a destructive-action
dialog before wiping. This must be reachable both from the landing page (per recent-repo
row hover action) and from an in-app Settings panel (see 3.4, gear icon).

---

## 3. Design system (read carefully — the agent cannot see the reference images, so this is a full textual spec)

### 3.1 Overall visual language
Clean, light, professional SaaS-developer-tool aesthetic. Think Linear / Vercel dashboard,
NOT playful or colorful. Mostly monochrome (near-black, whites, grays) with a single blue
accent color used sparingly for links, active states, and one highlighted CTA button per
screen. Generous whitespace, soft rounded corners (8–12px), subtle borders instead of heavy
shadows, small soft drop shadows only on floating/elevated surfaces like the app window
mockup or dropdowns.

### 3.2 Design tokens (Tailwind theme)
```
colors:
  background:      #FAFAFA   (very light warm gray, page background)
  surface:          #FFFFFF   (cards, panels)
  surface-secondary:#F5F5F4   (subtle inset panels, hover states)
  border:           #E7E5E4   (hairline borders throughout)
  text-primary:     #18181B   (near-black, headings/body)
  text-secondary:   #71717A   (muted gray, descriptions/meta text)
  text-tertiary:    #A1A1AA   (timestamps, placeholder text)
  accent:           #2563EB   (blue — links, active nav, focus rings)
  accent-hover:     #1D4ED8
  success:          #16A34A   (added lines / insertion stats, green)
  danger:           #DC2626   (removed lines / deletion stats, red)
  dark-surface:     #18181B   (near-black, used for primary buttons and the
                                code-editor-style panels e.g. dark mode toggle areas)

radius:
  sm: 6px   md: 8px   lg: 12px   xl: 16px   pill: 999px (for tags/badges)

font:
  family: Inter (or system-ui fallback stack) for all UI text
  monospace: "JetBrains Mono" or "Fira Code" fallback to ui-monospace, for code/diff panels,
             commit SHAs, and file paths
  scale: display 40px/1.1 bold — h1 32px/1.2 bold — h2 20px/1.3 semibold —
         body 15px/1.5 regular — small 13px/1.4 regular — micro 12px/1.4 medium (uppercase,
         letter-spacing 0.05em, used for section eyebrow labels and stat labels)

spacing: base unit 4px; primary layout gutters at 24px/32px; card padding 24px;
         section vertical rhythm 80–120px on the marketing page
```

### 3.2a Logo & brand mark
Do not use a literal clock as the primary logo (too generic/on-the-nose, and it no longer
matches the product name). Use a mark built around **retracing a path**: e.g. a looping
arrow that curves back on itself, or a dotted/dashed trail line that folds back into a
solid line (visually implying "tracing back over ground already covered"). Keep it a single
color (near-black in light mode, near-white in dark mode), simple enough to render crisply
at 20–24px in the nav bar. The empty-state hero illustration (3.5) should follow the same
motif — replace the "folder with a clock face" concept with a folder icon that has a small
looping/retrace-arrow badge on it instead, keeping the same muted pastel, geometric,
non-photorealistic style and the flanking tree/sunrise shapes.

### 3.3 Shared components to build
- **Button**: primary (dark-surface bg, white text, rounded-md, 10px/16px padding),
  secondary (white bg, border, dark text), and icon-button (square, border, icon centered)
  variants. Primary buttons carry a small leading icon + trailing arrow icon on marketing
  CTAs.
- **Badge/pill**: small rounded-pill tag used for commit short-SHA (monospace, gray bg) and
  branch name.
- **Avatar**: 24–32px circular, generated identicon (deterministic geometric pattern from a
  hash of the author name/email — build a small local identicon generator, no network
  calls).
- **Timeline scrubber** (the signature component — build this carefully): a horizontal
  track with a thin line, evenly spaced dots for each commit, the currently-selected commit
  shown as a larger filled dot with a floating tooltip above it showing relative time (e.g.
  "2 days ago"). Below the track, a horizontal filmstrip of small rounded-rectangle
  thumbnail cards (one per commit, or per meaningful interval on large histories), each
  showing a tiny label (commit message excerpt + relative time) and a placeholder
  screenshot area. The currently-selected thumbnail has a blue 2px border/ring. Playback
  controls sit to the left: play/pause, skip-to-start, skip-to-end, and a speed toggle
  (1x/2x/4x cycling on click), plus Auto-play and Loop toggle switches. A zoom slider and
  "fit to screen" icon sit at the far right of the scrubber row.
- **Diff file row**: filename (monospace, truncated with ellipsis in the middle if long, not
  the end), right-aligned green "+N" and red "-N" counts, and a thin horizontal bar
  visualizing the ratio of additions (green) to deletions (red) segment-style, similar to
  GitHub's diff stat bars.
- **Code diff panel**: line-numbered, monospace, added lines have a light green background
  (`#DCFCE7`) with a `+` gutter marker, removed lines have a light red background
  (`#FEE2E2`) with a `-` gutter marker, unchanged context lines are plain white/gray text.

### 3.4 Screen 1 — Landing / marketing page (unauthenticated, no repo open yet)
Purpose: explain the product and drive the user to open a repo. Structure top to bottom:

1. **Top nav bar**: left — small logo mark (a looping/retracing path or dotted-trail icon,
   not a literal clock — see Section 3.2a) + "Retrace" wordmark
   (bold, 16px). Center-right — text nav links: Features, How it works, FAQ, GitHub. Far
   right — a dark primary button "Open Repository →".
2. **Hero section**: two-column layout.
   - Left column: a small green-dot "status pill" reading "Your code. Your history. Stay
     local." above a large bold headline "Time travel through your codebase." (headline
     wraps to two lines), a paragraph of muted gray subtext explaining the product in ~2
     sentences, then a button row: dark primary button "Open Repository" (folder icon) and
     a white secondary button "View on GitHub" (github icon). Below that, a row of three
     small trust indicators with icons: "100% Local" (shield), "Private & Secure" (lock),
     "No Uploads" (no-upload/cloud-slash icon) — small gray text, muted icons.
   - Right column: a browser-chrome-style mock window (rounded corners, three traffic-light
     dots top-left, a center label showing "my-portfolio · main · 187 commits"). Inside:
     a horizontal timeline strip with 4–5 labeled tick marks (dates + short commit labels
     like "Initial commit", "Add hero section", "Dark mode", "Refactor UI", "Latest"), a
     two-column "Changed Files" / "Commit Message" summary panel below it (file list with
     +N line-count badges on the left, commit message + author avatar + name + relative
     time on the right), a "View all changes →" link, and at the very bottom a row of 6
     small rounded thumbnail previews representing the project timeline, with one
     highlighted by a blue border as the "current" position.
3. **Features section** ("Everything you need to understand your project" — centered
   heading + muted subheading). A 3-column, 2-row grid of 6 feature cards, each: a small
   rounded-square icon tile (light blue bg, blue icon) top-left, bold feature title, 1–2
   line muted description. The six features: **Visual Timeline** (clock icon — interactive
   timeline, every commit a milestone), **File Changes** (side-by-side/columns icon —
   inspect diffs with a beautiful viewer), **Compare Any Two Points** (shuffle/compare
   icon — select any two commits, side-by-side), **Replay Mode** (play icon — watch the
   project build itself over time, smooth playback), **Branch Explorer** (git-branch icon —
   visualize branches/merges), **Fast & Local** (search/lightning icon — all processing
   local, code never leaves the browser).
4. **"How it works" section**: eyebrow label "How it works" + heading "Explore your
   repository in 3 simple steps". Two-column layout: left is a vertical numbered list of 3
   steps, each with a filled dark circular number badge, bold title, muted description —
   **1. Open your repository** (choose a local Git repo, everything stays local),
   **2. We analyze the history** (parses commits/files/changes instantly in your browser),
   **3. Explore & time travel** (navigate timeline, inspect changes, compare commits, replay
   history). Below the steps, a small callout card with a lock icon: "Your data never
   leaves your device. It's private, secure, and 100% yours." Right column: a large
   screenshot-style mock of the actual app workspace (commit list sidebar on the left inside
   the mock, code diff on the right, showing an example `Hero.tsx` diff with green-added /
   red-removed lines) inside a rounded bordered panel with a top toolbar (breadcrumb "‹›
   my-portfolio · main · 187 commits", "Compare" and "Replay" buttons, overflow menu).
5. **FAQ section**: centered heading "Frequently asked questions" + muted subheading. Two
   columns of accordion rows (collapsed by default, chevron-down icon that rotates on
   expand). Questions to include, left column: "Is my code uploaded anywhere?" (answer: no,
   all processing happens locally in your browser, repos never leave your device), "Which
   browsers are supported?" (Chromium-based browsers only, due to the File System Access
   API — Chrome, Edge, Arc; note Safari/Firefox support may come later), "Can I use it with
   private repositories?" (yes — it reads local folders directly, there's no concept of
   "private" vs "public" since nothing is transmitted). Right column: "Does it work with
   large repositories?" (yes, parsing runs in a background worker and lists are virtualized;
   very large histories may take a few seconds to index on first open, then are cached
   locally), "Can I export my timeline or data?" (state this as a roadmap item — not yet,
   but planned), "Is it free?" (yes, fully free and open source).
6. **Footer**: 4-column layout — brand column (logo + name + tagline + 3 small social/icon
   links: GitHub, Twitter/X, a globe/website icon), "Product" link column (Features, How it
   works, FAQ), "Resources" link column (GitHub, Privacy, Terms), and a highlighted card
   column with dark rounded background: "Ready to explore your code history?" + a dark
   primary "Open Repository →" button. Bottom bar: centered copyright line.

### 3.5 Screen 2 — Empty state / "Open a repository" screen (post-nav, pre-workspace)
This is what shows immediately inside the app shell before any repo is opened. Persistent
left sidebar (narrower than the workspace sidebar, ~280px):
- Top: logo + wordmark, then a full-width dark "Open Repository" button with a dropdown
  chevron.
- "RECENT REPOS" section label (micro/eyebrow style) followed by either a list of
  previously-opened repos (name, path, last-opened relative time, small trash icon on
  hover to delete that repo's local data) or, if none exist yet, muted placeholder text:
  "No repositories opened yet. Your recent repositories will appear here."
- A divider, then 4 stacked info rows, each with a square icon tile + bold title + 1-line
  muted description: **100% Local** (your code never leaves your machine), **Private &
  Secure** (all data stays on your device, nothing is uploaded), **Blazing Fast** (navigate
  history instantly with local processing), **All History** (explore every commit, branch,
  and change over time).
- Bottom-left: a small row of 3 icon buttons — theme toggle (sun/moon), GitHub link, info/
  about.

Main content area (right of sidebar): top-right utility bar with a "⌘K" command-palette
hint pill, a help/question-mark icon button, and a hamburger/menu icon button. Centered in
the main area: a soft illustration (a folder icon with the small retrace-arrow badge from
Section 3.2a on it, flanked
by simple tree shapes and a rising-sun shape behind, all in muted pastel tones — this can
be a custom inline SVG, keep it simple and geometric, not photorealistic), below it a bold
heading "Open a repository to start", muted subtext "Select a local Git repository to
travel through its history." Below that, a row of 3 equal-width bordered cards, each with a
square icon tile, bold title + trailing arrow icon on the same line, and 1-line muted
description: **Open Local Repository** (folder icon — browse and open a repository from
your computer) → triggers `window.showDirectoryPicker()`, **Clone from GitHub** (link icon
— clone a public repository directly in your browser) → for Phase 3, can use isomorphic-git's
HTTP clone against a CORS proxy or be marked "Coming soon" if a reliable clone path isn't
available, **Open from ZIP** (upload/download icon — select a repository ZIP file from your
computer) → unzip client-side (e.g. with `fflate`) into an in-memory fs. Below the 3 cards,
a full-width dashed-border drop-zone: folder icon, "Or drag and drop a folder or ZIP file
here", "We'll handle the rest." At the very bottom, a centered small lock-icon note: "All
processing happens locally. Your files never leave your device."

### 3.6 Screen 3 — Main workspace (repo open, this is the core product)
Full-height 3-region layout: left sidebar (fixed ~300px), main diff/preview area (flexible
width), bottom timeline scrubber bar (fixed height, spans main area width, not under the
sidebar).

**Left sidebar:**
- Top: logo + wordmark row (compact).
- "Open Local Repository" button (secondary style now, since a repo is already open) — lets
  the user switch repos.
- Repo identity block: bold repo name (e.g. "acme-portfolio"), muted path below it (e.g.
  "~/Projects/acme-portfolio"), a chevron for a dropdown (recent repos / switch).
- Branch selector row: git-branch icon + current branch name ("main") + dropdown chevron,
  right-aligned muted "187 commits" count.
- A row of 4 icon-tab buttons (small square toggle buttons, active one has a filled/blue
  background): clock icon (Commit History view — default/active), branch-graph icon
  (Branch Explorer view), file icon (File Tree view), gear icon (Settings — houses theme,
  and the "clear local data" destructive actions from Section 2.4).
- "COMMIT HISTORY" eyebrow label, then a **virtualized scrollable list** of commits, each
  row: commit message (bold, truncate at one line), short SHA (monospace gray pill) + 
  relative time on the second line. The currently-selected commit row has a light blue-tint
  background and a small blue vertical bar/dot on its left edge connecting visually to the
  row above/below (implying the git graph line running down the sidebar).
- Below the list, a "Repository Stats" panel (3-column stat block): commit count, branch
  count, contributor count — each a bold large number over a small muted label.
- Bottom playback control cluster (mirrors the scrubber's controls for convenience): play
  button (dark filled square), skip-to-start, skip-to-end, speed toggle chip ("1x"),
  "Auto-play" label + toggle switch (on by default, blue when on), "Loop" label + toggle
  switch (off by default).

**Top toolbar (above main area, spans main area width):**
- Left: breadcrumb-style current commit context — commit message (bold), short-SHA pill,
  relative time, author avatar + name.
- Right: a segmented control with two options **Split View** (side-by-side before/after,
  default/active — shown with a light background pill) and **Diff View** (unified
  inline diff), then an export/share icon button and an overflow "…" menu button.

**Main area — Split View (default):**
Two equal-width panels side by side, separated by a vertical divider with a centered
"→" arrow badge floating on it (visually: "before" flows into "after").
- Left panel header: "BEFORE THIS COMMIT" (small eyebrow label). Below it, a mock browser
  window: 3 traffic-light dots + a fake URL bar showing `http://localhost:5173`, then the
  actual rendered preview of the site at the parent commit. Below the preview frame, a
  bordered card: "Commit Message" eyebrow label + the parent commit's message text.
- Right panel header: "AFTER THIS COMMIT" eyebrow label. Same mock browser window structure
  showing the rendered preview at the selected commit. Below it, a bordered "Changed Files
  (N)" card: a list of changed file rows (filename, +N/-N counts, ratio bar) as described in
  3.3.
- **Live preview rendering scope (important, see Section 4)**: this side-by-side live
  iframe preview only works reliably for statically-servable projects. For anything needing
  a build step, replace the mock browser window content with a clearly-labeled placeholder
  ("Live preview unavailable for this commit — requires a build step. Showing file diff
  instead.") and fall through to the diff view below automatically.

**Main area — Diff View (toggle):**
Single-column unified diff. Top: file list (same diff-file-row component as above,
clickable to jump). Below: the selected file's line-numbered code diff panel as described
in 3.3, with a collapsible/expandable long-file affordance (only show ~30 lines of context
around changes by default, "Show N unchanged lines" expander between hunks).

**Bottom timeline scrubber bar:** the full Timeline Scrubber component from 3.3, spanning
the width of the main content area (not the sidebar). Includes the filmstrip thumbnails
row, zoom slider, and fit-to-screen control on the far right.

### 3.7 Dark mode
Support a dark theme (toggle in sidebar/settings). Dark tokens: background `#0A0A0B`,
surface `#18181B`, surface-secondary `#27272A`, border `#3F3F46`, text-primary `#FAFAFA`,
text-secondary `#A1A1AA`. Keep the accent blue, success green, and danger red roughly the
same hue but slightly desaturated/brightened for contrast on dark backgrounds. Persist the
choice in the `settings` IndexedDB store.

---

## 4. Known technical risks and required solutions (do not skip these)

1. **"Live preview" cannot realistically build arbitrary JS projects entirely client-side
   for v1.** Solution: implement a **preview capability detector** per commit — if the
   commit's tree contains a recognizable static-servable shape (plain `index.html` at root
   or in a common output-ish folder, no `package.json` requiring a bundler, or a
   `package.json` with no `build` script), serve it directly via a Blob-URL-backed virtual
   file server into the iframe. Otherwise, mark that commit as "diff-only" and skip the live
   iframe, falling back to the diff panel as the primary view. Be explicit about this
   limitation in the UI (see 3.6) rather than trying to fake a build.
   *(A stretch-goal Phase 4, not required now, would be integrating something like
   WebContainers to actually run a dev server in-browser for npm-based projects — call this
   out as a documented future enhancement, do not attempt it in Phases 1–3.)*
2. **File System Access API is Chromium-only.** Solution: feature-detect
   `window.showDirectoryPicker` on load; if absent, replace the "Open Repository" CTA
   behavior with an inline banner explaining the browser isn't supported, listing Chrome/
   Edge/Arc as alternatives, and still let the marketing page render normally.
3. **Large repos (1,000+ commits) must not freeze the UI.** Solution: all isomorphic-git
   walking/diffing happens in a Web Worker; the main thread receives incremental batches and
   renders the commit list virtualized (react-window); show a lightweight progress indicator
   ("Indexing commit 340 / 1,872…") during first-open indexing, then rely on the IndexedDB
   cache for subsequent opens (only re-walk new commits since the cached HEAD).
4. **Re-granting folder access across sessions.** Solution as described in 2.3 — store the
   handle, re-request permission on reopen, and design the "Recent Repos" UI to clearly
   show a "click to re-grant access" affordance for repos that need it, rather than an
   error state.
5. **Binary files in diffs** (images, fonts). Solution: detect binary content and render a
   "Binary file changed" row with file size before/after instead of attempting a text diff;
   for image assets specifically, show a small side-by-side thumbnail comparison since
   that's cheap and high-value (e.g. the `hero-bg.png` example file in the design).
6. **Permanent deletion correctness.** Solution: write and run a simple test that opens a
   repo, confirms cache entries exist in IndexedDB, calls the delete action, and asserts the
   relevant object store entries are gone — don't just trust the UI removing a list item.

---

## 5. Build phases

### Phase 1 — Shell, marketing page, and repo-opening flow
- Scaffold Next.js + TypeScript + Tailwind with the design tokens from Section 3.2.
- Build the full marketing/landing page (Section 3.4) as a static route, fully responsive,
  with working FAQ accordions and smooth-scroll nav links. No repo logic needed here yet.
- Build the app shell: sidebar + main area layout skeleton, theme toggle wired to
  IndexedDB `settings`, dark mode fully working across both states.
- Build the empty state screen (Section 3.5), wire up "Open Local Repository" to
  `window.showDirectoryPicker()` with the browser-support feature detection from Section 4
  point 2.
- Set up the IndexedDB schema (`idb`), the recent-repos store, and the delete/wipe actions
  (Section 2.4) — verify they work even before real git parsing exists, using placeholder
  repo entries if needed for UI testing.
- Deliverable: a working marketing page, a working empty-state app shell, and the ability to
  pick a folder and land on a bare "repo opened, parsing not yet implemented" placeholder
  workspace screen.

### Phase 2 — Git parsing engine and core workspace (commit history + diffs)
- Integrate isomorphic-git + the File System Access API bridge (or raw `.git` object
  reading, per Section 1) inside a Web Worker.
- Implement full commit history walking, branch listing, and per-commit file-change/diff
  computation, with the incremental-indexing and IndexedDB caching strategy from Section 4
  point 3.
- Build the full main workspace UI (Section 3.6): sidebar commit list (virtualized), repo
  stats panel, branch selector, top toolbar with Split View / Diff View toggle, the diff
  file-row and line-diff components, binary-file and image-diff handling (Section 4 point
  5).
- Implement Diff View fully (this does not depend on live preview rendering — ship it
  first and make it solid).
- Wire the timeline scrubber (Section 3.3) to actually navigate commit selection (dots +
  filmstrip thumbnails, even if thumbnails are placeholder-colored blocks for now rather
  than real screenshots).
- Deliverable: a user can open a real local git repo, browse full commit history, select
  any commit, and see an accurate unified diff view of what changed, with working dark
  mode and working local data deletion.

### Phase 3 — Split View live preview, Replay Mode, Branch Explorer, polish
- Implement the preview-capability detector and static-servable live iframe rendering
  (Section 4 point 1) for Split View's before/after mock browser windows, with the
  documented graceful fallback for non-static projects.
- Implement Replay Mode: autoplay through commits at the selected speed (1x/2x/4x), with
  loop support, driven by the same playback controls in the sidebar and scrubber.
- Implement Branch Explorer view (the branch-graph sidebar tab) — at minimum, a visual list
  of branches with their head commits and simple ahead/behind info versus the current
  branch; a full commit-graph visualization is a nice-to-have if time allows.
- Implement File Tree view (the file-icon sidebar tab) — browse the project's file tree as
  of the selected commit, click a file to jump straight to its diff.
- Implement "Compare Any Two Points": allow selecting two arbitrary commits (not just
  parent/child) and viewing the diff between them.
- Real filmstrip thumbnails: generate them by rendering the static preview (where available)
  into an offscreen canvas/iframe screenshot at a small size, or fall back to a generated
  placeholder graphic (not a broken image) for non-static commits.
- Full responsive/accessibility pass: keyboard navigation of the commit list and scrubber,
  focus-visible states using the accent color, proper ARIA labeling on icon-only buttons,
  color-contrast check on both light and dark themes.
- Deliverable: the complete product as scoped, matching every screen described in Section 3,
  with the technical caveats from Section 4 handled gracefully rather than causing errors.

---

## 6. Explicitly out of scope (do not build, but leave the door open)
- Cloud sync, accounts, or any server component.
- Running an actual in-browser dev server / bundler for arbitrary npm projects
  (WebContainers-style) — documented as a future Phase 4 idea only.
- Exporting timeline/data (mentioned in the landing page FAQ as "not yet, planned").
- Non-Chromium browser support beyond a clear "unsupported browser" message.
