/**
 * 官方插件 · 电磁学模块
 *  - em-particle：带电粒子在匀强电场 / 匀强磁场（及其叠加）中的运动（解析解）
 *  - em-rod：单杆在水平导轨上切割磁感线（恒力 + 安培力 + 摩擦力，解析解）
 * 演示：如何用 api.models.register + api.kit.makeSim 增加一个全新的物理模块。
 */
PhysLab.definePlugin({
  id: 'electromagnetism',
  name: '电磁学模块',
  version: '1.0.0',
  author: 'PhysLab Official',
  category: 'official',
  kinds: ['module', 'chart', 'variable'],
  apiVersion: '1.0',

  activate(api) {
    const H = api.helpers, kit = api.kit, C = api.core;
    const { fmt, nfix, clamp, sArrow, sText, sHUD, FONT } = H;
    const p = (key, sym, name, unit, def, x) => Object.assign({ key, sym, name, unit, def }, x || {});
    const TWO_PI = 2 * Math.PI;

    /* ======================= 模块 1：带电粒子 ======================= */
    const particleAt = (P, t) => {
      const ph = P.phi * Math.PI / 180, vx0 = P.v0 * Math.cos(ph), vy0 = P.v0 * Math.sin(ph);
      const om = P.q * P.B / P.m, noB = Math.abs(P.B) < 1e-12;
      let x, y, vx, vy;
      if (noB) {                       // 只有电场：类平抛
        const a = P.q * P.E / P.m;
        x = P.x0 + vx0 * t; y = P.y0 + vy0 * t + 0.5 * a * t * t; vx = vx0; vy = vy0 + a * t;
      } else {                         // 漂移速度系中做匀速圆周运动
        const vd = P.E / P.B, u0x = vx0 - vd, u0y = vy0, c = Math.cos(om * t), s = Math.sin(om * t);
        x = P.x0 + vd * t + (u0x * s + u0y * (1 - c)) / om;
        y = P.y0 + (u0y * s - u0x * (1 - c)) / om;
        vx = vd + u0x * c + u0y * s; vy = u0y * c - u0x * s;
      }
      const v = Math.hypot(vx, vy);
      const Fm = Math.abs(P.q) * Math.abs(P.B) * v, Fe = Math.abs(P.q * P.E);
      const ax = P.q * (vy * P.B) / P.m, ay = P.q * (P.E - vx * P.B) / P.m;
      return { x, y, vx, vy, v, Ek: 0.5 * P.m * v * v, Fm, Fe, a: Math.hypot(ax, ay), We: P.q * P.E * (y - P.y0) };
    };

    function simulateParticle(P) {
      const noB = Math.abs(P.B) < 1e-12, T = noB ? Infinity : TWO_PI / Math.abs(P.q * P.B / P.m);
      const tEnd = P.tMax;
      const n = clamp(isFinite(T) ? Math.round(tEnd / (T / 2)) : 1, 1, 8), dt = tEnd / n;
      const kind = noB ? (Math.abs(P.E) < 1e-12 ? '匀速直线运动' : '类平抛运动（只受电场力）')
        : Math.abs(P.E) < 1e-12 ? '匀速圆周运动（洛伦兹力提供向心力）' : '圆周运动 + E×B 漂移（摆线类运动）';
      const phases = [];
      for (let k = 0; k < n; k++) {
        const a = particleAt(P, k * dt), b = particleAt(P, (k + 1) * dt);
        phases.push({ t0: k * dt, t1: (k + 1) * dt, title: kind, end: k === n - 1 ? '到达最长模拟时间' : '进入下一段（约每半个周期一段）',
          lines: ['位置：(' + fmt(a.x) + ', ' + fmt(a.y) + ') → (' + fmt(b.x) + ', ' + fmt(b.y) + ') m',
            '速度：' + fmt(a.v) + ' → ' + fmt(b.v) + ' m/s',
            '动能变化：' + fmt(b.Ek - a.Ek) + ' J'] });
      }
      let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity, vmax = 0;
      for (let i = 0; i <= 240; i++) { const s = particleAt(P, tEnd * i / 240); xmin = Math.min(xmin, s.x); xmax = Math.max(xmax, s.x); ymin = Math.min(ymin, s.y); ymax = Math.max(ymax, s.y); vmax = Math.max(vmax, s.v); }
      const S0 = particleAt(P, 0), S1 = particleAt(P, tEnd);
      const sim = kit.makeSim({
        P, tEnd, phases, xmin, xmax, vmax, samples: 40,
        state: t => particleAt(P, t),
        names: { v: 'v', vx: 'vx', vy: 'vy' },
        tiles: [['全过程时间', fmt(tEnd) + ' s'], ['回旋半径', noB ? '—' : fmt(P.m * Math.hypot(P.v0 * Math.cos(P.phi * Math.PI / 180) - P.E / P.B, P.v0 * Math.sin(P.phi * Math.PI / 180)) / (Math.abs(P.q * P.B))) + ' m'], ['周期 T', noB ? '—' : fmt(T) + ' s'], ['末动能', fmt(S1.Ek) + ' J']],
        rows: s => {
          const R = [['运动类型', kind], ['全过程时间 t', fmt(tEnd) + ' s']];
          if (!noB) {
            const vd = P.E / P.B, ph = P.phi * Math.PI / 180, u = Math.hypot(P.v0 * Math.cos(ph) - vd, P.v0 * Math.sin(ph));
            R.push(['角速度 ω = |q|B / m', fmt(Math.abs(P.q * P.B / P.m)) + ' rad/s'], ['周期 T = 2πm / (|q|B)', fmt(T) + ' s'], ['回旋半径 R = m·u / (|q|B)（u 为漂移系中的速率）', fmt(P.m * u / Math.abs(P.q * P.B)) + ' m']);
            if (Math.abs(P.E) > 1e-12) R.push(['E×B 漂移速度 E / B', fmt(vd) + ' m/s（沿 +x）']);
          } else if (Math.abs(P.E) > 1e-12) R.push(['加速度 a = qE / m（沿 y）', fmt(P.q * P.E / P.m) + ' m/s²']);
          R.push(['末位置 (x, y)', '(' + fmt(S1.x) + ', ' + fmt(S1.y) + ') m'], ['末速度 (vx, vy)', '(' + fmt(S1.vx) + ', ' + fmt(S1.vy) + ') m/s'], ['末速率', fmt(S1.v) + ' m/s'],
            ['动能变化 ΔEk', fmt(S1.Ek - S0.Ek) + ' J'], ['电场力做功 qE·Δy', fmt(S1.We) + ' J'], ['洛伦兹力做功', '0 J（始终垂直于速度）']);
          return R;
        },
        checks: () => {
          let r = 0; for (let i = 0; i <= 200; i++) { const t = tEnd * i / 200, a = particleAt(P, t); r = Math.max(r, Math.abs((a.Ek - S0.Ek) - a.We)); }
          const out = [{ status: r < 1e-8 * Math.max(1, S0.Ek) ? 'pass' : 'fail', item: '动能定理：ΔEk = qE·Δy（洛伦兹力不做功）', detail: '全程最大残差 ' + r.toExponential(1) + ' J' }];
          if (Math.abs(P.E) < 1e-12 && !noB) { let dv = 0; for (let i = 0; i <= 200; i++) dv = Math.max(dv, Math.abs(particleAt(P, tEnd * i / 200).v - P.v0)); out.push({ status: dv < 1e-8 * Math.max(1, P.v0) ? 'pass' : 'fail', item: '只有磁场时速率不变', detail: '最大速率偏差 ' + dv.toExponential(1) + ' m/s' }); }
          return out;
        },
        solution: () => {
          const st = [{ title: '受力分析', items: [{ tag: '洛伦兹力', tex: '$f = |q|vB$，方向由左手定则判断，始终垂直于速度，不做功' }, { tag: '电场力', tex: '$F = qE = ' + fmt(P.q * P.E) + '$ N（沿 +y 方向为正）' }] }];
          if (!noB) st.push({ title: '圆周运动', items: [{ tag: '向心力', tex: '$|q|vB = m v^2 / R$' }, { tag: '半径', tex: '$R = mv / (|q|B)$' }, { tag: '周期', tex: '$T = 2πm / (|q|B) = #' + fmt(T) + '#$ s（与速度大小无关）' }] });
          else st.push({ title: '类平抛', items: [{ tag: '加速度', tex: '$a = qE / m = #' + fmt(P.q * P.E / P.m) + '#$ m/s²' }, { tag: '偏移', tex: '$Δy = v_{y0}t + at²/2$' }] });
          return st;
        },
        infoBox: st => '洛伦兹力 f = <b>' + nfix(st.Fm, 3) + ' N</b><br>电场力 F = <b>' + nfix(st.Fe, 3) + ' N</b><br>速率 v = <b>' + nfix(st.v, 3) + ' m/s</b>' + (noB ? '' : '<br>周期 T = <b>' + nfix(T, 3) + ' s</b>'),
        forceBox: st => '<h6>带电粒子（m = ' + nfix(P.m) + ' kg，q = ' + nfix(P.q) + ' C）</h6><div><i style="background:#9c36b5"></i><span>洛伦兹力</span><b>' + nfix(st.Fm, 3) + ' N</b></div><div><i style="background:#d9480f"></i><span>电场力</span><b>' + nfix(st.Fe, 3) + ' N</b></div><div><i style="background:#1f7a36"></i><span>加速度</span><b>' + nfix(st.a, 3) + ' m/s²</b></div>',
        render2D: (ctx, W, Hh, s, st, o) => {
          const vw = (o && o.view) || {}, mx = 0.15 * Math.max(xmax - xmin, ymax - ymin, 1) + 0.5;
          const bx0 = xmin - mx, bx1 = xmax + mx, by0 = ymin - mx, by1 = ymax + mx;
          const sc = (vw.zoom || 1) * Math.min((W - 60) / (bx1 - bx0), (Hh - 80) / (by1 - by0));
          const cx = W / 2 + (vw.x || 0) - ((bx0 + bx1) / 2) * sc, cy = Hh / 2 + 10 + (vw.y || 0) + ((by0 + by1) / 2) * sc;
          const X = x => cx + x * sc, Y = y => cy - y * sc;
          ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, Hh);
          if (!noB) {   // 磁场符号：B>0 垂直纸面向外（点），B<0 向内（叉）
            ctx.strokeStyle = ctx.fillStyle = 'rgba(28,126,214,.35)'; ctx.lineWidth = 1.3;
            const gap = 34;
            for (let gx = 30; gx < W; gx += gap) for (let gy = 56; gy < Hh - 10; gy += gap) {
              if (P.B > 0) { ctx.beginPath(); ctx.arc(gx, gy, 2.4, 0, TWO_PI); ctx.fill(); ctx.beginPath(); ctx.arc(gx, gy, 6, 0, TWO_PI); ctx.stroke(); }
              else { ctx.beginPath(); ctx.moveTo(gx - 4, gy - 4); ctx.lineTo(gx + 4, gy + 4); ctx.moveTo(gx + 4, gy - 4); ctx.lineTo(gx - 4, gy + 4); ctx.stroke(); }
            }
          }
          if (Math.abs(P.E) > 1e-12) { const up = P.E > 0; for (let gx = 70; gx < W; gx += 120) sArrow(ctx, gx, up ? Hh - 20 : 60, gx, up ? 70 : Hh - 22, 'rgba(217,72,15,.45)', 2, true); }
          ctx.strokeStyle = '#d9d2c0'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.moveTo(X(0), 40); ctx.lineTo(X(0), Hh); ctx.stroke(); ctx.setLineDash([]);
          ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(232,89,12,.28)'; ctx.beginPath();
          s.samples.forEach((q, i) => { i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)); }); ctx.stroke();
          ctx.lineWidth = 2.6; ctx.strokeStyle = '#e8590c'; ctx.beginPath(); let first = true;
          for (const q of s.samples) { if (q.t > st.t + 1e-9) break; first ? ctx.moveTo(X(q.x), Y(q.y)) : ctx.lineTo(X(q.x), Y(q.y)); first = false; }
          ctx.lineTo(X(st.x), Y(st.y)); ctx.stroke();
          ctx.fillStyle = P.q >= 0 ? '#e03131' : '#1c7ed6'; ctx.beginPath(); ctx.arc(X(st.x), Y(st.y), 8, 0, TWO_PI); ctx.fill();
          sText(ctx, P.q >= 0 ? '+' : '−', X(st.x), Y(st.y), '#fff', '700 12px ' + FONT);
          if (o && o.showVec !== false && st.v > 1e-9) sArrow(ctx, X(st.x), Y(st.y), X(st.x) + st.vx / Math.max(s.vmax, 1e-9) * 60, Y(st.y) - st.vy / Math.max(s.vmax, 1e-9) * 60, '#2b8a3e', 2.4);
          sText(ctx, (P.B > 0 ? 'B 垂直纸面向外' : P.B < 0 ? 'B 垂直纸面向内' : '无磁场') + (Math.abs(P.E) > 1e-12 ? '　E 沿 ' + (P.E > 0 ? '+y' : '−y') : ''), W - 12, 22, '#566078', '12px ' + FONT, 'right');
          sHUD(ctx, W, Hh, s, st);
        },
      });
      return sim;
    }

    api.models.register({
      id: 'em-particle', name: '电磁·带电粒子在电磁场中运动', short: '带电粒子', carrier: '粒子', noCarrier: true, segLabel: '带电粒子',
      stats: [['t', 't', 's'], ['x', 'x', 'm'], ['y', 'y', 'm'], ['vx', 'vx', 'm/s'], ['vy', 'vy', 'm/s'], ['v', 'v', 'm/s'], ['Ek', 'Ek', 'J'], ['Fm', 'f洛', 'N'], ['Fe', 'F电', 'N']],
      defaultCharts: ['em_xy', 'em_vt'],
      aiNote: '坐标系：x 向右、y 向上；B>0 垂直纸面向外，E>0 沿 +y；phi 为初速度与 +x 轴的夹角（度）。',
      params: [
        p('m', 'm', '粒子质量', 'kg', '1', { group: '粒子', pos: true }),
        p('q', 'q', '电荷量（带符号）', 'C', '1', { group: '粒子', ai: '带符号，负电荷填负数' }),
        p('x0', 'x<sub>0</sub>', '初始位置 x', 'm', '0', { group: '粒子' }), p('y0', 'y<sub>0</sub>', '初始位置 y', 'm', '0', { group: '粒子' }),
        p('v0', 'v<sub>0</sub>', '初速率', 'm/s', '2', { group: '粒子', nonneg: true }),
        p('phi', 'φ', '初速度方向（与 +x 夹角）', '°', '90', { group: '粒子', hint: '90 = 沿 +y 向上', ai: '度，逆时针为正' }),
        p('B', 'B', '磁感应强度（带符号）', 'T', '1', { group: '场', hint: '正 = 垂直纸面向外，0 = 无磁场', ai: '正 = 垂直纸面向外，负 = 向内' }),
        p('E', 'E', '电场强度（沿 y）', 'V/m', '0', { group: '场', hint: '正 = 沿 +y', ai: '正 = 沿 +y 方向' }),
        p('tMax', 't<sub>max</sub>', '模拟时间', 's', '2π', { group: '环境', pos: true }),
      ],
      build(cfg, P, errors) { if (!errors.q && Math.abs(P.q) < 1e-15) errors.q = '电荷量不能为 0'; },
      simulate: simulateParticle,
      presets: [
        { name: '匀强磁场·匀速圆周运动', params: { m: '1', q: '1', B: '1', E: '0', v0: '2', phi: '90', tMax: '2π' },
          problem: { text: '质量 m=1 kg、电荷量 q=1 C 的粒子以 v₀=2 m/s 沿 +y 方向射入垂直纸面向外、B=1 T 的匀强磁场。求：\n(1) 粒子的轨道半径；\n(2) 运动周期；\n(3) 运动一个周期后的位置。', answer: '(1) R = 2 m  (2) T = 2π s  (3) 回到出发点' } },
        { name: '速度选择器·匀速直线', params: { m: '1', q: '1', B: '2', E: '4', v0: '2', phi: '0', tMax: '5' },
          problem: { text: '正交的匀强电场（E=4 V/m，沿 +y）和匀强磁场（B=2 T，垂直纸面向外）中，粒子以 v₀=2 m/s 沿 +x 射入。判断粒子的运动并求 5 s 内的位移。', answer: 'qE = qv₀B，粒子做匀速直线运动，位移 10 m' } },
        { name: '摆线运动（由静止释放）', params: { m: '1', q: '1', B: '1', E: '1', v0: '0', phi: '0', tMax: '4π' },
          problem: { text: '正交的匀强电场（E=1 V/m，沿 +y）与匀强磁场（B=1 T，垂直纸面向外）中，质量 1 kg、电荷量 1 C 的粒子由静止释放。求粒子的最大速率和沿 x 方向的平均漂移速度。', answer: 'vmax = 2E/B = 2 m/s；漂移速度 E/B = 1 m/s' } },
        { name: '匀强电场·类平抛偏转', params: { m: '1', q: '1', B: '0', E: '2', v0: '3', phi: '0', tMax: '3' },
          problem: { text: '粒子以 v₀=3 m/s 沿 +x 射入 E=2 V/m（沿 +y）的匀强电场，m=1 kg，q=1 C，不计重力。求 3 s 末的位置与速度。', answer: '位置 (9, 9) m；速度 (3, 6) m/s' } },
      ],
    });
    api.charts.register({ id: 'em_xy', name: 'y-x 运动轨迹', xl: 'x / m', yl: 'y / m', models: ['em-particle'], series: [{ n: '粒子', c: '#e8590c', x: 'x', y: 'y' }] });
    api.charts.register({ id: 'em_vt', name: 'v-t 速度分量', xl: 't / s', yl: 'v / (m·s⁻¹)', time: true, models: ['em-particle'], series: [{ n: 'vx', c: '#1c7ed6', x: 't', y: 'vx' }, { n: 'vy', c: '#2b8a3e', x: 't', y: 'vy' }, { n: '|v|', c: '#e8590c', x: 't', y: 'v' }] });
    api.charts.register({ id: 'em_Et', name: 'Ek-t 动能', xl: 't / s', yl: 'E / J', time: true, models: ['em-particle'], series: [{ n: 'Ek', c: '#e8590c', x: 't', y: 'Ek' }, { n: '电场力做功', c: '#9c36b5', x: 't', y: 'We' }] });

    /* ======================= 模块 2：导体棒切割磁感线 ======================= */
    const rodAt = (P, K, t) => {
      const tt = Math.min(t, K.tStop);
      const e = Math.exp(-tt / K.tau);
      let v = K.vT + (P.v0 - K.vT) * e, x = K.vT * tt + (P.v0 - K.vT) * K.tau * (1 - e);
      if (t >= K.tStop) v = 0;
      if (K.static) { v = 0; x = 0; }
      const emf = P.B * P.L * v, I = emf / P.R, FA = P.B * I * P.L, Ek = 0.5 * P.m * v * v;
      const moving = !K.static && t < K.tStop, a = moving ? (K.Fn - FA) / P.m : 0;
      const Qf = P.mu * P.m * P.g * x, WF = P.F * x, QJ = WF - Qf - (Ek - 0.5 * P.m * P.v0 * P.v0);
      return { x, v, a, emf, I, FA, Ek, PF: P.F * v, PJ: I * I * P.R, QJ, Qf, qc: P.B * P.L * x / P.R };
    };
    function rodConst(P) {
      const k = P.B * P.B * P.L * P.L / P.R, Fn = P.F - P.mu * P.m * P.g;
      const K = { k, Fn, tau: P.m / k, vT: Fn / k, tStop: Infinity, static: false };
      if (P.v0 < 1e-12 && Fn <= 1e-12) K.static = true;
      else if (K.vT < -1e-12) K.tStop = K.tau * Math.log((P.v0 - K.vT) / (-K.vT));
      return K;
    }
    function simulateRod(P) {
      const K = rodConst(P), tEnd = P.tMax, stops = isFinite(K.tStop) && K.tStop < tEnd;
      let cut = stops ? K.tStop : (Math.abs(K.vT - P.v0) > 1e-12 && K.vT > 1e-12 ? K.tau * Math.log(100 * Math.abs(P.v0 - K.vT) / Math.max(Math.abs(K.vT), 1e-12)) : 0);
      const steady = !stops && cut > 1e-9 && cut < tEnd - 1e-9;
      const phases = [];
      const line = (a, b) => ['速度：' + fmt(a.v) + ' → ' + fmt(b.v) + ' m/s', '位移：' + fmt(b.x - a.x) + ' m', '电流：' + fmt(a.I) + ' → ' + fmt(b.I) + ' A', '安培力：' + fmt(a.FA) + ' → ' + fmt(b.FA) + ' N'];
      if (K.static) phases.push({ t0: 0, t1: tEnd, title: '杆保持静止（外力不大于最大静摩擦力）', lines: ['v = 0，无感应电流'], end: '到达最长模拟时间' });
      else if (stops) {
        const A = rodAt(P, K, 0), B = rodAt(P, K, K.tStop), Cc = rodAt(P, K, tEnd);
        phases.push({ t0: 0, t1: K.tStop, title: '减速运动（安培力与摩擦力阻碍运动）', lines: line(A, B), end: '杆停止运动，t = ' + fmt(K.tStop) + ' s' },
          { t0: K.tStop, t1: tEnd, title: '杆静止', lines: ['v = 0，无感应电流', '位移不再变化：' + fmt(Cc.x) + ' m'], end: '到达最长模拟时间' });
      } else if (steady) {
        const A = rodAt(P, K, 0), B = rodAt(P, K, cut), Cc = rodAt(P, K, tEnd);
        phases.push({ t0: 0, t1: cut, title: (P.v0 < K.vT ? '加速度逐渐减小的加速运动' : '加速度逐渐减小的减速运动'), lines: line(A, B), end: '速度达到终极速度的 99%（t ≈ ' + fmt(cut) + ' s）' },
          { t0: cut, t1: tEnd, title: '趋于匀速运动（F = F安 + f）', lines: line(B, Cc), end: '到达最长模拟时间' });
      } else {
        const A = rodAt(P, K, 0), B = rodAt(P, K, tEnd);
        phases.push({ t0: 0, t1: tEnd, title: K.vT > P.v0 ? '加速运动' : '运动', lines: line(A, B), end: '到达最长模拟时间' });
      }
      const S1 = rodAt(P, K, tEnd), S0 = rodAt(P, K, 0);
      let xmaxR = 0, Imax = 0, FAmax = 0, vmax = 0; for (let i = 0; i <= 120; i++) { const s = rodAt(P, K, tEnd * i / 120); xmaxR = Math.max(xmaxR, s.x); Imax = Math.max(Imax, Math.abs(s.I)); FAmax = Math.max(FAmax, Math.abs(s.FA)); vmax = Math.max(vmax, s.v); }
      return kit.makeSim({
        P, tEnd, phases, xmin: 0, xmax: Math.max(xmaxR, 1), vmax: Math.max(vmax, 1e-6), samples: 50, endReason: stops ? 'steady' : 'tmax',
        state: t => rodAt(P, K, t),
        tiles: [['全过程时间', fmt(tEnd) + ' s'], ['终极速度', K.vT > 0 ? fmt(K.vT) + ' m/s' : '—'], ['焦耳热 Q', fmt(S1.QJ) + ' J'], ['通过电荷量', fmt(S1.qc) + ' C']],
        rows: () => [['时间常数 τ = mR / (B²L²)', fmt(K.tau) + ' s'], ['终极速度 vT = (F − μmg)R / (B²L²)', fmt(K.vT) + ' m/s'], ['杆停止时刻', isFinite(K.tStop) ? fmt(K.tStop) + ' s' : '不会停下'],
          ['末速度', fmt(S1.v) + ' m/s'], ['位移 x', fmt(S1.x) + ' m'], ['最大感应电流', fmt(Imax) + ' A'], ['最大安培力', fmt(FAmax) + ' N'],
          ['回路焦耳热 Q', fmt(S1.QJ) + ' J'], ['摩擦生热', fmt(S1.Qf) + ' J'], ['外力做功 W = F·x', fmt(S1.x * P.F) + ' J'], ['通过回路的电荷量 q = BLx / R', fmt(S1.qc) + ' C'], ['动能变化 ΔEk', fmt(S1.Ek - S0.Ek) + ' J']],
        checks: () => {
          let q = 0, prev = rodAt(P, K, 0), r = 0; const N = 2000;
          for (let i = 1; i <= N; i++) { const s = rodAt(P, K, tEnd * i / N); q += 0.5 * (prev.PJ + s.PJ) * tEnd / N; prev = s; }
          r = Math.abs(q - S1.QJ);
          return [{ status: r < 1e-4 * Math.max(1, Math.abs(S1.QJ)) ? 'pass' : 'fail', item: '能量守恒：W外 = ΔEk + Q焦耳 + Q摩擦', detail: '∫I²R dt = ' + nfix(q, 5) + ' J，与能量法 ' + nfix(S1.QJ, 5) + ' J 相差 ' + r.toExponential(1) },
            { status: 'info', item: '提示', detail: '此模块假设杆始终垂直于导轨、导轨足够长且电阻只在回路 R 中。' }];
        },
        solution: () => [{ title: '受力与动力学方程', items: [{ tag: '感应电动势', tex: '$ε = BLv$' }, { tag: '安培力', tex: '$F_安 = B²L²v / R$' }, { tag: '牛顿第二定律', tex: '$F − μmg − B²L²v / R = m·dv/dt$' }] },
          { title: '解', items: [{ tag: '终极速度', tex: '$v_T = (F − μmg)R / (B²L²) = #' + fmt(K.vT) + '#$ m/s' }, { tag: '速度', tex: '$v = v_T + (v_0 − v_T)e^{−t/τ}$，$τ = mR/(B²L²) = ' + fmt(K.tau) + '$ s' }, { tag: '焦耳热', tex: '$Q = Fx − μmgx − ΔE_k = #' + fmt(S1.QJ) + '#$ J' }] }],
        infoBox: st => '感应电动势 ε = <b>' + nfix(st.emf, 3) + ' V</b><br>电流 I = <b>' + nfix(st.I, 3) + ' A</b><br>安培力 F安 = <b>' + nfix(st.FA, 3) + ' N</b><br>焦耳热 Q = <b>' + nfix(st.QJ, 3) + ' J</b>',
        forceBox: st => '<h6>导体棒（m = ' + nfix(P.m) + ' kg）</h6><div><i style="background:#d9480f"></i><span>外力 F</span><b>' + nfix(P.F, 3) + ' N</b></div><div><i style="background:#9c36b5"></i><span>安培力</span><b>' + nfix(st.FA, 3) + ' N</b></div><div><i style="background:#6b4fbb"></i><span>滑动摩擦力</span><b>' + nfix(st.v > 1e-9 ? P.mu * P.m * P.g : 0, 3) + ' N</b></div><div><i style="background:#1f7a36"></i><span>加速度</span><b>' + nfix(st.a, 3) + ' m/s²</b></div>',
        render2D: (ctx, W, Hh, s, st, o) => {
          const vw = (o && o.view) || {}, padX = 80, span = Math.max(s.xmax * 1.15, 1), sc = (vw.zoom || 1) * (W - padX * 2 - 30) / span, x0 = padX + (vw.x || 0), yT = Hh * 0.32 + (vw.y || 0), yB = Hh * 0.72 + (vw.y || 0);
          ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, Hh);
          ctx.strokeStyle = 'rgba(28,126,214,.35)'; ctx.lineWidth = 1.3;
          for (let gx = padX + 20; gx < W - 20; gx += 38) for (let gy = yT + 16; gy < yB - 10; gy += 34) { ctx.beginPath(); ctx.moveTo(gx - 4, gy - 4); ctx.lineTo(gx + 4, gy + 4); ctx.moveTo(gx + 4, gy - 4); ctx.lineTo(gx - 4, gy + 4); ctx.stroke(); }
          ctx.strokeStyle = '#2f3b52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 - 30, yT); ctx.lineTo(W - 20, yT); ctx.moveTo(x0 - 30, yB); ctx.lineTo(W - 20, yB); ctx.moveTo(x0 - 30, yT); ctx.lineTo(x0 - 30, yB); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.fillRect(x0 - 38, (yT + yB) / 2 - 16, 16, 32); ctx.strokeRect(x0 - 38, (yT + yB) / 2 - 16, 16, 32); sText(ctx, 'R', x0 - 56, (yT + yB) / 2, '#2f3b52');
          const bx = x0 + st.x * sc; ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, yT); ctx.lineTo(bx, yB); ctx.stroke(); ctx.lineCap = 'butt';
          sText(ctx, 'L = ' + nfix(P.L), bx + 26, (yT + yB) / 2, '#566078', '11px ' + FONT);
          if (P.F > 1e-9) sArrow(ctx, bx + 12, (yT + yB) / 2 + 28, bx + 12 + Math.min(70, 18 + P.F * 8), (yT + yB) / 2 + 28, '#d9480f', 3);
          if (Math.abs(st.FA) > 1e-6) sArrow(ctx, bx - 12, (yT + yB) / 2 - 28, bx - 12 - Math.min(70, 14 + Math.abs(st.FA) * 8), (yT + yB) / 2 - 28, '#9c36b5', 3);
          if (st.v > 1e-9) sArrow(ctx, bx, yB + 26, bx + 14 + 50 * st.v / Math.max(s.vmax, 1e-9), yB + 26, '#2b8a3e', 2.6);
          sText(ctx, 'B 垂直纸面向内', W - 12, 22, '#566078', '12px ' + FONT, 'right'); sText(ctx, 'F 橙色 · F安 紫色 · v 绿色', W - 12, 40, '#8a93a6', '11px ' + FONT, 'right');
          sHUD(ctx, W, Hh, s, st);
        },
      });
    }
    api.models.register({
      id: 'em-rod', name: '电磁·导体棒切割磁感线（水平导轨）', short: '导体棒', carrier: '导体棒', noCarrier: true, segLabel: '导体棒',
      stats: [['t', 't', 's'], ['x', 'x', 'm'], ['v', 'v', 'm/s'], ['a', 'a', 'm/s²'], ['emf', 'ε', 'V'], ['I', 'I', 'A'], ['FA', 'F安', 'N'], ['PJ', 'P热', 'W'], ['QJ', 'Q焦耳', 'J'], ['qc', 'q', 'C']],
      defaultCharts: ['rod_vt', 'rod_It'],
      aiNote: '单杆在水平光滑/粗糙导轨上，磁场垂直导轨平面；F 为沿导轨的恒定外力，R 为回路总电阻。',
      params: [
        p('m', 'm', '导体棒质量', 'kg', '1', { group: '导体棒', pos: true }),
        p('v0', 'v<sub>0</sub>', '初速度', 'm/s', '0', { group: '导体棒', nonneg: true }),
        p('mu', 'μ', '棒与导轨动摩擦因数', '', '0', { group: '导体棒', nonneg: true }),
        p('F', 'F', '恒定外力（沿速度方向）', 'N', '2', { group: '外力', nonneg: true }),
        p('L', 'L', '导轨间距', 'm', '1', { group: '回路', pos: true }),
        p('R', 'R', '回路总电阻', 'Ω', '1', { group: '回路', pos: true }),
        p('B', 'B', '磁感应强度', 'T', '1', { group: '场', pos: true }),
        Object.assign({}, C.COMMON_PARAMS[0]),
        p('tMax', 't<sub>max</sub>', '模拟时间', 's', '6', { group: '环境', pos: true }),
      ],
      simulate: simulateRod,
      presets: [
        { name: '恒力拉杆·趋于终极速度', params: { m: '1', v0: '0', mu: '0', F: '2', L: '1', R: '1', B: '1', tMax: '6' },
          problem: { text: '光滑水平导轨间距 L=1 m，电阻 R=1 Ω，匀强磁场 B=1 T 垂直导轨平面。质量 m=1 kg 的导体棒在恒力 F=2 N 作用下由静止开始运动。求：\n(1) 棒的最大速度；\n(2) 速度为 1 m/s 时的加速度。', answer: '(1) 2 m/s  (2) 1 m/s²' } },
        { name: '给杆初速·无外力减速到停', params: { m: '1', v0: '4', mu: '0', F: '0', L: '1', R: '1', B: '1', tMax: '6' },
          problem: { text: '光滑水平导轨间距 L=1 m，回路电阻 R=1 Ω，B=1 T。质量 m=1 kg 的导体棒以 v₀=4 m/s 向右运动且不受其他外力。求：\n(1) 棒滑行的总距离；\n(2) 回路产生的焦耳热。', answer: '(1) 4 m  (2) 8 J' } },
        { name: '粗糙导轨·外力不足以拉动', params: { m: '1', v0: '0', mu: '0.3', F: '2', L: '1', R: '1', B: '1', tMax: '4' },
          problem: { text: '导轨粗糙，μ=0.3，m=1 kg，g=10 m/s²，外力 F=2 N。判断棒能否被拉动。', answer: '最大静摩擦力 3 N > F，棒保持静止' } },
      ],
    });
    api.charts.register({ id: 'rod_vt', name: 'v-t 速度', xl: 't / s', yl: 'v / (m·s⁻¹)', time: true, models: ['em-rod'], series: [{ n: 'v', c: '#e8590c', x: 't', y: 'v' }] });
    api.charts.register({ id: 'rod_It', name: 'I-t 感应电流 / 安培力', xl: 't / s', yl: 'I / A　F安 / N', time: true, models: ['em-rod'], series: [{ n: 'I', c: '#1c7ed6', x: 't', y: 'I' }, { n: 'F安', c: '#9c36b5', x: 't', y: 'FA' }] });
    api.charts.register({ id: 'rod_Qt', name: 'Q-t 焦耳热与功率', xl: 't / s', yl: 'Q / J　P / W', time: true, models: ['em-rod'], series: [{ n: 'Q焦耳', c: '#e03131', x: 't', y: 'QJ' }, { n: 'P热', c: '#d9780a', x: 't', y: 'PJ' }, { n: 'P外力', c: '#2b8a3e', x: 't', y: 'PF' }] });
    api.charts.register({ id: 'rod_xt', name: 'x-t 位移', xl: 't / s', yl: 'x / m', time: true, models: ['em-rod'], series: [{ n: 'x', c: '#2b8a3e', x: 't', y: 'x' }] });

    /* 为已有的力学模型增加一个电磁相关变量：动能的电功率换算示例见 mechanics-variables 插件 */
  },
});
