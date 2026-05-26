const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.use(auth);

router.get('/', (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, sort = 'updated_at', order = 'desc' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const sortColumn = sort === 'created_at' ? 'created_at' : 'updated_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.userId];

    if (search && search.trim()) {
      whereClause += ' AND title LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM notes ${whereClause}`
    ).get(...params);

    const notes = db.prepare(
      `SELECT id, title, content, format, created_at, updated_at
       FROM notes ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT ? OFFSET ?`
    ).all(...params, limitNum, offset);

    const total = countRow.total;

    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { title = '未命名', content = '', format = 'markdown' } = req.body;

    const result = db.prepare(
      'INSERT INTO notes (user_id, title, content, format) VALUES (?, ?, ?, ?)'
    ).run(req.user.userId, title, content, format);

    const note = db.prepare(
      'SELECT id, title, content, format, created_at, updated_at FROM notes WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: { note } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const note = db.prepare(
      'SELECT id, title, content, format, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!note) {
      throw new AppError(404, '笔记不存在。');
    }

    res.json({ success: true, data: { note } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const existing = db.prepare(
      'SELECT id FROM notes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!existing) {
      throw new AppError(404, '笔记不存在。');
    }

    const { title, content, format } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    if (format !== undefined) {
      updates.push('format = ?');
      params.push(format);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.params.id);

      db.prepare(
        `UPDATE notes SET ${updates.join(', ')} WHERE id = ?`
      ).run(...params);
    }

    const note = db.prepare(
      'SELECT id, title, content, format, created_at, updated_at FROM notes WHERE id = ?'
    ).get(req.params.id);

    res.json({ success: true, data: { note } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const existing = db.prepare(
      'SELECT id FROM notes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!existing) {
      throw new AppError(404, '笔记不存在。');
    }

    db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: '笔记已删除。' });
  } catch (err) {
    next(err);
  }
});

// ── Version control ──

router.post('/:id/versions', (req, res, next) => {
  try {
    const note = db.prepare(
      'SELECT id, title, content, format FROM notes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!note) {
      throw new AppError(404, '笔记不存在。');
    }

    const result = db.prepare(
      'INSERT INTO note_versions (note_id, title, content, format) VALUES (?, ?, ?, ?)'
    ).run(note.id, note.title, note.content, note.format);

    const version = db.prepare(
      'SELECT id, note_id, title, content, format, saved_at FROM note_versions WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: { version } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/versions', (req, res, next) => {
  try {
    const note = db.prepare(
      'SELECT id FROM notes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!note) {
      throw new AppError(404, '笔记不存在。');
    }

    const versions = db.prepare(
      `SELECT id, note_id, title, content, format, saved_at
       FROM note_versions
       WHERE note_id = ?
       ORDER BY saved_at DESC`
    ).all(req.params.id);

    res.json({ success: true, data: { versions } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/versions/:versionId', (req, res, next) => {
  try {
    const note = db.prepare(
      'SELECT id FROM notes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!note) {
      throw new AppError(404, '笔记不存在。');
    }

    const version = db.prepare(
      'SELECT id, note_id, title, content, format, saved_at FROM note_versions WHERE id = ? AND note_id = ?'
    ).get(req.params.versionId, req.params.id);

    if (!version) {
      throw new AppError(404, '版本不存在。');
    }

    res.json({ success: true, data: { version } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/versions/:versionId/restore', (req, res, next) => {
  try {
    const note = db.prepare(
      'SELECT id FROM notes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!note) {
      throw new AppError(404, '笔记不存在。');
    }

    const version = db.prepare(
      'SELECT id, title, content, format FROM note_versions WHERE id = ? AND note_id = ?'
    ).get(req.params.versionId, req.params.id);

    if (!version) {
      throw new AppError(404, '版本不存在。');
    }

    db.prepare(
      'UPDATE notes SET title = ?, content = ?, format = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(version.title, version.content, version.format, req.params.id);

    const updated = db.prepare(
      'SELECT id, title, content, format, created_at, updated_at FROM notes WHERE id = ?'
    ).get(req.params.id);

    res.json({ success: true, data: { note: updated } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
