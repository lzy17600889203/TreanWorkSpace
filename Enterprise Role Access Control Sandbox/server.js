const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 内存中的数据存储
let state = {
  users: [],
  roles: [],
  permissions: [],
  user_roles: [],
  role_permissions: []
};

let idCounter = 1;

const initData = () => {
  state = {
    users: [
      { id: idCounter++, name: 'Admin', type: 'user', color: '#FF6B6B' },
      { id: idCounter++, name: 'Alice', type: 'user', color: '#4ECDC4' },
      { id: idCounter++, name: 'Bob', type: 'user', color: '#4ECDC4' },
      { id: idCounter++, name: 'Charlie', type: 'user', color: '#4ECDC4' }
    ],
    roles: [
      { id: idCounter++, name: 'Super Admin', type: 'role', color: '#FFE66D' },
      { id: idCounter++, name: 'Editor', type: 'role', color: '#FFE66D' },
      { id: idCounter++, name: 'Viewer', type: 'role', color: '#FFE66D' }
    ],
    permissions: [
      { id: idCounter++, name: 'Read', type: 'permission', color: '#FF6B6B' },
      { id: idCounter++, name: 'Write', type: 'permission', color: '#FF6B6B' },
      { id: idCounter++, name: 'Delete', type: 'permission', color: '#FF6B6B' },
      { id: idCounter++, name: 'Manage', type: 'permission', color: '#FF6B6B' }
    ],
    user_roles: [
      { user_id: 1, role_id: 5 },
      { user_id: 2, role_id: 6 },
      { user_id: 3, role_id: 7 }
    ],
    role_permissions: [
      { role_id: 5, permission_id: 9 },
      { role_id: 5, permission_id: 10 },
      { role_id: 5, permission_id: 11 },
      { role_id: 5, permission_id: 12 },
      { role_id: 6, permission_id: 9 },
      { role_id: 6, permission_id: 10 },
      { role_id: 7, permission_id: 9 }
    ]
  };
};

initData();

app.get('/api/data', (req, res) => {
  const users = state.users.map(u => ({ ...u }));
  const roles = state.roles.map(r => ({ ...r }));
  const permissions = state.permissions.map(p => ({ ...p }));
  
  res.json({
    nodes: [...users, ...roles, ...permissions],
    edges: [
      ...state.user_roles.map(ur => ({ source: ur.user_id, target: `role_${ur.role_id}` })),
      ...state.role_permissions.map(rp => ({ source: `role_${rp.role_id}`, target: `perm_${rp.permission_id}` }))
    ]
  });
});

app.post('/api/assign', (req, res) => {
  const { sourceId, targetId, type } = req.body;
  
  if (type === 'user-role') {
    const userId = Number(sourceId);
    const roleId = Number(targetId.replace('role_', ''));
    const exists = state.user_roles.some(ur => ur.user_id === userId && ur.role_id === roleId);
    if (!exists) {
      state.user_roles.push({ user_id: userId, role_id: roleId });
    }
  } else if (type === 'role-permission') {
    const roleId = Number(sourceId.replace('role_', ''));
    const permId = Number(targetId.replace('perm_', ''));
    const exists = state.role_permissions.some(rp => rp.role_id === roleId && rp.permission_id === permId);
    if (!exists) {
      state.role_permissions.push({ role_id: roleId, permission_id: permId });
    }
  }
  
  res.json({ success: true });
});

app.post('/api/unassign', (req, res) => {
  const { sourceId, targetId, type } = req.body;
  
  if (type === 'user-role') {
    const userId = Number(sourceId);
    const roleId = Number(targetId.replace('role_', ''));
    state.user_roles = state.user_roles.filter(ur => !(ur.user_id === userId && ur.role_id === roleId));
  } else if (type === 'role-permission') {
    const roleId = Number(sourceId.replace('role_', ''));
    const permId = Number(targetId.replace('perm_', ''));
    state.role_permissions = state.role_permissions.filter(rp => !(rp.role_id === roleId && rp.permission_id === permId));
  }
  
  res.json({ success: true });
});

app.post('/api/load-scenario', (req, res) => {
    const { scenario } = req.body;
    loadScenario(scenario);
    res.json({ success: true });
});

app.post('/api/delete-node', (req, res) => {
    const { id, type } = req.body;
    let numericId;
    
    if (type === 'user') {
        numericId = Number(id);
        state.users = state.users.filter(u => u.id !== numericId);
        state.user_roles = state.user_roles.filter(ur => ur.user_id !== numericId);
    } else if (type === 'role') {
        numericId = Number(id.replace('role_', ''));
        state.roles = state.roles.filter(r => r.id !== numericId);
        state.user_roles = state.user_roles.filter(ur => ur.role_id !== numericId);
        state.role_permissions = state.role_permissions.filter(rp => rp.role_id !== numericId);
    } else if (type === 'permission') {
        numericId = Number(id.replace('perm_', ''));
        state.permissions = state.permissions.filter(p => p.id !== numericId);
        state.role_permissions = state.role_permissions.filter(rp => rp.permission_id !== numericId);
    }
    
    res.json({ success: true });
});

const loadScenario = (scenario) => {
  idCounter = 1;
  state = {
    users: [],
    roles: [],
    permissions: [],
    user_roles: [],
    role_permissions: []
  };
  
  switch(scenario) {
    case 'star':
      state.users.push({ id: idCounter++, name: '超级管理员', type: 'user', color: '#FF6B6B' });
      for(let i = 1; i <= 10; i++) {
        state.users.push({ id: idCounter++, name: `用户${i}`, type: 'user', color: '#4ECDC4' });
      }
      state.roles.push({ id: idCounter++, name: '全局管理员', type: 'role', color: '#FFE66D' });
      state.permissions.push({ id: idCounter++, name: '全部权限', type: 'permission', color: '#FF6B6B' });
      
      state.user_roles.push({ user_id: 1, role_id: 12 });
      state.role_permissions.push({ role_id: 12, permission_id: 13 });
      break;
      
    case 'ghost':
      state.users.push({ id: idCounter++, name: '在职员工A', type: 'user', color: '#4ECDC4' });
      state.users.push({ id: idCounter++, name: '在职员工B', type: 'user', color: '#4ECDC4' });
      state.users.push({ id: idCounter++, name: '离职员工X', type: 'user', color: '#999999' });
      state.roles.push({ id: idCounter++, name: '普通员工', type: 'role', color: '#FFE66D' });
      state.roles.push({ id: idCounter++, name: '财务审批', type: 'role', color: '#FFE66D' });
      state.permissions.push({ id: idCounter++, name: '日常操作', type: 'permission', color: '#FF6B6B' });
      state.permissions.push({ id: idCounter++, name: '财务审批权', type: 'permission', color: '#FF6B6B' });
      
      state.user_roles.push({ user_id: 1, role_id: 4 });
      state.user_roles.push({ user_id: 2, role_id: 4 });
      state.user_roles.push({ user_id: 3, role_id: 4 });
      state.user_roles.push({ user_id: 3, role_id: 5 });
      state.role_permissions.push({ role_id: 4, permission_id: 6 });
      state.role_permissions.push({ role_id: 5, permission_id: 7 });
      break;
      
    case 'temp':
      state.users.push({ id: idCounter++, name: '管理员', type: 'user', color: '#FF6B6B' });
      state.users.push({ id: idCounter++, name: '临时员工', type: 'user', color: '#FFD700' });
      state.roles.push({ id: idCounter++, name: '超级管理员', type: 'role', color: '#FFE66D' });
      state.roles.push({ id: idCounter++, name: '访客', type: 'role', color: '#FFE66D' });
      state.permissions.push({ id: idCounter++, name: '管理权限', type: 'permission', color: '#FF6B6B' });
      state.permissions.push({ id: idCounter++, name: '只读权限', type: 'permission', color: '#FF6B6B' });
      
      state.user_roles.push({ user_id: 1, role_id: 3 });
      state.user_roles.push({ user_id: 2, role_id: 3 });
      state.user_roles.push({ user_id: 2, role_id: 4 });
      state.role_permissions.push({ role_id: 3, permission_id: 5 });
      state.role_permissions.push({ role_id: 4, permission_id: 6 });
      break;
      
    case 'maze':
      const depts = ['技术部', '产品部', '市场部', '财务部'];
      const rolesList = ['开发', '测试', '产品经理', '设计师', '运营', '会计'];
      const permsList = ['代码提交', '代码审核', '需求管理', '设计评审', '营销投放', '预算审批'];
      
      depts.forEach(d => state.users.push({ id: idCounter++, name: d, type: 'user', color: '#4ECDC4' }));
      rolesList.forEach(r => state.roles.push({ id: idCounter++, name: r, type: 'role', color: '#FFE66D' }));
      permsList.forEach(p => state.permissions.push({ id: idCounter++, name: p, type: 'permission', color: '#FF6B6B' }));
      
      for(let u = 1; u <= 4; u++) {
        for(let r = 1; r <= 3; r++) {
          state.user_roles.push({ user_id: u, role_id: 4 + r });
        }
      }
      for(let r = 1; r <= 6; r++) {
        for(let p = 1; p <= 3; p++) {
          state.role_permissions.push({ role_id: 4 + r, permission_id: 10 + p });
        }
      }
      break;
  }
};

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
