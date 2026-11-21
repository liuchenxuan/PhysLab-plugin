/**
 * 官方插件 · 图表扩展包
 * 演示：① 折线图（series 描述）② 自绘图（paint 回调，如柱状图）
 */
PhysLab.definePlugin({
  id: 'chart-pack',
  name: '图表扩展包',
  version: '1.0.0',
  author: 'PhysLab Official',
  category: 'official',
  kinds: ['chart'],
  apiVersion: '1.0',

  activate(api) {
    const { fmt, nfix, FONT } = api.helpers;
    const ALL = ['belt', 'board', 'duo', 'boat'];

    // ① 折线图：相对速度
    api.charts.register({
      id: 'rel_vt', name: 'v相对-t 相对速度', xl: 't / s', yl: 'v相对 / (m·s⁻¹)', time: true, models: ALL,
      series: [{ n: '相对速度', c: '#2b8a3e', x: 't', y: 'vr' }],
    });

    // ① 折线图：动量-时间（板块 / 碰撞 / 人船）
    api.charts.register({
      id: 'mom_t', name: 'p-t 动量', xl: 't / s', yl: 'p / (kg·m·s⁻¹)', time: true, models: ['board', 'duo', 'boat'],
      series: [
        { n: 'p物块', c: '#e8590c', x: 't', y: 'pb' },
        { n: 'p载体', c: '#1c7ed6', x: 't', y: 'pc' },
        { n: 'p总', c: '#9c36b5', x: 't', y: s => s.pb + s.pc },
      ],
    });

    // ① 折线图：相对位移 - 相对速度 相图
    api.charts.register({
      id: 'rel_phase', name: '相图：v相对-Δx', xl: 'Δx / m', yl: 'v相对 / (m·s⁻¹)', models: ['belt', 'board'],
      series: [{ n: '相轨迹', c: '#c92a2a', x: 'dRel', y: 'vr' }],
    });

    // ② 自绘图：能量分配柱状图（只显示当前时刻）
    api.charts.register({
      id: 'energy_bars', name: '能量分配（柱状图）', models: ['belt', 'board'],
      paint(ctx, W, H, env) {
        const { st, sim } = env;
        const items = [
          ['Ek物块', st.Ekb, '#e8590c'], ['Ek木板', sim.isBelt ? 0 : st.Ekc, '#1c7ed6'],
          ['ΔEp', st.dEp, '#2b8a3e'], ['Q摩擦', st.Q1, '#e03131'], ['Q地面', st.Q2, '#9c36b5'],
        ].filter(it => !(sim.isBelt && it[0] === 'Ek木板'));
        const last = sim.samples[sim.samples.length - 1] || st;
        const vmax = Math.max(1e-9, ...sim.samples.map(s => Math.max(s.Ekb, s.Ekc, Math.abs(s.dEp), s.Q1, s.Q2)), ...items.map(i => Math.abs(i[1])));
        const L = 54, R = 16, T = 40, B = 36, w = W - L - R, h = H - T - B, bw = Math.min(54, w / items.length * 0.6);
        const zeroY = T + h;
        ctx.strokeStyle = '#ddd5c5'; ctx.fillStyle = '#8a93a6'; ctx.font = '11px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) { const y = T + h - h * i / 4; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + w, y); ctx.stroke(); ctx.fillText(nfix(vmax * i / 4, 2), L - 6, y); }
        items.forEach((it, i) => {
          const cx = L + w * (i + 0.5) / items.length, bh = Math.abs(it[1]) / vmax * h;
          ctx.fillStyle = it[2]; ctx.fillRect(cx - bw / 2, it[1] >= 0 ? zeroY - bh : zeroY, bw, bh);
          ctx.fillStyle = '#1b2333'; ctx.textAlign = 'center'; ctx.font = '600 11px ' + FONT; ctx.textBaseline = 'bottom'; ctx.fillText(nfix(it[1], 2) + ' J', cx, (it[1] >= 0 ? zeroY - bh : zeroY) - 3);
          ctx.fillStyle = '#566078'; ctx.font = '11px ' + FONT; ctx.textBaseline = 'top'; ctx.fillText(it[0], cx, zeroY + 8);
        });
        ctx.fillStyle = '#8a93a6'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('t = ' + nfix(st.t, 2) + ' s（全程末态 Q = ' + nfix(last.Q1 + last.Q2, 2) + ' J）', W - 12, 14);
      },
    });
  },
});
