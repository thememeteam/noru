import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import fg from "fast-glob";

import { getSchema, type NoruSchema } from "./schema";
import type { TestConvex } from "convex-test";

type ModulesMap = Record<string, () => Promise<unknown>>;

let cachedModules: ModulesMap | null = null;

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function normalizePath(value: string) {
  return value.replace(/\\/g, "/");
}

export function getModulesMap(): ModulesMap {
  if (cachedModules) {
    return cachedModules;
  }

  const convexRoot = normalizePath(path.resolve(currentDir, "../../convex"));
  const patterns = [`${convexRoot}/**/*.ts`, `${convexRoot}/**/*.js`];
  const files = fg.sync(patterns, { ignore: ["**/*.d.ts"] });

  const modules: ModulesMap = {};
  for (const file of files) {
    const normalized = normalizePath(file);
    modules[normalized] = async () => import(pathToFileURL(normalized).href);
  }

  cachedModules = modules;
  return modules;
}

export async function createConvexTest() {
  const { convexTest } = await import("convex-test");
  const schema = await getSchema();
  return convexTest({ schema, modules: getModulesMap() });
}

export function asUser(t: TestConvex<NoruSchema>, userId: string) {
  return t.withIdentity({ subject: `${userId}|session`, issuer: "https://convex.test" });
}
