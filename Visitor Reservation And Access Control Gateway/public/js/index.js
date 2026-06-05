const form = document.getElementById('reservationForm');
const formCard = document.getElementById('formCard');
const qrCard = document.getElementById('qrCard');
const qrcodeDiv = document.getElementById('qrcode');
const qrInfo = document.getElementById('qrInfo');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        company: document.getElementById('company').value,
        duration: parseInt(document.getElementById('duration').value)
    };

    try {
        const response = await fetch('/api/reservation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

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
    qrcodeDiv.innerHTML = '';
    
    QRCode.toCanvas(document.createElement('canvas'), data.qrCode, {
        width: 250,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, function(error, canvas) {
        if (error) {
            console.error(error);
            return;
        }
        qrcodeDiv.appendChild(canvas);
    });

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
    qrCard.classList.add('hidden');
    formCard.classList.remove('hidden');
}
