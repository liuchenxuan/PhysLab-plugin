# PhysLab 插件模板

复制本文件夹即可开始开发一个 PhysLab 插件。

```
plugin-template/
├─ plugin.json                 插件清单（市场展示 / 发布用）
├─ index.js                    入口：同时演示 模块 / 图表 / 变量 / 结果 / AI 五类扩展
├─ pack.mjs                    把插件打成单个 .json 包，便于分享与导入
├─ AI-SKILL.md                 AI 生成插件的技能文件（给 ChatGPT / Claude / DeepSeek 等）
└─ types/physlab-plugin.d.ts   编辑器自动补全用的类型提示（可选）
```

## 开发步骤

1. **复制并改名**：把文件夹改成你的插件 id（小写字母、数字、连字符，如 `my-optics`）。
2. **改清单**：编辑 `plugin.json` 与 `index.js` 里的 `id / name / version / author / description / kinds`（两处 `id` 必须一致）。
3. **删减示例**：`index.js` 里 ①–⑤ 五段互相独立，不需要的整段删除。所有 id 已加 `tpl-` / `tpl_` 前缀，改成你自己的前缀避免冲突。
4. **本地测试**：打开 PhysLab → **插件市场 → 导入本地插件** → 选 `index.js` → **立即重新加载**。出错信息会显示在市场卡片上，详细堆栈在浏览器控制台。
5. **发布**（可选）：
   - 把文件夹放入 `PhysLab-plugin` 仓库的 `indexplugin/users/<id>/`；
   - 运行 `node indexplugin/build-index.mjs` 更新 `index.json`；
   - 提交 Pull Request。

## 用 AI 生成插件

把 `AI-SKILL.md` 的全文发给 AI（或在支持 Skill 的工具里安装它），然后描述需求，例如：

> 请按 AI-SKILL.md 为 PhysLab 写一个“LC 振荡电路”模块插件：参数 L、C、初始电荷 Q0、电阻 R（阻尼），给出 q-t、i-t 图表，包含解题过程与能量守恒校验。

AI 会输出 `plugin.json` 与 `index.js`，保存到一个新文件夹后按上面的步骤导入即可。

## 打包为单个 JSON（可选）

```bash
node pack.mjs        # 生成 <id>.physlab-plugin.json
```

在市场里“导入本地插件”选择这个 `.json` 文件即可安装。

## 参考

- 完整开发文档：仓库 `docs/PLUGIN_DEVELOPMENT.md`
- 官方插件源码（电磁学模块等）：仓库 `indexplugin/official/`
- 用户插件示例：`indexplugin/users/projectile-demo/`
