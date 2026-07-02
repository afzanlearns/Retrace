interface FsStats {
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
  mode: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  uid: number;
  gid: number;
  dev: number;
  ino: number;
  nlink: number;
  rdev: number;
  blksize: number;
  blocks: number;
}

async function resolveHandle(
  root: FileSystemDirectoryHandle,
  filePath: string
): Promise<FileSystemFileHandle | FileSystemDirectoryHandle | null> {
  const parts = filePath.replace(/^\/+/, "").replace(/\/+$/, "").split("/");
  let handle: FileSystemDirectoryHandle | FileSystemFileHandle = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (handle instanceof FileSystemDirectoryHandle) {
      try {
        if (i === parts.length - 1) {
          return await handle.getFileHandle(part);
        } else {
          handle = await handle.getDirectoryHandle(part);
        }
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  return handle;
}

export function createFsAdapter(root: FileSystemDirectoryHandle) {
  const readFile = async (path: string): Promise<Uint8Array> => {
    const handle = await resolveHandle(root, path);
    if (!handle || handle instanceof FileSystemDirectoryHandle) {
      throw new Error(`ENOENT: ${path}`);
    }
    const file = await handle.getFile();
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  };

  const readdir = async (path: string): Promise<string[]> => {
    const handle = await resolveHandle(root, path);
    if (!handle || !(handle instanceof FileSystemDirectoryHandle)) {
      throw new Error(`ENOTDIR: ${path}`);
    }
    const entries: string[] = [];
    for await (const [name] of handle.entries()) {
      entries.push(name);
    }
    return entries.sort();
  };

  const stat = async (path: string): Promise<FsStats> => {
    const handle = await resolveHandle(root, path);
    if (!handle) {
      throw new Error(`ENOENT: ${path}`);
    }

    const isDir = handle instanceof FileSystemDirectoryHandle;
    let size = 0;
    let mtimeMs = Date.now();

    if (!isDir) {
      try {
        const file = await handle.getFile();
        size = file.size;
        mtimeMs = file.lastModified;
      } catch {}
    }

    return {
      isDirectory: () => isDir,
      isFile: () => !isDir,
      isSymbolicLink: () => false,
      mode: isDir ? 0o40000 : 0o100644,
      size,
      mtimeMs,
      ctimeMs: mtimeMs,
      uid: 0,
      gid: 0,
      dev: 0,
      ino: 0,
      nlink: 1,
      rdev: 0,
      blksize: 4096,
      blocks: Math.ceil(size / 4096),
    };
  };

  const lstat = async (path: string): Promise<FsStats> => {
    return stat(path);
  };

  const readlink = async (): Promise<string> => {
    throw new Error("readlink not supported");
  };

  const writeFile = async (): Promise<void> => {
    throw new Error("write not supported (read-only filesystem)");
  };

  const unlink = async (): Promise<void> => {
    throw new Error("unlink not supported (read-only filesystem)");
  };

  const mkdir = async (): Promise<void> => {
    throw new Error("mkdir not supported (read-only filesystem)");
  };

  const rmdir = async (): Promise<void> => {
    throw new Error("rmdir not supported (read-only filesystem)");
  };

  const symlink = async (): Promise<void> => {
    throw new Error("symlink not supported (read-only filesystem)");
  };

  const chmod = async (): Promise<void> => {
    throw new Error("chmod not supported (read-only filesystem)");
  };

  return {
    promises: {
      readFile,
      readdir,
      stat,
      lstat,
      readlink,
      writeFile,
      unlink,
      mkdir,
      rmdir,
      symlink,
      chmod,
    },
  };
}
