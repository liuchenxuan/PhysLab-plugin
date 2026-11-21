/**
 * 官方插件 · 力学变量与公式
 * 演示：api.variables.register —— 增加新变量（含计算公式），
 * 并可自动出现在“实时数据 / 图表 / 任意时刻测量 / 参数扫描指标”中。
 */
PhysLab.definePlugin({
  id: 'mechanics-variables',
  name: '力学变量与公式',
  version: '1.0.0',
  author: 'PhysLab Official',
  category: 'official',
  kinds: ['variable', 'chart'],
  apiVersion: '1.0',

  activate(api) {
    // 物块机械能 E = Ek + Ep（Ep 相对起点）
    api.variables.register({
      key: 'Emech', name: '物块机械能增量', label: 'E机', unit: 'J', models: ['belt', 'board'],
      chart: true, metric: 'end', color: '#2b8a3e',
      compute: (st, { P }) => st.Ekb - 0.5 * P.m * P.v0 * P.v0 + P.m * P.g * P.sin * st.sb,
    });

    // 摩擦力对物块的瞬时功率 P = f·v
    api.variables.register({
      key: 'Pf', name: '摩擦力对物块的功率', label: 'P摩', unit: 'W', models: ['belt', 'board'],
      chart: true, metric: 'max', color: '#9c36b5',
      compute: st => st.fb * st.vb,
    });

    // 系统总动量（板块 / 碰撞 / 人船）
    api.variables.register({
      key: 'ptot', name: '系统总动量', label: 'p总', unit: 'kg·m/s', models: ['board', 'duo', 'boat'],
      compute: st => st.pb + st.pc,
    });

    // 系统能量账本：Ek + Ep + Q（无外力时应守恒）
    api.variables.register({
      key: 'Eledger', name: '系统能量账本 Ek+Ep+Q', label: 'E账', unit: 'J', models: ['belt', 'board'],
      chart: true, color: '#c92a2a',
      compute: st => st.Ekb + st.Ekc + st.dEp + st.Q1 + st.Q2,
    });

    // 相对动能：1/2 μ_red v_rel²，μ_red 为折合质量（板块 / 碰撞）
    api.variables.register({
      key: 'Erel', name: '相对运动动能', label: 'E相', unit: 'J', models: ['board', 'duo'],
      compute: (st, { P }) => 0.5 * (P.m * P.M / (P.m + P.M)) * st.vr * st.vr,
    });
  },
});
