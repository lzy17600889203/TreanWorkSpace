const express = require('express');
const db = require('./db');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/rooms', (req, res) => {
  const rooms = db.prepare('SELECT * FROM meeting_rooms').all();
  res.json(rooms);
});

app.get('/api/bookings', (req, res) => {
  const { date, room_id } = req.query;
  let query = 'SELECT * FROM bookings JOIN meeting_rooms ON bookings.room_id = meeting_rooms.id';
  const params = [];
  
  if (date) {
    query += ' WHERE bookings.date = ?';
    params.push(date);
    if (room_id) {
      query += ' AND bookings.room_id = ?';
      params.push(room_id);
    }
  } else if (room_id) {
    query += ' WHERE bookings.room_id = ?';
    params.push(room_id);
  }
  
  const bookings = db.prepare(query).all(...params);
  res.json(bookings);
});

app.post('/api/book', (req, res) => {
  const { room_id, applicant, date, start_time, end_time } = req.body;
  
  if (!room_id || !applicant || !date || !start_time || !end_time) {
    return res.status(400).json({ success: false, message: '所有字段都是必填项' });
  }
  
  const startParts = start_time.split(':');
  const endParts = end_time.split(':');
  const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
  const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
  
  if (isNaN(startMinutes) || isNaN(endMinutes)) {
    return res.status(400).json({ success: false, message: '时间格式错误' });
  }
  
  if (endMinutes <= startMinutes) {
    return res.status(400).json({ success: false, message: '结束时间必须晚于开始时间' });
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ success: false, message: '日期格式错误，应为YYYY-MM-DD' });
  }
  
  const checkBooking = db.prepare(`
    SELECT * FROM bookings 
    WHERE room_id = ? AND date = ? 
    AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))
  `);
  
  const conflicts = checkBooking.all(room_id, date, end_time, start_time, end_time, start_time);
  
  if (conflicts.length > 0) {
    return res.status(409).json({ 
      success: false, 
      message: '该时间段已被预订',
      conflicts: conflicts 
    });
  }
  
  try {
    const insert = db.prepare('INSERT INTO bookings (room_id, applicant, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
    const result = insert.run(room_id, applicant, date, start_time, end_time);
    
    const newBooking = db.prepare('SELECT * FROM bookings JOIN meeting_rooms ON bookings.room_id = meeting_rooms.id WHERE bookings.id = ?').get(result.lastInsertRowid);
    
    res.json({ 
      success: true, 
      message: '预订成功',
      booking: newBooking 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '预订失败: ' + error.message });
  }
});

app.delete('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ success: false, message: '无效的预订ID' });
  }
  
  const deleteBooking = db.prepare('DELETE FROM bookings WHERE id = ?');
  const result = deleteBooking.run(id);
  
  if (result.changes > 0) {
    res.json({ success: true, message: '取消预订成功' });
  } else {
    res.status(404).json({ success: false, message: '未找到该预订' });
  }
});

app.post('/api/scenario', (req, res) => {
  const { scenario } = req.body;
  
  db.prepare('DELETE FROM bookings').run();
  
  let message = '';
  
  if (scenario === 'available') {
    const rooms = db.prepare('SELECT id FROM meeting_rooms').all();
    const monday = getWeekdayDate(1);
    const tuesday = getWeekdayDate(2);
    const wednesday = getWeekdayDate(3);
    
    const insert = db.prepare('INSERT INTO bookings (room_id, applicant, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
    
    insert.run(rooms[0].id, '张三', monday, '09:00', '10:00');
    insert.run(rooms[1].id, '李四', tuesday, '14:00', '15:30');
    insert.run(rooms[2].id, '王五', wednesday, '10:30', '12:00');
    
    message = '已加载「空闲充足的周一至周三」场景';
  } else if (scenario === 'full') {
    const rooms = db.prepare('SELECT id FROM meeting_rooms').all();
    const friday = getWeekdayDate(5);
    
    const insert = db.prepare('INSERT INTO bookings (room_id, applicant, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
    
    insert.run(rooms[0].id, '赵六', friday, '13:00', '14:00');
    insert.run(rooms[1].id, '孙七', friday, '13:00', '14:30');
    insert.run(rooms[2].id, '周八', friday, '14:00', '15:30');
    insert.run(rooms[3].id, '吴九', friday, '15:00', '16:30');
    insert.run(rooms[0].id, '郑十', friday, '14:00', '15:00');
    insert.run(rooms[1].id, '王十一', friday, '15:30', '17:00');
    
    message = '已加载「全部爆满的周五下午」场景';
  } else if (scenario === 'conflict') {
    const rooms = db.prepare('SELECT id FROM meeting_rooms').all();
    const today = new Date().toISOString().split('T')[0];
    
    const insert = db.prepare('INSERT INTO bookings (room_id, applicant, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
    
    insert.run(rooms[0].id, '用户A', today, '10:00', '11:30');
    insert.run(rooms[0].id, '用户B', today, '11:00', '12:00');
    insert.run(rooms[0].id, '用户C', today, '10:30', '11:30');
    
    message = '已加载「时间重叠的冲突预订」场景';
  } else if (scenario === 'overnight') {
    const rooms = db.prepare('SELECT id FROM meeting_rooms').all();
    const today = new Date().toISOString().split('T')[0];
    
    const insert = db.prepare('INSERT INTO bookings (room_id, applicant, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
    
    insert.run(rooms[0].id, '加班团队', today, '22:00', '02:00');
    
    message = '已加载「跨越午夜的超长会议」场景';
  } else {
    message = '场景已清空';
  }
  
  res.json({ success: true, message });
});

function getWeekdayDate(weekday) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToAdd = (weekday - dayOfWeek + 7) % 7 || 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysToAdd);
  return targetDate.toISOString().split('T')[0];
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});