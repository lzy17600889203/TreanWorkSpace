(function() {
  'use strict';

  const svg = d3.select('#galaxy');
  const tooltip = d3.select('#tooltip');
  let width, height, centerX, centerY;
  let allNodes = [];
  let allLinks = [];
  let currentMode = 'init';
  let animationId = null;
  let sparkInterval = null;
  let beamInterval = null;
  let rootPulseInterval = null;
  let rootShakeInterval = null;
  let galaxyGroup, linkGroup, sectorGroup, nodeGroup, sparkGroup, beamGroup, rootGroup, starGroup;

  const COLORS = {
    safe: '#34d399',
    low: '#60a5fa',
    medium: '#fbbf24',
    high: '#f87171',
    critical: '#dc2626',
    blood: '#991b1b',
    conflict: '#f59e0b',
    conflict2: '#f97316',
    init: '#e5e7eb',
    rootSafe: '#7dd3fc',
    rootDanger: '#ef4444',
    linkSafe: 'rgba(125, 211, 252, 0.18)',
    linkDanger: 'rgba(239, 68, 68, 0.55)',
    linkConflict: 'rgba(245, 158, 11, 0.4)'
  };

  function resize() {
    const container = document.getElementById('galaxyContainer');
    width = container.clientWidth;
    height = container.clientHeight;
    centerX = width / 2;
    centerY = height / 2;
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');
  }

  function getColorForNode(node, mode) {
    if (mode === 'init') return COLORS.init;
    if (mode === 'safe') return COLORS.safe;
    if (node._conflict || node._conflictWith) return COLORS.conflict;
    const sev = node.maxSeverity || 0;
    if (sev >= 4) return COLORS.critical;
    if (sev === 3) return COLORS.high;
    if (sev === 2) return COLORS.medium;
    if (sev === 1) return COLORS.low;
    return COLORS.safe;
  }

  function getLevelLabel(node, mode) {
    if (mode === 'init') return { text: '等待注入', cls: 'SAFE' };
    if (mode === 'safe') return { text: '安全', cls: 'SAFE' };
    if (node._conflict || node._conflictWith) return { text: '版本冲突', cls: 'CONFLICT' };
    const sev = node.maxSeverity || 0;
    if (sev >= 4) return { text: '极危', cls: 'CRITICAL' };
    if (sev === 3) return { text: '高危', cls: 'HIGH' };
    if (sev === 2) return { text: '中危', cls: 'MEDIUM' };
    if (sev === 1) return { text: '低危', cls: 'LOW' };
    return { text: '安全', cls: 'SAFE' };
  }

  function flattenTree(root) {
    const nodes = [];
    const links = [];
    function walk(node, parent, depth, startAngle, endAngle) {
      const angle = (startAngle + endAngle) / 2;
      const radiusStep = Math.min(width, height) * 0.085;
      const radius = depth === 0 ? 0 : radiusStep * (depth - 1) + radiusStep * 0.9;
      const entry = {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        angle, radius,
        startAngle, endAngle,
        depth,
        parentKey: parent ? parent._key : null,
        _key: node.name + '@' + node.version + '-' + depth + '-' + Math.random()
      };
      nodes.push(entry);
      if (parent) {
        links.push({ source: parent, target: entry });
      }
      if (node.children && node.children.length > 0) {
        const spread = endAngle - startAngle;
        const childCount = node.children.length;
        const gap = spread * 0.08 / childCount;
        const totalSpread = spread - gap * childCount;
        const segSize = totalSpread / childCount;
        let cur = startAngle;
        node.children.forEach((child, i) => {
          walk(child, entry, depth + 1, cur, cur + segSize);
          cur += segSize + gap;
        });
      }
    }
    walk(root, null, 0, 0, Math.PI * 2);
    return { nodes, links };
  }

  function clearAnimations() {
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    if (sparkInterval) { clearInterval(sparkInterval); sparkInterval = null; }
    if (beamInterval) { clearInterval(beamInterval); beamInterval = null; }
    if (rootPulseInterval) { clearInterval(rootPulseInterval); rootPulseInterval = null; }
    if (rootShakeInterval) { clearInterval(rootShakeInterval); rootShakeInterval = null; }
    if (starGroup) starGroup.selectAll('*').remove();
  }

  function createBackgroundStars(mode) {
    if (!starGroup) starGroup = galaxyGroup.append('g').attr('class', 'bg-stars');
    starGroup.selectAll('*').remove();
    const starCount = 120;
    const twinkleDuration = mode === 'dangerous' ? 0.6 : 3;
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 1.2 + 0.3;
      const delay = Math.random() * twinkleDuration;
      starGroup.append('circle')
        .attr('cx', x).attr('cy', y).attr('r', r)
        .attr('fill', mode === 'dangerous' ? '#fca5a5' : '#cbd5e1')
        .attr('opacity', 0.2 + Math.random() * 0.5)
        .style('animation', `starTwinkle ${twinkleDuration + Math.random()}s ease-in-out ${delay}s infinite alternate`);
    }
  }

  function drawOrbitRings(maxDepth, mode) {
    const radiusStep = Math.min(width, height) * 0.085;
    const rings = galaxyGroup.selectAll('g.ring-group');
    rings.remove();
    const ringG = galaxyGroup.append('g').attr('class', 'ring-group');
    for (let d = 1; d <= maxDepth + 1; d++) {
      const r = radiusStep * d;
      ringG.append('circle')
        .attr('cx', centerX).attr('cy', centerY).attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', mode === 'dangerous' ? 'rgba(220,38,38,0.12)' : 'rgba(125,211,252,0.08)')
        .attr('stroke-dasharray', '3 5')
        .attr('stroke-width', 1);
    }
  }

  function drawSectors(nodes, mode) {
    sectorGroup.selectAll('*').remove();
    const radiusStep = Math.min(width, height) * 0.085;
    const dangerousNodes = nodes.filter(n => n.depth > 0 && (n.maxSeverity >= 3 || n._conflict));
    dangerousNodes.forEach(node => {
      const innerR = radiusStep * node.depth - radiusStep * 0.45;
      const outerR = radiusStep * node.depth + radiusStep * 0.55;
      const angleSpan = (node.endAngle - node.startAngle) * 1.15;
      const midAngle = (node.startAngle + node.endAngle) / 2;
      const a1 = midAngle - angleSpan / 2;
      const a2 = midAngle + angleSpan / 2;
      const sector = d3.arc()
        .innerRadius(innerR)
        .outerRadius(outerR)
        .startAngle(a1)
        .endAngle(a2);
      const color = node._conflict ? COLORS.conflict : (node.maxSeverity >= 4 ? COLORS.blood : COLORS.high);
      sectorGroup.append('path')
        .attr('d', sector)
        .attr('transform', `translate(${centerX},${centerY})`)
        .attr('fill', color)
        .attr('opacity', 0.12)
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.4)
        .style('filter', `drop-shadow(0 0 ${node.maxSeverity >= 4 ? 20 : 8}px ${color})`);
      sectorGroup.append('path')
        .attr('d', sector)
        .attr('transform', `translate(${centerX},${centerY})`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.35)
        .style('animation', `sectorPulse ${1.2 + Math.random()}s ease-in-out ${Math.random()}s infinite alternate`);
    });
  }

  function drawLinks(links, mode) {
    linkGroup.selectAll('*').remove();
    links.forEach(link => {
      const x1 = link.source.x, y1 = link.source.y;
      const x2 = link.target.x, y2 = link.target.y;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const nx = -dy / dist, ny = dx / dist;
      const curveFactor = 0.12;
      const cx = midX + nx * dist * curveFactor + (centerX - midX) * 0.02;
      const cy = midY + ny * dist * curveFactor + (centerY - midY) * 0.02;
      const isDanger = link.target.maxSeverity >= 3 && link.target.depth > 0;
      const isConflict = link.target._conflict;
      let strokeColor = COLORS.linkSafe;
      let strokeWidth = 1;
      if (mode === 'dangerous' && isDanger) { strokeColor = COLORS.linkDanger; strokeWidth = 1.6; }
      if (isConflict) { strokeColor = COLORS.linkConflict; strokeWidth = 1.4; }
      if (mode === 'safe') strokeColor = 'rgba(52, 211, 153, 0.2)';
      linkGroup.append('path')
        .attr('d', `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`)
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', strokeWidth)
        .attr('stroke-linecap', 'round')
        .attr('data-beam', isDanger ? '1' : '0')
        .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
    });
  }

  function drawNodes(nodes, mode) {
    nodeGroup.selectAll('*').remove();
    rootGroup.selectAll('*').remove();
    const rootNode = nodes.find(n => n.depth === 0);
    const otherNodes = nodes.filter(n => n.depth > 0);

    otherNodes.forEach(node => {
      const g = nodeGroup.append('g')
        .attr('transform', `translate(${node.x},${node.y})`)
        .style('cursor', 'pointer')
        .on('mouseenter', function(e) { showTooltip(e, node, mode); })
        .on('mousemove', function(e) { moveTooltip(e); })
        .on('mouseleave', hideTooltip);
      const color = getColorForNode(node, mode);
      const glowColor = color;
      const baseRadius = node.depth === 1 ? 7 : Math.max(3.5, 7 - node.depth * 0.7);
      const r = (node.maxSeverity >= 3 || node._conflict) ? baseRadius * 1.5 : baseRadius;
      g.append('circle')
        .attr('r', r * 3)
        .attr('fill', glowColor)
        .attr('opacity', 0.08)
        .style('filter', `blur(4px)`);
      if (node.maxSeverity >= 3 || node._conflict) {
        g.append('circle')
          .attr('r', r * 1.6)
          .attr('fill', 'none')
          .attr('stroke', glowColor)
          .attr('stroke-width', 1)
          .attr('opacity', 0.5)
          .style('animation', `haloPulse ${1 + Math.random()}s ease-in-out ${Math.random()}s infinite alternate`);
      }
      g.append('circle')
        .attr('r', r)
        .attr('fill', color)
        .attr('stroke', '#ffffff30')
        .attr('stroke-width', 1)
        .style('filter', `drop-shadow(0 0 ${node.maxSeverity >= 3 ? 12 : 4}px ${glowColor})`);
      if (node.depth <= 2) {
        g.append('text')
          .attr('x', r + 6).attr('y', 3)
          .attr('fill', mode === 'dangerous' ? '#fecaca' : '#cbd5e1')
          .attr('font-size', 10)
          .attr('font-family', 'inherit')
          .text(node.name);
      }
      if (node._conflict) {
        g.append('text')
          .attr('x', 0).attr('y', -r - 6)
          .attr('fill', COLORS.conflict)
          .attr('font-size', 10)
          .attr('font-weight', '700')
          .attr('text-anchor', 'middle')
          .text('⚡');
      }
    });

    if (rootNode) {
      const rootG = rootGroup.append('g').attr('transform', `translate(${centerX},${centerY})`)
        .on('mouseenter', function(e) { showTooltip(e, rootNode, mode); })
        .on('mousemove', function(e) { moveTooltip(e); })
        .on('mouseleave', hideTooltip);
      let rootColor = COLORS.rootSafe;
      if (mode === 'dangerous') rootColor = COLORS.rootDanger;
      else if (mode === 'safe') rootColor = COLORS.safe;
      else if (mode === 'conflict') rootColor = COLORS.conflict;
      else if (mode === 'init') rootColor = COLORS.init;
      rootG.append('circle').attr('r', 60).attr('fill', rootColor).attr('opacity', 0.05).style('filter', 'blur(10px)');
      rootG.append('circle').attr('r', 38).attr('fill', rootColor).attr('opacity', 0.12).style('filter', 'blur(6px)');
      rootG.append('circle').attr('r', 24).attr('fill', 'none').attr('stroke', rootColor).attr('stroke-width', 2).attr('opacity', 0.6).style('animation', 'rootRing 2.5s ease-out infinite');
      rootG.append('circle').attr('r', 18).attr('fill', 'none').attr('stroke', rootColor).attr('stroke-width', 1.5).attr('opacity', 0.4).style('animation', 'rootRing 2.5s ease-out 1s infinite');
      rootG.append('circle').attr('r', 12).attr('fill', rootColor).style('filter', `drop-shadow(0 0 20px ${rootColor})`).attr('id', 'rootCore');
      rootG.append('text').attr('y', 4).attr('fill', '#0a0d15').attr('font-size', 10).attr('font-weight', '700').attr('text-anchor', 'middle').text('ROOT');
    }
  }

  function showTooltip(e, node, mode) {
    const level = getLevelLabel(node, mode);
    let cveHtml = '';
    if (node.cves && node.cves.length > 0) {
      cveHtml = node.cves.map(c => `<div class="vuln-cve">${c.cve_id || 'CVE-?'} · ${c.severity}</div><div class="t-desc">${c.description || ''}</div>`).join('');
    }
    tooltip.html(`
      <div class="t-name">${node.name}</div>
      <div class="t-ver">v${node.version || '1.0.0'} · depth ${node.depth}</div>
      <span class="t-level ${level.cls}">${level.text}</span>
      ${node._conflict ? `<div class="t-desc">⚠ 与 ${node._conflictWith} 存在版本冲突</div>` : ''}
      ${cveHtml}
      ${(!node.cves || node.cves.length === 0) && !node._conflict ? '<div class="t-desc">无已知漏洞</div>' : ''}
    `);
    tooltip.classed('visible', true);
    moveTooltip(e);
  }
  function moveTooltip(e) {
    const rect = document.getElementById('galaxyContainer').getBoundingClientRect();
    const tx = Math.min(e.clientX - rect.left + 14, rect.width - 300);
    const ty = Math.min(e.clientY - rect.top + 14, rect.height - 140);
    tooltip.style('left', tx + 'px').style('top', ty + 'px');
  }
  function hideTooltip() { tooltip.classed('visible', false); }

  function animateBeams(mode) {
    beamGroup.selectAll('*').remove();
    if (mode !== 'dangerous') return;
    beamInterval = setInterval(() => {
      const dangerLinks = document.querySelectorAll('path[data-beam="1"]');
      if (dangerLinks.length === 0) return;
      const count = Math.min(3, Math.ceil(dangerLinks.length / 4));
      for (let i = 0; i < count; i++) {
        const link = dangerLinks[Math.floor(Math.random() * dangerLinks.length)];
        if (!link) continue;
        const x1 = parseFloat(link.getAttribute('x1'));
        const y1 = parseFloat(link.getAttribute('y1'));
        const x2 = parseFloat(link.getAttribute('x2'));
        const y2 = parseFloat(link.getAttribute('y2'));
        fireBeam(x1, y1, x2, y2);
      }
    }, 500);
  }

  function fireBeam(x1, y1, x2, y2) {
    const beam = beamGroup.append('line')
      .attr('x1', x1).attr('y1', y1)
      .attr('x2', x1).attr('y2', y1)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .style('filter', 'drop-shadow(0 0 8px #fecaca) drop-shadow(0 0 15px #ef4444)');
    beam.transition().duration(400).ease(d3.easeQuadOut)
      .attr('x2', x2).attr('y2', y2)
      .transition().duration(300)
      .attr('stroke', '#fca5a5').attr('stroke-width', 0.5).attr('opacity', 0)
      .on('end', function() { d3.select(this).remove(); });
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      const spark = beamGroup.append('circle')
        .attr('cx', px).attr('cy', py).attr('r', 1.5)
        .attr('fill', '#fff7ed')
        .style('filter', 'drop-shadow(0 0 6px #fca5a5)');
      spark.transition().delay(400 + i * 30).duration(700)
        .attr('r', 0).attr('opacity', 0).on('end', function() { d3.select(this).remove(); });
    }
  }

  function animateSparks(nodes, mode) {
    sparkGroup.selectAll('*').remove();
    if (mode !== 'conflict') return;
    const conflictNodes = nodes.filter(n => n._conflict);
    if (conflictNodes.length === 0) return;
    sparkInterval = setInterval(() => {
      conflictNodes.forEach(node => {
        if (Math.random() < 0.6) {
          const otherX = node.x + (Math.random() - 0.5) * 30;
          const otherY = node.y + (Math.random() - 0.5) * 30;
          drawStaticSpark(node.x, node.y, otherX, otherY);
        }
      });
    }, 180);
  }

  function drawStaticSpark(x1, y1, x2, y2) {
    const points = [];
    const segs = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const jitter = i === 0 || i === segs ? 0 : 8;
      points.push([x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter, y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter]);
    }
    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ');
    const spark = sparkGroup.append('path')
      .attr('d', pathD)
      .attr('fill', 'none')
      .attr('stroke', '#fef08a')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .style('filter', 'drop-shadow(0 0 6px #fbbf24) drop-shadow(0 0 12px #f59e0b)');
    spark.transition().duration(350)
      .attr('stroke-opacity', 0)
      .attr('stroke-width', 0.3)
      .on('end', function() { d3.select(this).remove(); });
    for (let i = 0; i < 3; i++) {
      const px = x1 + (x2 - x1) * (Math.random() * 0.5 + 0.25);
      const py = y1 + (y2 - y1) * (Math.random() * 0.5 + 0.25);
      const dot = sparkGroup.append('circle')
        .attr('cx', px).attr('cy', py).attr('r', 1.5)
        .attr('fill', '#fff')
        .style('filter', 'drop-shadow(0 0 4px #fef08a)');
      dot.transition().duration(400)
        .attr('r', 0).attr('opacity', 0).on('end', function() { d3.select(this).remove(); });
    }
  }

  function animateRoot(mode) {
    if (mode === 'dangerous') {
      rootShakeInterval = setInterval(() => {
        const core = document.getElementById('rootCore');
        if (core) {
          const parent = core.parentNode;
          const dx = (Math.random() - 0.5) * 4;
          const dy = (Math.random() - 0.5) * 4;
          parent.setAttribute('transform', `translate(${centerX + dx},${centerY + dy})`);
          setTimeout(() => { parent.setAttribute('transform', `translate(${centerX},${centerY})`); }, 60);
        }
      }, 160);
    }
  }

  function updateSidebar(data, mode) {
    const root = data.tree;
    document.getElementById('projectName').textContent = root.name + ' v' + (root.version || '1.0.0');
    document.getElementById('totalCount').textContent = data.stats.totalCount || 0;
    document.getElementById('vulnCount').textContent = data.stats.vulnCount || 0;
    document.getElementById('conflictCount').textContent = data.stats.conflictCount || 0;
    let statusText = '安全', statusColor = '#34d399';
    if (mode === 'init') { statusText = '空白'; statusColor = '#9ca3af'; }
    else if (mode === 'safe') { statusText = '完美'; statusColor = '#34d399'; }
    else if (mode === 'conflict') { statusText = '冲突'; statusColor = '#f59e0b'; }
    else if (mode === 'dangerous') { statusText = '千疮百孔'; statusColor = '#dc2626'; }
    const statusEl = document.getElementById('status');
    statusEl.textContent = statusText;
    statusEl.style.color = statusColor;

    const list = document.getElementById('vulnList');
    const vulns = [];
    (function collect(node) {
      if (node.cves && node.cves.length > 0) {
        node.cves.forEach(c => vulns.push({ pkg: node.name, version: node.version, ...c }));
      }
      (node.children || []).forEach(collect);
    })(root);
    if (vulns.length === 0) { list.innerHTML = '<div class="empty">暂无发现高危漏洞</div>'; return; }
    list.innerHTML = vulns.map(v => `
      <div class="vuln-item ${(v.severity || '').toLowerCase()}">
        <div class="vuln-title">${v.pkg} ${v.version || ''}</div>
        <div class="vuln-cve">${v.cve_id || 'CVE-UNKNOWN'} · ${v.severity || 'UNKNOWN'}</div>
        <div class="vuln-desc">${v.description || ''}</div>
      </div>
    `).join('');
  }

  function render(data) {
    clearAnimations();
    resize();
    const mode = data.mode || currentMode;
    currentMode = mode;

    galaxyGroup = svg.append('g').attr('class', 'galaxy-main');
    if (!galaxyGroup.node()) galaxyGroup = svg.append('g');

    galaxyGroup.selectAll('*').remove();
    linkGroup = galaxyGroup.append('g').attr('class', 'links');
    sectorGroup = galaxyGroup.append('g').attr('class', 'sectors');
    nodeGroup = galaxyGroup.append('g').attr('class', 'nodes');
    rootGroup = galaxyGroup.append('g').attr('class', 'root');
    sparkGroup = galaxyGroup.append('g').attr('class', 'sparks');
    beamGroup = galaxyGroup.append('g').attr('class', 'beams');
    starGroup = galaxyGroup.append('g').attr('class', 'stars');

    createBackgroundStars(mode);

    const { nodes, links } = flattenTree(data.tree);
    allNodes = nodes;
    allLinks = links;
    const maxDepth = d3.max(nodes, n => n.depth);
    drawOrbitRings(maxDepth, mode);
    drawSectors(nodes, mode);
    drawLinks(links, mode);
    drawNodes(nodes, mode);
    animateBeams(mode);
    animateSparks(nodes, mode);
    animateRoot(mode);
    updateSidebar(data, mode);
  }

  function loadDemo(mode) {
    fetch('/api/demo/' + mode)
      .then(r => r.json())
      .then(data => render(data))
      .catch(err => console.error(err));
  }

  function initUI() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const mode = this.getAttribute('data-mode');
        loadDemo(mode);
      });
    });
    document.getElementById('refreshBtn').addEventListener('click', () => {
      const active = document.querySelector('.mode-btn.active');
      loadDemo(active ? active.getAttribute('data-mode') : 'normal');
    });
    document.getElementById('fileInput').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      fetch('/api/analyze-file', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
          document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
          document.querySelector('.mode-btn[data-mode="normal"]').classList.add('active');
          render(data);
        })
        .catch(err => alert('解析失败: ' + err.message));
    });
    window.addEventListener('resize', () => {
      const active = document.querySelector('.mode-btn.active');
      loadDemo(active ? active.getAttribute('data-mode') : 'init');
    });
  }

  function injectStyles() {
    const css = `
      @keyframes rootRing {
        0% { transform: scale(0.5); opacity: 0.9; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      @keyframes haloPulse {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      @keyframes sectorPulse {
        0% { opacity: 0.1; }
        100% { opacity: 0.35; }
      }
      @keyframes starTwinkle {
        0% { opacity: 0.1; }
        100% { opacity: 0.8; }
      }
      g.root circle#rootCore { transform-origin: center; transform-box: fill-box; }
      g.nodes circle { transform-origin: center; transform-box: fill-box; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    resize();
    initUI();
    loadDemo('init');
  });
})();
