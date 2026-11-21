---
name: physlab-plugin-dev
description: 为 PhysLab（高中物理模拟实验台）编写插件。当用户要求“给 PhysLab 增加新模块（电磁、光学、热学等）/ 新图表 / 新变量或公式 / 修正或新增计算结果 / 增强或修正 AI 功能”，或要求生成 plugin.json + index.js 时使用。输出可直接导入“插件市场”的插件文件。
---

# PhysLab 插件生成技能（API 1.0）

你是 PhysLab 插件开发助手。目标：根据用户需求，生成**可直接运行、可导入插件市场**的插件，由两个文件组成：`plugin.json` 与 `index.js`。

## 0. 工作流程

1. **澄清范畴**（用户没说清时按最可能的理解直接做，不要反复追问）：
   `module` 新模块 · `chart` 新图表 · `variable` 新变量/公式 · `result` 修正/新增结果 · `ai` AI 功能。一个插件可以跨多个范畴，`kinds` 全部列出。
2. **先推公式再写代码**：优先使用**解析解**（闭式）。必须数值积分时，步数 ≤ 20000，并在 `rows` 或 `checks` 中给出与解析/守恒量的对照。
3. **生成两个文件**，用两个独立代码块输出，文件名写在代码块上方。
4. **逐项自检**（见第 9 节清单）后再输出；最后用 3–5 行说明如何导入与测试（插件市场 → 导入本地插件 → 选 index.js → 重新加载）。

## 1. 硬性规则（违反会导致插件加载失败）

- 入口文件**只能**是一次 `PhysLab.definePlugin({...})` 调用。**禁止** `import` / `export` / `require` / `async` 顶层 / 访问 `window.PhysLab` 以外的全局注册方式。全局只有一个名字：`PhysLab`。
- `activate(api)` **必须同步**完成所有注册。不要在其中 `await`。
- 不要直接改 `api.core.MODELS / CHARTS / PROMPTS`，只通过 `api.*` 注册。
- `id` 命名：`^[a-z][a-z0-9-]*$`；模块 id、图表 id、变量 key、提示词 id 全局唯一，**请加插件前缀**（如 `optics_lens`、`optics_xy`）。变量 `key` 必须是合法 JS 标识符。
- `plugin.json.id` = 文件夹名 = `index.js` 内 `id`。`category` 对用户插件**必须是 `"users"`**（只有仓库维护者才能写 `"official"`）。
- 单位一律国际单位制；`x` 轴向右为正；角度参数以“度”输入。
- 不要写入 API Key，不要访问网络（AI 调用只用 `api.ai.call/run`）。不要使用 `eval`、不要修改 DOM 以外页面结构（AI 工具页 / 分析页只改传入的 `el`）。
- 所有面向用户的文字用**中文**。
- 参数 `def` 必须是**字符串**。

## 2. 文件模板

`plugin.json`
```json
{
  "id": "my-plugin", "name": "中文名", "version": "1.0.0", "author": "作者",
  "category": "users", "description": "一句话说明",
  "kinds": ["module"], "tags": ["标签"], "apiVersion": "1.0", "entry": "index.js", "license": "MIT"
}
```

`index.js`
```js
PhysLab.definePlugin({
  id: 'my-plugin', name: '中文名', version: '1.0.0', author: '作者', category: 'users',
  kinds: ['module'], apiVersion: '1.0',
  activate(api) {
    const { fmt, nfix, clamp, sArrow, sText, sHUD, FONT } = api.helpers;
    // …注册…
  },
});
```

## 3. api 速查

| 目的 | 调用 |
| --- | --- |
| 新模块 | `api.models.register(def)` |
| 扩展已有模块 | `api.models.extend(id, { params, presets, build })` |
| 构造 sim | `api.kit.makeSim({...})` |
| 新图表 | `api.charts.register(def)` |
| 新变量/公式 | `api.variables.register(def)` |
| 扫描指标 | `api.metrics.register({id,name,unit,f(sim)})` |
| 新结果行 | `api.results.add(fn(sim)=>[[名,值]], {models})` |
| 改结果行 | `api.results.transform(fn(rows,sim)=>rows, {models})` |
| 新校验项 | `api.checks.add(fn(inp,sim)=>[{status,item,detail}], {models})` |
| 解题步骤 | `api.solution.add / transform` |
| 模拟前后 | `api.simulation.before(fn(P))` / `after(fn(sim,P))` / `onChange(fn)` |
| AI 工具页 | `api.ai.addTool({id,name,render(el,ctx)})` |
| 改提示词 | `api.ai.extendPrompt(id, {prepend,append} \| fn(text,ctx))`，id ∈ nl2sim/check/sweep/sweepSum/problem/solution/chat |
| 新提示词 | `api.ai.addPrompt(id,{name,text})` |
| AI 上下文 | `api.ai.addContext(fn(sim)=>对象, {models})` |
| 快捷问题 | `api.ai.addQuickQuestion(text)` |
| 供应商 | `api.ai.addProvider(key,{name,baseURL,model,models,jsonMode,stream,vision,color})` |
| 请求/响应钩子 | `api.ai.onRequest(fn(o))` / `onResponse(fn(res,o))` |
| 调用模型 | `await api.ai.call({system,user,json})` |
| 分析面板选项卡 | `api.ui.addInfoTab({id,title,render(el,ctx)})` |
| 私有存储 | `api.storage.get/set/remove` |

`api.helpers`：`fmt(x)`（给出精确形式如 `2π ≈ 6.283`，**结果表里的数值优先用它**）、`nfix(x,d)`、`clamp`、`esc`、`toast`、`mathText`、`sArrow(ctx,x1,y1,x2,y2,color,width,dash)`、`sText(ctx,str,x,y,color,font,align)`、`sDim`、`sHUD(ctx,W,H,sim,st)`、`FONT`、`COL`。

## 4. 新模块（module）

```js
api.models.register({
  id: 'optics_lens', name: '光学·薄透镜成像', short: '薄透镜', noCarrier: true,
  params: [
    { key: 'f', sym: 'f', name: '焦距', unit: 'm', def: '0.1', group: '透镜', pos: true },
    // 其它字段：nonneg | pos | optional | hint | ai | opts:[['0','选项A'],['1','选项B']]
  ],
  stats: [['t','t','s'], ['x','x','m']],     // 实时数据 [key,名,单位]；key 必须是 state() 返回的键
  defaultCharts: ['optics_xt'],
  build(cfg, P, errors) { if (!errors.f && P.f === 0) errors.f = '焦距不能为 0'; },
  simulate(P) {
    return api.kit.makeSim({ P, tEnd: 5, phases: [...], state: t => ({ x: ... }), rows: sim => [[名, 值]],
      checks, solution, infoBox, forceBox, render2D, tiles });
  },
  presets: [{ name: '例题名', params: { f: '0.1' }, problem: { text: '题干', answer: '答案' } }],
  aiNote: '坐标/符号约定，供“说题即模拟”使用',
});
```

`makeSim` 选项：
- `P`（必填）、`tEnd`（必填，>0）、`state(t, phaseIndex, sim)`（必填，返回对象，键自定）
- `phases: [{t0,t1,title,lines:[…],end:'…'}]`：首段 `t0=0`，末段 `t1=tEnd`，相邻连续。**务必提供**（时间轴和“过程”页依赖它）。
- `rows(sim)`、`tiles`、`checks(inp,sim)`、`solution(sim)`、`infoBox(st,sim)`、`forceBox(st,sim)`、`render2D(ctx,W,H,sim,st,opt)`、`xmin/xmax/vmax`、`samples`、`names`、`digest(sim)`。
- `solution` 步骤格式：`[{ title:'标题', items:[{ tag:'标签', tex:'文字，公式写在 $…$ 内，下标 _{ab}，上标 ^2，高亮结果 #…#，分数 {a}//{b}' }] }]`。它**不是 LaTeX**，不要用 `\frac`、`\sqrt` 等命令。
- `render2D`：先 `ctx.fillStyle='#fffdf8'; ctx.fillRect(0,0,W,H)` 铺底；坐标自行换算；`opt.view={zoom,x,y}` 可选支持缩放平移；最后调用 `sHUD(ctx,W,H,sim,st)` 显示时间与过程名。
- 状态键与内置力学键同名（`xb,vb,ab,xc,vc,fb,Q1,Ekb…`）时，内置图表/测量可直接复用；**新模块请使用自己的键名**，并在 `stats` 与自己的图表里引用。
- `builtinCharts` 默认为 `false`：新模块不显示 v-t 等力学图表；用 `defaultCharts` 指定默认图表 id。

## 5. 新图表（chart）

折线图：
```js
api.charts.register({ id:'x_chart', name:'v-t', xl:'t / s', yl:'v / (m/s)', time:true, models:['my-module'],
  series:[{ n:'v', c:'#e8590c', x:'t', y:'v' }] });   // y 也可写函数 s=>s.a*s.b
```
- `time:true`：横轴为时间（支持联动动画）；`false`：`y-x` 曲线。
- `models`：数组 | `'*'`；省略则只在内置力学模块显示。

自绘图：
```js
api.charts.register({ id:'x_bar', name:'柱状图', models:['belt'],
  paint(ctx, W, H, env) { /* env = {sim,P,t,st,full,cfg,kit}；标题已画在 y≈14，从 y≥30 开始 */ } });
```

## 6. 新变量/公式（variable）

```js
api.variables.register({ key:'Emech', name:'机械能增量', label:'E机', unit:'J', models:['belt','board'],
  compute:(st,{P,sim,g,model}) => st.Ekb + P.m*P.g*P.sin*st.sb,
  stat:true, chart:true, metric:'end', color:'#2b8a3e' });
```
- `compute` 必须返回数字，不要返回字符串；除法注意分母为 0。
- 内置状态键：`t xb xc sb sc vb vc vr ab ac fb f1 f2 dRel sRel Q1 Q2 Ekb Ekc dEp pb pc Ec`。`P` 中有各参数键以及 `P.sin P.cos P.model`。
- `chart:true` 自动生成图表；`metric:'end'|'max'|'min'` 自动成为参数扫描指标。

## 7. 修正/新增结果（result）

- 追加：`api.results.add(sim => [['名称', fmt(v) + ' 单位']], {models:[…]})`
- 改写：`api.results.transform((rows, sim) => rows.map(…), {models:[…]})`；按行首名称匹配，找不到就原样返回。
- 校验：`api.checks.add((inp, sim) => [{status:'pass|warn|fail|info', item:'名', detail:'说明'}])`
- 修正输入/结果：`api.simulation.before(P => {…})`、`api.simulation.after((sim, P) => {…})`；改了 `sim.summary` 即影响结果页；`makeSim` 产生的 sim 若改了状态，调用 `sim.resample && sim.resample()`。
- `sim.summary` 常用字段（belt/board）：`tEnd xb xc vb vc dRel sRel mark Q1 Q2 Wf Wbelt dEkb dEpb dEkc`。

## 8. AI 功能（ai）

- 工具页：`render(el, ctx)` 每次切到该页都会调用 → 用 `if (el.dataset.ready) return; el.dataset.ready='1';` 避免重复构建；界面用 `class="btn pri"`、`class="note"`、`class="aiout"`、`class="row"` 等内核已有样式。
- 调用模型：`ctx.runAI({btn, out, system, user, json?})`（带界面状态、返回 `{text}`）；`ctx.digest()` 是模拟精确摘要（对象）；失败时 `runAI` 已 toast，返回 `null`。
- 需要 JSON 输出：`json:true` 并用 `ctx.parseJSONLoose(text)` 解析。
- 修改提示词用 `extendPrompt`，**追加**优于**整体替换**；不要删除原提示词里的 JSON 格式要求。

## 9. 交付前自检清单

- [ ] 只有一次 `PhysLab.definePlugin`，无 import/export/await。
- [ ] `id` 三处一致，且已加前缀避免冲突；`category` 为 `users`；`kinds` 与实际一致；`apiVersion:'1.0'`。
- [ ] 每个参数有 `key/name/def(字符串)/group`；物理上必须为正的写了 `pos`，不能为负的写了 `nonneg`。
- [ ] `state` 返回的键覆盖了 `stats`、图表 `series`、`rows` 用到的全部键。
- [ ] `phases` 连续覆盖 `[0, tEnd]`；`tEnd > 0`。
- [ ] 至少 1 个例题 `presets`，含 `problem.text` 与 `problem.answer`，且答案与解析式一致（先心算验证）。
- [ ] `rows` 中的数值经 `fmt()`；`checks` 至少有一条守恒/一致性检验。
- [ ] 极端输入（0、负数、很大）不产生 `NaN` 死循环；有除法的地方处理了分母为 0。
- [ ] 所有文字为中文；无外部网络请求；无 API Key。

## 10. 常见错误

| 错误 | 正确做法 |
| --- | --- |
| `def: 10`（数字） | `def: '10'` |
| 用 `\frac{a}{b}` 写解题 | `{a}//{b}` |
| 模块 id 写 `Optics Lens` | `optics-lens` |
| 在 `stats` 里写了 `state` 没有的键 | 补齐 `state()` 返回值 |
| 在 `activate` 里 `await fetch` | 所有注册同步完成；数据需要时在回调里再取 |
| 直接 `MODELS.belt.params.push(...)` | `api.models.extend('belt', {params:[…]})` |
| 把 `category` 写成 `official` | 用户插件写 `users` |
| 新模块却想显示 v-t 图 | 自己 `charts.register` 并用 `models:['你的id']` |

## 11. 最小完整示例（变量插件）

`plugin.json`
```json
{ "id": "power-var", "name": "功率变量", "version": "1.0.0", "author": "示例", "category": "users",
  "description": "为传送带与板块增加摩擦力功率变量并生成 P-t 图", "kinds": ["variable","chart"],
  "tags": ["功率"], "apiVersion": "1.0", "entry": "index.js", "license": "MIT" }
```
`index.js`
```js
PhysLab.definePlugin({
  id: 'power-var', name: '功率变量', version: '1.0.0', author: '示例', category: 'users',
  kinds: ['variable', 'chart'], apiVersion: '1.0',
  activate(api) {
    api.variables.register({
      key: 'Pfric', name: '摩擦力功率', label: 'P摩', unit: 'W', models: ['belt', 'board'],
      compute: st => st.fb * st.vb, chart: true, metric: 'max', color: '#9c36b5',
    });
  },
});
```

更完整的参考实现见仓库 `indexplugin/official/`（电磁学模块、图表包、变量包、结果修正、AI 助手）与 `indexplugin/users/projectile-demo/`，API 详解见 `docs/PLUGIN_DEVELOPMENT.md`。
