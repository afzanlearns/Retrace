export type ProjectType = "web" | "cli-library-backend" | "unknown-mixed";

const FRONTEND_CONFIGS = new Set([
  "vite.config.ts", "vite.config.js", "vite.config.mjs",
  "webpack.config.js", "webpack.config.ts",
  "next.config.js", "next.config.mjs", "next.config.ts",
  "rollup.config.js", "rollup.config.ts",
  ".parcelrc", "vue.config.js", "nuxt.config.ts",
]);

const BACKEND_INDICATORS = new Set([
  "Cargo.toml", "go.mod", "go.sum",
  "setup.py", "pyproject.toml", "requirements.txt",
  "Gemfile", "Podfile", "build.gradle", "pom.xml",
  "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  "Makefile", "CMakeLists.txt",
]);

export function classifyProject(
  tree: { name: string; path: string; type: "blob" | "tree" }[]
): ProjectType {
  const rootNames = new Set(
    tree.filter((e) => !e.path.includes("/")).map((e) => e.name)
  );
  const allBlobNames = new Set(
    tree.filter((e) => e.type === "blob").map((e) => e.name)
  );
  const hasIndexHtmlRoot = rootNames.has("index.html");
  const hasIndexHtmlAnywhere = allBlobNames.has("index.html");
  const hasFrontendConfig = [...FRONTEND_CONFIGS].some((f) => rootNames.has(f));
  const hasPackageJson = rootNames.has("package.json");

  // Clear web signals
  if (hasIndexHtmlRoot || hasIndexHtmlAnywhere || hasFrontendConfig) {
    return "web";
  }

  // Backend-only signals (no index.html anywhere)
  const hasBackendIndicator = [...BACKEND_INDICATORS].some((f) => rootNames.has(f));
  if (hasBackendIndicator) {
    return "cli-library-backend";
  }

  // package.json without index.html → library/CLI
  if (hasPackageJson && !hasIndexHtmlAnywhere) {
    return "cli-library-backend";
  }

  return "unknown-mixed";
}
