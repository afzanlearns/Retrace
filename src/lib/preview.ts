export function isStaticServable(
  tree: { name: string; path: string; type: "blob" | "tree" }[]
): boolean {
  const rootFiles = new Set(
    tree.filter((e) => !e.path.includes("/")).map((e) => e.name)
  );

  const hasIndexHtml = rootFiles.has("index.html");
  const hasPackageJson = rootFiles.has("package.json");
  const hasBuildScript = false;

  if (!hasPackageJson && hasIndexHtml) return true;

  if (hasPackageJson && !hasBuildScript && hasIndexHtml) return true;

  const commonOutputDirs = ["dist", "build", "out", "_site", "public"];
  const hasOutputDir = tree.some(
    (e) => e.type === "tree" && commonOutputDirs.includes(e.name)
  );

  if (hasOutputDir) return true;

  return hasIndexHtml;
}

export function getEntryPoint(
  tree: { name: string; path: string; type: "blob" | "tree" }[]
): string | null {
  const rootNames = new Set(
    tree.filter((e) => !e.path.includes("/")).map((e) => e.name)
  );

  if (rootNames.has("index.html")) return "index.html";

  const commonDirs = ["dist", "build", "out", "_site", "public"];
  for (const dir of commonDirs) {
    if (tree.some((e) => e.path === dir && e.type === "tree")) {
      return `${dir}/index.html`;
    }
  }

  return null;
}

export function createBlobUrl(
  content: Uint8Array,
  mimeType: string
): string {
  const blob = new Blob([content as BlobPart], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function mimeTypeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "application/javascript",
    mjs: "application/javascript",
    jsx: "text/jsx",
    ts: "text/typescript",
    tsx: "text/typescript",
    json: "application/json",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/vnd.microsoft.icon",
    txt: "text/plain",
    xml: "application/xml",
    pdf: "application/pdf",
    wasm: "application/wasm",
    map: "application/json",
    md: "text/markdown",
    yaml: "text/yaml",
    yml: "text/yaml",
    toml: "text/toml",
    sh: "text/plain",
    bat: "text/plain",
    ps1: "text/plain",
  };
  return mimeMap[ext || ""] || "application/octet-stream";
}
