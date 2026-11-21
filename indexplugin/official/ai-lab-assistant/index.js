/**
 * 官方插件 · AI 实验助手
 * 演示：新增 AI 工具选项卡（ai.addTool）、修改已有提示词（ai.extendPrompt）、
 * 给 AI 追加上下文（ai.addContext）、增加对话快捷问题（ai.addQuickQuestion）。
 */
PhysLab.definePlugin({
  id: 'ai-lab-assistant',
  name: 'AI 实验助手',
  version: '1.0.0',
  author: 'PhysLab Official',
  category: 'official',
  kinds: ['ai'],
  apiVersion: '1.0',

  activate(api) {
    // 1) 新增 AI 工具：实验报告
    api.ai.addTool({
      id: 'report',
      name: 'AI 实验报告',
      render(el, ctx) {
        if (el.dataset.ready) return;   // 只构建一次
        el.dataset.ready = '1';
        el.innerHTML = '<p class="note" style="margin-top:0">基于当前模拟的精确数据，让 AI 写一份“目的—原理—过程—结果—误差分析”的实验报告。</p>' +
          '<div class="row"><button class="btn pri" id="rptAI">AI 生成实验报告</button><button class="btn" id="rptLocal">离线生成（无需 AI）</button><button class="btn" id="rptCopy">复制</button></div>' +
          '<pre class="aiout" id="rptOut" hidden></pre>';
        const out = el.querySelector('#rptOut');
        el.querySelector('#rptAI').onclick = async e => {
          const d = ctx.digest(); if (!d) { ctx.toast('当前参数有误，无法生成', 'bad'); return; }
          const r = await ctx.runAI({
            btn: e.target, out, busy: '生成中…',
            system: '你是高中物理实验指导教师。根据用户提供的“模拟数据（精确）”写一份结构化实验报告，使用 Markdown 小标题：实验目的、实验原理、实验过程、数据与结果、误差与讨论。数值以提供的数据为准，不要编造。',
            user: JSON.stringify(ctx.digest()) + '\n题干：' + ((ctx.cfg.problem && ctx.cfg.problem.text) || '（无）'),
          });
          if (r) out.dataset.text = r.text;
        };
        el.querySelector('#rptLocal').onclick = () => {
          const sim = ctx.sim; if (!sim) return;
          const rows = sim.resultRows ? sim.resultRows(sim) : [];
          const text = '# ' + ctx.cfg.name + ' 实验报告\n\n## 过程\n' + sim.phases.map((p, i) => (i + 1) + '. ' + p.title + '（结束：' + p.end + '）').join('\n') + '\n\n## 结果\n' + rows.map(r => '- ' + r[0] + '：' + r[1]).join('\n');
          out.hidden = false; out.textContent = text; out.dataset.text = text;
        };
        el.querySelector('#rptCopy').onclick = () => { const t = out.dataset.text || out.textContent; navigator.clipboard && navigator.clipboard.writeText(t).then(() => ctx.toast('已复制', 'ok')); };
      },
    });

    // 2) 修改已有提示词：让“物理一致性校验”给出修正建议
    api.ai.extendPrompt('check', { append: '\n\n【附加要求（AI 实验助手插件）】对每个“不通过”或“注意”的项目，补充一条可操作的修正建议。' });

    // 3) 追加上下文：告诉 AI 单位制与已启用的能力
    api.ai.addContext(() => ({ 单位制: 'SI（m、kg、s、N、J、C、T、V、Ω）', 说明: '数值均为模拟器精确计算结果，请直接引用，不要重新取近似。' }));

    // 4) 对话快捷问题
    api.ai.addQuickQuestion('用控制变量法设计一个探究实验，并预测结论');
    api.ai.addQuickQuestion('指出这道题常见的三个易错点');
  },
});
