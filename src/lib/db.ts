import { openDB } from "idb";

const DB_NAME = "retrace";
const DB_VERSION = 1;

export interface RecentRepo {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  commitCount: number;
  handle?: FileSystemDirectoryHandle;
}

export interface AppSettings {
  id: string;
  theme: "light" | "dark";
  autoplay: boolean;
  loop: boolean;
  speed: 1 | 2 | 4;
}

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("recentRepos")) {
        db.createObjectStore("recentRepos", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
    },
  });
}

export async function getRecentRepos(): Promise<RecentRepo[]> {
  const db = await getDB();
  const repos = await db.getAll("recentRepos");
  return repos.sort((a, b) => b.lastOpened - a.lastOpened);
}

export async function addRecentRepo(repo: RecentRepo): Promise<void> {
  const db = await getDB();
  await db.put("recentRepos", repo);
}

export async function removeRecentRepo(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("recentRepos", id);
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const storeNames = Array.from(db.objectStoreNames);
  for (const name of storeNames) {
    if (name !== "settings") {
      await db.clear(name);
    }
  }
}

export function wipeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSettings(): Promise<AppSettings | undefined> {
  const db = await getDB();
  return db.get("settings", "global");
}

export async function saveSettings(
  settings: Omit<AppSettings, "id">
): Promise<void> {
  const db = await getDB();
  await db.put("settings", { id: "global", ...settings });
}
