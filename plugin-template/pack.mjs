#!/usr/bin/env node
/**
 * 把本文件夹打包成单个 .json 插件包（便于通过聊天 / 邮件分享，市场里“导入本地插件”可直接选它）。
 * 用法：node pack.mjs   →  生成 <id>.physlab-plugin.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(dir, "plugin.json"), "utf8"));
const code = readFileSync(join(dir, manifest.entry || "index.js"), "utf8");

if (!new RegExp(`id:\\s*['"]${manifest.id}['"]`).test(code)) {
  console.warn(`⚠ index.js 里没有找到 id: '${manifest.id}'，请确认与 plugin.json 一致`);
}
const out = join(dir, `${manifest.id}.physlab-plugin.json`);
writeFileSync(out, JSON.stringify({ ...manifest, code }, null, 2));
console.log("已生成", out);
