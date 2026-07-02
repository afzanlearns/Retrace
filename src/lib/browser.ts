"use client";

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickRepository(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    return null;
  }
  try {
    const handle = await window.showDirectoryPicker({
      mode: "read",
    });
    return handle;
  } catch {
    return null;
  }
}

export async function requestPermission(
  handle: FileSystemDirectoryHandle
): Promise<"granted" | "denied" | "prompt"> {
  try {
    return await handle.requestPermission({ mode: "read" });
  } catch {
    return "denied";
  }
}
