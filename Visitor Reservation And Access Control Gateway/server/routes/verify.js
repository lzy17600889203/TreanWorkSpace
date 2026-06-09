const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.post('/', function(req, res) {
  const qrCode = req.body.qrCode;

  if (!qrCode) {
    return res.status(400).json({
      success: false,
      status: 'error',
      message: '请提供二维码'
    });
  }

  let qrData;
  try {
    qrData = JSON.parse(qrCode);
  } catch (e) {
    qrData = { id: qrCode };
  }

  const id = qrData.id;
  if (!id) {
    return res.status(400).json({
      success: false,
      status: 'error',
      message: '无效的二维码'
    });
  }

  db.get('SELECT * FROM reservations WHERE id = ?', [id], function(err, row) {
    if (err || !row) {
      return res.status(404).json({
        success: false,
        status: 'error',
        message: '未找到预约记录'
      });
    }

    if (row.isBlacklist === 1) {
      return res.json({
        success: false,
        status: 'blacklist',
        message: '该人员已被标记为黑名单',
        data: {
          name: row.name,
          company: row.company,
          expiresAt: row.expiresAt
        }
      });
    }

    const now = new Date();
    const expiresAt = new Date(row.expiresAt);
    
    if (now > expiresAt) {
      const minutesAgo = Math.floor((now - expiresAt) / (1000 * 60));
      return res.json({
        success: false,
        status: 'expired',
        message: '该预约已于 ' + minutesAgo + ' 分钟前失效',
        data: {
          name: row.name,
          company: row.company,
          expiresAt: row.expiresAt
        }
      });
    }

    res.json({
      success: true,
      status: 'success',
      message: '核验通过',
      data: {
        name: row.name,
        company: row.company,
        expiresAt: row.expiresAt
      }
    });
  });
});

module.exports = router;
