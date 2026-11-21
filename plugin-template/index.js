/**
 * PhysLab 插件模板
 * ------------------------------------------------------------------
 * 使用方法：
 *   1. 复制本文件夹并改名（= 你的插件 id，小写字母/数字/连字符）；
 *   2. 同时修改 plugin.json 与下面 definePlugin 里的 id / name / version / author；
 *   3. 删掉不需要的 “①…⑤” 段落（每段相互独立）；
 *   4. PhysLab → 插件市场 → 导入本地插件 → 选择本文件 → 立即重新加载。
 *
 * 规则：不要 import / export；只有一个全局名 PhysLab；activate 里必须同步完成注册。
 * 所有 id（模块 / 图表 / 变量 / 提示词）全局唯一，请统一加前缀（下面用 tpl_）。
 * 完整说明：docs/PLUGIN_DEVELOPMENT.md ；AI 生成插件：AI-SKILL.md
 */
PhysLab.definePlugin({
  id: 'plugin-template',
  name: '插件模板',
  version: '1.0.0',
  author: '你的名字',
  category: 'users',
  kinds: ['module', 'chart', 'variable', 'result', 'ai'],
  apiVersion: '1.0',

  activate(api) {
    const { fmt, nfix } = api.helpers;

    /* ① 新增模块：自由落体（解析解 + makeSim） ------------------------ */
    api.models.register({
      id: 'tpl-free-fall',
      name: '模板·自由落体',
      short: '自由落体',
      noCarrier: true,
      stats: [['t', 't', 's'], ['h', 'h', 'm'], ['v', 'v', 'm/s'], ['Ek', 'Ek', 'J']],   // 实时数据：[键, 名, 单位]
      defaultCharts: ['tpl_ht', 'tpl_vt'],
      params: [
        { key: 'm',  sym: 'm',  name: '物体质量', unit: 'kg',   def: '1',  group: '物体', pos: true },
        { key: 'h0', sym: 'h<sub>0</sub>', name: '起始高度', unit: 'm', def: '20', group: '条件', pos: true },
        { key: 'g',  sym: 'g',  name: '重力加速度', unit: 'm/s²', def: '10', group: '条件', pos: true },
      ],
      simulate(P) {
        const T = Math.sqrt(2 * P.h0 / P.g);                       // 落地时间（解析解）
        const at = t => ({ h: P.h0 - 0.5 * P.g * t * t, v: P.g * t, Ek: 0.5 * P.m * (P.g * t) ** 2 });
        return api.kit.makeSim({
          P, tEnd: T,
          state: t => at(t),                                          // 返回时刻 t 的全部状态
          phases: [{ t0: 0, t1: T, title: '自由落体', lines: ['初速度为 0，加速度 g'], end: '落地，t = ' + fmt(T) + ' s' }],
          tiles: [['落地时间', fmt(T) + ' s'], ['落地速度', fmt(P.g * T) + ' m/s']],
          rows: () => [['落地时间 t = √(2h/g)', fmt(T) + ' s'], ['落地速度 v = gt', fmt(P.g * T) + ' m/s'], ['落地动能', fmt(at(T).Ek) + ' J']],
          checks: () => [{ status: Math.abs(at(T).Ek - P.m * P.g * P.h0) < 1e-9 ? 'pass' : 'fail', item: '机械能守恒', detail: 'Ek末 = mgh0' }],
          solution: () => [{ title: '求落地时间', items: [{ tag: '位移公式', tex: '$h = {1}//{2} g t^2$' }, { tag: '结果', tex: '$t = √({2h}//{g}) = #' + fmt(T) + '#$ s' }] }],
          render2D(ctx, W, H, sim, st) {
            ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, H);
            const top = 50, bottom = H - 40, y = bottom - (st.h / P.h0) * (bottom - top);
            ctx.strokeStyle = '#2f3b52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(30, bottom + 10); ctx.lineTo(W - 30, bottom + 10); ctx.stroke();
            ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(W / 2, y, 12, 0, 7); ctx.fill();
            api.helpers.sArrow(ctx, W / 2 + 30, y, W / 2 + 30, y + Math.min(80, st.v * 3 + 10), '#2b8a3e', 2.4);
            api.helpers.sHUD(ctx, W, H, sim, st);
          },
        });
      },
      presets: [{ name: '20 m 高处自由落体', params: { h0: '20' },
        problem: { text: '物体从 20 m 高处自由下落，g 取 10 m/s²，求落地时间与速度。', answer: '2 s，20 m/s' } }],
    });

    /* ② 新增图表：声明式折线图 + 自绘图 -------------------------------- */
    api.charts.register({ id: 'tpl_ht', name: 'h-t 高度', xl: 't / s', yl: 'h / m', time: true, models: ['tpl-free-fall'],
      series: [{ n: '高度', c: '#e8590c', x: 't', y: 'h' }] });
    api.charts.register({ id: 'tpl_vt', name: 'v-t 速度', xl: 't / s', yl: 'v / (m/s)', time: true, models: ['tpl-free-fall'],
      series: [{ n: '速度', c: '#1c7ed6', x: 't', y: 'v' }] });
    api.charts.register({ id: 'tpl_bar', name: '模板·当前动能柱', models: ['belt', 'board'],
      paint(ctx, W, H, { st }) {                                      // 自绘：画一根表示物块动能的柱子
        const h = Math.min(H - 70, st.Ekb * 6);
        ctx.fillStyle = '#e8590c'; ctx.fillRect(W / 2 - 25, H - 30 - h, 50, h);
        ctx.fillStyle = '#566078'; ctx.textAlign = 'center'; ctx.fillText('Ek = ' + nfix(st.Ekb, 2) + ' J', W / 2, H - 14);
      } });

    /* ③ 新增变量与公式：自动进入实时数据 / 图表 / 测量 / 扫描指标 / CSV ---- */
    api.variables.register({
      key: 'tplPf', name: '摩擦力功率（模板）', label: 'P摩', unit: 'W',
      models: ['belt', 'board'],
      compute: st => st.fb * st.vb,                                    // f·v
      chart: true, metric: 'max', color: '#9c36b5',
    });

    /* ④ 新增 / 修正计算结果 ------------------------------------------- */
    api.results.add(sim => [['机械能损失占比（模板）', nfix(100 * (sim.summary.Q1 + sim.summary.Q2) /
      Math.max(1e-9, sim.summary.Q1 + sim.summary.Q2 + Math.abs(sim.summary.dEkb)), 1) + ' %']], { models: ['belt', 'board'] });
    api.results.transform((rows) => rows.map(r => r[0] === '摩擦生热 Q = f·s相对' ? [r[0], r[1] + '（模板修正示例）'] : r), { models: ['belt', 'board'] });
    api.checks.add(() => [{ status: 'info', item: '模板校验项', detail: '这里可以放你自己的守恒量 / 一致性检验' }], { models: ['belt', 'board'] });

    /* ⑤ AI 功能：新增 AI 工具页 + 修改已有提示词 ------------------------- */
    api.ai.addTool({
      id: 'tpl-hello', name: 'AI 模板工具',
      render(el, ctx) {
        if (el.dataset.ready) return; el.dataset.ready = '1';
        el.innerHTML = '<p class="note" style="margin-top:0">让 AI 用一句话点评当前模拟。</p><div class="row"><button class="btn pri" id="go">点评</button></div><pre class="aiout" id="out" hidden></pre>';
        el.querySelector('#go').onclick = e => ctx.runAI({
          btn: e.target, out: el.querySelector('#out'),
          system: '你是物理教师，用一句话点评。', user: JSON.stringify(ctx.digest()),
        });
      },
    });
    api.ai.extendPrompt('chat', { append: '\n回答尽量简短，先给结论再给推导。' });
  },
});
