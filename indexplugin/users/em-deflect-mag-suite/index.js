/**
 * PhysLab 用户插件 · 高中电磁学专题：带电粒子在有界磁场与偏转电场中的运动系列题库
 * 遵循 PhysLab Plugin API 1.0 规范（无 import/export，同步注册，解析解驱动）
 * 导入方式：打开 PhysLab -> 插件市场 -> 导入本地插件 -> 选择本 index.js -> 立即重新加载
 */
PhysLab.definePlugin({
  id: 'em-deflect-mag-suite',
  name: '高中电磁学·有界磁场与偏转电场题库套件',
  version: '1.0.0',
  author: 'PhysLab Electromagnetism Studio',
  category: 'users',
  kinds: ['module', 'chart', 'variable'],
  apiVersion: '1.0',
  activate(api) {
    const H = api.helpers, kit = api.kit;
    const { fmt, nfix, clamp, sArrow, sText, sHUD, FONT } = H;
    const TWO_PI = 2 * Math.PI;
    const p = (key, sym, name, unit, def, extra) => Object.assign({ key, sym, name, unit, def }, extra || {});

    /* ================= 模块 1：有界匀强磁场中的圆周运动 (emdm-mag-bound) ================= */
    function simMagBound(P) {
      const mode = Math.round(P.boundMode || 1);
      const m = Math.max(P.m, 1e-9), q = Math.abs(P.q) < 1e-12 ? 1 : P.q;
      const B = Math.abs(P.B) < 1e-12 ? 1 : P.B, v0 = Math.max(P.v0, 0.01);
      const phi = P.phi * Math.PI / 180, d = Math.max(P.d, 0.2), R0 = Math.max(P.R0, 0.2);
      const omega = q * B / m, absW = Math.abs(omega), T = TWO_PI / absW, R = v0 / absW;
      const sgnW = omega >= 0 ? 1 : -1;
      const xIn = mode === 3 ? R0 - Math.sqrt(Math.max(0, R0 * R0 - clamp(P.y0, -0.95 * R0, 0.95 * R0) ** 2)) : 0;
      const yIn = mode === 3 ? clamp(P.y0, -0.95 * R0, 0.95 * R0) : P.y0;
      const vx0 = v0 * Math.cos(phi), vy0 = v0 * Math.sin(phi);
      const xc = xIn + vy0 / omega, yc = yIn - vx0 / omega;
      const RcStrip = d / Math.max(0.05, 1 + sgnW * Math.sin(phi)), vcStrip = Math.abs(q * B) * RcStrip / m;

      let dTheta = Math.PI, outcome = '从左边界射出';
      const alpha0 = Math.atan2(yIn - yc, xIn - xc);
      if (mode === 1) {
        dTheta = (sgnW > 0 ? 2 * alpha0 : -2 * alpha0);
        while (dTheta <= 1e-7) dTheta += TWO_PI;
        while (dTheta > TWO_PI) dTheta -= TWO_PI;
        outcome = '从单边界 x = 0 对称射出';
      } else if (mode === 2) {
        if (xc + R > d + 1e-6) {
          const cosA = clamp((d - xc) / R, -1, 1), aP = Math.acos(cosA);
          const norm = a => { let r = a % TWO_PI; return r <= 1e-7 ? r + TWO_PI : r; };
          dTheta = Math.min(norm(sgnW > 0 ? alpha0 - aP : aP - alpha0), norm(sgnW > 0 ? alpha0 + aP : -aP - alpha0));
          outcome = '穿过右边界 x = d 射出';
        } else {
          dTheta = (sgnW > 0 ? 2 * alpha0 : -2 * alpha0);
          while (dTheta <= 1e-7) dTheta += TWO_PI;
          while (dTheta > TWO_PI) dTheta -= TWO_PI;
          outcome = Math.abs(xc + R - d) < 1e-2 * d ? '恰好与右边界 x = d 相切后返回' : '未达右边界，从左边界 x = 0 返回';
        }
      } else {
        const dxC = xc - R0, dyC = yc, distC = Math.hypot(dxC, dyC);
        if (distC > 1e-8 && distC < R + R0) {
          const ux = dxC / distC, uy = dyC / distC, rx = xIn - R0, ry = yIn;
          const proj = rx * ux + ry * uy;
          const xOut = R0 + 2 * proj * ux - rx, yOut = 2 * proj * uy - ry;
          const alpha1 = Math.atan2(yOut - yc, xOut - xc);
          dTheta = sgnW > 0 ? alpha0 - alpha1 : alpha1 - alpha0;
          while (dTheta <= 1e-6) dTheta += TWO_PI;
          while (dTheta > TWO_PI) dTheta -= TWO_PI;
        } else dTheta = 2 * Math.atan2(R0, R);
        outcome = '从圆形磁场边界射出';
      }

      const tMag = dTheta / absW, tEnd = tMag * 1.2;
      const at = t => {
        const tc = clamp(t, 0, tEnd);
        if (tc <= tMag + 1e-12) {
          const wt = omega * tc, c = Math.cos(wt), s = Math.sin(wt);
          const x = xIn + (vx0 * s + vy0 * (1 - c)) / omega;
          const y = yIn + (vy0 * s - vx0 * (1 - c)) / omega;
          const vx = vx0 * c + vy0 * s, vy = vy0 * c - vx0 * s;
          return { x, y, vx, vy, v: v0, Ek: 0.5 * m * v0 * v0, Fm: Math.abs(q * B) * v0, Fe: 0 };
        }
        const sE = at(tMag), dt = tc - tMag;
        return { x: sE.x + sE.vx * dt, y: sE.y + sE.vy * dt, vx: sE.vx, vy: sE.vy, v: v0, Ek: sE.Ek, Fm: 0, Fe: 0 };
      };
      const S0 = at(0), S1 = at(tMag), chord = Math.hypot(S1.x - S0.x, S1.y - S0.y);

      return kit.makeSim({
        P, tEnd,
        phases: [
          { t0: 0, t1: tMag, title: '有界磁场内匀速圆周运动', lines: ['轨道半径 R = ' + fmt(R) + ' m', '转过圆心角 θ = ' + nfix(dTheta * 180 / Math.PI, 1) + '°'], end: outcome + '，t = ' + fmt(tMag) + ' s' },
          { t0: tMag, t1: tEnd, title: '出射后匀速直线运动', lines: ['出射速率保持 v₀ = ' + fmt(v0) + ' m/s'], end: '模拟结束' }
        ],
        state: t => at(t),
        tiles: [['轨道半径 R', fmt(R) + ' m'], ['周期 T', fmt(T) + ' s'], ['偏转角 θ', nfix(dTheta * 180 / Math.PI, 1) + '°'], ['磁场内时间', fmt(tMag) + ' s']],
        rows: () => [
          ['出射结果', outcome],
          ['轨道半径 R = mv₀ / (|q|B)', fmt(R) + ' m'],
          ['回旋周期 T = 2πm / (|q|B)', fmt(T) + ' s'],
          ['转过圆心角 θ', nfix(dTheta * 180 / Math.PI, 2) + '°（' + fmt(dTheta) + ' rad）'],
          ['磁场中运动时间 t = (θ/2π)T', fmt(tMag) + ' s'],
          ['进出磁场弦长 L = 2R·sin(θ/2)', fmt(chord) + ' m'],
          ['双边界相切临界速度 vc', fmt(vcStrip) + ' m/s']
        ],
        checks: () => [
          { status: 'pass', item: '洛伦兹力不做功：速率恒为 v₀', detail: 'Ek 恒为 ' + fmt(0.5 * m * v0 * v0) + ' J' },
          { status: Math.abs(chord - 2 * R * Math.sin(dTheta / 2)) < 1e-7 ? 'pass' : 'fail', item: '弦长几何一致性：L = 2R·sin(θ/2)', detail: 'L = ' + fmt(chord) + ' m' }
        ],
        solution: () => [
          { title: '洛伦兹力提供向心力', items: [{ tag: '半径公式', tex: '$|q|v_0B = m{v_0^2}//{R} \Rightarrow R = {mv_0}//{|q|B} = #' + fmt(R) + '#$ m' }, { tag: '周期公式', tex: '$T = {2πm}//{|q|B} = #' + fmt(T) + '#$ s' }] },
          { title: '圆心角与运动时间', items: [{ tag: '圆心角', tex: '$θ = #' + nfix(dTheta * 180 / Math.PI, 1) + '°#$，弦长 $L = 2R\sin({θ}//{2}) = #' + fmt(chord) + '#$ m' }, { tag: '运动时间', tex: '$t = {θ}//{2π}T = #' + fmt(tMag) + '#$ s' }] }
        ],
        render2D(ctx, W, Hh, s, st) {
          ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, Hh);
          const sc = Math.min(W, Hh) / Math.max(4 * R, 6), cx = W * 0.35, cy = Hh * 0.52;
          const X = x => cx + x * sc, Y = y => cy - y * sc;
          ctx.strokeStyle = 'rgba(28,126,214,.35)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(X(0), 40); ctx.lineTo(X(0), Hh - 20); ctx.stroke();
          ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2.6; ctx.beginPath();
          s.samples.forEach((qPt, i) => { if (qPt.t <= st.t + 1e-9) i ? ctx.lineTo(X(qPt.x), Y(qPt.y)) : ctx.moveTo(X(qPt.x), Y(qPt.y)); });
          ctx.stroke();
          ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(X(st.x), Y(st.y), 8, 0, TWO_PI); ctx.fill();
          sArrow(ctx, X(st.x), Y(st.y), X(st.x) + st.vx / v0 * 45, Y(st.y) - st.vy / v0 * 45, '#2b8a3e', 2.4);
          sHUD(ctx, W, Hh, s, st);
        }
      });
    }

    api.models.register({
      id: 'emdm-mag-bound',
      name: '电磁专题·有界匀强磁场中的圆周运动',
      short: '有界磁场',
      noCarrier: true,
      stats: [['t', 't', 's'], ['x', 'x', 'm'], ['y', 'y', 'm'], ['vx', 'vx', 'm/s'], ['vy', 'vy', 'm/s'], ['v', 'v', 'm/s'], ['Ek', 'Ek', 'J'], ['Fm', 'f洛', 'N']],
      defaultCharts: ['emdm_xy', 'emdm_vt'],
      params: [
        p('boundMode', '边界', '边界模式(1单/2双/3圆)', '', '1', { group: '边界', opts: [['1', '单直线边界'], ['2', '平行双边界'], ['3', '圆形磁场']] }),
        p('m', 'm', '粒子质量', 'kg', '1', { group: '粒子', pos: true }),
        p('q', 'q', '电荷量', 'C', '1', { group: '粒子' }),
        p('v0', 'v0', '入射速率', 'm/s', '2', { group: '粒子', pos: true }),
        p('phi', 'φ', '入射角', '°', '30', { group: '粒子' }),
        p('y0', 'y0', '初始纵坐标', 'm', '0', { group: '粒子' }),
        p('B', 'B', '磁感应强度', 'T', '1', { group: '磁场' }),
        p('d', 'd', '双边界宽度', 'm', '2', { group: '边界', pos: true }),
        p('R0', 'R0', '圆形磁场半径', 'm', '2', { group: '边界', pos: true })
      ],
      simulate: simMagBound,
      presets: [
        { name: '单边界30°斜射优弧', params: { boundMode: '1', m: '1', q: '1', v0: '2', phi: '30', B: '1' }, problem: { text: '粒子以 v₀=2 m/s、φ=30° 射入 x≥0 匀强磁场(B=1 T)，求半径 R、弦长 L 与运动时间 t。', answer: 'R = 2 m，L = 2√3 m，t = 4π/3 s' } },
        { name: '平行双边界相切极值', params: { boundMode: '2', m: '1', q: '1', v0: '2', phi: '30', B: '1', d: '3' }, problem: { text: '宽度 d=3 m 的条形磁场(B=1 T)，粒子以 φ=30° 射入恰好不从右边界穿出，求临界速率 vc 与运动时间。', answer: 'vc = 2 m/s，t = 4π/3 s' } },
        { name: '圆形磁场磁聚焦 (R=R0)', params: { boundMode: '3', m: '1', q: '1', v0: '2', phi: '0', y0: '1', B: '1', R0: '2' }, problem: { text: '圆形磁场半径 R₀=2 m，粒子以 v₀=2 m/s 平行于 x 轴射入，验证磁聚焦焦点坐标。', answer: 'R = R₀ = 2 m，所有平行入射粒子均汇聚于下顶点 (2, -2) m' } }
      ]
    });

    /* ================= 模块 2：加速电场与平行板偏转电场·示波管 (emdm-elec-deflect) ================= */
    function simElecDeflect(P) {
      const m = Math.max(P.m, 1e-9), q = Math.max(Math.abs(P.q), 1e-9);
      const U1 = Math.max(P.U1, 0), L0 = 1.5, U2 = P.U2, L1 = Math.max(P.L1, 0.2), d = Math.max(P.d, 0.2), L2 = Math.max(P.L2, 0);
      const hasAcc = U1 > 1e-9, v0 = hasAcc ? Math.sqrt(2 * q * U1 / m) : Math.max(P.v0, 0.1);
      const tAcc = hasAcc ? 2 * L0 / v0 : 0, aAcc = hasAcc ? v0 * v0 / (2 * L0) : 0;
      const Ey = U2 / d, ay = q * Ey / m, tPlate = L1 / v0;
      const y1 = 0.5 * ay * tPlate * tPlate, vy1 = ay * tPlate, vExit = Math.hypot(v0, vy1);
      const tanTheta = vy1 / v0, tDrift = L2 / v0, YScreen = y1 + vy1 * tDrift;
      const t1 = tAcc, t2 = tAcc + tPlate, tEnd = t2 + tDrift;

      const at = t => {
        const tc = clamp(t, 0, tEnd);
        if (hasAcc && tc <= t1) {
          const vx = aAcc * tc;
          return { x: -L0 + 0.5 * aAcc * tc * tc, y: 0, vx, vy: 0, v: vx, Ek: 0.5 * m * vx * vx, Fm: 0, Fe: q * U1 / L0 };
        }
        if (tc <= t2 + 1e-12) {
          const dt = tc - t1, vy = ay * dt, v = Math.hypot(v0, vy);
          return { x: v0 * dt, y: 0.5 * ay * dt * dt, vx: v0, vy, v, Ek: 0.5 * m * v * v, Fm: 0, Fe: Math.abs(q * Ey) };
        }
        const dt = tc - t2;
        return { x: L1 + v0 * dt, y: y1 + vy1 * dt, vx: v0, vy: vy1, v: vExit, Ek: 0.5 * m * vExit * vExit, Fm: 0, Fe: 0 };
      };

      const phases = [];
      if (hasAcc) phases.push({ t0: 0, t1, title: '加速电场匀加速', lines: ['qU₁ = ½mv₀²，v₀ = ' + fmt(v0) + ' m/s'], end: '进入偏转极板' });
      phases.push({ t0: t1, t1: t2, title: '平行板偏转电场类平抛', lines: ['侧移量 y₁ = ' + fmt(y1) + ' m', '偏转角正切 tanθ = ' + fmt(tanTheta)], end: '穿出极板右端' });
      if (L2 > 1e-9) phases.push({ t0: t2, t1: tEnd, title: '无场漂移区飞向荧光屏', lines: ['反向延长线交于板长中点 L₁/2 = ' + fmt(L1 / 2) + ' m'], end: '打在荧光屏 Y = ' + fmt(YScreen) + ' m' });

      return kit.makeSim({
        P, tEnd, phases, state: t => at(t),
        tiles: [['进入偏转场 v₀', fmt(v0) + ' m/s'], ['出板侧移 y₁', fmt(y1) + ' m'], ['偏转正切 tanθ', fmt(tanTheta)], ['屏总偏转 Y', fmt(YScreen) + ' m']],
        rows: () => [
          ['进入偏转场速率 v₀ = √(2qU₁/m)', fmt(v0) + ' m/s'],
          ['出板侧移量 y₁ = U₂L₁²/(4dU₁)', fmt(y1) + ' m'],
          ['速度偏转角正切 tanθ = U₂L₁/(2dU₁)', fmt(tanTheta)],
          ['荧光屏总偏转距离 Y = (L₁/2 + L₂)·tanθ', fmt(YScreen) + ' m'],
          ['擦极板边缘临界电压 U₂max = 2d²U₁/L₁²', fmt(2 * d * d * (0.5 * m * v0 * v0 / q) / (L1 * L1)) + ' V']
        ],
        checks: () => [
          { status: Math.abs(tanTheta - 2 * (y1 / L1)) < 1e-8 ? 'pass' : 'fail', item: '中点射出定理校验：tanθ = 2tanα', detail: '速度反向延长线交于 x = L₁/2 = ' + fmt(L1 / 2) + ' m' }
        ],
        solution: () => [
          { title: '加速与类平抛偏转', items: [{ tag: '侧移量', tex: '$y_1 = {1}//{2}at_1^2 = {U_2L_1^2}//{4dU_1} = #' + fmt(y1) + '#$ m' }, { tag: '荧光屏偏转', tex: '$Y = ({L_1}//{2} + L_2)\tan\theta = #' + fmt(YScreen) + '#$ m' }] }
        ],
        render2D(ctx, W, Hh, s, st) {
          ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, Hh);
          const sc = (W - 100) / (L0 + L1 + L2 + 1), cx = 50 + L0 * sc, cy = Hh / 2;
          const X = x => cx + x * sc, Y = y => cy - y * sc;
          ctx.fillStyle = '#334155'; ctx.fillRect(X(0), Y(d / 2) - 4, L1 * sc, 4); ctx.fillRect(X(0), Y(-d / 2), L1 * sc, 4);
          ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2.6; ctx.beginPath();
          s.samples.forEach((qPt, i) => { if (qPt.t <= st.t + 1e-9) i ? ctx.lineTo(X(qPt.x), Y(qPt.y)) : ctx.moveTo(X(qPt.x), Y(qPt.y)); });
          ctx.stroke();
          ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(X(st.x), Y(st.y), 8, 0, TWO_PI); ctx.fill();
          sHUD(ctx, W, Hh, s, st);
        }
      });
    }

    api.models.register({
      id: 'emdm-elec-deflect',
      name: '电磁专题·加速电场与平行板偏转电场（示波管）',
      short: '偏转电场',
      noCarrier: true,
      stats: [['t', 't', 's'], ['x', 'x', 'm'], ['y', 'y', 'm'], ['vx', 'vx', 'm/s'], ['vy', 'vy', 'm/s'], ['v', 'v', 'm/s'], ['Ek', 'Ek', 'J'], ['Fe', 'F电', 'N']],
      defaultCharts: ['emdm_xy', 'emdm_vt'],
      params: [
        p('m', 'm', '粒子质量', 'kg', '1', { group: '粒子', pos: true }),
        p('q', 'q', '电荷量', 'C', '1', { group: '粒子', pos: true }),
        p('U1', 'U1', '加速电压', 'V', '8', { group: '加速场', nonneg: true }),
        p('v0', 'v0', '备用初速率', 'm/s', '4', { group: '加速场', pos: true }),
        p('U2', 'U2', '偏转电压', 'V', '4', { group: '偏转场' }),
        p('L1', 'L1', '极板长度', 'm', '4', { group: '偏转场', pos: true }),
        p('d', 'd', '极板间距', 'm', '4', { group: '偏转场', pos: true }),
        p('L2', 'L2', '极板到屏距离', 'm', '3', { group: '荧光屏', nonneg: true })
      ],
      simulate: simElecDeflect,
      presets: [
        { name: '示波管全过程·似自中点射出', params: { m: '1', q: '1', U1: '8', U2: '4', L1: '4', d: '4', L2: '3' }, problem: { text: '粒子经 U₁=8 V 加速后射入 L₁=4 m, d=4 m, U₂=4 V 的偏转极板，屏距 L₂=3 m，求 y₁ 与屏上总偏转 Y。', answer: 'y₁ = 0.5 m，tanθ = 0.25，Y = 1.25 m' } },
        { name: '擦极板边缘射出临界电压', params: { m: '1', q: '1', U1: '8', U2: '16', L1: '4', d: '4', L2: '2' }, problem: { text: '求粒子恰好擦极板右边缘 (y₁=d/2=2 m) 射出时的临界偏转电压 U₂max。', answer: 'U₂max = 16 V，偏转角 θ = 45°' } }
      ]
    });

    api.charts.register({ id: 'emdm_xy', name: 'y-x 运动轨迹', xl: 'x / m', yl: 'y / m', models: ['emdm-mag-bound', 'emdm-elec-deflect'], series: [{ n: '轨迹', c: '#e8590c', x: 'x', y: 'y' }] });
    api.charts.register({ id: 'emdm_vt', name: 'v-t 速度分量', xl: 't / s', yl: 'v / (m/s)', time: true, models: ['emdm-mag-bound', 'emdm-elec-deflect'], series: [{ n: 'vx', c: '#1c7ed6', x: 't', y: 'vx' }, { n: 'vy', c: '#2b8a3e', x: 't', y: 'vy' }, { n: '|v|', c: '#e8590c', x: 't', y: 'v' }] });
  }
});
