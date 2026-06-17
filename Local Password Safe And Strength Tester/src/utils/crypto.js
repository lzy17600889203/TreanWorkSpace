import CryptoJS from 'crypto-js'

const STORAGE_KEY = 'local_password_safe_vault'

export function encryptData(data, masterKey) {
  const json = JSON.stringify(data)
  return CryptoJS.AES.encrypt(json, masterKey).toString()
}

export function decryptData(ciphertext, masterKey) {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, masterKey)
    const text = bytes.toString(CryptoJS.enc.Utf8)
    if (!text) return null
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

export function saveVault(entries, masterKey) {
  const cipher = encryptData({ entries, updatedAt: Date.now() }, masterKey)
  localStorage.setItem(STORAGE_KEY, cipher)
}

export function loadVault(masterKey) {
  const cipher = localStorage.getItem(STORAGE_KEY)
  if (!cipher) return { entries: [], isNew: true }
  const data = decryptData(cipher, masterKey)
  if (!data) return null
  return { entries: data.entries || [], isNew: false }
}

export function hasVault() {
  return !!localStorage.getItem(STORAGE_KEY)
}

export function clearVault() {
  localStorage.removeItem(STORAGE_KEY)
}
