class WorkflowEditor {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.draggingNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isConnecting = false;
        this.connectionStart = null;
        this.tempLine = null;
        this.nodeIdCounter = 0;
        
        this.canvas = document.getElementById('canvas');
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupNodeTemplates();
        this.setupEventListeners();
        this.loadDefaultWorkflow();
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.setAttribute('width', container.clientWidth);
        this.canvas.setAttribute('height', container.clientHeight);
    }

    setupNodeTemplates() {
        const templates = document.querySelectorAll('.node-template');
        templates.forEach(template => {
            template.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('nodeType', template.dataset.type);
                e.dataTransfer.setData('nodeRole', template.dataset.role || '');
            });
        });
    }

    setupEventListeners() {
        this.canvas.addEventListener('dragover', (e) => e.preventDefault());
        this.canvas.addEventListener('drop', (e) => this.handleDrop(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));

        document.getElementById('saveWorkflow').addEventListener('click', () => this.saveWorkflow());
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
    }

    handleDrop(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - 75;
        const y = e.clientY - rect.top - 40;
        
        const type = e.dataTransfer.getData('nodeType');
        const role = e.dataTransfer.getData('nodeRole');
        
        this.addNode(x, y, type, role);
    }

    addNode(x, y, type, role) {
        const node = {
            id: `node_${this.nodeIdCounter++}`,
            x: x,
            y: y,
            type: type,
            role: role,
            label: this.getNodeLabel(type, role)
        };
        
        this.nodes.push(node);
        this.render();
    }

    getNodeLabel(type, role) {
        const labels = {
            'start': '发起',
            'end': '结束',
            'manager': '部门主管',
            'finance': '财务复核',
            'ceo': '总经理'
        };
        return labels[role] || labels[type] || '节点';
    }

    handleCanvasMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const target = e.target;
        if (target.classList.contains('node-port')) {
            const nodeId = target.parentElement.dataset.nodeId;
            this.isConnecting = true;
            this.connectionStart = nodeId;
            const node = this.nodes.find(n => n.id === nodeId);
            this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            this.tempLine.setAttribute('class', 'connection-line');
            this.tempLine.setAttribute('stroke-dasharray', '5,5');
            this.canvas.appendChild(this.tempLine);
        } else if (target.closest('.workflow-node')) {
            const nodeEl = target.closest('.workflow-node');
            const nodeId = nodeEl.dataset.nodeId;
            this.draggingNode = this.nodes.find(n => n.id === nodeId);
            this.dragOffset = {
                x: x - this.draggingNode.x,
                y: y - this.draggingNode.y
            };
            this.selectNode(nodeId);
        } else {
            this.selectNode(null);
        }
    }

    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isConnecting && this.tempLine) {
            const startNode = this.nodes.find(n => n.id === this.connectionStart);
            const d = this.createBezierPath(
                startNode.x + 150, startNode.y + 40,
                x, y
            );
            this.tempLine.setAttribute('d', d);
        } else if (this.draggingNode) {
            this.draggingNode.x = x - this.dragOffset.x;
            this.draggingNode.y = y - this.dragOffset.y;
            this.render();
        }
    }

    handleCanvasMouseUp(e) {
        if (this.isConnecting) {
            const target = e.target;
            if (target.closest('.workflow-node')) {
                const nodeEl = target.closest('.workflow-node');
                const endNodeId = nodeEl.dataset.nodeId;
                if (endNodeId !== this.connectionStart) {
                    this.addConnection(this.connectionStart, endNodeId);
                }
            }
            if (this.tempLine) {
                this.tempLine.remove();
                this.tempLine = null;
            }
            this.isConnecting = false;
            this.connectionStart = null;
        }
        this.draggingNode = null;
    }

    addConnection(fromId, toId) {
        const exists = this.connections.some(c => c.from === fromId && c.to === toId);
        if (!exists) {
            this.connections.push({ from: fromId, to: toId });
            this.render();
        }
    }

    selectNode(nodeId) {
        this.selectedNode = nodeId;
        this.render();
    }

    createBezierPath(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1) * 0.5;
        return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    }

    render() {
        this.canvas.innerHTML = '';

        this.connections.forEach(conn => {
            const fromNode = this.nodes.find(n => n.id === conn.from);
            const toNode = this.nodes.find(n => n.id === conn.to);
            if (fromNode && toNode) {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'connection-line');
                path.setAttribute('d', this.createBezierPath(
                    fromNode.x + 150, fromNode.y + 40,
                    toNode.x, toNode.y + 40
                ));
                this.canvas.appendChild(path);
            }
        });

        this.nodes.forEach(node => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', `workflow-node ${this.selectedNode === node.id ? 'selected' : ''}`);
            g.setAttribute('data-node-id', node.id);

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'node-body');
            rect.setAttribute('x', node.x);
            rect.setAttribute('y', node.y);
            rect.setAttribute('width', 150);
            rect.setAttribute('height', 80);
            rect.setAttribute('rx', 12);
            rect.setAttribute('fill', 'white');
            rect.setAttribute('stroke', '#e1e8ed');
            rect.setAttribute('stroke-width', 2);

            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            icon.setAttribute('x', node.x + 75);
            icon.setAttribute('y', node.y + 35);
            icon.setAttribute('text-anchor', 'middle');
            icon.setAttribute('font-size', '24');
            icon.textContent = this.getNodeIcon(node.type, node.role);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', node.x + 75);
            text.setAttribute('y', node.y + 65);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', '#1a1a2e');
            text.textContent = node.label;

            const port = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            port.setAttribute('class', 'node-port');
            port.setAttribute('cx', node.x + 150);
            port.setAttribute('cy', node.y + 40);
            port.setAttribute('r', 8);
            port.setAttribute('fill', '#667eea');
            port.setAttribute('stroke', 'white');
            port.setAttribute('stroke-width', 2);

            g.appendChild(rect);
            g.appendChild(icon);
            g.appendChild(text);
            g.appendChild(port);

            this.canvas.appendChild(g);
        });
    }

    getNodeIcon(type, role) {
        const icons = {
            'start': '🚀',
            'end': '✅',
            'manager': '👔',
            'finance': '💰',
            'ceo': '👑'
        };
        return icons[role] || icons[type] || '📋';
    }

    clearCanvas() {
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.render();
    }

    loadDefaultWorkflow() {
        this.addNode(100, 250, 'start', 'employee');
        this.addNode(350, 250, 'approval', 'manager');
        this.addNode(600, 250, 'approval', 'finance');
        this.addNode(850, 250, 'approval', 'ceo');
        this.addNode(1100, 250, 'end', '');

        setTimeout(() => {
            this.addConnection('node_0', 'node_1');
            this.addConnection('node_1', 'node_2');
            this.addConnection('node_2', 'node_3');
            this.addConnection('node_3', 'node_4');
        }, 100);
    }

    saveWorkflow() {
        const name = document.getElementById('workflowName').value || '未命名流程';
        const data = {
            name: name,
            config: {
                nodes: this.nodes,
                connections: this.connections
            }
        };

        fetch('/api/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            alert('流程保存成功！');
            loadWorkflows();
        })
        .catch(err => console.error('保存失败:', err));
    }
}

let currentUser = 'employee1';
let workflows = [];
let users = {};
let editor = null;

document.addEventListener('DOMContentLoaded', () => {
    editor = new WorkflowEditor();
    setupNavigation();
    loadWorkflows();
    loadApplications();
    loadUsers();
    setupDemoButtons();
    setupModal();
    // 绑定新建申请按钮
    const newAppBtn = document.getElementById('newApplication');
    if (newAppBtn) {
        newAppBtn.onclick = showNewApplicationModal;
    }
});

function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
}

function loadWorkflows() {
    fetch('/api/workflows')
        .then(res => res.json())
        .then(data => {
            workflows = data;
        });
}

function loadUsers() {
    fetch('/api/users')
        .then(res => res.json())
        .then(data => {
            users = data;
        });
}

function loadApplications() {
    fetch('/api/applications')
        .then(res => res.json())
        .then(data => renderApplications(data));
}

function renderApplications(applications) {
    const list = document.getElementById('applicationsList');
    list.innerHTML = '';

    if (applications.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">暂无申请</p>';
        return;
    }

    applications.forEach(app => {
        const card = document.createElement('div');
        card.className = 'application-card';
        card.innerHTML = `
            <div class="application-header">
                <div class="application-title">${app.type} - ${app.applicant}</div>
                <span class="application-status status-${app.status}">${getStatusText(app.status)}</span>
            </div>
            <div class="application-meta">
                <span>📅 ${new Date(app.created_at).toLocaleString()}</span>
            </div>
            <div style="margin-bottom: 16px; color: #666;">
                <strong>请假天数：</strong>${app.data.days}天<br>
                <strong>原因：</strong>${app.data.reason}
            </div>
            <div class="application-actions">
                ${app.status === 'pending' ? `
                    <button class="btn primary" onclick="approveApplication(${app.id})">审批通过</button>
                    <button class="btn danger" onclick="showRejectModal(${app.id})">驳回</button>
                    <button class="btn" style="background: #666;" onclick="withdrawApplication(${app.id})">撤销</button>
                ` : ''}
            </div>
        `;
        list.appendChild(card);
    });
}

function getStatusText(status) {
    const texts = {
        'pending': '待审批',
        'approved': '已通过',
        'rejected': '已驳回',
        'withdrawn': '已撤销'
    };
    return texts[status] || status;
}

function showNewApplicationModal() {
    if (workflows.length === 0) {
        alert('请先创建一个审批流程！');
        return;
    }

    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    
    // 生成用户选项
    const userOptions = Object.entries(users).map(([userId, userInfo]) => 
        `<option value="${userInfo.name}" data-user-id="${userId}">${userInfo.avatar} ${userInfo.name}</option>`
    ).join('');

    body.innerHTML = `
        <h2 style="margin-bottom: 24px;">新建请假申请</h2>
        <div class="form-group">
            <label>选择流程</label>
            <select id="selectWorkflow">
                ${workflows.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>申请人</label>
            <select id="applicantName">
                ${userOptions}
            </select>
        </div>
        <div class="form-group">
            <label>请假天数</label>
            <input type="number" id="leaveDays" value="3" min="1">
        </div>
        <div class="form-group">
            <label>请假原因</label>
            <textarea id="leaveReason" rows="3">家里有事</textarea>
        </div>
        <button class="btn primary" onclick="submitApplication()" style="width: 100%;">提交申请</button>
    `;
    modal.classList.remove('hidden');
}

function submitApplication() {
    const workflowId = document.getElementById('selectWorkflow').value;
    const applicant = document.getElementById('applicantName').value;
    const days = document.getElementById('leaveDays').value;
    const reason = document.getElementById('leaveReason').value;

    fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            workflowId: parseInt(workflowId),
            applicant: applicant,
            type: '请假申请',
            data: { days: days, reason: reason }
        })
    })
    .then(res => res.json())
    .then(() => {
        closeModal();
        loadApplications();
    });
}

function approveApplication(id) {
    fetch(`/api/applications/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser })
    })
    .then(res => res.json())
    .then(() => loadApplications());
}

function showRejectModal(id) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    body.innerHTML = `
        <h2 style="margin-bottom: 24px;">驳回申请</h2>
        <div class="form-group">
            <label>驳回原因</label>
            <textarea id="rejectReason" rows="3">请补充请假材料</textarea>
        </div>
        <button class="btn danger" onclick="rejectApplication(${id})" style="width: 100%;">确认驳回</button>
    `;
    modal.classList.remove('hidden');
}

function rejectApplication(id) {
    const reason = document.getElementById('rejectReason').value;
    fetch(`/api/applications/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser, reason: reason })
    })
    .then(res => res.json())
    .then(() => {
        closeModal();
        loadApplications();
    });
}

function withdrawApplication(id) {
    fetch(`/api/applications/${id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser })
    })
    .then(res => res.json())
    .then(() => loadApplications());
}

function setupModal() {
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function setupDemoButtons() {
    document.querySelectorAll('.demo-btn').forEach(btn => {
        btn.addEventListener('click', () => showDemo(btn.dataset.demo));
    });
}

function showDemo(type) {
    const area = document.getElementById('demoArea');
    switch(type) {
        case 'perfect':
            area.innerHTML = `
                <div class="demo-perfect">
                    <h3 style="margin-bottom: 20px;">完美流转状态</h3>
                    <div class="progress-bar" style="width: 100%;"></div>
                    <div class="demo-node completed">
                        <div class="demo-avatar">👨‍💼</div>
                        <div class="demo-node-info">
                            <div class="demo-node-title">发起 - 张三</div>
                            <div class="demo-node-time">2024-01-15 09:00:00</div>
                        </div>
                        <div style="color: #48bb78; font-weight: 600;">✅ 已完成</div>
                    </div>
                    <div class="demo-node completed">
                        <div class="demo-avatar">👔</div>
                        <div class="demo-node-info">
                            <div class="demo-node-title">部门主管 - 李经理</div>
                            <div class="demo-node-time">2024-01-15 10:30:00</div>
                        </div>
                        <div style="color: #48bb78; font-weight: 600;">✅ 已通过</div>
                    </div>
                    <div class="demo-node completed">
                        <div class="demo-avatar">💰</div>
                        <div class="demo-node-info">
                            <div class="demo-node-title">财务复核 - 王财务</div>
                            <div class="demo-node-time">2024-01-15 14:00:00</div>
                        </div>
                        <div style="color: #48bb78; font-weight: 600;">✅ 已通过</div>
                    </div>
                    <div class="demo-node completed">
                        <div class="demo-avatar">👑</div>
                        <div class="demo-node-info">
                            <div class="demo-node-title">总经理 - 孙总</div>
                            <div class="demo-node-time">2024-01-15 16:30:00</div>
                        </div>
                        <div style="color: #48bb78; font-weight: 600;">✅ 已批准</div>
                    </div>
                </div>
            `;
            break;
        case 'reject':
            area.innerHTML = `
                <div class="demo-reject-overlay">
                    <div class="demo-reject-icon">⚠️</div>
                    <h3 style="text-align: center; color: #c53030; margin-bottom: 24px;">申请被驳回</h3>
                    <div class="demo-reject-reason">
                        <h4 style="margin-bottom: 12px; color: #1a1a2e;">驳回原因：</h4>
                        <p style="color: #666; line-height: 1.6;">请假申请材料不完整，请补充医院诊断证明或相关证明文件。</p>
                    </div>
                    <div class="demo-reject-reason">
                        <h4 style="margin-bottom: 12px; color: #1a1a2e;">修改建议：</h4>
                        <p style="color: #666; line-height: 1.6;">1. 上传正规医院的诊断证明<br>2. 注明需要请假的具体时间段<br>3. 如有紧急情况请电话联系</p>
                    </div>
                    <div style="text-align: center; margin-top: 24px;">
                        <button class="btn primary" style="width: auto;">重新提交申请</button>
                    </div>
                </div>
            `;
            break;
        case 'countersign':
            area.innerHTML = `
                <h3 style="margin-bottom: 20px; text-align: center;">会签卡点状态</h3>
                <div class="demo-countersign">
                    <div class="countersign-item">
                        <div class="countersign-icon completed">💰</div>
                        <div class="countersign-name">王财务</div>
                        <div style="color: #48bb78; font-size: 12px; margin-top: 4px;">已签字</div>
                    </div>
                    <div class="countersign-item">
                        <div class="countersign-icon completed">💰</div>
                        <div class="countersign-name">赵财务</div>
                        <div style="color: #48bb78; font-size: 12px; margin-top: 4px;">已签字</div>
                    </div>
                    <div class="countersign-item">
                        <div class="countersign-icon">⏳</div>
                        <div class="countersign-name">钱财务</div>
                        <div style="color: #f6ad55; font-size: 12px; margin-top: 4px;">等待中</div>
                    </div>
                </div>
                <p style="text-align: center; color: #666; margin-top: 24px;">需要所有财务总监签字后才能进入下一流程</p>
            `;
            break;
        case 'withdraw':
            area.innerHTML = `
                <div class="demo-withdraw">
                    <h3 style="margin-bottom: 20px;">发起人撤销状态</h3>
                    <div class="application-card">
                        <div class="application-header">
                            <div class="application-title">
                                请假申请 - 张三
                                <span class="withdraw-tag">已撤回</span>
                            </div>
                            <span class="application-status status-withdrawn">已撤销</span>
                        </div>
                        <div class="application-meta">
                            <span>📅 2024-01-15 09:00:00</span>
                        </div>
                        <div style="margin-bottom: 16px; color: #666;">
                            <strong>请假天数：</strong>3天<br>
                            <strong>原因：</strong>家里有事
                        </div>
                        <div class="application-actions">
                            <button class="btn" style="background: #999; cursor: not-allowed;" disabled>发起</button>
                            <button class="btn" style="background: #999; cursor: not-allowed;" disabled>撤销</button>
                        </div>
                    </div>
                </div>
            `;
            break;
    }
}
