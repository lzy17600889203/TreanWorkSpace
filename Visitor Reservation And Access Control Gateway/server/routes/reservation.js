const express = require('express');
const router = express.Router();
const { db, generateUUID } = require('../db/database');

router.post('/', function(req, res) {
  const name = req.body.name;
  const phone = req.body.phone;
  const company = req.body.company;
  const duration = req.body.duration || 30;

  if (!name || !phone || !company) {
    return res.status(400).json({
      success: false,
      message: '请填写完整信息'
    });
  }

  const id = generateUUID();
  const now = new Date();
  const visit = req.body.visitTime ? new Date(req.body.visitTime) : now;
  const expiresAt = new Date(visit.getTime() + duration * 60 * 1000);
  
  const qrCode = JSON.stringify({
    id: id,
    timestamp: now.getTime()
  });

  db.run('INSERT INTO reservations (id, name, phone, company, visitTime, createdAt, expiresAt, isBlacklist) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, name, phone, company, visit.toISOString(), now.toISOString(), expiresAt.toISOString(), 0], function(err) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '创建预约失败'
      });
    }

    res.json({
      success: true,
      data: {
        id: id,
        qrCode: qrCode,
        expiresAt: expiresAt.toISOString(),
        name: name,
        company: company
      }
    });
  });
});

module.exports = router;
