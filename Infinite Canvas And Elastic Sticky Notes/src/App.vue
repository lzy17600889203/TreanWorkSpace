<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import Konva from 'konva'
import { playWhoosh, playSnap } from './utils/audio.js'

// ======== 状态 ========
const containerRef = ref(null)
const stageRef = ref(null)
let mainLayer = null
let bgLayer = null
let gridGroup = null
let starsGroup = null
let starsLayer = null

// 便签与连线数据
const notes = ref([]) // {id, x, y, color, text, group}
const connections = ref([]) // {id, from, to, line}
const pendingFrom = ref(null) // 待连线起点 id
const pendingFromId = computed(() => pendingFrom.value)

// 主题
const isNight = ref(false)
watch(isNight, (v) => {
  if (v) document.body.classList.add('night')
  else document.body.classList.remove('night')
  redrawBackground()
})

// 画布视口
const viewport = ref({ x: 0, y: 0, scale: 1 })

// 预设颜色（便签 + 霓虹色）
const COLOR_PALETTES = [
  { fill: '#FFD66B', night: '#FFC857', glow: '#FFE58A' },
  { fill: '#FF9AA2', night: '#FF7A86', glow: '#FFB3BA' },
  { fill: '#B5EAD7', night: '#8CE0C3', glow: '#BFF2DC' },
  { fill: '#C7CEEA', night: '#A8B0D8', glow: '#D4DAF2' },
  { fill: '#FFDAC1', night: '#FFBE9A', glow: '#FFE3CF' },
  { fill: '#E2F0CB', night: '#C8E3A8', glow: '#EEF5D9' },
]

// 可拖动状态
let dragInfo = null // {type:'canvas'|'note', ...}
let mouseInside = false

// 弹性动画相关
let springAnimations = new Map() // id -> {animation, values}
let lastFrameTime = 0
const ANIM_SPRING_K = 0.18 // 弹性系数
const ANIM_SPRING_DAMP = 0.72 // 阻尼
const ANIM_TARGET_LERP = 0.08

// ======== 工具函数 ========
function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3)
}

function getPointerPos() {
  const stage = stageRef.value
  if (!stage) return { x: 0, y: 0 }
  const pos = stage.getPointerPosition()
  return pos || { x: 0, y: 0 }
}

function screenToWorld(sx, sy) {
  const stage = stageRef.value
  const scale = stage.scaleX()
  return {
    x: (sx - stage.x()) / scale,
    y: (sy - stage.y()) / scale,
  }
}

// ======== 初始化 Konva 舞台 ========
onMounted(() => {
  const container = containerRef.value
  const width = window.innerWidth
  const height = window.innerHeight

  stageRef.value = new Konva.Stage({
    container,
    width,
    height,
    draggable: false,
  })

  // 背景层（网格、星空）
  bgLayer = new Konva.Layer()
  stageRef.value.add(bgLayer)

  starsLayer = new Konva.Layer()
  stageRef.value.add(starsLayer)

  // 主层（便签 + 连线）
  mainLayer = new Konva.Layer()
  stageRef.value.add(mainLayer)

  // 先画初始背景
  redrawBackground()

  // 预置几个便签，展示效果
  const preset = [
    { x: width / 2 - 220, y: height / 2 - 60, text: '整理想法 ✨', colorIdx: 0 },
    { x: width / 2 + 40, y: height / 2 - 120, text: '做个小计划', colorIdx: 1 },
    { x: width / 2 - 100, y: height / 2 + 100, text: '随时灵感 💡', colorIdx: 2 },
  ]
  preset.forEach((p) => {
    const palette = COLOR_PALETTES[p.colorIdx]
    addNoteAt(p.x, p.y, palette, p.text)
  })

  // 事件：窗口尺寸变化
  window.addEventListener('resize', handleResize)

  // 舞台事件 - 拖动平移、滚轮缩放
  stageRef.value.on('mousedown', handleStageMouseDown)
  stageRef.value.on('mousemove', handleStageMouseMove)
  stageRef.value.on('mouseup', handleStageMouseUp)
  stageRef.value.on('mouseleave', handleStageMouseUp)
  stageRef.value.on('wheel', handleWheel, { passive: false })
  stageRef.value.on('click tap', handleStageClick)

  // 开启弹性动画帧循环
  lastFrameTime = performance.now()
  startSpringLoop()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (stageRef.value) stageRef.value.destroy()
  if (springLoopRAF) cancelAnimationFrame(springLoopRAF)
})

function handleResize() {
  if (!stageRef.value) return
  stageRef.value.width(window.innerWidth)
  stageRef.value.height(window.innerHeight)
  redrawBackground()
}

// ======== 背景绘制（网格 & 星空） ========
function redrawBackground() {
  if (!stageRef.value) return
  // 清除旧内容
  bgLayer.destroyChildren()
  starsLayer.destroyChildren()
  gridGroup = null
  starsGroup = null

  if (isNight.value) {
    drawStars()
  } else {
    drawGrid()
  }
  bgLayer.batchDraw()
  starsLayer.batchDraw()
}

function drawGrid() {
  gridGroup = new Konva.Group()
  const stage = stageRef.value
  const w = stage.width()
  const h = stage.height()
  // 淡色大背景矩形
  const bg = new Konva.Rect({
    x: 0,
    y: 0,
    width: w,
    height: h,
    fill: '#f5f1e8',
    listening: false,
  })
  gridGroup.add(bg)

  // 网格点（浅色）
  const step = 40
  for (let x = 0; x < w; x += step) {
    for (let y = 0; y < h; y += step) {
      const dot = new Konva.Circle({
        x,
        y,
        radius: 1.2,
        fill: 'rgba(120,110,90,0.25)',
        listening: false,
      })
      gridGroup.add(dot)
    }
  }
  bgLayer.add(gridGroup)
}

function drawStars() {
  const stage = stageRef.value
  const w = stage.width()
  const h = stage.height()
  const bg = new Konva.Rect({
    x: 0,
    y: 0,
    width: w,
    height: h,
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: 0, y: h },
    fillLinearGradientColorStops: [0, '#05060f', 0.5, '#0a0b25', 1, '#1a0f3a'],
    listening: false,
  })
  starsLayer.add(bg)

  // 生成星星
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = Math.random() * 1.4 + 0.3
    const alpha = Math.random() * 0.7 + 0.3
    const star = new Konva.Circle({
      x,
      y,
      radius: r,
      fill: `rgba(255,255,255,${alpha})`,
      listening: false,
      shadowColor: '#a8b0ff',
      shadowBlur: Math.random() < 0.15 ? 8 : 0,
      shadowOpacity: 0.6,
    })
    starsLayer.add(star)
  }

  // 几朵星云
  for (let i = 0; i < 3; i++) {
    const cx = Math.random() * w
    const cy = Math.random() * h
    const rr = 150 + Math.random() * 120
    const color = ['#5c3ba8', '#a8408c', '#3b5ea8'][i % 3]
    const neb = new Konva.Circle({
      x: cx,
      y: cy,
      radius: rr,
      fillRadialGradientStartPoint: { x: 0, y: 0 },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndPoint: { x: 0, y: 0 },
      fillRadialGradientEndRadius: rr,
      fillRadialGradientColorStops: [0, color + '66', 1, color + '00'],
      listening: false,
      opacity: 0.5,
    })
    starsLayer.add(neb)
  }
}

// ======== 舞台交互（平移、滚轮缩放） ========
function handleStageMouseDown(e) {
  // 如果点中的是便签（通过 name 判断），交给便签自己处理
  const target = e.target
  if (target && target.name && target.name().indexOf('note') === 0) return

  // 开始画布平移
  const pos = getPointerPos()
  dragInfo = {
    type: 'canvas',
    startX: pos.x,
    startY: pos.y,
    origStageX: stageRef.value.x(),
    origStageY: stageRef.value.y(),
  }
  // 点击空白处清除连线待选状态
  if (pendingFrom.value) {
    pendingFrom.value = null
    redrawAllNotes()
  }
}

function handleStageMouseMove(e) {
  if (!dragInfo) return
  const pos = getPointerPos()
  if (dragInfo.type === 'canvas') {
    stageRef.value.x(dragInfo.origStageX + (pos.x - dragInfo.startX))
    stageRef.value.y(dragInfo.origStageY + (pos.y - dragInfo.startY))
    viewport.value = {
      x: stageRef.value.x(),
      y: stageRef.value.y(),
      scale: stageRef.value.scaleX(),
    }
  } else if (dragInfo.type === 'note') {
    const note = notes.value.find((n) => n.id === dragInfo.noteId)
    if (!note) return
    const world = screenToWorld(pos.x - dragInfo.offsetX, pos.y - dragInfo.offsetY)
    note.x = world.x
    note.y = world.y
    note.group.x(world.x)
    note.group.y(world.y)
    updateConnectionsForNote(note.id)
  }
}

function handleStageMouseUp() {
  dragInfo = null
}

function handleWheel(e) {
  e.evt.preventDefault?.()
  const delta = e.evt.deltaY
  const stage = stageRef.value
  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition() || { x: 0, y: 0 }

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }

  const zoomIntensity = 0.0012
  const factor = Math.exp(-delta * zoomIntensity)
  let newScale = oldScale * factor
  newScale = Math.max(0.25, Math.min(3, newScale))

  stage.scale({ x: newScale, y: newScale })
  stage.position({
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  })
  viewport.value = { x: stage.x(), y: stage.y(), scale: newScale }
}

function handleStageClick() {
  // 防止误触发，这里不用
}

// ======== 便签 ========
function addNoteAt(screenX, screenY, palette, text = '') {
  const world = screenToWorld(screenX, screenY)
  const group = new Konva.Group({
    x: world.x,
    y: world.y,
    name: 'note-group',
    draggable: false,
  })

  const W = 160
  const H = 110

  // 阴影
  const shadow = new Konva.Rect({
    x: -W / 2 + 4,
    y: -H / 2 + 6,
    width: W,
    height: H,
    cornerRadius: 8,
    fill: 'rgba(0,0,0,0.18)',
    name: 'note-shadow',
    listening: false,
    shadowForStrokeEnabled: false,
  })

  // 主体矩形（便签）
  const body = new Konva.Rect({
    x: -W / 2,
    y: -H / 2,
    width: W,
    height: H,
    cornerRadius: 8,
    fill: isNight.value ? palette.night : palette.fill,
    stroke: isNight.value ? palette.glow : 'rgba(80,70,50,0.15)',
    strokeWidth: isNight.value ? 2 : 1,
    shadowColor: isNight.value ? palette.glow : 'rgba(0,0,0,0.25)',
    shadowBlur: isNight.value ? 18 : 8,
    shadowOpacity: isNight.value ? 0.7 : 0.5,
    shadowOffset: { x: 0, y: 3 },
    name: 'note-body',
  })

  // 顶部"胶带"
  const tape = new Konva.Rect({
    x: -34,
    y: -H / 2 - 10,
    width: 68,
    height: 18,
    cornerRadius: 3,
    fill: isNight.value ? 'rgba(180,170,230,0.35)' : 'rgba(255,240,200,0.75)',
    stroke: isNight.value ? 'rgba(200,180,255,0.5)' : 'rgba(180,160,120,0.35)',
    strokeWidth: 1,
    rotation: -6,
    name: 'note-tape',
    shadowColor: isNight.value ? '#c9c2ff' : 'rgba(0,0,0,0.15)',
    shadowBlur: isNight.value ? 8 : 4,
    shadowOpacity: 0.5,
  })

  // 文字
  const label = new Konva.Text({
    x: -W / 2 + 14,
    y: -H / 2 + 24,
    width: W - 28,
    height: H - 40,
    text,
    fontSize: 16,
    fontFamily:
      "system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fill: isNight.value ? '#15162a' : '#3a3228',
    align: 'center',
    verticalAlign: 'middle',
    name: 'note-text',
  })

  // 删除按钮（小 ×）
  const delBtnBg = new Konva.Circle({
    x: W / 2 - 2,
    y: -H / 2 + 2,
    radius: 11,
    fill: 'rgba(255,255,255,0.85)',
    stroke: 'rgba(200,80,80,0.6)',
    strokeWidth: 1.5,
    name: 'note-del-bg',
  })
  const delBtnX = new Konva.Text({
    x: W / 2 - 2,
    y: -H / 2 + 2,
    text: '×',
    fontSize: 18,
    fontStyle: 'bold',
    fill: '#a23',
    align: 'center',
    verticalAlign: 'middle',
    offsetX: 5,
    offsetY: 9,
    name: 'note-del-x',
  })

  group.add(shadow, body, tape, label, delBtnBg, delBtnX)
  mainLayer.add(group)

  const note = {
    id: uid('note'),
    x: world.x,
    y: world.y,
    color: palette,
    colorIdx: COLOR_PALETTES.indexOf(palette),
    text,
    group,
    body,
    tape,
    label,
    shadow,
    delBtnBg,
    delBtnX,
    width: W,
    height: H,
    pending: false,
  }
  notes.value.push(note)

  // ====== 事件绑定 ======
  // 鼠标悬浮 - 手型
  ;[body, tape, label, shadow, delBtnBg, delBtnX].forEach((el) => {
    el.on('mouseenter', () => {
      containerRef.value.style.cursor = 'pointer'
    })
    el.on('mouseleave', () => {
      containerRef.value.style.cursor = ''
    })
  })

  // 删除按钮
  delBtnBg.on('click tap', () => {
    removeNote(note.id)
  })
  delBtnX.on('click tap', () => {
    removeNote(note.id)
  })
  delBtnBg.on('mouseenter', () => {
    containerRef.value.style.cursor = 'pointer'
  })

  // 便签拖动
  let noteDragStart = null
  group.on('mousedown', (e) => {
    // 如果点到删除按钮，不触发拖动
    const tname = e.target && e.target.name()
    if (tname === 'note-del-bg' || tname === 'note-del-x') return
    const pos = getPointerPos()
    const wpos = screenToWorld(pos.x, pos.y)
    noteDragStart = {
      offsetX: wpos.x - note.x,
      offsetY: wpos.y - note.y,
      moved: false,
    }
    dragInfo = {
      type: 'note',
      noteId: note.id,
      offsetX: pos.x - (note.x * stageRef.value.scaleX() + stageRef.value.x()),
      offsetY: pos.y - (note.y * stageRef.value.scaleY() + stageRef.value.y()),
    }
    // 提升层级
    group.moveToTop()
  })

  group.on('click tap', () => {
    // 点击后刷新（确保层级）
  })

  // 双击进入连线
  group.on('dblclick dbltap', (e) => {
    e.cancelBubble = true
    handleNoteDoubleClick(note)
  })

  // 进入动画（弹出）
  group.scale({ x: 0.3, y: 0.3 })
  group.opacity(0)
  const tween = new Konva.Tween({
    node: group,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    duration: 0.35,
    easing: Konva.Easings.BackEaseOut,
  })
  tween.play()

  mainLayer.batchDraw()
  return note
}

function handleNoteDoubleClick(note) {
  if (!pendingFrom.value) {
    // 开始连线
    pendingFrom.value = note.id
    note.pending = true
    redrawNote(note)
  } else if (pendingFrom.value === note.id) {
    // 取消
    pendingFrom.value = null
    note.pending = false
    redrawNote(note)
  } else {
    // 完成连线 - 用弹性动画从起点 "飞" 到终点
    const fromNote = notes.value.find((n) => n.id === pendingFrom.value)
    const toNote = note
    if (fromNote) fromNote.pending = false
    pendingFrom.value = null
    redrawAllNotes()
    addSpringConnection(fromNote, toNote)
  }
}

function redrawNote(note) {
  if (!note || !note.body) return
  const palette = note.color
  if (note.pending) {
    note.body.stroke('#ff5fa2')
    note.body.strokeWidth(3)
    note.body.shadowColor('#ff9ec2')
    note.body.shadowBlur(22)
    note.body.shadowOpacity(0.9)
  } else {
    note.body.stroke(isNight.value ? palette.glow : 'rgba(80,70,50,0.15)')
    note.body.strokeWidth(isNight.value ? 2 : 1)
    note.body.shadowColor(isNight.value ? palette.glow : 'rgba(0,0,0,0.25)')
    note.body.shadowBlur(isNight.value ? 18 : 8)
    note.body.shadowOpacity(isNight.value ? 0.7 : 0.5)
  }
  mainLayer.batchDraw()
}

function redrawAllNotes() {
  notes.value.forEach(redrawNote)
}

// ======== 弹性连线（橡皮筋） ========
// 每条连线由若干控制点组成，用弹簧模型模拟弹性
function addSpringConnection(fromNote, toNote) {
  if (!fromNote || !toNote) return
  // 创建一条主连线（带控制点）
  const startX = fromNote.x
  const startY = fromNote.y
  const endX = toNote.x
  const endY = toNote.y

  // 中间控制点（多个 - 增强弹性感）
  const midCount = 4
  const controlPoints = []
  for (let i = 1; i <= midCount; i++) {
    const t = i / (midCount + 1)
    controlPoints.push({
      x: startX + (endX - startX) * t + (Math.random() - 0.5) * 20,
      y: startY + (endY - startY) * t + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
    })
  }

  const line = new Konva.Line({
    points: [startX, startY],
    stroke: isNight.value ? '#ffd36b' : '#4a455a',
    strokeWidth: 2.5,
    lineCap: 'round',
    lineJoin: 'round',
    shadowColor: isNight.value ? '#ffe78a' : 'rgba(0,0,0,0.3)',
    shadowBlur: isNight.value ? 14 : 4,
    shadowOpacity: isNight.value ? 0.9 : 0.5,
    tension: 0.5,
    listening: false,
  })
  mainLayer.add(line)

  const conn = {
    id: uid('conn'),
    from: fromNote.id,
    to: toNote.id,
    line,
    controlPoints,
    // 用于吸附瞬间的"弹跳"动画
    snapPulse: 1.0,
  }
  connections.value.push(conn)

  // 播放吸附音
  playSnap()

  mainLayer.batchDraw()
}

function updateConnectionsForNote(noteId) {
  // 无需特殊处理 - 弹性动画循环会按两端便签位置重新计算
}

// ======== 弹性循环（弹簧模拟 + 橡皮筋拖拽预览线） ========
let springLoopRAF = null
function startSpringLoop() {
  const tick = () => {
    const now = performance.now()
    const dt = Math.min(32, now - lastFrameTime) / 16
    lastFrameTime = now

    // 更新每条连线（弹簧物理）
    connections.value.forEach((conn) => {
      const fromNote = notes.value.find((n) => n.id === conn.from)
      const toNote = notes.value.find((n) => n.id === conn.to)
      if (!fromNote || !toNote) return

      const pts = []
      pts.push(fromNote.x, fromNote.y)
      const segs = conn.controlPoints.length + 1 // 分段数
      // 目标直线位置（每段均分）
      for (let i = 0; i < conn.controlPoints.length; i++) {
        const cp = conn.controlPoints[i]
        const t = (i + 1) / segs
        const tx = fromNote.x + (toNote.x - fromNote.x) * t
        const ty = fromNote.y + (toNote.y - fromNote.y) * t

        // 弹簧：加速度 = -k*(当前-目标) - 阻尼 * 速度
        const ax = -ANIM_SPRING_K * (cp.x - tx) - ANIM_SPRING_DAMP * cp.vx
        const ay = -ANIM_SPRING_K * (cp.y - ty) - ANIM_SPRING_DAMP * cp.vy
        cp.vx += ax * dt
        cp.vy += ay * dt
        cp.x += cp.vx * dt
        cp.y += cp.vy * dt

        // 吸附脉冲：影响控制点外摆幅度
        if (conn.snapPulse > 0) {
          // 向外垂直偏移产生"弹跳"视觉
          const dx = toNote.x - fromNote.x
          const dy = toNote.y - fromNote.y
          const len = Math.hypot(dx, dy) || 1
          const nx = -dy / len
          const ny = dx / len
          const off = Math.sin(t * Math.PI) * conn.snapPulse * 14
          cp.x += nx * off * dt
          cp.y += ny * off * dt
          conn.snapPulse = Math.max(0, conn.snapPulse - 0.06 * dt)
        }
        pts.push(cp.x, cp.y)
      }
      pts.push(toNote.x, toNote.y)
      conn.line.points(pts)
    })

    // 待选连线的"橡皮筋"预览线
    if (pendingFrom.value) {
      const fromNote = notes.value.find((n) => n.id === pendingFrom.value)
      if (fromNote && stageRef.value) {
        const pos = stageRef.value.getPointerPosition()
        if (pos) {
          const world = screenToWorld(pos.x, pos.y)
          // 模拟一条带两个控制点的弯曲预览线
          const dx = world.x - fromNote.x
          const dy = world.y - fromNote.y
          // 垂直偏移方向
          const len = Math.hypot(dx, dy) || 1
          const nx = -dy / len
          const ny = dx / len
          const bendAmount = Math.min(len * 0.18, 40) * (Math.sin(now / 200) * 0.4 + 0.8)
          const p1x = fromNote.x + dx * 0.33 + nx * bendAmount * 0.5
          const p1y = fromNote.y + dy * 0.33 + ny * bendAmount * 0.5
          const p2x = fromNote.x + dx * 0.66 - nx * bendAmount * 0.5
          const p2y = fromNote.y + dy * 0.66 - ny * bendAmount * 0.5

          previewLine.points([fromNote.x, fromNote.y, p1x, p1y, p2x, p2y, world.x, world.y])
          previewLine.visible(true)
        }
      }
    } else {
      previewLine.visible(false)
    }

    mainLayer.batchDraw()
    springLoopRAF = requestAnimationFrame(tick)
  }

  // 创建预览线
  previewLine = new Konva.Line({
    points: [0, 0, 0, 0],
    stroke: '#ff5fa2',
    strokeWidth: 2.5,
    lineCap: 'round',
    dash: [8, 6],
    shadowColor: '#ff9ec2',
    shadowBlur: 10,
    shadowOpacity: 0.7,
    tension: 0.6,
    listening: false,
    visible: false,
  })
  mainLayer.add(previewLine)

  springLoopRAF = requestAnimationFrame(tick)
}
let previewLine = null

// ======== 删除便签（纸团飞出） ========
function removeNote(noteId) {
  const idx = notes.value.findIndex((n) => n.id === noteId)
  if (idx < 0) return
  const note = notes.value[idx]
  notes.value.splice(idx, 1)

  // 删除相关连线
  const relatedConn = []
  for (let i = connections.value.length - 1; i >= 0; i--) {
    const c = connections.value[i]
    if (c.from === noteId || c.to === noteId) {
      relatedConn.push(c)
      connections.value.splice(i, 1)
    }
  }

  // 播放"唰"音
  playWhoosh()

  // 动画：先缩小 → 揉皱 → 旋转飞出
  const group = note.group
  const startScaleX = group.scaleX()
  const startScaleY = group.scaleY()
  const startX = group.x()
  const startY = group.y()

  // 随机飞出方向（向右上或左下居多）
  const dir = Math.random() > 0.5 ? 1 : -1
  const flyX = dir * (window.innerWidth * 0.7)
  const flyY = -dir * (window.innerHeight * 0.5) - 200

  const duration = 700
  const t0 = performance.now()

  // 相关连线同时淡出
  relatedConn.forEach((c) => (c.line.opacity(1)))

  const step = () => {
    const t = Math.min(1, (performance.now() - t0) / duration)
    const e = 1 - Math.pow(1 - t, 3) // easeOutCubic
    // 缩小到 0.15 倍
    const scale = startScaleX * (1 - e * 0.85)
    group.scale({ x: scale, y: scale * 0.9 })
    group.rotation(e * 260 * dir)
    group.x(startX + flyX * e)
    group.y(startY + flyY * e)
    group.opacity(1 - e)

    relatedConn.forEach((c) => {
      c.line.opacity(1 - e)
    })

    mainLayer.batchDraw()
    if (t < 1) {
      requestAnimationFrame(step)
    } else {
      group.destroy()
      relatedConn.forEach((c) => c.line.destroy())
      mainLayer.batchDraw()
    }
  }
  requestAnimationFrame(step)
}

// ======== 工具栏按钮 ========
function addRandomNote() {
  const stage = stageRef.value
  if (!stage) return
  const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)]
  const cx = stage.width() / 2 + (Math.random() - 0.5) * 300
  const cy = stage.height() / 2 + (Math.random() - 0.5) * 200
  const samples = ['新想法 💡', '待办 📌', '灵感 ⚡', '备忘 📝', '重点 🔖']
  addNoteAt(cx, cy, palette, samples[Math.floor(Math.random() * samples.length)])
}

function resetView() {
  const stage = stageRef.value
  if (!stage) return
  stage.scale({ x: 1, y: 1 })
  stage.position({ x: 0, y: 0 })
  viewport.value = { x: 0, y: 0, scale: 1 }
}

function toggleNight() {
  isNight.value = !isNight.value
  // 重绘便签颜色
  notes.value.forEach((n) => {
    const palette = n.color
    n.body.fill(isNight.value ? palette.night : palette.fill)
    n.body.stroke(isNight.value ? palette.glow : 'rgba(80,70,50,0.15)')
    n.body.strokeWidth(isNight.value ? 2 : 1)
    n.body.shadowColor(isNight.value ? palette.glow : 'rgba(0,0,0,0.25)')
    n.body.shadowBlur(isNight.value ? 18 : 8)
    n.body.shadowOpacity(isNight.value ? 0.7 : 0.5)
    n.label.fill(isNight.value ? '#15162a' : '#3a3228')
    n.tape.fill(isNight.value ? 'rgba(180,170,230,0.35)' : 'rgba(255,240,200,0.75)')
    n.tape.stroke(isNight.value ? 'rgba(200,180,255,0.5)' : 'rgba(180,160,120,0.35)')
    n.tape.shadowColor(isNight.value ? '#c9c2ff' : 'rgba(0,0,0,0.15)')
  })
  connections.value.forEach((c) => {
    c.line.stroke(isNight.value ? '#ffd36b' : '#4a455a')
    c.line.shadowColor(isNight.value ? '#ffe78a' : 'rgba(0,0,0,0.3)')
    c.line.shadowBlur(isNight.value ? 14 : 4)
    c.line.shadowOpacity(isNight.value ? 0.9 : 0.5)
  })
  redrawAllNotes()
  mainLayer.batchDraw()
}
</script>

<template>
  <div ref="containerRef" class="canvas-container"></div>

  <div class="toolbar">
    <button @click="addRandomNote">➕ 新增便签</button>
    <button @click="toggleNight">
      {{ isNight ? '☀️ 日间' : '🌙 夜间' }}
    </button>
    <button @click="resetView">🎯 回到原点</button>
    <div class="hint">
      按住空白处拖动画布 · 滚轮缩放 · 双击便签开始连线，再双击另一张完成 ·
      点 × 删除
    </div>
  </div>
</template>

<style scoped>
.canvas-container {
  position: fixed;
  inset: 0;
  overflow: hidden;
}
</style>
