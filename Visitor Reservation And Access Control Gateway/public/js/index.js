const form = document.getElementById('reservationForm');
const formCard = document.getElementById('formCard');
const qrCard = document.getElementById('qrCard');
const qrInfo = document.getElementById('qrInfo');
const qrcodeImg = document.getElementById('qrcode-img');
const qrcodeText = document.getElementById('qrcode-text');
const qrCodeContent = document.getElementById('qr-code-content');

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    console.log('表单提交中...');
    
    const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        company: document.getElementById('company').value,
        duration: parseInt(document.getElementById('duration').value)
    };

    console.log('表单数据:', formData);

    try {
        console.log('发送请求到 /api/reservation');
        const response = await fetch('/api/reservation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        console.log('响应状态:', response.status);
        const result = await response.json();
        console.log('响应数据:', result);

        if (result.success) {
            showQRCode(result.data);
        } else {
            alert(result.message || '预约失败，请重试');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('网络错误，请重试');
    }
});

function showQRCode(data) {
    console.log('显示二维码, 数据:', data);
    
    qrcodeImg.style.display = 'none';
    qrcodeText.style.display = 'none';
    
    try {
        if (window.QRCode) {
            console.log('使用 QRCode 库生成二维码');
            qrcodeImg.style.display = 'block';
            qrcodeImg.src = '';
            qrcodeImg.alt = '正在生成二维码...';
            
            const container = document.querySelector('.qr-container');
            const qrcodeDiv = document.createElement('div');
            qrcodeDiv.id = 'qrcode';
            container.insertBefore(qrcodeDiv, container.firstChild);
            
            new QRCode(qrcodeDiv, {
                text: data.qrCode,
                width: 250,
                height: 250,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            throw new Error('QRCode 库未加载');
        }
    } catch (error) {
        console.warn('QRCode 生成失败，使用备用方案:', error);
        qrcodeText.style.display = 'block';
        qrCodeContent.textContent = data.qrCode;
    }

    const expiresAt = new Date(data.expiresAt);
    qrInfo.innerHTML = `
        <p><strong>姓名：</strong>${data.name}</p>
        <p><strong>公司：</strong>${data.company}</p>
        <p><strong>有效期至：</strong>${expiresAt.toLocaleString('zh-CN')}</p>
    `;

    formCard.classList.add('hidden');
    qrCard.classList.remove('hidden');
}

function backToForm() {
    form.reset();
    const oldQr = document.getElementById('qrcode');
    if (oldQr) {
        oldQr.remove();
    }
    qrCard.classList.add('hidden');
    formCard.classList.remove('hidden');
}
