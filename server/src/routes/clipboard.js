const express = require('express');
const crypto = require('crypto');
const { execSync } = require('child_process');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.use(auth);

function readClipboard() {
  const raw = execSync(
    'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard"',
    { encoding: 'utf-8', timeout: 5000, windowsHide: true }
  );
  return raw;
}

// GET /api/clipboard — list all items (scroll-based, no pagination)
router.get('/', (req, res, next) => {
  try {
    const { search, date, sort = 'created_at', order = 'desc' } = req.query;

    const sortColumn = sort === 'char_count' ? 'char_count' : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.userId];

    if (search && search.trim()) {
      whereClause += ' AND truncated_preview LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    if (req.query.favorite === '1') {
      whereClause += ' AND is_favorite = 1';
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      whereClause += ' AND DATE(created_at) = ?';
      params.push(date);
    }

    const items = db.prepare(
      `SELECT id, truncated_preview, char_count, content, created_at, is_favorite
       FROM clipboard_items ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}`
    ).all(...params);

    res.json({
      success: true,
      data: { items },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/clipboard/capture — read system clipboard, deduplicate, store
router.post('/capture', (req, res, next) => {
  try {
    let content;
    try {
      content = readClipboard();
    } catch {
      return res.json({
        success: true,
        data: { duplicate: false, message: '剪贴板内容不是文本格式。' },
      });
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return res.json({
        success: true,
        data: { duplicate: false, message: '剪贴板为空。' },
      });
    }

    const hash = crypto.createHash('sha256').update(trimmed).digest('hex');

    const latest = db.prepare(
      'SELECT id, content_hash, created_at FROM clipboard_items WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(req.user.userId);

    if (latest && latest.content_hash === hash) {
      return res.json({
        success: true,
        data: {
          duplicate: true,
          item: { id: latest.id, created_at: latest.created_at },
        },
      });
    }

    const truncated_preview = trimmed.slice(0, 100);
    const char_count = trimmed.length;

    const result = db.prepare(
      'INSERT INTO clipboard_items (user_id, content, content_hash, truncated_preview, char_count) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.userId, trimmed, hash, truncated_preview, char_count);

    const item = db.prepare(
      'SELECT id, content, truncated_preview, char_count, created_at, is_favorite FROM clipboard_items WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: { duplicate: false, item },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/clipboard/:id — get single item with full content
router.get('/:id', (req, res, next) => {
  try {
    const item = db.prepare(
      'SELECT id, content, truncated_preview, char_count, created_at, is_favorite FROM clipboard_items WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!item) {
      throw new AppError(404, '记录不存在。');
    }

    res.json({ success: true, data: { item } });
  } catch (err) {
    next(err);
  }
});

// POST /api/clipboard/:id/copy — return content for client-side clipboard write
router.post('/:id/copy', (req, res, next) => {
  try {
    const item = db.prepare(
      'SELECT id, content FROM clipboard_items WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!item) {
      throw new AppError(404, '记录不存在。');
    }

    db.prepare('UPDATE clipboard_items SET created_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.id);

    res.json({ success: true, data: { content: item.content } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/clipboard/:id — toggle favorite
router.patch('/:id', (req, res, next) => {
  try {
    const item = db.prepare(
      'SELECT id, is_favorite FROM clipboard_items WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!item) {
      throw new AppError(404, '记录不存在。');
    }

    const newValue = item.is_favorite ? 0 : 1;
    db.prepare('UPDATE clipboard_items SET is_favorite = ? WHERE id = ?')
      .run(newValue, req.params.id);

    const updated = db.prepare(
      'SELECT id, truncated_preview, char_count, created_at, is_favorite FROM clipboard_items WHERE id = ?'
    ).get(req.params.id);

    res.json({ success: true, data: { item: updated } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clipboard/:id — delete single item
router.delete('/:id', (req, res, next) => {
  try {
    const existing = db.prepare(
      'SELECT id FROM clipboard_items WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!existing) {
      throw new AppError(404, '记录不存在。');
    }

    db.prepare('DELETE FROM clipboard_items WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: '记录已删除。' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clipboard — clear all items for current user
router.delete('/', (req, res, next) => {
  try {
    db.prepare('DELETE FROM clipboard_items WHERE user_id = ?').run(req.user.userId);

    res.json({ success: true, message: '已清空所有记录。' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
