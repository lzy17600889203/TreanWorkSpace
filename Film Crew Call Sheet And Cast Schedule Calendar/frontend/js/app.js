const API = {
  async getScenes() {
    const res = await fetch('/api/scenes');
    return res.json();
  },
  
  async getActors() {
    const res = await fetch('/api/actors');
    return res.json();
  },
  
  async getLocations() {
    const res = await fetch('/api/locations');
    return res.json();
  },
  
  async getEquipment() {
    const res = await fetch('/api/equipment');
    return res.json();
  },
  
  async getConflicts() {
    const res = await fetch('/api/conflicts');
    return res.json();
  },
  
  async updateScene(scene) {
    const res = await fetch(`/api/scenes/${scene.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: scene.name,
        startDate: scene.startDate,
        endDate: scene.endDate,
        locationId: scene.location?.id,
        color: scene.color,
        actorIds: scene.actors?.map(a => a.id),
        equipmentIds: scene.equipment?.map(e => e.id)
      })
    });
    return res.json();
  }
};

class App {
  constructor() {
    this.canvas = document.getElementById('ganttCanvas');
    this.container = document.querySelector('.canvas-container');
    this.tooltip = document.getElementById('tooltip');
    this.modal = document.getElementById('modal');
    this.conflictCount = document.getElementById('conflictCount');
    
    this.gantt = new GanttChart(this.canvas, this.container);
    this.setupGanttEvents();
    this.setupUIEvents();
    this.loadData();
  }
  
  setupGanttEvents() {
    this.gantt.onHover = (scene, pos) => {
      if (scene) {
        this.showTooltip(scene, pos);
      } else {
        this.hideTooltip();
      }
    };
    
    this.gantt.onSceneDrag = async (scene) => {
      await this.checkConflicts();
    };
    
    this.gantt.onSceneDrop = async (scene) => {
      await API.updateScene(scene);
      await this.checkConflicts();
    };
    
    this.gantt.onSceneDoubleClick = (scene) => {
      this.openEditModal(scene);
    };
  }
  
  setupUIEvents() {
    document.querySelectorAll('.view-mode-buttons button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-mode-buttons button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gantt.setViewMode(btn.dataset.mode);
      });
    });
    
    document.getElementById('addConflictBtn').addEventListener('click', () => {
      this.createConflictDemo();
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.loadData();
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
      this.closeModal();
    });
    
    document.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.closeModal();
      }
    });
  }
  
  async loadData() {
    try {
      const [scenes, actors, locations, equipment] = await Promise.all([
        API.getScenes(),
        API.getActors(),
        API.getLocations(),
        API.getEquipment()
      ]);
      
      this.gantt.setData(scenes, actors, locations, equipment, []);
      await this.checkConflicts();
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }
  
  async checkConflicts() {
    try {
      const conflicts = await API.getConflicts();
      this.gantt.conflicts = conflicts;
      this.gantt.draw();
      
      this.conflictCount.classList.toggle('hidden', conflicts.length === 0);
      this.conflictCount.querySelector('span').textContent = conflicts.length;
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }
  }
  
  showTooltip(scene, pos) {
    const actorsList = scene.actors?.map(a => a.name).join(', ') || '无';
    const locationName = scene.location?.name || '未安排';
    const equipmentList = scene.equipment?.map(e => e.name).join(', ') || '无';
    
    this.tooltip.innerHTML = `
      <h4>${scene.name}</h4>
      <p><span class="label">日期:</span> ${scene.startDate} 至 ${scene.endDate}</p>
      <p><span class="label">演员:</span> ${actorsList}</p>
      <p><span class="label">场地:</span> ${locationName}</p>
      <p><span class="label">设备:</span> ${equipmentList}</p>
    `;
    
    const containerRect = this.container.getBoundingClientRect();
    let left = pos.x - this.container.scrollLeft + 15;
    let top = pos.y - this.container.scrollTop + 15;
    
    if (left + 280 > containerRect.width) {
      left = pos.x - this.container.scrollLeft - 295;
    }
    
    this.tooltip.style.left = left + 'px';
    this.tooltip.style.top = top + 'px';
    this.tooltip.classList.remove('hidden');
  }
  
  hideTooltip() {
    this.tooltip.classList.add('hidden');
  }
  
  openEditModal(scene) {
    document.getElementById('sceneName').value = scene.name;
    document.getElementById('sceneStartDate').value = scene.startDate;
    document.getElementById('sceneEndDate').value = scene.endDate;
    
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(opt => {
      opt.classList.toggle('selected', opt.style.backgroundColor === scene.color);
    });
    
    this.editingScene = scene;
    this.modal.classList.remove('hidden');
  }
  
  closeModal() {
    this.modal.classList.add('hidden');
  }
  
  async createConflictDemo() {
    if (this.gantt.scenes.length < 2) return;
    
    const scene1 = this.gantt.scenes[0];
    const scene2 = this.gantt.scenes[1];
    
    scene2.startDate = scene1.startDate;
    scene2.endDate = scene1.endDate;
    
    await API.updateScene(scene2);
    this.gantt.scenes = [...this.gantt.scenes];
    await this.checkConflicts();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});

document.querySelectorAll('.color-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
  });
});
