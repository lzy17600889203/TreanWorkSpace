class GameOfLife {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.gridWidth = 50;
    this.gridHeight = 50;
    this.cellSize = 10;
    this.zoom = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    
    this.grid = [];
    this.generation = 0;
    this.isRunning = false;
    this.speed = 50;
    this.wrapAround = true;
    
    this.birthRule = [3];
    this.surviveRule = [2, 3];
    
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    this.cellAnimations = new Map();
    this.generationAnimation = 0;
    
    this.init();
    this.setupEventListeners();
    this.loadPatterns();
  }

  init() {
    this.resizeCanvas();
    this.createEmptyGrid();
    this.draw();
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  createEmptyGrid() {
    this.grid = Array(this.gridHeight).fill(null).map(() => 
      Array(this.gridWidth).fill(false)
    );
  }

  draw() {
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    const offsetX = this.offsetX;
    const offsetY = this.offsetY;
    const cellSize = this.cellSize * this.zoom;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 0.5;
    
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        const px = x * cellSize + offsetX;
        const py = y * cellSize + offsetY;
        
        this.ctx.strokeRect(px, py, cellSize, cellSize);
        
        if (this.grid[y][x]) {
          const key = `${x},${y}`;
          const anim = this.cellAnimations.get(key);
          const alpha = anim ? Math.min(1, anim.progress) : 1;
          const size = anim ? cellSize * (0.5 + anim.progress * 0.5) : cellSize;
          const offset = (cellSize - size) / 2;
          
          const gradient = this.ctx.createRadialGradient(
            px + cellSize / 2, py + cellSize / 2, 0,
            px + cellSize / 2, py + cellSize / 2, cellSize / 2
          );
          gradient.addColorStop(0, `rgba(0, 255, 136, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(0, 217, 255, ${alpha * 0.8})`);
          gradient.addColorStop(1, `rgba(0, 102, 255, ${alpha * 0.6})`);
          
          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.roundRect(px + offset, py + offset, size, size, 2);
          this.ctx.fill();
        }
      }
    }
    
    this.updateInfo();
    
    if (this.isRunning) {
      requestAnimationFrame(() => this.draw());
    }
  }

  updateInfo() {
    document.getElementById('generation').textContent = Math.floor(this.generationAnimation);
    document.getElementById('aliveCount').textContent = this.countAliveCells();
    document.getElementById('gridSize').textContent = `${this.gridWidth} × ${this.gridHeight}`;
    document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
    document.getElementById('zoomDisplay').textContent = `${Math.round(this.zoom * 100)}%`;
  }

  countAliveCells() {
    if (!this.grid || !Array.isArray(this.grid)) return 0;
    return this.grid.flat().filter(Boolean).length;
  }

  async nextGeneration() {
    const rules = {
      birth: this.birthRule,
      survive: this.surviveRule
    };

    const response = await fetch('/api/next-gen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grid: this.grid,
        width: this.gridWidth,
        height: this.gridHeight,
        wrapAround: this.wrapAround,
        rules: rules
      })
    });

    const data = await response.json();
    const newGrid = data.grid;
    
    this.updateAnimations(newGrid);
    this.grid = newGrid;
    this.generation += 1;
    
    this.generationAnimation = this.generation;
    await this.saveHistory();
  }

  updateAnimations(newGrid) {
    const newAnimations = new Map();
    
    if (!newGrid || !Array.isArray(newGrid)) {
      this.cellAnimations = newAnimations;
      return;
    }
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const key = `${x},${y}`;
        
        if (!this.grid[y] || !newGrid[y]) continue;
        
        if (!this.grid[y][x] && newGrid[y][x]) {
          newAnimations.set(key, { type: 'birth', progress: 0 });
        } else if (this.grid[y][x] && !newGrid[y][x]) {
          newAnimations.set(key, { type: 'death', progress: 1 });
        } else if (this.grid[y][x] && newGrid[y][x]) {
          const existing = this.cellAnimations.get(key);
          if (existing && existing.type === 'birth') {
            newAnimations.set(key, { type: 'birth', progress: Math.min(1, existing.progress + 0.3) });
          }
        }
      }
    }
    
    this.cellAnimations = newAnimations;
    
    const animStep = () => {
      let needsUpdate = false;
      this.cellAnimations.forEach((anim, key) => {
        if (anim.type === 'birth') {
          anim.progress += 0.15;
          if (anim.progress >= 1) {
            anim.progress = 1;
          } else {
            needsUpdate = true;
          }
        } else {
          anim.progress -= 0.2;
          if (anim.progress <= 0) {
            this.cellAnimations.delete(key);
          } else {
            needsUpdate = true;
          }
        }
      });
      
      if (needsUpdate && this.isRunning) {
        requestAnimationFrame(animStep);
      }
    };
    
    if (this.isRunning) {
      animStep();
    }
  }

  async saveHistory() {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern_name: 'current',
          generation: this.generation,
          alive_count: this.countAliveCells()
        })
      });
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  async start() {
    this.isRunning = true;
    document.getElementById('statusIndicator').classList.add('running');
    this.draw();
    this.loop();
  }

  pause() {
    this.isRunning = false;
    document.getElementById('statusIndicator').classList.remove('running');
  }

  async step() {
    await this.nextGeneration();
    this.draw();
  }

  clear() {
    this.pause();
    this.createEmptyGrid();
    this.generation = 0;
    this.generationAnimation = 0;
    this.cellAnimations.clear();
    this.draw();
  }

  loop() {
    if (!this.isRunning) return;
    
    setTimeout(async () => {
      await this.nextGeneration();
      this.loop();
    }, this.speed);
  }

  setSpeed(value) {
    this.speed = value;
    document.getElementById('speedValue').textContent = value;
  }

  setGridSize(size) {
    this.gridWidth = size;
    this.gridHeight = size;
    document.getElementById('gridSizeValue').textContent = `${size}x${size}`;
    this.createEmptyGrid();
    this.draw();
  }

  setWrapAround(value) {
    this.wrapAround = value;
  }

  setRules(birth, survive) {
    this.birthRule = Array.isArray(birth) ? birth : [parseInt(birth)];
    this.surviveRule = Array.isArray(survive) ? survive : survive.split(',').map(s => parseInt(s.trim())).filter(Boolean);
  }

  zoomIn() {
    const newZoom = Math.min(3, this.zoom + 0.25);
    this.animateZoom(newZoom);
  }

  zoomOut() {
    const newZoom = Math.max(0.25, this.zoom - 0.25);
    this.animateZoom(newZoom);
  }

  animateZoom(targetZoom) {
    const startZoom = this.zoom;
    const duration = 200;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      this.zoom = startZoom + (targetZoom - startZoom) * this.easeOutQuad(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
      
      this.draw();
    };
    
    requestAnimationFrame(animate);
  }

  easeOutQuad(t) {
    return t * (2 - t);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.draw();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.isRunning) return;
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left - this.offsetX) / (this.cellSize * this.zoom));
      const y = Math.floor((e.clientY - rect.top - this.offsetY) / (this.cellSize * this.zoom));
      
      if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
        this.grid[y][x] = !this.grid[y][x];
        this.draw();
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.offsetX += dx;
        this.offsetY += dy;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.draw();
      } else if (!this.isRunning) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left - this.offsetX) / (this.cellSize * this.zoom));
        const y = Math.floor((e.clientY - rect.top - this.offsetY) / (this.cellSize * this.zoom));
        
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
          this.canvas.style.cursor = 'crosshair';
        } else {
          this.canvas.style.cursor = 'default';
        }
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const gridX = (mouseX - this.offsetX) / (this.cellSize * this.zoom);
      const gridY = (mouseY - this.offsetY) / (this.cellSize * this.zoom);
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.25, Math.min(3, this.zoom + delta));
      
      this.offsetX = mouseX - gridX * this.cellSize * newZoom;
      this.offsetY = mouseY - gridY * this.cellSize * newZoom;
      
      this.zoom = newZoom;
      this.draw();
    });

    document.getElementById('startBtn').addEventListener('click', () => this.start());
    document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
    document.getElementById('stepBtn').addEventListener('click', () => this.step());
    document.getElementById('clearBtn').addEventListener('click', () => this.clear());

    document.getElementById('speedSlider').addEventListener('input', (e) => {
      this.setSpeed(parseInt(e.target.value));
    });

    document.getElementById('gridSizeSlider').addEventListener('input', (e) => {
      this.setGridSize(parseInt(e.target.value));
    });

    document.getElementById('wrapAround').addEventListener('change', (e) => {
      this.setWrapAround(e.target.checked);
    });

    document.getElementById('birthRule').addEventListener('change', (e) => {
      this.setRules(parseInt(e.target.value), this.surviveRule);
    });

    document.getElementById('surviveRule').addEventListener('change', (e) => {
      this.setRules(this.birthRule, e.target.value);
    });

    document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());

    document.getElementById('gosperBtn').addEventListener('click', () => this.loadGosperGliderGun());
    document.getElementById('randomBtn').addEventListener('click', () => this.loadRandomPattern());
    document.getElementById('blockBtn').addEventListener('click', () => this.loadBlockPattern());
    document.getElementById('growthBtn').addEventListener('click', () => this.loadGrowthPattern());

    document.getElementById('savePatternBtn').addEventListener('click', () => this.savePattern());
  }

  loadGosperGliderGun() {
    this.clear();
    
    const gun = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    
    const offsetX = Math.floor((this.gridWidth - gun[0].length) / 2);
    const offsetY = Math.floor((this.gridHeight - gun.length) / 2);
    
    for (let y = 0; y < gun.length; y++) {
      for (let x = 0; x < gun[y].length; x++) {
        if (gun[y][x] === 1) {
          const gx = x + offsetX;
          const gy = y + offsetY;
          if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
            this.grid[gy][gx] = true;
          }
        }
      }
    }
    
    this.draw();
  }

  loadRandomPattern() {
    this.clear();
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = Math.random() > 0.7;
      }
    }
    
    this.draw();
  }

  loadBlockPattern() {
    this.clear();
    
    const blocks = [
      [5, 5], [6, 5], [5, 6], [6, 6],
      [5, 15], [6, 15], [5, 16], [6, 16],
      [15, 5], [16, 5], [15, 6], [16, 6],
      [15, 15], [16, 15], [15, 16], [16, 16],
      [25, 25], [26, 25], [25, 26], [26, 26],
      [35, 10], [36, 10], [35, 11], [36, 11],
      [35, 20], [36, 20], [35, 21], [36, 21],
      [10, 35], [11, 35], [10, 36], [11, 36]
    ];
    
    blocks.forEach(([x, y]) => {
      if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
        this.grid[y][x] = true;
      }
    });
    
    this.draw();
  }

  loadGrowthPattern() {
    this.clear();
    
    const breeder = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    
    const offsetX = Math.floor((this.gridWidth - breeder[0].length) / 2);
    const offsetY = Math.floor((this.gridHeight - breeder.length) / 2);
    
    const glider1 = [[3,0],[4,1],[2,2],[3,2],[4,2]];
    const glider2 = [[19,0],[20,1],[18,2],[19,2],[20,2]];
    const eater = [[6,4],[7,4],[6,5],[7,5],[8,5],[9,6],[5,7],[9,7],[5,8],[6,8],[7,8]];
    
    glider1.forEach(([x, y]) => {
      const gx = x + offsetX;
      const gy = y + offsetY;
      if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
        this.grid[gy][gx] = true;
      }
    });
    
    glider2.forEach(([x, y]) => {
      const gx = x + offsetX;
      const gy = y + offsetY;
      if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
        this.grid[gy][gx] = true;
      }
    });
    
    eater.forEach(([x, y]) => {
      const gx = x + offsetX;
      const gy = y + offsetY;
      if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
        this.grid[gy][gx] = true;
      }
    });
    
    this.draw();
  }

  async savePattern() {
    const name = document.getElementById('patternName').value.trim();
    if (!name) {
      alert('请输入图案名称');
      return;
    }
    
    const response = await fetch('/api/patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        data: this.grid,
        width: this.gridWidth,
        height: this.gridHeight
      })
    });
    
    if (response.ok) {
      document.getElementById('patternName').value = '';
      this.loadPatterns();
    }
  }

  async loadPatterns() {
    const response = await fetch('/api/patterns');
    const patterns = await response.json();
    
    const list = document.getElementById('patternList');
    list.innerHTML = '';
    
    patterns.forEach(pattern => {
      const item = document.createElement('div');
      item.className = 'pattern-item';
      item.innerHTML = `
        <span>${pattern.name}</span>
        <button onclick="game.deletePattern(${pattern.id})">删除</button>
      `;
      item.addEventListener('click', () => this.loadPattern(pattern.id));
      list.appendChild(item);
    });
  }

  async loadPattern(id) {
    try {
      const response = await fetch(`/api/patterns/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Pattern not found:', id);
          return;
        }
        throw new Error('Failed to load pattern');
      }
      const pattern = await response.json();
      
      if (!pattern.data || !Array.isArray(pattern.data)) {
        console.error('Invalid pattern data', pattern);
        return;
      }
      
      this.grid = pattern.data;
      this.gridWidth = pattern.width;
      this.gridHeight = pattern.height;
      
      document.getElementById('gridSizeSlider').value = Math.min(200, Math.max(20, this.gridWidth));
      document.getElementById('gridSizeValue').textContent = `${this.gridWidth}x${this.gridHeight}`;
      
      this.draw();
    } catch (error) {
      console.error('Error loading pattern:', error);
    }
  }

  async deletePattern(id) {
    if (!confirm('确定要删除这个图案吗？')) return;
    
    await fetch(`/api/patterns/${id}`, { method: 'DELETE' });
    this.loadPatterns();
  }
}

const game = new GameOfLife();