
const form = document.getElementById('reservationForm');
const formCard = document.getElementById('formCard');
const qrCard = document.getElementById('qrCard');
const qrcodeDiv = document.getElementById('qrcode');
const qrInfo = document.getElementById('qrInfo');

form.addEventListener('submit', async (e) =&gt; {
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
    // 清空之前的二维码
    qrcodeDiv.innerHTML = '';
    
    // 生成新的二维码
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

    // 显示预约信息
    const expiresAt = new Date(data.expiresAt);
    qrInfo.innerHTML = `
        &lt;p&gt;&lt;strong&gt;姓名：&lt;/strong&gt;${data.name}&lt;/p&gt;
        &lt;p&gt;&lt;strong&gt;公司：&lt;/strong&gt;${data.company}&lt;/p&gt;
        &lt;p&gt;&lt;strong&gt;有效期至：&lt;/strong&gt;${expiresAt.toLocaleString('zh-CN')}&lt;/p&gt;
    `;

    // 切换显示
    formCard.classList.add('hidden');
    qrCard.classList.remove('hidden');
}

function backToForm() {
    form.reset();
    qrCard.classList.add('hidden');
    formCard.classList.remove('hidden');
}

