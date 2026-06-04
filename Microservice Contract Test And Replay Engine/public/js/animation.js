class PipelineAnimation {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.isRunning = false;
    this.pipeState = 'normal';
    this.pipeExpand = 0;
    this.currentSceneColor = '#00ff88';
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;
  }

  createParticle(type = 'success') {
    const colors = {
      success: '#00ff88',
      timeout: '#ffcc00',
      error: '#ff3366'
    };
    
    return {
      x: 120,
      y: this.height / 2 + (Math.random() - 0.5) * 100,
      vx: 2 + Math.random() * 3,
      vy: (Math.random() - 0.5) * 0.5,
      radius: 4 + Math.random() * 6,
      color: colors[type],
      alpha: 1,
      type: type
    };
  }

  addParticle(type = 'success') {
    this.particles.push(this.createParticle(type));
  }

  setState(state) {
    this.pipeState = state;
  }

  setSceneColor(color) {
    this.currentSceneColor = color;
  }

  drawPipe() {
    const centerY = this.height / 2;
    const pipeWidth = this.width - 240;
    const basePipeHeight = 80;
    const expandAmount = this.pipeExpand * 40;
    const pipeHeight = basePipeHeight + expandAmount;
    
    let pipeColor = this.currentSceneColor;
    if (this.pipeState === 'timeout') {
      pipeColor = '#ffcc00';
    } else if (this.pipeState === 'error') {
      pipeColor = '#ff3366';
    }
    
    const gradient = this.ctx.createLinearGradient(0, centerY - pipeHeight / 2, 0, centerY + pipeHeight / 2);
    gradient.addColorStop(0, pipeColor);
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, pipeColor);
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.roundRect(125, centerY - pipeHeight / 2 + 5, pipeWidth, pipeHeight, 20);
    this.ctx.fill();
    
    this.ctx.fillStyle = gradient;
    this.roundRect(120, centerY - pipeHeight / 2, pipeWidth, pipeHeight, 20);
    this.ctx.fill();
    
    this.ctx.strokeStyle = pipeColor;
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = pipeColor;
    this.ctx.shadowBlur = 20;
    this.roundRect(120, centerY - pipeHeight / 2, pipeWidth, pipeHeight, 20);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
    
    this.draw3DEffect(centerY, pipeWidth, pipeHeight, pipeColor);
  }

  draw3DEffect(centerY, pipeWidth, pipeHeight, color) {
    const topGradient = this.ctx.createLinearGradient(0, centerY - pipeHeight / 2, 0, centerY - pipeHeight / 2 + 20);
    topGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    topGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = topGradient;
    this.roundRect(120, centerY - pipeHeight / 2, pipeWidth, 20, 20, true);
    this.ctx.fill();
    
    const bottomGradient = this.ctx.createLinearGradient(0, centerY + pipeHeight / 2 - 20, 0, centerY + pipeHeight / 2);
    bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    this.ctx.fillStyle = bottomGradient;
    this.roundRect(120, centerY + pipeHeight / 2 - 20, pipeWidth, 20, 20, true);
    this.ctx.fill();
  }

  roundRect(x, y, width, height, radius, topOnly = false) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    if (!topOnly) {
      this.ctx.lineTo(x + width, y + height - radius);
      this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      this.ctx.lineTo(x + radius, y + height);
      this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    }
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  drawParticles() {
    this.particles.forEach((p, index) => {
      p.x += p.vx;
      p.y += p.vy;
      
      const centerY = this.height / 2;
      const targetY = centerY + Math.sin(p.x * 0.02) * 20;
      p.y += (targetY - p.y) * 0.05;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 15;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      
      const trailGradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
      trailGradient.addColorStop(0, p.color);
      trailGradient.addColorStop(1, 'transparent');
      this.ctx.beginPath();
      this.ctx.arc(p.x - 10, p.y, p.radius * 0.5, 0, Math.PI * 2);
      this.ctx.fillStyle = trailGradient;
      this.ctx.fill();
      
      if (p.x > this.width - 100) {
        this.particles.splice(index, 1);
      }
    });
  }

  drawNodes() {
    const centerY = this.height / 2;
    
    const sourceGradient = this.ctx.createRadialGradient(80, centerY, 0, 80, centerY, 60);
    sourceGradient.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
    sourceGradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.3)');
    sourceGradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = sourceGradient;
    this.ctx.beginPath();
    this.ctx.arc(80, centerY, 60, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(80, centerY, 35, 0, Math.PI * 2);
    this.ctx.fillStyle = '#00d4ff';
    this.ctx.shadowColor = '#00d4ff';
    this.ctx.shadowBlur = 30;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    const targetX = this.width - 80;
    const targetGradient = this.ctx.createRadialGradient(targetX, centerY, 0, targetX, centerY, 60);
    targetGradient.addColorStop(0, this.currentSceneColor + 'cc');
    targetGradient.addColorStop(0.5, this.currentSceneColor + '4d');
    targetGradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = targetGradient;
    this.ctx.beginPath();
    this.ctx.arc(targetX, centerY, 60, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(targetX, centerY, 35, 0, Math.PI * 2);
    this.ctx.fillStyle = this.currentSceneColor;
    this.ctx.shadowColor = this.currentSceneColor;
    this.ctx.shadowBlur = 30;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  drawBackgroundGrid() {
    this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
    this.ctx.lineWidth = 1;
    
    for (let x = 0; x < this.width; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < this.height; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  update() {
    if (this.pipeState === 'timeout') {
      this.pipeExpand = Math.min(this.pipeExpand + 0.02, 1);
    } else {
      this.pipeExpand = Math.max(this.pipeExpand - 0.02, 0);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.drawBackgroundGrid();
    this.drawNodes();
    this.drawPipe();
    this.drawParticles();
    this.update();
  }

  start() {
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
  }

  animate() {
    if (!this.isRunning) return;
    this.render();
    requestAnimationFrame(() => this.animate());
  }

  clear() {
    this.particles = [];
    this.pipeState = 'normal';
    this.pipeExpand = 0;
  }
}
