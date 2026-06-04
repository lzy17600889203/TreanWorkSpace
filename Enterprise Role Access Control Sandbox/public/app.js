const canvas = document.getElementById('topologyCanvas');
const ctx = canvas.getContext('2d');
const alertContent = document.getElementById('alertContent');

let nodes = [];
let edges = [];
let draggedNode = null;
let hoveredNode = null;
let hoveredEdge = null;
let animationPaths = [];
let animationTime = 0;
let isDragging = false;

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

async function loadData() {
    try {
        const res = await fetch('/api/data');
        const data = await res.json();
        
        nodes = [];
        edges = [];
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        data.nodes.forEach((node, i) => {
            const angle = (i / data.nodes.length) * Math.PI * 2;
            const radius = 200 + (i % 3) * 100;
            nodes.push({
                ...node,
                id: node.type === 'role' ? `role_${node.id}` : (node.type === 'permission' ? `perm_${node.id}` : node.id),
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                radius: 30,
                vx: 0,
                vy: 0
            });
        });
        
        edges = data.edges;
        
        applyForceDirectedLayout();
    } catch (err) {
        console.error('Failed to load data:', err);
    }
}

function applyForceDirectedLayout() {
    for (let iter = 0; iter < 100; iter++) {
        nodes.forEach(node => {
            node.vx = 0;
            node.vy = 0;
        });
        
        const repulsion = 5000;
        nodes.forEach((n1, i) => {
            nodes.forEach((n2, j) => {
                if (i !== j) {
                    const dx = n1.x - n2.x;
                    const dy = n1.y - n2.y;
                    const dist = Math.max(distance(n1, n2), 50);
                    const force = repulsion / (dist * dist);
                    n1.vx += (dx / dist) * force;
                    n1.vy += (dy / dist) * force;
                }
            });
        });
        
        const attraction = 0.01;
        edges.forEach(edge => {
            const n1 = nodes.find(n => n.id == edge.source);
            const n2 = nodes.find(n => n.id == edge.target);
            if (n1 && n2) {
                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                n1.vx += dx * attraction;
                n1.vy += dy * attraction;
                n2.vx -= dx * attraction;
                n2.vy -= dy * attraction;
            }
        });
        
        const damping = 0.9;
        nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;
            node.vx *= damping;
            node.vy *= damping;
        });
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    edges.forEach(edge => {
        const n1 = nodes.find(n => n.id == edge.source);
        const n2 = nodes.find(n => n.id == edge.target);
        if (n1 && n2) {
            drawEdge(n1, n2, edge === hoveredEdge);
        }
    });
    
    drawAnimationPaths();
    
    nodes.forEach(node => {
        drawNode(node, node === hoveredNode, node === draggedNode);
    });
    
    animationTime += 0.02;
    requestAnimationFrame(draw);
}

function drawEdge(n1, n2, isHovered) {
    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    
    if (isHovered) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
    } else {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
    }
    
    ctx.stroke();
    
    const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
    const arrowLen = 12;
    const arrowX = n2.x - Math.cos(angle) * n2.radius;
    const arrowY = n2.y - Math.sin(angle) * n2.radius;
    
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
        arrowX - arrowLen * Math.cos(angle - Math.PI / 6),
        arrowY - arrowLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
        arrowX - arrowLen * Math.cos(angle + Math.PI / 6),
        arrowY - arrowLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
}

function drawNode(node, isHovered, isDragged) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + (isHovered || isDragged ? 5 : 0), 0, Math.PI * 2);
    ctx.fillStyle = isDragged ? '#3b82f6' : (isHovered ? '#60a5fa' : node.color);
    ctx.fill();
    ctx.strokeStyle = isHovered || isDragged ? '#93c5fd' : '#1e293b';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let displayText = node.name.length > 8 ? node.name.substring(0, 8) + '...' : node.name;
    ctx.fillText(displayText, node.x, node.y);
    
    if (isHovered) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '14px Segoe UI';
        ctx.fillText(node.name, node.x, node.y - node.radius - 20);
    }
}

function drawAnimationPaths() {
    animationPaths.forEach((path, idx) => {
        const progress = (animationTime + idx * 0.3) % 1;
        
        if (progress < 1) {
            const totalLen = path.reduce((sum, point, i) => {
                if (i === 0) return 0;
                return sum + distance(path[i - 1], point);
            }, 0);
            
            let targetDist = progress * totalLen;
            let currentDist = 0;
            let currentPoint = path[0];
            
            for (let i = 1; i < path.length; i++) {
                const segLen = distance(path[i - 1], path[i]);
                if (currentDist + segLen >= targetDist) {
                    const t = (targetDist - currentDist) / segLen;
                    currentPoint = {
                        x: path[i - 1].x + (path[i].x - path[i - 1].x) * t,
                        y: path[i - 1].y + (path[i].y - path[i - 1].y) * t
                    };
                    break;
                }
                currentDist += segLen;
            }
            
            ctx.beginPath();
            ctx.arc(currentPoint.x, currentPoint.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(239, 68, 68, ${1 - progress})`;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(currentPoint.x, currentPoint.y, 12 * (1 - progress), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 * (1 - progress)})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function findNodeAt(pos) {
    return nodes.find(node => distance(pos, node) <= node.radius);
}

function findEdgeAt(pos) {
    for (let edge of edges) {
        const n1 = nodes.find(n => n.id == edge.source);
        const n2 = nodes.find(n => n.id == edge.target);
        if (n1 && n2) {
            const distToLine = distanceToLine(pos, n1, n2);
            if (distToLine <= 10) {
                const minX = Math.min(n1.x, n2.x) - 10;
                const maxX = Math.max(n1.x, n2.x) + 10;
                const minY = Math.min(n1.y, n2.y) - 10;
                const maxY = Math.max(n1.y, n2.y) + 10;
                if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
                    return edge;
                }
            }
        }
    }
    return null;
}

function distanceToLine(p, a, b) {
    const numerator = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x);
    const denominator = Math.sqrt((b.y - a.y) ** 2 + (b.x - a.x) ** 2);
    return numerator / denominator;
}

function addAlert(path) {
    const pathNames = path.map(n => n.name).join(' → ');
    const alertItem = document.createElement('div');
    alertItem.className = 'alert-item';
    alertItem.innerHTML = `
        <div class="alert-path">越权路径: ${pathNames}</div>
        <div class="alert-time">${new Date().toLocaleTimeString()}</div>
    `;
    
    if (alertContent.querySelector('.no-alert')) {
        alertContent.innerHTML = '';
    }
    alertContent.insertBefore(alertItem, alertContent.firstChild);
    
    animationPaths.push(path.map(n => ({ x: n.x, y: n.y })));
    setTimeout(() => {
        const idx = animationPaths.indexOf(path);
        if (idx > -1) animationPaths.splice(idx, 1);
    }, 5000);
}

function findPaths(start, end, maxDepth = 5) {
    const paths = [];
    
    function dfs(current, target, visited, path) {
        if (path.length > maxDepth) return;
        if (current.id === target.id) {
            paths.push([...path]);
            return;
        }
        
        const nextNodes = [];
        edges.forEach(edge => {
            if (edge.source == current.id) {
                const next = nodes.find(n => n.id == edge.target);
                if (next && !visited.has(next.id)) {
                    nextNodes.push(next);
                }
            }
        });
        
        nextNodes.forEach(next => {
            visited.add(next.id);
            path.push(next);
            dfs(next, target, visited, path);
            path.pop();
            visited.delete(next.id);
        });
    }
    
    dfs(start, end, new Set([start.id]), [start]);
    return paths;
}

let lastClickTime = 0;
let lastClickNode = null;

canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e);
    draggedNode = findNodeAt(pos);
    isDragging = false;
});

canvas.addEventListener('mousemove', (e) => {
    const pos = getMousePos(e);
    hoveredNode = findNodeAt(pos);
    hoveredEdge = findEdgeAt(pos);
    
    if (draggedNode) {
        draggedNode.x = pos.x;
        draggedNode.y = pos.y;
        isDragging = true;
    }
});

canvas.addEventListener('mouseup', async (e) => {
    if (draggedNode) {
        const pos = getMousePos(e);
        const targetNode = findNodeAt(pos);
        
        if (targetNode && targetNode !== draggedNode) {
            const type1 = draggedNode.type;
            const type2 = targetNode.type;
            
            let assignType = null;
            let sourceId = null;
            let targetId = null;
            
            if (type1 === 'user' && type2 === 'role') {
                assignType = 'user-role';
                sourceId = draggedNode.id;
                targetId = targetNode.id;
            } else if (type1 === 'role' && type2 === 'permission') {
                assignType = 'role-permission';
                sourceId = draggedNode.id;
                targetId = targetNode.id;
            } else if (type2 === 'user' && type1 === 'role') {
                assignType = 'user-role';
                sourceId = targetNode.id;
                targetId = draggedNode.id;
            } else if (type2 === 'role' && type1 === 'permission') {
                assignType = 'role-permission';
                sourceId = targetNode.id;
                targetId = draggedNode.id;
            }
            
            if (assignType) {
                const existingEdge = edges.find(
                    e => (e.source == sourceId && e.target == targetId)
                );
                
                if (!existingEdge) {
                    edges.push({ source: sourceId, target: targetId });
                    await fetch('/api/assign', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sourceId, targetId, type: assignType })
                    });
                    
                    const users = nodes.filter(n => n.type === 'user');
                    const perms = nodes.filter(n => n.type === 'permission');
                    users.forEach(u => {
                        perms.forEach(p => {
                            const paths = findPaths(u, p);
                            if (paths.length > 0) {
                                addAlert(paths[0]);
                            }
                        });
                    });
                }
            }
        }
    }
    
    draggedNode = null;
});

canvas.addEventListener('dblclick', async (e) => {
    if (isDragging) return; // 如果是拖拽操作，不处理双击
    
    const pos = getMousePos(e);
    const node = findNodeAt(pos);
    
    if (node) {
        // 删除节点
        await fetch('/api/delete-node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: node.id, type: node.type })
        });
        
        // 从前端也移除该节点和相关边
        nodes = nodes.filter(n => n.id !== node.id);
        edges = edges.filter(e => e.source !== node.id && e.target !== node.id);
    }
});

canvas.addEventListener('click', async (e) => {
    if (hoveredEdge) {
        const idx = edges.indexOf(hoveredEdge);
        if (idx > -1) {
            edges.splice(idx, 1);
            
            const n1 = nodes.find(n => n.id == hoveredEdge.source);
            const n2 = nodes.find(n => n.id == hoveredEdge.target);
            const type = (n1?.type === 'user' && n2?.type === 'role') ? 'user-role' : 'role-permission';
            
            await fetch('/api/unassign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId: hoveredEdge.source,
                    targetId: hoveredEdge.target,
                    type
                })
            });
        }
    }
});

document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const scenario = btn.dataset.scenario;
        await fetch('/api/load-scenario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario })
        });
        await loadData();
        // 加载场景时不自动触发告警
    });
});

window.addEventListener('resize', () => {
    resizeCanvas();
});

resizeCanvas();
loadData();
draw();
