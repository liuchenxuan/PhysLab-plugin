/**
 * 用户插件示例 · 抛体运动模块
 * 这是“用户插件（Users）”的参考实现：一个纯解析解的小模块，约 80 行。
 */
PhysLab.definePlugin({
  id: 'projectile-demo',
  name: '抛体运动（示例）',
  version: '0.1.0',
  author: 'PhysLab Community',
  category: 'users',
  kinds: ['module', 'chart'],
  apiVersion: '1.0',

  activate(api) {
    const { fmt, nfix, clamp, sArrow, sText, sHUD } = api.helpers;
    const g0 = Object.assign({}, api.core.COMMON_PARAMS[0]);

    const at = (P, t) => {
      const a = P.ang * Math.PI / 180, vx = P.v0 * Math.cos(a), vy0 = P.v0 * Math.sin(a) - P.g * t;
      const x = vx * t, y = P.h0 + P.v0 * Math.sin(a) * t - 0.5 * P.g * t * t;
      return { x, y: Math.max(y, 0), vx, vy: vy0, v: Math.hypot(vx, vy0), Ek: 0.5 * P.m * (vx * vx + vy0 * vy0), Ep: P.m * P.g * Math.max(y, 0) };
    };

    api.models.register({
      id: 'projectile', name: '抛体运动（斜抛 / 平抛）', short: '抛体', carrier: '小球', noCarrier: true,
      stats: [['t', 't', 's'], ['x', 'x', 'm'], ['y', 'y', 'm'], ['vx', 'vx', 'm/s'], ['vy', 'vy', 'm/s'], ['Ek', 'Ek', 'J'], ['Ep', 'Ep', 'J']],
      defaultCharts: ['pj_xy', 'pj_vt'],
      params: [
        g0,
        { key: 'm', sym: 'm', name: '小球质量', unit: 'kg', def: '1', group: '小球', pos: true },
        { key: 'v0', sym: 'v<sub>0</sub>', name: '抛出速率', unit: 'm/s', def: '10', group: '小球', pos: true },
        { key: 'ang', sym: 'α', name: '抛射角（水平向上为正）', unit: '°', def: '45', group: '小球', hint: '0 = 平抛，负数 = 斜向下抛' },
        { key: 'h0', sym: 'h<sub>0</sub>', name: '抛出高度', unit: 'm', def: '0', group: '小球', nonneg: true },
      ],
      build(cfg, P, errors) { if (!errors.ang && !errors.h0 && P.ang <= 0 && P.h0 <= 0) errors.h0 = '不上抛时需要大于 0 的抛出高度'; },
      simulate(P) {
        const vy0 = P.v0 * Math.sin(P.ang * Math.PI / 180), tL = (vy0 + Math.sqrt(vy0 * vy0 + 2 * P.g * P.h0)) / P.g;
        const top = vy0 > 0 ? vy0 / P.g : 0, ph = [];
        if (top > 1e-9) ph.push({ t0: 0, t1: top, title: '上升阶段', lines: ['竖直方向做匀减速运动'], end: '到达最高点，t = ' + fmt(top) + ' s' }, { t0: top, t1: tL, title: '下落阶段', lines: ['竖直方向做自由落体'], end: '落地，t = ' + fmt(tL) + ' s' });
        else ph.push({ t0: 0, t1: tL, title: '下落阶段', lines: ['水平匀速 + 竖直匀加速'], end: '落地，t = ' + fmt(tL) + ' s' });
        const E = at(P, tL), H = P.h0 + vy0 * vy0 / (2 * P.g);
        return api.kit.makeSim({
          P, tEnd: tL, phases: ph, xmin: 0, xmax: Math.max(E.x, 1), vmax: P.v0, state: t => at(P, t),
          tiles: [['飞行时间', fmt(tL) + ' s'], ['射程', fmt(E.x) + ' m'], ['最大高度', fmt(H) + ' m'], ['落地速率', fmt(E.v) + ' m/s']],
          rows: () => [['飞行时间 T', fmt(tL) + ' s'], ['射程 R', fmt(E.x) + ' m'], ['最大高度 H', fmt(H) + ' m'], ['落地速度 (vx, vy)', '(' + fmt(E.vx) + ', ' + fmt(E.vy) + ') m/s'], ['机械能守恒残差', Math.abs(E.Ek + E.Ep - at(P, 0).Ek - at(P, 0).Ep).toExponential(1) + ' J']],
          render2D: (ctx, W, Hh, s, st) => {
            const sc = Math.min((W - 80) / Math.max(s.xmax, 1), (Hh - 90) / Math.max(H, 1)), X = x => 40 + x * sc, Y = y => Hh - 40 - y * sc;
            ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, Hh); ctx.strokeStyle = '#2f3b52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, Y(0)); ctx.lineTo(W - 10, Y(0)); ctx.stroke();
            ctx.strokeStyle = 'rgba(232,89,12,.3)'; ctx.lineWidth = 1.6; ctx.beginPath(); s.samples.forEach((q, i) => i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y))); ctx.stroke();
            ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(X(st.x), Y(st.y), 8, 0, 7); ctx.fill();
            sArrow(ctx, X(st.x), Y(st.y), X(st.x) + st.vx * 4, Y(st.y) - st.vy * 4, '#2b8a3e', 2.4);
            sText(ctx, 'x = ' + nfix(st.x, 2) + ' m　y = ' + nfix(st.y, 2) + ' m', W - 12, 22, '#566078', '12px sans-serif', 'right'); sHUD(ctx, W, Hh, s, st);
          },
        });
      },
      presets: [
        { name: '斜抛 45°', params: { v0: '10', ang: '45', h0: '0', g: '10' }, problem: { text: '小球以 10 m/s、仰角 45° 抛出，g 取 10 m/s²，求射程与最大高度。', answer: '射程 10 m，最大高度 2.5 m' } },
        { name: '平抛', params: { v0: '5', ang: '0', h0: '20', g: '10' }, problem: { text: '小球从 20 m 高处以 5 m/s 水平抛出，求飞行时间和水平位移。', answer: '2 s，10 m' } },
      ],
    });
    api.charts.register({ id: 'pj_xy', name: 'y-x 轨迹', xl: 'x / m', yl: 'y / m', models: ['projectile'], series: [{ n: '小球', c: '#e8590c', x: 'x', y: 'y' }] });
    api.charts.register({ id: 'pj_vt', name: 'v-t 速度分量', xl: 't / s', yl: 'v / (m·s⁻¹)', time: true, models: ['projectile'], series: [{ n: 'vx', c: '#1c7ed6', x: 't', y: 'vx' }, { n: 'vy', c: '#2b8a3e', x: 't', y: 'vy' }] });
  },
});
