const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, JWT_SECRET } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/register', (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      throw new AppError(400, '用户名、邮箱和密码为必填项。');
    }

    if (password.length < 6) {
      throw new AppError(400, '密码长度不能少于6个字符。');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(400, '邮箱格式不正确。');
    }

    const existing = db.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).get(username, email);

    if (existing) {
      throw new AppError(409, '用户名或邮箱已被注册。');
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, passwordHash);

    const token = jwt.sign(
      { userId: result.lastInsertRowid, username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: result.lastInsertRowid, username, email },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, '用户名/邮箱和密码为必填项。');
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(email, email);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new AppError(401, '用户名/邮箱或密码错误。');
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, (req, res, next) => {
  try {
    const user = db.prepare(
      'SELECT id, username, email, created_at FROM users WHERE id = ?'
    ).get(req.user.userId);

    if (!user) {
      throw new AppError(404, '用户不存在。');
    }

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
