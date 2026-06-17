<template>
  <div class="app-root">
    <div class="app-header">
      <div class="brand">
        <div class="brand-logo">🔐</div>
        <div>
          <div class="brand-title">本地密码保险箱</div>
          <div class="brand-sub">纯本地 · AES 加密 · 零上传</div>
        </div>
      </div>
      <div class="status-pill" v-if="isUnlocked">
        <span class="pulse-dot"></span> 已解锁 · {{ entries.length }} 条记录
      </div>
      <div class="status-pill locked" v-else>
        <span class="pulse-dot red"></span> 🔒 保险箱已锁定
      </div>
    </div>

    <div class="auth-view" v-if="!isUnlocked">
      <VaultDoor :is-unlocked="isUnlocked" :spinning="dialSpinning">
        <div class="auth-panel">
          <div class="auth-head">
            <div class="auth-icon">🔑</div>
            <h2>{{ isFirstTime ? '设置主密码' : '请输入主密码' }}</h2>
            <p v-if="isFirstTime">
              这是你第一次使用。主密码是解锁保险箱的唯一钥匙，<br>
              请务必牢记！<strong style="color:#ff6b8a;">忘记无法找回。</strong>
            </p>
            <p v-else>
              所有密码都用主密码 AES 加密后，保存在你电脑的本地存储中。
            </p>
          </div>

          <div class="master-input-wrap">
            <input
              ref="masterInput"
              v-model="masterPassword"
              :type="showMaster ? 'text' : 'password'"
              :placeholder="isFirstTime ? '设置一个强主密码...' : '输入你的主密码...'"
              @keyup.enter="unlock"
              autocomplete="current-password"
            />
            <button class="eye-btn" @click="showMaster = !showMaster">
              {{ showMaster ? '🙈' : '👁️' }}
            </button>
          </div>

          <StrengthMeter v-if="isFirstTime || masterPassword" :analysis="masterAnalysis" />

          <div v-if="isFirstTime" class="confirm-wrap">
            <input
              v-model="masterConfirm"
              :type="showMaster ? 'text' : 'password'"
              placeholder="再次输入确认..."
              @keyup.enter="unlock"
            />
          </div>

          <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

          <button class="unlock-btn" :class="{ spinning: dialSpinning }" @click="unlock">
            <span class="unlock-inner">
              <span class="lock-icon">{{ isFirstTime ? '🛡️' : '🔑' }}</span>
              <span>{{ isFirstTime ? '创建保险箱' : '解锁保险箱' }}</span>
            </span>
          </button>

          <div v-if="hasVault && !isFirstTime" class="danger-zone">
            <button class="wipe-btn" @click="wipeAll">⚠️ 清空所有数据重置</button>
          </div>
        </div>
      </VaultDoor>
    </div>

    <div class="vault-view" v-else>
      <VaultDoor :is-unlocked="true">
        <PasswordList
          :entries="displayEntries"
          @add="addEntry"
          @remove="removeEntry"
        />
      </VaultDoor>

      <div class="bottom-actions">
        <input
          v-model="searchTerm"
          class="search-input"
          placeholder="🔎 搜索密码名称/账号..."
        />
        <button class="logout-btn" @click="lock">🔒 锁定保险箱</button>
      </div>
    </div>

    <div class="app-footer">
      <span>⚡ Vue 3 + CryptoJS · 所有数据仅保存在本浏览器 LocalStorage</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import VaultDoor from './components/VaultDoor.vue'
import StrengthMeter from './components/StrengthMeter.vue'
import PasswordList from './components/PasswordList.vue'
import { analyzePassword } from './utils/passwordStrength.js'
import { saveVault, loadVault, hasVault as checkVault, clearVault } from './utils/crypto.js'
import { playClick, playMetalClank, playSuccess, playError } from './utils/sound.js'

const isUnlocked = ref(false)
const isFirstTime = ref(false)
const hasVault = ref(false)
const entries = reactive([])
const masterPassword = ref('')
const masterConfirm = ref('')
const masterKeyCache = ref('')
const showMaster = ref(false)
const errorMsg = ref('')
const dialSpinning = ref(false)
const searchTerm = ref('')
const masterInput = ref(null)

const masterAnalysis = computed(() => analyzePassword(masterPassword.value))

const displayEntries = computed(() => {
  const q = searchTerm.value.trim().toLowerCase()
  if (!q) return entries
  return entries.filter(e =>
    (e.name || '').toLowerCase().includes(q) ||
    (e.username || '').toLowerCase().includes(q) ||
    (e.note || '').toLowerCase().includes(q)
  )
})

onMounted(() => {
  hasVault.value = checkVault()
  isFirstTime.value = !hasVault.value
  nextTick(() => {
    if (masterInput.value) masterInput.value.focus()
  })
})

function seedEntries() {
  return [
    {
      id: 'demo_1',
      name: 'Google / Gmail',
      username: 'your.email@gmail.com',
      password: 'G00gl3@MyP@ss!987',
      note: '记得开启两步验证 🔐',
      createdAt: Date.now()
    },
    {
      id: 'demo_2',
      name: 'GitHub',
      username: 'your_github_name',
      password: 'Gh_!Secure2026_$',
      note: '个人 token 也可以存在这里',
      createdAt: Date.now() - 1000
    },
    {
      id: 'demo_3',
      name: '示例：弱密码（可删除）',
      username: 'demo@weak.pwd',
      password: '123456',
      note: '这个非常弱，看小偷怎么笑你 😏',
      createdAt: Date.now() - 2000
    }
  ]
}

function stripTransient(entry) {
  const { _shown, _copied, ...rest } = entry
  return rest
}

function doEncryptSave() {
  if (!masterKeyCache.value) return
  saveVault(entries.map(stripTransient), masterKeyCache.value)
}

function unlock() {
  errorMsg.value = ''
  const pwd = masterPassword.value
  if (!pwd.trim()) {
    errorMsg.value = '请输入主密码'
    playError()
    return
  }

  if (isFirstTime.value) {
    if (pwd.length < 6) {
      errorMsg.value = '主密码至少 6 位，建议使用大小写 + 符号'
      playError()
      return
    }
    if (pwd !== masterConfirm.value) {
      errorMsg.value = '两次输入的主密码不一致'
      playError()
      return
    }
    dialSpinning.value = true
    playClick()
    setTimeout(() => {
      masterKeyCache.value = pwd
      entries.splice(0, entries.length, ...seedEntries())
      doEncryptSave()
      playMetalClank()
      playSuccess()
      setTimeout(() => {
        isUnlocked.value = true
        dialSpinning.value = false
        masterPassword.value = ''
        masterConfirm.value = ''
      }, 1300)
    }, 300)
  } else {
    dialSpinning.value = true
    playClick()
    setTimeout(() => {
      const data = loadVault(pwd)
      if (!data) {
        errorMsg.value = '❌ 主密码错误，保险箱无法打开'
        playError()
        dialSpinning.value = false
        return
      }
      masterKeyCache.value = pwd
      entries.splice(0, entries.length, ...(data.entries || []))
      playMetalClank()
      playSuccess()
      setTimeout(() => {
        isUnlocked.value = true
        dialSpinning.value = false
        masterPassword.value = ''
      }, 1300)
    }, 500)
  }
}

function lock() {
  playClick()
  masterKeyCache.value = ''
  isUnlocked.value = false
  searchTerm.value = ''
  nextTick(() => {
    if (masterInput.value) masterInput.value.focus()
  })
}

function addEntry(entry) {
  entries.unshift(entry)
  doEncryptSave()
}

function removeEntry(id) {
  const idx = entries.findIndex(e => e.id === id)
  if (idx >= 0) {
    entries.splice(idx, 1)
    doEncryptSave()
  }
}

function wipeAll() {
  if (confirm('⚠️ 这将永久删除保险箱内的所有密码记录，且无法恢复！\n\n确定要清空吗？')) {
    clearVault()
    entries.splice(0, entries.length)
    masterPassword.value = ''
    masterConfirm.value = ''
    masterKeyCache.value = ''
    isFirstTime.value = true
    hasVault.value = false
    isUnlocked.value = false
    errorMsg.value = ''
  }
}
</script>

<style scoped>
.app-root {
  min-height: 100vh;
  padding: 30px 20px 80px;
  max-width: 820px;
  margin: 0 auto;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-logo {
  font-size: 40px;
  background: linear-gradient(135deg, rgba(46, 213, 115, 0.2), rgba(0, 200, 255, 0.15));
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(46, 213, 115, 0.3);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.brand-title {
  font-size: 20px;
  font-weight: 800;
  color: #f0f0f8;
  letter-spacing: 0.5px;
}

.brand-sub {
  font-size: 11px;
  color: #8a8aa8;
  margin-top: 2px;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(46, 213, 115, 0.1);
  border: 1px solid rgba(46, 213, 115, 0.3);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #2ed573;
}

.status-pill.locked {
  background: rgba(255, 71, 87, 0.1);
  border-color: rgba(255, 71, 87, 0.3);
  color: #ff6b8a;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #2ed573;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.pulse-dot.red {
  background: #ff4757;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(46, 213, 115, 0.7); }
  50% { box-shadow: 0 0 0 8px rgba(46, 213, 115, 0); }
}

.auth-view,
.vault-view { position: relative; }

.auth-panel { padding: 8px 4px; }

.auth-head {
  text-align: center;
  margin-bottom: 22px;
}

.auth-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.auth-head h2 {
  margin: 0 0 8px;
  font-size: 22px;
  color: #f0f0f8;
}

.auth-head p {
  margin: 0;
  font-size: 12px;
  color: #8a8aa8;
  line-height: 1.7;
}

.master-input-wrap {
  position: relative;
  max-width: 360px;
  margin: 0 auto 12px;
}

.master-input-wrap input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 50px 14px 18px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: #f0f0f8;
  font-size: 16px;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.master-input-wrap input:focus {
  outline: none;
  border-color: rgba(46, 213, 115, 0.6);
  box-shadow: 0 0 0 4px rgba(46, 213, 115, 0.15), 0 0 20px rgba(46, 213, 115, 0.2);
}

.eye-btn {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 20px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}

.eye-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.confirm-wrap {
  position: relative;
  max-width: 360px;
  margin: 0 auto 12px;
}

.confirm-wrap input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 18px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: #f0f0f8;
  font-size: 14px;
  font-family: 'Courier New', monospace;
}

.confirm-wrap input:focus {
  outline: none;
  border-color: rgba(46, 213, 115, 0.6);
}

.error-msg {
  max-width: 360px;
  margin: 0 auto 12px;
  padding: 10px 14px;
  background: rgba(255, 71, 87, 0.12);
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 10px;
  color: #ff6b8a;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  animation: shake 0.4s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.unlock-btn {
  display: block;
  margin: 24px auto 12px;
  padding: 0;
  background: linear-gradient(135deg, #2ed573, #00a86b);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(46, 213, 115, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.unlock-btn:hover:not(.spinning) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(46, 213, 115, 0.6);
}

.unlock-btn:active:not(.spinning) { transform: translateY(0); }

.unlock-btn.spinning {
  cursor: wait;
  background: linear-gradient(135deg, #ffb74d, #ff9800);
  box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
}

.unlock-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 32px;
  color: white;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 1px;
}

.lock-icon { font-size: 22px; }

.danger-zone {
  text-align: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.wipe-btn {
  background: transparent;
  border: 1px solid rgba(255, 71, 87, 0.3);
  color: #ff6b8a;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.wipe-btn:hover {
  background: rgba(255, 71, 87, 0.12);
  border-color: rgba(255, 71, 87, 0.6);
}

.bottom-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 12px 18px;
  background: rgba(20, 22, 38, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #f0f0f8;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: rgba(46, 213, 115, 0.5);
}

.logout-btn {
  padding: 12px 20px;
  background: rgba(255, 71, 87, 0.15);
  border: 1px solid rgba(255, 71, 87, 0.35);
  color: #ff6b8a;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.logout-btn:hover {
  background: rgba(255, 71, 87, 0.3);
  transform: translateY(-1px);
}

.app-footer {
  margin-top: 40px;
  text-align: center;
  color: #5a5a74;
  font-size: 11px;
}

@media (max-width: 600px) {
  .brand-title { font-size: 17px; }
  .brand-logo { font-size: 32px; width: 48px; height: 48px; }
  .auth-head h2 { font-size: 18px; }
}
</style>
