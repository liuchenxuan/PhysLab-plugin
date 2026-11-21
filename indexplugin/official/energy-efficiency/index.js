/**
 * 官方插件 · 能量与效率分析
 * 演示：新增计算结果（results.add）、修正已有结果（results.transform）、
 * 新增本地校验（checks.add）、新增解题步骤（solution.add）。
 */
PhysLab.definePlugin({
  id: 'energy-efficiency',
  name: '能量与效率分析',
  version: '1.0.0',
  author: 'PhysLab Official',
  category: 'official',
  kinds: ['result'],
  apiVersion: '1.0',

  activate(api) {
    const { fmt, nfix } = api.helpers;

    // 新增结果：传送带的能量去向与效率
    api.results.add(sim => {
      const S = sim.summary, dE = S.dEkb + S.dEpb, W = S.Wbelt;
      const rows = [['物块机械能增量 ΔE机', fmt(dE) + ' J']];
      if (W > 1e-12) rows.push(['传送效率 η = ΔE机 / W电', nfix(dE / W * 100, 2) + ' %'], ['摩擦热占电能比例 Q / W电', nfix(S.Q1 / W * 100, 2) + ' %']);
      return rows;
    }, { models: ['belt'] });

    // 新增结果：板块的机械能损失占比
    api.results.add(sim => {
      const S = sim.summary, E0 = 0.5 * sim.P.m * sim.P.v0 * sim.P.v0 + 0.5 * sim.P.M * sim.P.boardV0 * sim.P.boardV0;
      const rows = [['系统总生热 Q总', fmt(S.Q1 + S.Q2) + ' J']];
      if (E0 > 1e-12) rows.push(['总生热占初始动能比例', nfix((S.Q1 + S.Q2) / E0 * 100, 2) + ' %']);
      return rows;
    }, { models: ['board'] });

    // 修正已有结果：痕迹重叠时给“痕迹长度”加说明，防止误用于求 Q
    api.results.transform((rows, sim) => {
      const S = sim.summary;
      return rows.map(r => (r[0] === '痕迹长度' && S.sRel - S.mark > 1e-6) ? [r[0], r[1] + '（痕迹重叠，求 Q 用相对路程）'] : r);
    }, { models: ['belt', 'board'] });

    // 新增校验：电能 = 机械能增量 + 摩擦热
    api.checks.add((inp, sim) => {
      const S = sim.summary, lhs = S.Wbelt, rhs = S.dEkb + S.dEpb + S.Q1, r = Math.abs(lhs - rhs);
      return [{ status: r < 1e-6 * Math.max(1, Math.abs(lhs)) ? 'pass' : 'warn', item: '传送带能量账本：W电 = ΔE机 + Q', detail: 'W电 = ' + nfix(lhs, 4) + ' J，ΔE机 + Q = ' + nfix(rhs, 4) + ' J' }];
    }, { models: ['belt'] });

    // 新增解题步骤
    api.solution.add(sim => {
      const S = sim.summary;
      return [{ title: '能量转化（由 能量与效率分析 插件补充）', items: [
        { tag: '电能', tex: '$W_电 = ΔE_机 + Q = ' + fmt(S.dEkb + S.dEpb) + ' + ' + fmt(S.Q1) + ' = #' + fmt(S.Wbelt) + '#$ J' }] }];
    }, { models: ['belt'] });
  },
});
