const container = document.getElementById('verifyContainer');
const standbyState = document.getElementById('standbyState');
const successState = document.getElementById('successState');
const expiredState = document.getElementById('expiredState');
const blacklistState = document.getElementById('blacklistState');
const nightState = document.getElementById('nightState');
const successInfo = document.getElementById('successInfo');
const expiredMessage = document.getElementById('expiredMessage');
const blacklistMessage = document.getElementById('blacklistMessage');

let html5QrCode = null;
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSuccessSound() {
    initAudio();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
}

function playAlertSound() {
    initAudio();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.4);
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.6);
}

function hideAllStates() {
    standbyState.classList.add('hidden');
    successState.classList.add('hidden');
    expiredState.classList.add('hidden');
    blacklistState.classList.add('hidden');
    nightState.classList.add('hidden');
    container.className = 'verify-container';
}

function showStandby() {
    hideAllStates();
    standbyState.classList.remove('hidden');
}

function showSuccess(data) {
    hideAllStates();
    container.classList.add('success-bg');
    successState.classList.remove('hidden');
    
    successInfo.innerHTML = `
        <p><strong>姓名：</strong>${data.name}</p>
        <p><strong>公司：</strong>${data.company}</p>
    `;
    
    playSuccessSound();
    
    setTimeout(() => {
        showStandby();
        if (html5QrCode) {
            html5QrCode.resumeScan();
        }
    }, 3000);
}

function showExpired(message, data) {
    hideAllStates();
    container.classList.add('expired-bg');
    expiredState.classList.remove('hidden');
    
    expiredMessage.innerHTML = `
        <p>${message}</p>
        ${data ? `<p>${data.name} - ${data.company}</p>` : ''}
    `;
    
    setTimeout(() => {
        showStandby();
        if (html5QrCode) {
            html5QrCode.resumeScan();
        }
    }, 4000);
}

function showBlacklist(message, data) {
    hideAllStates();
    container.classList.add('blacklist-bg');
    blacklistState.classList.remove('hidden');
    
    blacklistMessage.innerHTML = `
        <p>${message}</p>
        ${data ? `<p><strong>${data.name}</strong> - ${data.company}</p>` : ''}
    `;
    
    playAlertSound();
    
    setTimeout(() => {
        showStandby();
        if (html5QrCode) {
            html5QrCode.resumeScan();
        }
    }, 6000);
}

function showNightMode() {
    hideAllStates();
    container.classList.add('night-bg');
    nightState.classList.remove('hidden');
}

async function verifyQRCode(qrCode) {
    if (html5QrCode) {
        html5QrCode.pauseScan();
    }
    
    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ qrCode })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showSuccess(result.data);
        } else if (result.status === 'expired') {
            showExpired(result.message, result.data);
        } else if (result.status === 'blacklist') {
            showBlacklist(result.message, result.data);
        } else {
            alert(result.message || '核验失败');
            showStandby();
            if (html5QrCode) {
                html5QrCode.resumeScan();
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('网络错误，请重试');
        showStandby();
        if (html5QrCode) {
            html5QrCode.resumeScan();
        }
    }
}

async function initScanner() {
    try {
        html5QrCode = new Html5Qrcode("reader");
        
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                verifyQRCode(decodedText);
            },
            (errorMessage) => {
            }
        );
    } catch (err) {
        console.error('扫码器初始化失败:', err);
        alert('无法启动摄像头，请确保已授权摄像头权限');
    }
}

function testSuccess() {
    showSuccess({ name: '张三', company: '科技公司' });
}

function testExpired() {
    showExpired('该预约已于10分钟前失效', { name: '李四', company: '贸易公司' });
}

function testBlacklist() {
    showBlacklist('该人员已被标记为恶意推销', { name: '王五', company: '推销公司' });
}

function testNightMode() {
    showNightMode();
}

document.addEventListener('DOMContentLoaded', () => {
    initScanner();
});
