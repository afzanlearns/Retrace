function resolvePath(base: string, relative: string): string | null {
  if (!relative || relative.startsWith("data:") || relative.startsWith("blob:") || relative.startsWith("http:") || relative.startsWith("https:")) return null;
  let normalized = relative;
  if (normalized.startsWith("/")) normalized = normalized.slice(1);
  const baseParts = base.split("/").filter(Boolean).slice(0, -1);
  for (const part of normalized.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join("/");
}

function toDataUri(content: Uint8Array, mimeType: string): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(content)));
  return `data:${mimeType};base64,${base64}`;
}

function mimeTypeFromExt(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: "application/javascript", mjs: "application/javascript",
    css: "text/css",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    ico: "image/vnd.microsoft.icon",
    html: "text/html", htm: "text/html",
  };
  return map[ext || ""] || "application/octet-stream";
}

export function buildPreviewHtml(
  entryPoint: string,
  files: Map<string, Uint8Array>
): string {
  const entryContent = files.get(entryPoint);
  if (!entryContent) return "";

  let html = new TextDecoder().decode(entryContent);
  const usedFiles = new Set<string>([entryPoint]);

  html = html.replace(
    /<script\s+([^>]*?)\s*src\s*=\s*"([^"]+)"([^>]*?)>\s*<\/script>/gi,
    (_match, before, src, after) => {
      const resolved = resolvePath(entryPoint, src);
      if (!resolved) return _match;
      const content = files.get(resolved);
      if (!content) return _match;
      usedFiles.add(resolved);
      return `<script${before}${after}>/* inlined from ${src} */\n${new TextDecoder().decode(content)}\n</script>`;
    }
  );

  html = html.replace(
    /<link\s+([^>]*?)\s*href\s*=\s*"([^"]+)"([^>]*?)\s*\/?>/gi,
    (_match, before, href, after) => {
      const isStylesheet = /\brel\s*=\s*"stylesheet"/i.test(before + after);
      if (!isStylesheet) return _match;
      const resolved = resolvePath(entryPoint, href);
      if (!resolved) return _match;
      const content = files.get(resolved);
      if (!content) return _match;
      usedFiles.add(resolved);
      let css = new TextDecoder().decode(content);
      css = inlineCssUrls(css, resolved, files, usedFiles);
      return `<style>/* inlined from ${href} */\n${css}\n</style>`;
    }
  );

  html = html.replace(
    /(<img[^>]*?)\s+src\s*=\s*"([^"]+)"([^>]*?>)/gi,
    (_match, before, src, after) => {
      const resolved = resolvePath(entryPoint, src);
      if (!resolved) return _match;
      const content = files.get(resolved);
      if (!content) return _match;
      usedFiles.add(resolved);
      const mime = mimeTypeFromExt(resolved);
      const dataUri = toDataUri(content, mime);
      return `${before} src="${dataUri}"${after}`;
    }
  );

  html = html.replace(
    /(<link[^>]*?)\s+href\s*=\s*"([^"]+)"([^>]*?>)/gi,
    (_match, before, href, after) => {
      const isIcon = /\brel\s*=\s*"(?:icon|shortcut icon|apple-touch-icon)"/i.test(before + after);
      if (!isIcon) return _match;
      const resolved = resolvePath(entryPoint, href);
      if (!resolved) return _match;
      const content = files.get(resolved);
      if (!content) return _match;
      usedFiles.add(resolved);
      const mime = mimeTypeFromExt(resolved);
      const dataUri = toDataUri(content, mime);
      return `${before} href="${dataUri}"${after}`;
    }
  );

  return html;
}

function inlineCssUrls(
  css: string,
  basePath: string,
  files: Map<string, Uint8Array>,
  usedFiles: Set<string>
): string {
  return css.replace(
    /url\(\s*["']?([^"'\s)]+)["']?\s*\)/gi,
    (_match, url) => {
      if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("http:") || url.startsWith("https:")) return _match;
      const resolved = resolvePath(basePath, url);
      if (!resolved) return _match;
      const content = files.get(resolved);
      if (!content) return _match;
      usedFiles.add(resolved);
      const mime = mimeTypeFromExt(resolved);
      return `url("${toDataUri(content, mime)}")`;
    }
  );
}
