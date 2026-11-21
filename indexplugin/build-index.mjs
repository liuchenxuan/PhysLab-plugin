#!/usr/bin/env node
/**
 * 扫描 official/*、users/* 下的 plugin.json，生成 indexplugin/index.json。
 * 用法：node indexplugin/build-index.mjs
 * （发布到 PhysLab-plugin 仓库前运行一次；GitHub Actions 里也可以自动运行）
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const plugins = [];

for (const category of ["official", "users"]) {
  const base = join(root, category);
  if (!existsSync(base)) continue;
  for (const id of readdirSync(base).sort()) {
    const dir = join(base, id);
    if (!statSync(dir).isDirectory()) continue;
    const mf = join(dir, "plugin.json");
    if (!existsSync(mf)) { console.warn(`跳过 ${category}/${id}：缺少 plugin.json`); continue; }
    const m = JSON.parse(readFileSync(mf, "utf8"));
    if (m.id !== id) throw new Error(`${category}/${id}/plugin.json 的 id（${m.id}）必须与文件夹名一致`);
    if (m.category !== category) throw new Error(`${category}/${id}/plugin.json 的 category 必须是 ${category}`);
    if (!existsSync(join(dir, m.entry || "index.js"))) throw new Error(`${category}/${id} 缺少入口文件`);
    plugins.push({ ...m, path: `${category}/${id}`, entry: m.entry || "index.js" });
  }
}

writeFileSync(join(root, "index.json"), JSON.stringify({ schema: 1, updated: new Date().toISOString().slice(0, 10), plugins }, null, 2) + "\n");
console.log(`已生成 index.json：${plugins.length} 个插件`);
