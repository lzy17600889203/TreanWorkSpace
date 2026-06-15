/* 动态瀑布图渲染器 - Vanilla JS + Canvas */
(function (global) {
  class WaterfallChart {
    constructor(canvas, data) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.data = data;
      this.padding = { top: 80, right: 60, bottom: 90, left: 80 };
      this.cols = Math.max(data.steps.length + 1, 4);
      this.t = 0;
      this.animTarget = 1;
      this.particles = [];
      this.sparkleTimer = 0;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      const ratio = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = Math.floor(rect.width * ratio);
      this.canvas.height = Math.floor(rect.height * ratio);
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.w = rect.width;
      this.h = rect.height;
    }

    setData(data) {
      this.data = data;
      this.cols = Math.max(data.steps.length + 1, 4);
      this.t = 0;
      this.animTarget = 1;
      this.particles = [];
    }

    getScale() {
      const { steps, finalBalance } = this.data;
      let maxVal = 0;
      let minVal = 0;
      let running = 0;
      steps.forEach(s => {
        running += s.value;
        if (running > maxVal) maxVal = running;
        if (running < minVal) minVal = running;
      });
      if (finalBalance.value > maxVal) maxVal = finalBalance.value;
      if (finalBalance.value < minVal) minVal = finalBalance.value;
      if (maxVal === 0 && minVal === 0) { maxVal = 100; minVal = -100; }
      const pad = 0.25;
      const range = (maxVal - minVal) || 100;
      maxVal += range * pad;
      minVal -= range * pad * 0.4;
      return { maxVal, minVal };
    }

    y(v) {
      const { maxVal, minVal } = this.getScale();
      const innerH = this.h - this.padding.top - this.padding.bottom;
      const ratio = (maxVal - v) / (maxVal - minVal);
      return this.padding.top + innerH * ratio;
    }

    x(i) {
      const innerW = this.w - this.padding.left - this.padding.right;
      const stepW = innerW / this.cols;
      return this.padding.left + stepW * (i + 0.5);
    }

    colWidth() {
      const innerW = this.w - this.padding.left - this.padding.right;
      const w = innerW / this.cols;
      return Math.min(w * 0.62, 58);
    }

    render() {
      const { ctx, data } = this;
      this.t += (this.animTarget - this.t) * 0.06;
      if (Math.abs(this.t - this.animTarget) < 0.002) this.t = this.animTarget;
      ctx.clearRect(0, 0, this.w, this.h);

      // 背景网格
      this.drawGrid();
      // 零轴（基准线，收入向上、支出向下）
      this.drawZeroAxis();

      const alphaEase = 1 - Math.pow(1 - this.t, 3);
      const cw = this.colWidth();
      const zeroY = this.y(0);    // 0 基准线的 y 坐标

      // 画每一根柱子：全部从 0 基准线出发
      data.steps.forEach((step, i) => {
        const centerX = this.x(i);
        // 动画后的实际值
        const val = step.value * alphaEase;
        const endY = this.y(val);
        const topY = val >= 0 ? endY : zeroY;
        const botY = val >= 0 ? zeroY : endY;
        const height = Math.max(2, Math.abs(endY - zeroY));

        const isIncome = step.value > 0;
        let color, glow;
        if (isIncome) { color = '#06d6a0'; glow = 'rgba(6,214,160,0.35)'; }
        else if (step.is_unnecessary) { color = '#ff6b9d'; glow = 'rgba(255,107,157,0.35)'; }
        else { color = '#ef476f'; glow = 'rgba(239,71,111,0.35)'; }

        // 发光
        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = 18;

        // 渐变柱
        const grad = ctx.createLinearGradient(0, topY, 0, botY);
        if (isIncome) {
          grad.addColorStop(0, color);
          grad.addColorStop(1, this.hexToRgba(color, 0.55));
        } else {
          grad.addColorStop(0, this.hexToRgba(color, 0.55));
          grad.addColorStop(1, color);
        }
        ctx.fillStyle = grad;
        this.roundRect(ctx, centerX - cw / 2, topY, cw, height, 4);
        ctx.fill();
        ctx.restore();

        // 金额标签（柱子顶端）
        ctx.save();
        ctx.fillStyle = isIncome ? '#b8f7e0' : (step.is_unnecessary ? '#ffd3e0' : '#ffb3c4');
        ctx.font = '600 11px sans-serif';
        ctx.textAlign = 'center';
        const labelY = val >= 0 ? topY - 8 : botY + 14;
        const valStr = (step.value > 0 ? '+' : '') + Math.abs(step.value).toFixed(0);
        ctx.fillText(valStr, centerX, labelY);

        // 类别标签（倾斜）
        ctx.fillStyle = '#a8afc7';
        ctx.font = '11px sans-serif';
        ctx.save();
        ctx.translate(centerX, this.h - this.padding.bottom + 12);
        ctx.rotate(-Math.PI / 8);
        ctx.textAlign = 'right';
        ctx.fillText(step.label, 0, 0);
        ctx.restore();

        if (step.is_unnecessary) {
          ctx.fillStyle = '#ff6b9d';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('非必要', centerX, this.h - this.padding.bottom + 42);
        }
        ctx.restore();
      });

      // 最后一根结余柱
      this.drawFinalBalance(cw, alphaEase);

      // 粒子系统
      this.updateParticles();

      // 发薪日特效：金币掉落
      if (data.state === 'payday') {
        this.sparkleTimer++;
        if (this.sparkleTimer % 3 === 0) {
          const firstIncomeIdx = data.steps.findIndex(s => s.value > 0);
          if (firstIncomeIdx >= 0) {
            const cx = this.x(firstIncomeIdx);
            const topY = this.y(data.steps[firstIncomeIdx].start + data.steps[firstIncomeIdx].value);
            for (let k = 0; k < 2; k++) {
              this.particles.push({
                x: cx + (Math.random() - 0.5) * cw,
                y: topY - Math.random() * 8,
                vx: (Math.random() - 0.5) * 1.8,
                vy: -Math.random() * 2 - 0.5,
                life: 80 + Math.random() * 40,
                age: 0,
                type: 'coin',
                size: 4 + Math.random() * 3
              });
            }
          }
        }
      }

      // 入不敷出特效：骷髅
      if (data.state === 'overspend') {
        this.drawSkull();
      }

      // 冲动消费警示：红色断层闪烁
      if (data.state === 'impulsive') {
        const bigExp = data.steps
          .map((s, i) => ({ s, i }))
          .filter(o => o.s.is_unnecessary)
          .sort((a, b) => Math.abs(a.s.value) - Math.abs(b.s.value))
          .pop();
        if (bigExp) {
          const cx = this.x(bigExp.i);
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 250);
          ctx.save();
          ctx.fillStyle = `rgba(255,107,157,${0.15 + 0.15 * pulse})`;
          ctx.beginPath();
          ctx.arc(cx, this.y(bigExp.s.start + bigExp.s.value / 2), cw * 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 状态标题
      this.drawStateTitle();
    }

    drawGrid() {
      const { ctx } = this;
      const { maxVal, minVal } = this.getScale();
      const steps = 5;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= steps; i++) {
        const v = maxVal - (maxVal - minVal) * (i / steps);
        const y = this.y(v);
        ctx.beginPath();
        ctx.moveTo(this.padding.left, y);
        ctx.lineTo(this.w - this.padding.right, y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(168,175,199,0.55)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(v.toFixed(0), this.padding.left - 8, y + 4);
      }
    }

    drawZeroAxis() {
      const { ctx } = this;
      const y = this.y(0);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(this.padding.left, y);
      ctx.lineTo(this.w - this.padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(168,175,199,0.7)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('0 基准线', this.w - this.padding.right + 6, y + 4);
    }

    drawFinalBalance(cw, alphaEase) {
      const { ctx, data } = this;
      const lastIdx = data.steps.length;
      const centerX = this.x(lastIdx);
      const topY = this.y(0);
      const v = data.finalBalance.value * alphaEase;
      const endY = this.y(v);
      const height = Math.max(2, Math.abs(endY - topY));
      const rectTop = v >= 0 ? endY : topY;

      let color, glow, title;
      const state = data.finalBalance.state;
      if (state === 'negative') { color = '#8a5a5a'; glow = 'rgba(239,71,111,0.4)'; title = '结余（负数）'; }
      else if (state === 'dry') { color = '#78849e'; glow = 'rgba(120,132,158,0.3)'; title = '结余（干瘪）'; }
      else { color = '#06d6a0'; glow = 'rgba(6,214,160,0.4)'; title = '健康结余'; }

      // 干瘪效果：抖动纹理
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = state === 'dry' ? 8 : 18;
      const grad = ctx.createLinearGradient(0, rectTop, 0, rectTop + height);
      if (state === 'negative') {
        grad.addColorStop(0, '#ef476f');
        grad.addColorStop(1, '#5a2a3a');
      } else if (state === 'dry') {
        grad.addColorStop(0, '#9aa5b8');
        grad.addColorStop(1, '#5a6175');
      } else {
        grad.addColorStop(0, '#06d6a0');
        grad.addColorStop(1, 'rgba(6,214,160,0.45)');
      }
      ctx.fillStyle = grad;
      this.roundRect(ctx, centerX - cw / 2, rectTop, cw, height, 4);
      ctx.fill();

      if (state === 'dry') {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = 'rgba(30,30,40,0.5)';
        ctx.lineWidth = 0.8;
        for (let k = 0; k < 6; k++) {
          const y = rectTop + Math.random() * height;
          ctx.beginPath();
          ctx.moveTo(centerX - cw / 2 + 3, y);
          ctx.lineTo(centerX + cw / 2 - 3, y + (Math.random() - 0.5) * 3);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // 数值
      ctx.save();
      ctx.fillStyle = state === 'negative' ? '#ef476f' : (state === 'dry' ? '#c8cfdc' : '#b8f7e0');
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      const labelY = v >= 0 ? endY - 8 : endY + 14;
      ctx.fillText((v >= 0 ? '+' : '') + v.toFixed(0), centerX, labelY);
      ctx.fillStyle = '#a8afc7';
      ctx.font = '11px sans-serif';
      ctx.fillText('结余', centerX, this.h - this.padding.bottom + 12);
      ctx.fillStyle = title === '结余（干瘪）' ? '#ff6b9d' : (state === 'negative' ? '#ef476f' : '#06d6a0');
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(title, centerX, this.h - this.padding.bottom + 28);
      ctx.restore();
    }

    drawStateTitle() {
      const { ctx, data } = this;
      const titles = {
        healthy: { text: '✦ 财务健康状态 ✦', color: '#06d6a0', sub: '收入在 0 基准线上方高耸，支出在下方温和' },
        impulsive: { text: '⚠ 冲动消费状态 ⚠', color: '#ffd166', sub: '非必要支出柱穿透 0 基准线向下猛长' },
        overspend: { text: '☠ 入不敷出状态 ☠', color: '#ef476f', sub: '支出总和超过收入，结余柱跌入负数区' },
        payday: { text: '💰 发薪日狂欢状态 💰', color: '#ffd166', sub: '收入柱直冲云霄，金币从天而降' }
      };
      const t = titles[data.state] || titles.healthy;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(t.text, this.w / 2, 36);
      ctx.fillStyle = 'rgba(168,175,199,0.7)';
      ctx.font = '12px sans-serif';
      ctx.fillText(t.sub + `  |  非必要支出占比：${(data.unnecessaryRatio * 100).toFixed(1)}%`, this.w / 2, 58);
      ctx.restore();
    }

    updateParticles() {
      const { ctx } = this;
      const next = [];
      for (const p of this.particles) {
        p.age++;
        p.vy += 0.22;
        p.x += p.vx;
        p.y += p.vy;
        const lifeRatio = p.age / p.life;
        if (p.age < p.life && p.y < this.h - this.padding.bottom + 10) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - lifeRatio);
          if (p.type === 'coin') {
            // 金币
            ctx.fillStyle = '#ffd166';
            ctx.shadowColor = 'rgba(255,209,102,0.8)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#b8860b';
            ctx.font = `bold ${p.size + 2}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('¥', p.x, p.y);
          }
          ctx.restore();
          next.push(p);
        }
      }
      this.particles = next;
    }

    drawSkull() {
      const { ctx, data } = this;
      const lastIdx = data.steps.length;
      const cx = this.x(lastIdx);
      const v = data.finalBalance.value;
      const endY = this.y(v);
      const skX = cx;
      const skY = endY + (v < 0 ? 40 : -50);
      const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 300);
      ctx.save();
      ctx.translate(skX, skY);
      ctx.scale(pulse, pulse);

      // 头盖骨
      ctx.fillStyle = '#e6e9f2';
      ctx.shadowColor = 'rgba(239,71,111,0.5)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, -4, 16, Math.PI, 0);
      ctx.lineTo(14, 10);
      ctx.lineTo(-14, 10);
      ctx.closePath();
      ctx.fill();

      // 眼窝
      ctx.fillStyle = '#1a1f3a';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(-6, -2, 3.5, 0, Math.PI * 2);
      ctx.arc(6, -2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 鼻子
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(-3, 8);
      ctx.lineTo(3, 8);
      ctx.closePath();
      ctx.fill();

      // 牙齿
      ctx.strokeStyle = '#1a1f3a';
      ctx.lineWidth = 1.2;
      for (let i = -8; i <= 8; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 5);
        ctx.lineTo(i, 10);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-14, 5);
      ctx.lineTo(14, 5);
      ctx.stroke();

      ctx.restore();

      // 文字 "吃土"
      ctx.save();
      ctx.fillStyle = '#ef476f';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💀 吃土 💀', skX, skY + 35);
      ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
      r = Math.min(r, Math.abs(h) / 2, w / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    animate() {
      this.render();
      requestAnimationFrame(() => this.animate());
    }
  }

  global.WaterfallChart = WaterfallChart;
})(window);
