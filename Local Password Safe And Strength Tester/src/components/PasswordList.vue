<template>
  <div class="password-list">
    <div class="list-header">
      <h3>
        <span class="icon">📋</span> 我的密码本
        <span class="count">{{ entries.length }} 条</span>
      </h3>
      <button class="add-btn" @click="openAdd">
        <span class="plus">+</span> 添加密码
      </button>
    </div>

    <div v-if="entries.length === 0" class="empty">
      <div class="empty-icon">🏛️</div>
      <div class="empty-title">保险箱空空如也</div>
      <div class="empty-desc">点击「添加密码」来保存你的第一个密码</div>
    </div>

    <transition-group tag="div" name="list" class="entries">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="entry-card"
      >
        <div class="entry-head">
          <div class="entry-title">
            <span class="site-icon">{{ getIcon(entry) }}</span>
            <div>
              <div class="name">{{ entry.name }}</div>
              <div class="username">{{ entry.username }}</div>
            </div>
          </div>
          <div class="entry-actions">
            <button class="act-btn" @click="toggleVisible(entry)" :title="entry._shown ? '隐藏' : '查看'">
              {{ entry._shown ? '🙈' : '👁️' }}
            </button>
            <button class="act-btn" @click="copyPassword(entry)" :title="'复制密码'">
              {{ entry._copied ? '✅' : '📋' }}
            </button>
            <button class="act-btn danger" @click="removeEntry(entry)" title="删除">
              🗑️
            </button>
          </div>
        </div>

        <div class="entry-field">
          <span class="field-label">密码：</span>
          <span class="field-value">
            <template v-if="entry._shown">{{ entry.password }}</template>
            <template v-else>
              <span v-for="i in Math.min(entry.password.length, 16)" :key="i" class="dot">•</span>
            </template>
          </span>
        </div>

        <div v-if="entry.note" class="entry-note">📝 {{ entry.note }}</div>

        <StrengthMeter :analysis="analyze(entry.password)" class="mini-meter" />
      </div>
    </transition-group>

    <!-- 添加对话框 -->
    <div v-if="showAdd" class="modal-backdrop" @click.self="closeAdd">
      <div class="modal">
        <h4><span class="icon">✨</span> 添加新密码</h4>

        <div class="field">
          <label>名称 / 网站</label>
          <input v-model="form.name" placeholder="例如 Google、淘宝..." />
        </div>
        <div class="field">
          <label>用户名 / 邮箱</label>
          <input v-model="form.username" placeholder="your@email.com" />
        </div>
        <div class="field">
          <label>密码</label>
          <div class="pwd-input">
            <input
              v-model="form.password"
              :type="form.showPwd ? 'text' : 'password'"
              placeholder="输入一个强密码！"
            />
            <button class="eye-btn" @click="form.showPwd = !form.showPwd">
              {{ form.showPwd ? '🙈' : '👁️' }}
            </button>
            <button class="eye-btn" @click="generateStrong" title="生成强密码">🎲</button>
          </div>
          <StrengthMeter :analysis="analyze(form.password)" />
        </div>
        <div class="field">
          <label>备注（可选）</label>
          <textarea v-model="form.note" placeholder="随便写点什么..."></textarea>
        </div>

        <div class="modal-actions">
          <button class="btn ghost" @click="closeAdd">取消</button>
          <button class="btn primary" @click="submit" :disabled="!canSubmit">
            💾 保存到保险箱
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import StrengthMeter from './StrengthMeter.vue'
import { analyzePassword } from '../utils/passwordStrength.js'
import { playClick, playSuccess } from '../utils/sound.js'

const props = defineProps({
  entries: { type: Array, required: true }
})
const emit = defineEmits(['add', 'remove', 'update'])

function analyze(pwd) {
  return analyzePassword(pwd)
}

function getIcon(entry) {
  const n = (entry.name || '').toLowerCase()
  if (n.includes('google') || n.includes('gmail')) return '🔍'
  if (n.includes('github')) return '🐙'
  if (n.includes('qq') || n.includes('微信') || n.includes('wechat')) return '💬'
  if (n.includes('淘宝') || n.includes('taobao') || n.includes('京东') || n.includes('jd')) return '🛒'
  if (n.includes('bank') || n.includes('银行')) return '🏦'
  if (n.includes('game') || n.includes('游戏') || n.includes('steam')) return '🎮'
  if (n.includes('apple') || n.includes('icloud')) return '🍎'
  if (n.includes('amazon')) return '📦'
  if (n.includes('twitter') || n.includes('x')) return '🐦'
  return '🔒'
}

function toggleVisible(entry) {
  entry._shown = !entry._shown
  playClick()
}

async function copyPassword(entry) {
  try {
    await navigator.clipboard.writeText(entry.password)
    entry._copied = true
    playSuccess()
    setTimeout(() => { entry._copied = false }, 1500)
  } catch (e) {
    alert('复制失败：' + e.message)
  }
}

function removeEntry(entry) {
  playClick()
  if (confirm(`确定要删除「${entry.name}」的密码吗？`)) {
    emit('remove', entry.id)
  }
}

const showAdd = reactive({ value: false })
const form = reactive({
  name: '',
  username: '',
  password: '',
  note: '',
  showPwd: false
})

function openAdd() {
  showAdd.value = true
  playClick()
}

function closeAdd() {
  showAdd.value = false
  form.name = ''
  form.username = ''
  form.password = ''
  form.note = ''
  form.showPwd = false
}

const canSubmit = computed(() => {
  return form.name.trim() && form.password.trim()
})

function submit() {
  if (!canSubmit.value) return
  emit('add', {
    id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    name: form.name.trim(),
    username: form.username.trim(),
    password: form.password,
    note: form.note.trim(),
    createdAt: Date.now()
  })
  playSuccess()
  closeAdd()
}

function generateStrong() {
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const symbols = '!@#$%^&*()-_=+[]{};:,.<>?'
  const all = lower + upper + digits + symbols
  let pwd = ''
  pwd += lower[Math.floor(Math.random() * lower.length)]
  pwd += upper[Math.floor(Math.random() * upper.length)]
  pwd += digits[Math.floor(Math.random() * digits.length)]
  pwd += symbols[Math.floor(Math.random() * symbols.length)]
  for (let i = 0; i < 12; i++) {
    pwd += all[Math.floor(Math.random() * all.length)]
  }
  pwd = pwd.split('').sort(() => Math.random() - 0.5).join('')
  form.password = pwd
  playClick()
}
</script>

<style scoped>
.password-list {
  color: #e8e8f0;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.list-header h3 {
  font-size: 18px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-header .icon {
  font-size: 22px;
}

.list-header .count {
  font-size: 12px;
  background: rgba(46, 213, 115, 0.15);
  color: #2ed573;
  padding: 3px 10px;
  border-radius: 16px;
  font-weight: 600;
}

.add-btn {
  background: linear-gradient(135deg, #00d26a, #00a86b);
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 14px rgba(0, 210, 106, 0.35);
  transition: transform 0.15s, box-shadow 0.15s;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 210, 106, 0.5);
}

.add-btn .plus {
  font-size: 18px;
  font-weight: 900;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  color: #9090a8;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 12px;
  opacity: 0.8;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #c0c0d8;
}

.empty-desc {
  font-size: 13px;
}

.entries {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry-card {
  background: rgba(20, 22, 38, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px;
  transition: transform 0.2s, border-color 0.2s;
}

.entry-card:hover {
  border-color: rgba(46, 213, 115, 0.3);
  transform: translateY(-1px);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.entry-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.entry-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.site-icon {
  font-size: 32px;
  background: rgba(255, 255, 255, 0.05);
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.name {
  font-weight: 700;
  font-size: 15px;
  color: #f0f0f8;
}

.username {
  font-size: 12px;
  color: #8a8aa8;
  margin-top: 2px;
}

.entry-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.act-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s;
}

.act-btn:hover {
  background: rgba(46, 213, 115, 0.15);
  border-color: rgba(46, 213, 115, 0.4);
  transform: scale(1.08);
}

.act-btn.danger:hover {
  background: rgba(255, 71, 87, 0.15);
  border-color: rgba(255, 71, 87, 0.4);
}

.entry-field {
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  word-break: break-all;
}

.field-label {
  color: #8a8aa8;
  margin-right: 8px;
}

.field-value {
  color: #00ffcc;
  letter-spacing: 1px;
}

.dot {
  margin-right: 2px;
  color: #6a6a84;
}

.entry-note {
  margin-top: 8px;
  font-size: 12px;
  color: #a0a0b8;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid rgba(46, 213, 115, 0.5);
  border-radius: 4px;
}

.mini-meter {
  margin-top: 10px;
  padding: 8px 10px;
}

.mini-meter .strength-bar {
  height: 10px;
}

.mini-meter .score-number {
  font-size: 14px;
  min-width: 36px;
}

.mini-meter .strength-meta,
.mini-meter .strength-label,
.mini-meter .roles {
  display: none;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
  backdrop-filter: blur(6px);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: linear-gradient(180deg, #1e2138, #16182a);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal h4 {
  margin: 0 0 18px;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.field {
  margin-bottom: 14px;
}

.field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #a0a0b8;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.field input,
.field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #f0f0f8;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: rgba(46, 213, 115, 0.5);
  box-shadow: 0 0 0 3px rgba(46, 213, 115, 0.15);
}

.field textarea {
  resize: vertical;
  min-height: 60px;
}

.pwd-input {
  position: relative;
  display: flex;
}

.pwd-input input {
  padding-right: 88px;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

.eye-btn {
  position: absolute;
  top: 4px;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.15s;
}

.eye-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.eye-btn:nth-last-child(2) {
  right: 44px;
}

.eye-btn:last-child {
  right: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: transform 0.15s, box-shadow 0.15s;
}

.btn.ghost {
  background: rgba(255, 255, 255, 0.05);
  color: #c0c0d8;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn.ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn.primary {
  background: linear-gradient(135deg, #00d26a, #00a86b);
  color: white;
  box-shadow: 0 4px 14px rgba(0, 210, 106, 0.35);
}

.btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 210, 106, 0.5);
}

.btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
