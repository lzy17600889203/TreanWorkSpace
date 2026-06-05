class GanttChart {
  constructor(canvas, container) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.container = container;
    
    this.scenes = [];
    this.actors = [];
    this.locations = [];
    this.equipment = [];
    this.conflicts = [];
    
    this.viewMode = 'actors';
    
    this.startDate = new Date('2024-06-01');
    this.endDate = new Date('2024-06-20');
    this.totalDays = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    this.rowHeight = 50;
    this.dayWidth = 80;
    this.headerHeight = 60;
    this.labelWidth = 180;
    
    this.isDragging = false;
    this.dragScene = null;
    this.dragOffset = { x: 0, y: 0 };
    this.dragStartDay = 0;
    
    this.hoveredScene = null;
    this.lightningPhase = 0;
    
    this.init();
  }
  
  init() {
    this.resize();
    this.setupEvents();
    this.animate();
  }
  
  resize() {
    const rows = this.getRows();
    this.canvas.width = this.labelWidth + this.totalDays * this.dayWidth + 100;
    this.canvas.height = this.headerHeight + rows.length * this.rowHeight + 50;
  }
  
  getRows() {
    switch (this.viewMode) {
      case 'actors':
        return this.actors;
      case 'locations':
        return this.locations;
      case 'equipment':
        return this.equipment;
      default:
        return this.actors;
    }
  }
  
  setViewMode(mode) {
    this.viewMode = mode;
    this.resize();
    this.draw();
  }
  
  setData(scenes, actors, locations, equipment, conflicts) {
    this.scenes = scenes;
    this.actors = actors;
    this.locations = locations;
    this.equipment = equipment;
    this.conflicts = conflicts;
    this.resize();
    this.draw();
  }
  
  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
  }
  
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left + this.container.scrollLeft,
      y: e.clientY - rect.top + this.container.scrollTop
    };
  }
  
  getSceneAt(pos) {
    const rows = this.getRows();
    
    for (const scene of this.scenes) {
      const sceneRows = this.getSceneRows(scene);
      
      for (let i = 0; i < sceneRows.length; i++) {
        const rowIndex = rows.findIndex(r => r.id === sceneRows[i].id);
        if (rowIndex === -1) continue;
        
        const startDay = this.getDayIndex(new Date(scene.startDate));
        const endDay = this.getDayIndex(new Date(scene.endDate));
        const duration = endDay - startDay + 1;
        
        const x = this.labelWidth + startDay * this.dayWidth;
        const y = this.headerHeight + rowIndex * this.rowHeight + 5;
        const width = duration * this.dayWidth - 8;
        const height = this.rowHeight - 10;
        
        if (pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height) {
          return scene;
        }
      }
    }
    return null;
  }
  
  getSceneRows(scene) {
    switch (this.viewMode) {
      case 'actors':
        return scene.actors || [];
      case 'locations':
        return scene.location ? [scene.location] : [];
      case 'equipment':
        return scene.equipment || [];
      default:
        return scene.actors || [];
    }
  }
  
  getDayIndex(date) {
    return Math.ceil((date - this.startDate) / (1000 * 60 * 60 * 24));
  }
  
  onMouseDown(e) {
    const pos = this.getMousePos(e);
    const scene = this.getSceneAt(pos);
    
    if (scene) {
      this.isDragging = true;
      this.dragScene = scene;
      
      const startDay = this.getDayIndex(new Date(scene.startDate));
      this.dragStartDay = startDay;
      this.dragOffset.x = pos.x - (this.labelWidth + startDay * this.dayWidth);
      
      const rows = this.getRows();
      const sceneRows = this.getSceneRows(scene);
      this.dragStartRowIndex = rows.findIndex(r => r.id === sceneRows[0]?.id);
      
      this.canvas.style.cursor = 'grabbing';
    }
  }
  
  onMouseMove(e) {
    const pos = this.getMousePos(e);
    this.hoveredScene = this.getSceneAt(pos);
    
    if (this.isDragging && this.dragScene) {
      const newStartDay = Math.floor((pos.x - this.labelWidth - this.dragOffset.x) / this.dayWidth);
      const dayDiff = newStartDay - this.dragStartDay;
      
      if (dayDiff !== 0) {
        const startDate = new Date(this.dragScene.startDate);
        const endDate = new Date(this.dragScene.endDate);
        startDate.setDate(startDate.getDate() + dayDiff);
        endDate.setDate(endDate.getDate() + dayDiff);
        
        this.dragScene.startDate = startDate.toISOString().split('T')[0];
        this.dragScene.endDate = endDate.toISOString().split('T')[0];
        this.dragStartDay = newStartDay;
        
        if (this.onSceneDrag) {
          this.onSceneDrag(this.dragScene);
        }
      }
    }
    
    this.draw();
    
    if (this.onHover) {
      this.onHover(this.hoveredScene, pos);
    }
  }
  
  onMouseUp(e) {
    if (this.isDragging && this.onSceneDrop) {
      this.onSceneDrop(this.dragScene);
    }
    
    this.isDragging = false;
    this.dragScene = null;
    this.canvas.style.cursor = 'grab';
    this.draw();
  }
  
  onDoubleClick(e) {
    const pos = this.getMousePos(e);
    const scene = this.getSceneAt(pos);
    if (scene && this.onSceneDoubleClick) {
      this.onSceneDoubleClick(scene);
    }
  }
  
  draw() {
    const ctx = this.ctx;
    const rows = this.getRows();
    
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawGrid(rows);
    this.drawLabels(rows);
    this.drawTransitions();
    this.drawScenes(rows);
    this.drawConflicts(rows);
    this.drawHeader();
  }
  
  drawGrid(rows) {
    const ctx = this.ctx;
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= this.totalDays; i++) {
      const x = this.labelWidth + i * this.dayWidth;
      ctx.beginPath();
      ctx.moveTo(x, this.headerHeight);
      ctx.lineTo(x, this.headerHeight + rows.length * this.rowHeight);
      ctx.stroke();
    }
    
    for (let i = 0; i <= rows.length; i++) {
      const y = this.headerHeight + i * this.rowHeight;
      ctx.beginPath();
      ctx.moveTo(this.labelWidth, y);
      ctx.lineTo(this.labelWidth + this.totalDays * this.dayWidth, y);
      ctx.stroke();
    }
  }
  
  drawHeader() {
    const ctx = this.ctx;
    
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, this.canvas.width, this.headerHeight);
    
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, this.labelWidth, this.headerHeight);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(this.getViewModeLabel(), this.labelWidth / 2, 35);
    
    for (let i = 0; i < this.totalDays; i++) {
      const date = new Date(this.startDate);
      date.setDate(date.getDate() + i);
      
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      if (isWeekend) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(
          this.labelWidth + i * this.dayWidth,
          this.headerHeight,
          this.dayWidth,
          this.canvas.height - this.headerHeight
        );
      }
      
      const x = this.labelWidth + i * this.dayWidth + this.dayWidth / 2;
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 14px JetBrains Mono';
      ctx.fillText(date.getDate(), x, 28);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '11px JetBrains Mono';
      const monthNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
      ctx.fillText(monthNames[date.getMonth()] + '月', x, 48);
    }
  }
  
  getViewModeLabel() {
    switch (this.viewMode) {
      case 'actors': return '演员';
      case 'locations': return '场地';
      case 'equipment': return '设备';
      default: return '演员';
    }
  }
  
  drawLabels(rows) {
    const ctx = this.ctx;
    
    for (let i = 0; i < rows.length; i++) {
      const y = this.headerHeight + i * this.rowHeight;
      
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, y, this.labelWidth, this.rowHeight);
      
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '500 13px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(rows[i].name, 16, y + this.rowHeight / 2 + 4);
      
      if (this.viewMode === 'actors' && rows[i].is_lead) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = '11px Inter';
        ctx.fillText('主演', 16, y + this.rowHeight / 2 + 20);
      }
    }
  }
  
  drawTransitions() {
    const ctx = this.ctx;
    const rows = this.getRows();
    
    const sortedScenes = [...this.scenes].sort((a, b) => 
      new Date(a.startDate) - new Date(b.startDate)
    );
    
    for (let i = 0; i < sortedScenes.length - 1; i++) {
      const scene1 = sortedScenes[i];
      const scene2 = sortedScenes[i + 1];
      
      if (scene1.location && scene2.location && scene1.location.id !== scene2.location.id) {
        const endDay1 = this.getDayIndex(new Date(scene1.endDate));
        const startDay2 = this.getDayIndex(new Date(scene2.startDate));
        
        if (startDay2 - endDay1 === 2) {
          const sceneRows = this.getSceneRows(scene1);
          
          for (const rowItem of sceneRows) {
            const rowIndex = rows.findIndex(r => r.id === rowItem.id);
            if (rowIndex === -1) continue;
            
            const x = this.labelWidth + (endDay1 + 1) * this.dayWidth;
            const y = this.headerHeight + rowIndex * this.rowHeight + 5;
            
            ctx.fillStyle = 'rgba(113, 128, 150, 0.3)';
            ctx.fillRect(x, y, this.dayWidth - 8, this.rowHeight - 10);
            
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('转场', x + (this.dayWidth - 8) / 2, y + (this.rowHeight - 10) / 2 + 4);
          }
        }
      }
    }
  }
  
  drawScenes(rows) {
    const ctx = this.ctx;
    
    for (const scene of this.scenes) {
      const sceneRows = this.getSceneRows(scene);
      
      for (const rowItem of sceneRows) {
        const rowIndex = rows.findIndex(r => r.id === rowItem.id);
        if (rowIndex === -1) continue;
        
        const startDay = this.getDayIndex(new Date(scene.startDate));
        const endDay = this.getDayIndex(new Date(scene.endDate));
        const duration = endDay - startDay + 1;
        
        const x = this.labelWidth + startDay * this.dayWidth + 4;
        const y = this.headerHeight + rowIndex * this.rowHeight + 5;
        const width = duration * this.dayWidth - 8;
        const height = this.rowHeight - 10;
        
        const isHovered = this.hoveredScene && this.hoveredScene.id === scene.id;
        const isDragging = this.dragScene && this.dragScene.id === scene.id;
        
        ctx.shadowColor = scene.color;
        ctx.shadowBlur = isHovered ? 15 : 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = isHovered ? 4 : 2;
        
        ctx.fillStyle = scene.color;
        ctx.globalAlpha = isDragging ? 0.7 : 0.9;
        this.roundRect(x, y, width, height, 8);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = 'white';
        ctx.font = '600 11px Inter';
        ctx.textAlign = 'left';
        
        const text = scene.name.length > 15 ? scene.name.substring(0, 15) + '...' : scene.name;
        if (width > 60) {
          ctx.fillText(text, x + 10, y + height / 2 + 4);
        }
      }
    }
  }
  
  drawConflicts(rows) {
    const ctx = this.ctx;
    
    for (const conflict of this.conflicts) {
      const scenes = conflict.sceneIds.map(id => this.scenes.find(s => s.id === id)).filter(Boolean);
      if (scenes.length < 2) continue;
      
      for (let i = 0; i < scenes.length - 1; i++) {
        for (let j = i + 1; j < scenes.length; j++) {
          const scene1 = scenes[i];
          const scene2 = scenes[j];
          
          const scene1Rows = this.getSceneRows(scene1);
          const scene2Rows = this.getSceneRows(scene2);
          
          for (const row1 of scene1Rows) {
            for (const row2 of scene2Rows) {
              if (row1.id !== row2.id && conflict.type !== 'distance') continue;
              
              const rowIndex = rows.findIndex(r => r.id === row1.id);
              if (rowIndex === -1) continue;
              
              const startDay1 = this.getDayIndex(new Date(scene1.startDate));
              const endDay1 = this.getDayIndex(new Date(scene1.endDate));
              const startDay2 = this.getDayIndex(new Date(scene2.startDate));
              const endDay2 = this.getDayIndex(new Date(scene2.endDate));
              
              const overlapStart = Math.max(startDay1, startDay2);
              const overlapEnd = Math.min(endDay1, endDay2);
              
              if (overlapStart > overlapEnd && conflict.type !== 'distance') continue;
              
              const displayStart = conflict.type === 'distance' ? Math.min(startDay1, startDay2) : overlapStart;
              const displayEnd = conflict.type === 'distance' ? Math.max(endDay1, endDay2) : overlapEnd;
              
              const x = this.labelWidth + displayStart * this.dayWidth;
              const y = this.headerHeight + rowIndex * this.rowHeight;
              const width = (displayEnd - displayStart + 1) * this.dayWidth;
              
              this.drawLightning(x + width / 2, y + this.rowHeight / 2);
            }
          }
        }
      }
    }
  }
  
  drawLightning(x, y) {
    const ctx = this.ctx;
    const scale = 0.8 + Math.sin(this.lightningPhase) * 0.2;
    const alpha = 0.7 + Math.sin(this.lightningPhase) * 0.3;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 30;
    
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-15, -30);
    ctx.lineTo(10, -5);
    ctx.lineTo(0, -5);
    ctx.lineTo(15, 30);
    ctx.lineTo(-10, 5);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
  
  roundRect(x, y, width, height, radius) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  animate() {
    this.lightningPhase += 0.1;
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}
