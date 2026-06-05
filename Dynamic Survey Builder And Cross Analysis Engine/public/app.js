let surveyTitle = '用户满意度调查';
let questions = [];
let currentSurveyId = null;
let editingQuestionIndex = null;

const demoSurvey1 = {
    title: '用户满意度与年龄交叉分析',
    structure: [
        {
            id: 1,
            type: 'radio',
            title: '您的年龄段是？',
            options: ['18-25岁', '26-35岁', '36-45岁', '46岁以上'],
            jumpLogic: []
        },
        {
            id: 2,
            type: 'radio',
            title: '您对我们产品的整体满意度如何？',
            options: ['非常满意', '满意', '一般', '不满意', '非常不满意'],
            jumpLogic: [
                { optionValue: '非常不满意', targetQuestion: 4 }
            ]
        },
        {
            id: 3,
            type: 'checkbox',
            title: '您最喜欢产品的哪些功能？（可多选）',
            options: ['界面设计', '功能实用性', '性能速度', '售后服务'],
            jumpLogic: []
        },
        {
            id: 4,
            type: 'matrix',
            title: '请对以下方面进行评分：',
            rows: ['易用性', '稳定性', '创新性'],
            columns: ['很差', '较差', '一般', '良好', '优秀'],
            jumpLogic: []
        }
    ]
};

const demoSurvey2 = {
    title: '产品使用习惯调查',
    structure: [
        {
            id: 1,
            type: 'radio',
            title: '您使用本产品的频率是？',
            options: ['每天', '每周几次', '每月几次', '很少'],
            jumpLogic: []
        },
        {
            id: 2,
            type: 'radio',
            title: '您会向朋友推荐本产品吗？',
            options: ['肯定会', '可能会', '不确定', '可能不会', '肯定不会'],
            jumpLogic: []
        },
        {
            id: 3,
            type: 'checkbox',
            title: '您使用过哪些功能？（可多选）',
            options: ['基础功能', '高级功能', '定制服务', 'API接口'],
            jumpLogic: []
        }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    initDragAndDrop();
    initNavigation();
    initModal();
    loadDemoSurvey1();
});

function initDragAndDrop() {
    const components = document.querySelectorAll('.component-item');
    const canvas = document.getElementById('canvas');

    components.forEach(comp => {
        // 点击添加题目
        comp.addEventListener('click', () => {
            addQuestion(comp.dataset.type);
        });
        
        // 拖拽添加题目
        comp.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('type', comp.dataset.type);
        });
    });

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvas.classList.add('drag-over');
    });

    canvas.addEventListener('dragleave', () => {
        canvas.classList.remove('drag-over');
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        canvas.classList.remove('drag-over');
        const type = e.dataTransfer.getData('type');
        if (type) addQuestion(type);
    });
}

function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(btn.dataset.tab).classList.add('active');

            if (btn.dataset.tab === 'preview') {
                renderPreview();
            } else if (btn.dataset.tab === 'dashboard') {
                initDashboard();
            }
        });
    });

    document.getElementById('saveSurvey').addEventListener('click', saveSurvey);
    document.getElementById('clearSurvey').addEventListener('click', clearSurvey);
    document.getElementById('loadDemo1').addEventListener('click', loadDemoSurvey1);
    document.getElementById('loadDemo2').addEventListener('click', loadDemoSurvey2);
}

function loadDemoSurvey1() {
    surveyTitle = demoSurvey1.title;
    questions = JSON.parse(JSON.stringify(demoSurvey1.structure));
    document.getElementById('surveyTitle').value = surveyTitle;
    renderCanvas();
}

function loadDemoSurvey2() {
    surveyTitle = demoSurvey2.title;
    questions = JSON.parse(JSON.stringify(demoSurvey2.structure));
    document.getElementById('surveyTitle').value = surveyTitle;
    renderCanvas();
}

function clearSurvey() {
    if (confirm('确定要清空所有题目吗？')) {
        questions = [];
        currentSurveyId = null;
        renderCanvas();
    }
}

function addQuestion(type) {
    const id = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    const question = {
        id,
        type,
        title: type === 'radio' ? '请输入单选题标题' : 
               type === 'checkbox' ? '请输入多选题标题' : '请输入矩阵题标题',
        options: type !== 'matrix' ? ['选项1', '选项2', '选项3'] : undefined,
        rows: type === 'matrix' ? ['行1', '行2'] : undefined,
        columns: type === 'matrix' ? ['列1', '列2', '列3'] : undefined,
        jumpLogic: []
    };
    questions.push(question);
    renderCanvas();
    // 添加后自动打开编辑弹窗，方便用户立即编辑
    editQuestion(questions.length - 1);
}

function renderCanvas() {
    const canvas = document.getElementById('canvas');
    canvas.innerHTML = '';
    
    if (questions.length === 0) {
        canvas.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
                <h3 style="color: #666; margin-bottom: 10px;">问卷还是空的</h3>
                <p>点击左侧「新增题目」按钮添加题目，开始创建您的问卷吧！</p>
            </div>
        `;
        return;
    }
    
    questions.forEach((q, index) => {
        const div = document.createElement('div');
        div.className = 'question-item';
        
        let typeLabel = q.type === 'radio' ? '单选题' : 
                       q.type === 'checkbox' ? '多选题' : '矩阵题';
        
        let optionsHtml = '';
        if (q.type === 'matrix') {
            optionsHtml = `<ul class="question-options"><li>行：${q.rows.join(', ')}</li><li>列：${q.columns.join(', ')}</li></ul>`;
        } else {
            optionsHtml = `<ul class="question-options">${q.options.map(o => `<li>${o}</li>`).join('')}</ul>`;
        }
        
        let jumpLogicHtml = '';
        if (q.jumpLogic && q.jumpLogic.length > 0) {
            jumpLogicHtml = `<p style="margin-top:10px;color:#667eea;font-size:13px;">🔀 跳转逻辑：${q.jumpLogic.map(j => `选"${j.optionValue}"跳至题${j.targetQuestion}`).join('；')}</p>`;
        }
        
        div.innerHTML = `
            <div class="question-item-header">
                <h4>Q${index + 1} [${typeLabel}] ${q.title}</h4>
                <div class="question-actions">
                    <button class="btn-edit" onclick="editQuestion(${index})">编辑</button>
                    <button class="btn-delete" onclick="deleteQuestion(${index})">删除</button>
                </div>
            </div>
            ${optionsHtml}
            ${jumpLogicHtml}
        `;
        canvas.appendChild(div);
    });
}

function deleteQuestion(index) {
    questions.splice(index, 1);
    renderCanvas();
}

function initModal() {
    const modal = document.getElementById('questionModal');
    document.querySelector('.close').addEventListener('click', () => {
        modal.classList.remove('show');
    });
    document.getElementById('cancelModal').addEventListener('click', () => {
        modal.classList.remove('show');
    });
    document.getElementById('saveQuestion').addEventListener('click', saveEditedQuestion);
}

function editQuestion(index) {
    editingQuestionIndex = index;
    const q = questions[index];
    const modal = document.getElementById('questionModal');
    const modalBody = document.getElementById('modalBody');
    document.getElementById('modalTitle').textContent = '编辑题目';
    
    let optionsEditor = '';
    if (q.type === 'matrix') {
        optionsEditor = `
            <div class="form-group">
                <label>行标题（每行一个）：</label>
                <textarea id="matrixRows" rows="3">${q.rows.join('\n')}</textarea>
            </div>
            <div class="form-group">
                <label>列标题（每列一个）：</label>
                <textarea id="matrixColumns" rows="3">${q.columns.join('\n')}</textarea>
            </div>
        `;
    } else {
        optionsEditor = `
            <div class="form-group">
                <label>选项：</label>
                <div class="option-editor" id="optionsEditor">
                    ${q.options.map((opt, i) => `
                        <div class="option-editor-item">
                            <input type="text" class="option-input" value="${opt}">
                            <button onclick="this.parentElement.remove()">删除</button>
                        </div>
                    `).join('')}
                </div>
                <button class="add-option-btn" onclick="addOptionInput()">+ 添加选项</button>
            </div>
        `;
    }
    
    let jumpLogicEditor = `
        <div class="form-group">
            <label>跳转逻辑（可选）：</label>
            <div id="jumpLogicEditor">
                ${(q.jumpLogic || []).map((jl, i) => renderJumpLogicItem(jl, i)).join('')}
            </div>
            <button class="add-option-btn" onclick="addJumpLogic()" style="margin-top:10px;">+ 添加跳转规则</button>
        </div>
    `;
    
    modalBody.innerHTML = `
        <div class="form-group">
            <label>题目标题：</label>
            <input type="text" id="questionTitle" value="${q.title}">
        </div>
        ${optionsEditor}
        ${jumpLogicEditor}
    `;
    
    modal.classList.add('show');
    updateJumpLogicSelects();
}

function renderJumpLogicItem(jl, index) {
    const availableOptions = getCurrentQuestionOptions();
    const availableQuestions = questions.map((q, i) => `<option value="${q.id}" ${jl && jl.targetQuestion === q.id ? 'selected' : ''}>第${i+1}题</option>`).join('');
    return `
        <div class="option-editor-item" style="margin-top:8px;">
            <span>当选择</span>
            <select class="jump-option">
                ${availableOptions.map(o => `<option value="${o}" ${jl && jl.optionValue === o ? 'selected' : ''}>${o}</option>`).join('')}
            </select>
            <span>时，跳转到</span>
            <select class="jump-target">
                ${availableQuestions}
            </select>
            <button onclick="this.parentElement.remove()">删除</button>
        </div>
    `;
}

function getCurrentQuestionOptions() {
    if (editingQuestionIndex === null) return [];
    const q = questions[editingQuestionIndex];
    return q.type === 'matrix' ? q.rows : (q.options || []);
}

function updateJumpLogicSelects() {
}

function addOptionInput() {
    const editor = document.getElementById('optionsEditor');
    const div = document.createElement('div');
    div.className = 'option-editor-item';
    div.innerHTML = `<input type="text" class="option-input" placeholder="新选项"><button onclick="this.parentElement.remove()">删除</button>`;
    editor.appendChild(div);
}

function addJumpLogic() {
    const editor = document.getElementById('jumpLogicEditor');
    const div = document.createElement('div');
    div.innerHTML = renderJumpLogicItem(null, 0);
    editor.appendChild(div);
    updateJumpLogicSelects();
}

function saveEditedQuestion() {
    const q = questions[editingQuestionIndex];
    q.title = document.getElementById('questionTitle').value;
    
    if (q.type === 'matrix') {
        q.rows = document.getElementById('matrixRows').value.split('\n').filter(x => x.trim());
        q.columns = document.getElementById('matrixColumns').value.split('\n').filter(x => x.trim());
    } else {
        q.options = Array.from(document.querySelectorAll('.option-input')).map(i => i.value).filter(x => x.trim());
    }
    
    q.jumpLogic = [];
    const jumpItems = document.querySelectorAll('#jumpLogicEditor .option-editor-item');
    jumpItems.forEach(item => {
        const optionValue = item.querySelector('.jump-option').value;
        const targetQuestion = parseInt(item.querySelector('.jump-target').value);
        q.jumpLogic.push({ optionValue, targetQuestion });
    });
    
    document.getElementById('questionModal').classList.remove('show');
    renderCanvas();
}

async function saveSurvey() {
    surveyTitle = document.getElementById('surveyTitle').value;
    const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: surveyTitle, structure: questions })
    });
    const data = await res.json();
    currentSurveyId = data.id;
    alert('问卷保存成功！ID: ' + data.id);
}

let previewAnswers = {};

function renderPreview() {
    document.getElementById('previewTitle').textContent = surveyTitle;
    const container = document.getElementById('previewForm');
    container.innerHTML = '';
    previewAnswers = {};

    questions.forEach((q, index) => {
        const div = document.createElement('div');
        div.className = 'preview-question';
        div.id = `preview-q${q.id}`;
        let html = `<h4>Q${index + 1} ${q.title}</h4>`;

        if (q.type === 'radio') {
            html += `<div class="option-group">${q.options.map((opt, i) => `
                <label><input type="radio" name="q${q.id}" value="${opt}" onchange="handleAnswer(${q.id}, '${opt}')"> ${opt}</label>
            `).join('')}</div>`;
        } else if (q.type === 'checkbox') {
            html += `<div class="option-group">${q.options.map((opt, i) => `
                <label><input type="checkbox" value="${opt}" onchange="handleCheckbox(${q.id}, '${opt}', this.checked)"> ${opt}</label>
            `).join('')}</div>`;
        } else if (q.type === 'matrix') {
            html += `<table class="matrix-table"><thead><tr><th></th>${q.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
            q.rows.forEach((row, ri) => {
                html += `<tr><td>${row}</td>`;
                q.columns.forEach((col, ci) => {
                    html += `<td><input type="radio" name="matrix-${q.id}-${ri}" value="${col}" onchange="handleMatrix(${q.id}, ${ri}, '${col}')"></td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table>`;
        }

        div.innerHTML = html;
        container.appendChild(div);
    });

    document.getElementById('submitPreview').onclick = submitAnswers;
}

function handleAnswer(qid, value) {
    previewAnswers[qid] = value;
    // 清除当前题目的高亮
    const el = document.getElementById(`preview-q${qid}`);
    if (el) el.style.borderLeft = '';
    applyJumpLogic();
}

function handleCheckbox(qid, value, checked) {
    if (!previewAnswers[qid]) previewAnswers[qid] = [];
    if (checked) {
        if (!previewAnswers[qid].includes(value)) previewAnswers[qid].push(value);
    } else {
        previewAnswers[qid] = previewAnswers[qid].filter(v => v !== value);
    }
    // 清除当前题目的高亮
    const el = document.getElementById(`preview-q${qid}`);
    if (el) el.style.borderLeft = '';
}

function handleMatrix(qid, rowIndex, value) {
    if (!previewAnswers[qid]) previewAnswers[qid] = {};
    previewAnswers[qid][rowIndex] = value;
    // 清除当前题目的高亮
    const el = document.getElementById(`preview-q${qid}`);
    if (el) el.style.borderLeft = '';
}

function applyJumpLogic() {
    const visibleIds = new Set(questions.map(q => q.id));
    
    questions.forEach(q => {
        if (q.jumpLogic && q.jumpLogic.length > 0 && previewAnswers[q.id]) {
            const answer = previewAnswers[q.id];
            const rule = q.jumpLogic.find(jl => jl.optionValue === answer);
            if (rule) {
                const qIndex = questions.findIndex(x => x.id === q.id);
                const targetIndex = questions.findIndex(x => x.id === rule.targetQuestion);
                for (let i = qIndex + 1; i < targetIndex; i++) {
                    visibleIds.delete(questions[i].id);
                }
            }
        }
    });

    questions.forEach(q => {
        const el = document.getElementById(`preview-q${q.id}`);
        if (el) {
            if (visibleIds.has(q.id)) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });
}

// 获取当前可见的题目列表（考虑跳转逻辑）
function getVisibleQuestions() {
    const visibleIds = new Set(questions.map(q => q.id));
    
    questions.forEach(q => {
        if (q.jumpLogic && q.jumpLogic.length > 0 && previewAnswers[q.id]) {
            const answer = previewAnswers[q.id];
            const rule = q.jumpLogic.find(jl => jl.optionValue === answer);
            if (rule) {
                const qIndex = questions.findIndex(x => x.id === q.id);
                const targetIndex = questions.findIndex(x => x.id === rule.targetQuestion);
                for (let i = qIndex + 1; i < targetIndex; i++) {
                    visibleIds.delete(questions[i].id);
                }
            }
        }
    });
    
    return questions.filter(q => visibleIds.has(q.id));
}

// 验证是否所有可见题目都已完成
function validateAnswers() {
    const visibleQuestions = getVisibleQuestions();
    const incompleteQuestions = [];
    
    visibleQuestions.forEach((q, idx) => {
        const answer = previewAnswers[q.id];
        let isComplete = false;
        
        if (q.type === 'radio') {
            isComplete = answer !== undefined && answer !== '';
        } else if (q.type === 'checkbox') {
            isComplete = Array.isArray(answer) && answer.length > 0;
        } else if (q.type === 'matrix') {
            // 矩阵题需要所有行都有答案
            if (answer && typeof answer === 'object') {
                const rowCount = q.rows.length;
                let answeredRows = 0;
                for (let i = 0; i < rowCount; i++) {
                    if (answer[i] !== undefined) answeredRows++;
                }
                isComplete = answeredRows === rowCount;
            }
        }
        
        if (!isComplete) {
            incompleteQuestions.push({
                index: idx + 1,
                title: q.title,
                type: q.type
            });
        }
    });
    
    return incompleteQuestions;
}

// 高亮显示未完成的题目
function highlightIncompleteQuestions(incomplete) {
    // 清除之前的高亮
    document.querySelectorAll('.preview-question').forEach(el => {
        el.style.borderLeft = '';
    });
    
    // 高亮未完成的
    incomplete.forEach(item => {
        const qObj = questions.find(q => q.title === item.title);
        if (qObj) {
            const el = document.getElementById(`preview-q${qObj.id}`);
            if (el) {
                el.style.borderLeft = '4px solid #ff6b6b';
            }
        }
    });
}

async function submitAnswers() {
    if (!currentSurveyId) {
        alert('请先保存问卷！');
        return;
    }
    
    const incomplete = validateAnswers();
    
    if (incomplete.length > 0) {
        // 构建提示信息
        let msg = '您还有以下题目未完成：\n\n';
        incomplete.forEach((item, i) => {
            msg += `${i + 1}. Q${item.index}: ${item.title}\n`;
        });
        msg += '\n请完成所有题目后再提交！';
        
        alert(msg);
        highlightIncompleteQuestions(incomplete);
        return;
    }
    
    await fetch(`/api/surveys/${currentSurveyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: previewAnswers })
    });
    alert('答案提交成功！');
}

let responses = [];

async function initDashboard() {
    if (!currentSurveyId) {
        alert('请先保存问卷并提交一些答案！');
        return;
    }
    
    const res = await fetch(`/api/surveys/${currentSurveyId}/responses`);
    responses = await res.json();
    
    updateDimensionSelects();
    
    document.getElementById('xDimension').onchange = renderHeatmap;
    document.getElementById('yDimension').onchange = renderHeatmap;
    document.getElementById('demoMode').onchange = renderHeatmap;
    
    renderHeatmap();
}

function updateDimensionSelects() {
    const xSelect = document.getElementById('xDimension');
    const ySelect = document.getElementById('yDimension');
    xSelect.innerHTML = '';
    ySelect.innerHTML = '';
    
    questions.forEach((q, i) => {
        if (q.type !== 'matrix') {
            xSelect.innerHTML += `<option value="${q.id}">Q${i+1}: ${q.title}</option>`;
            ySelect.innerHTML += `<option value="${q.id}">Q${i+1}: ${q.title}</option>`;
        }
    });
    
    if (questions.length > 1) {
        ySelect.selectedIndex = 1;
    }
}

function generateDemoData(mode, xQ, yQ) {
    const data = [];
    const xOpts = xQ.options;
    const yOpts = yQ.options;
    let count = 0;
    
    if (mode === 'concentrated') {
        count = 200;
        for (let i = 0; i < count; i++) {
            let x = 0, y = 0;
            if (Math.random() < 0.7) {
                x = 0;
                y = 0;
            } else {
                x = Math.floor(Math.random() * xOpts.length);
                y = Math.floor(Math.random() * yOpts.length);
            }
            data.push({ x: xOpts[x], y: yOpts[y] });
        }
    } else if (mode === 'diverse') {
        count = 200;
        for (let i = 0; i < count; i++) {
            data.push({
                x: xOpts[Math.floor(Math.random() * xOpts.length)],
                y: yOpts[Math.floor(Math.random() * yOpts.length)]
            });
        }
    } else if (mode === 'low') {
        count = 30;
        for (let i = 0; i < count; i++) {
            data.push({
                x: xOpts[Math.floor(Math.random() * xOpts.length)],
                y: yOpts[Math.floor(Math.random() * yOpts.length)]
            });
        }
    }
    
    return { data, count };
}

function renderHeatmap() {
    const xQ = questions.find(q => q.id == document.getElementById('xDimension').value);
    const yQ = questions.find(q => q.id == document.getElementById('yDimension').value);
    const mode = document.getElementById('demoMode').value;

    if (!xQ || !yQ || xQ.type === 'matrix' || yQ.type === 'matrix') return;

    const xOpts = xQ.options;
    const yOpts = yQ.options;

    let data = [];
    let totalCount = 0;

    if (mode === 'real') {
        responses.forEach(r => {
            const xv = r.answers[xQ.id];
            const yv = r.answers[yQ.id];
            if (xv && yv) {
                if (Array.isArray(xv)) {
                    xv.forEach(x => data.push({ x, y: yv }));
                } else {
                    data.push({ x: xv, y: yv });
                }
            }
        });
        totalCount = responses.length;
    } else {
        const demo = generateDemoData(mode, xQ, yQ);
        data = demo.data;
        totalCount = demo.count;
    }

    const matrix = {};
    yOpts.forEach(y => {
        matrix[y] = {};
        xOpts.forEach(x => matrix[y][x] = 0);
    });

    data.forEach(d => {
        if (matrix[d.y] && matrix[d.y][d.x] !== undefined) {
            matrix[d.y][d.x]++;
        }
    });

    const canvas = document.getElementById('heatmap');
    const ctx = canvas.getContext('2d');
    const cellSize = 80;
    const padding = { top: 60, left: 120, right: 30, bottom: 50 };
    
    canvas.width = padding.left + xOpts.length * cellSize + padding.right;
    canvas.height = padding.top + yOpts.length * cellSize + padding.bottom;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Segoe UI';
    ctx.textAlign = 'center';
    xOpts.forEach((opt, i) => {
        ctx.save();
        ctx.translate(padding.left + i * cellSize + cellSize/2, 40);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(opt, 0, 0);
        ctx.restore();
    });
    
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yOpts.forEach((opt, i) => {
        ctx.fillText(opt, padding.left - 15, padding.top + i * cellSize + cellSize/2);
    });

    let maxCount = 1;
    yOpts.forEach(y => {
        xOpts.forEach(x => {
            maxCount = Math.max(maxCount, matrix[y][x]);
        });
    });

    yOpts.forEach((y, yi) => {
        xOpts.forEach((x, xi) => {
            const value = matrix[y][x];
            const intensity = maxCount > 0 ? value / maxCount : 0;
            
            const r = Math.floor(255 * intensity);
            const g = Math.floor(255 * (1 - intensity) * 0.3);
            const b = Math.floor(255 * (1 - intensity) * 0.3);
            
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(
                padding.left + xi * cellSize,
                padding.top + yi * cellSize,
                cellSize - 2,
                cellSize - 2
            );
            
            ctx.fillStyle = intensity > 0.5 ? 'white' : '#333';
            ctx.font = '16px Segoe UI';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                value,
                padding.left + xi * cellSize + cellSize/2,
                padding.top + yi * cellSize + cellSize/2
            );
        });
    });

    renderLegend(maxCount);
    
    const warning = document.getElementById('sampleWarning');
    if (totalCount < 50) {
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }
}

function renderLegend(maxCount) {
    const legend = document.getElementById('heatmapLegend');
    legend.innerHTML = '';
    
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const intensity = i / steps;
        const r = Math.floor(255 * intensity);
        const g = Math.floor(255 * (1 - intensity) * 0.3);
        const b = Math.floor(255 * (1 - intensity) * 0.3);
        
        const div = document.createElement('div');
        div.className = 'legend-item';
        div.innerHTML = `
            <div class="legend-color" style="background: rgb(${r},${g},${b})"></div>
            <span>${Math.round(intensity * maxCount)}</span>
        `;
        legend.appendChild(div);
    }
}
