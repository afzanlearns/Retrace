import { describe, it, expect, beforeEach } from "vitest";
import {
  addRecentRepo,
  getRecentRepos,
  removeRecentRepo,
  clearAllData,
  getDB,
  saveSettings,
  getSettings,
  type RecentRepo,
} from "../db";

const testRepo: RecentRepo = {
  id: "test-repo",
  name: "test-repo",
  path: "/fake/path/test-repo",
  lastOpened: Date.now(),
  commitCount: 42,
};

beforeEach(async () => {
  const db = await getDB();
  await db.clear("recentRepos");
  await db.clear("settings");
});

describe("recentRepos", () => {
  it("stores and retrieves a repo entry", async () => {
    await addRecentRepo(testRepo);
    const repos = await getRecentRepos();
    expect(repos).toHaveLength(1);
    expect(repos[0].id).toBe("test-repo");
    expect(repos[0].name).toBe("test-repo");
    expect(repos[0].commitCount).toBe(42);
  });

  it("removes a specific repo entry", async () => {
    await addRecentRepo(testRepo);
    await removeRecentRepo("test-repo");
    const repos = await getRecentRepos();
    expect(repos).toHaveLength(0);
  });

  it("does not remove unrelated entries", async () => {
    const other: RecentRepo = {
      id: "other-repo",
      name: "other",
      path: "/other",
      lastOpened: 1,
      commitCount: 1,
    };
    await addRecentRepo(testRepo);
    await addRecentRepo(other);
    await removeRecentRepo("test-repo");
    const repos = await getRecentRepos();
    expect(repos).toHaveLength(1);
    expect(repos[0].id).toBe("other-repo");
  });

  it("preserves settings when clearing recent repos", async () => {
    await addRecentRepo(testRepo);
    await saveSettings({ theme: "light", autoplay: false, loop: true, speed: 2 });
    await clearAllData();
    const repos = await getRecentRepos();
    expect(repos).toHaveLength(0);
    const settings = await getSettings();
    expect(settings).toBeDefined();
    expect(settings!.autoplay).toBe(false);
  });
});

describe("delete actions", () => {
  it("clearAllData deletes all entries except settings", async () => {
    await addRecentRepo(testRepo);
    await clearAllData();
    const repos = await getRecentRepos();
    expect(repos).toHaveLength(0);
    const db = await getDB();
    const stores = Array.from(db.objectStoreNames);
    for (const name of stores) {
      if (name !== "settings") {
        const count = await db.count(name);
        expect(count).toBe(0);
      }
    }
  });
});
