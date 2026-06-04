const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.use(auth);

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 500000; // 500KB

router.get('/', (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, sort = 'updated_at', order = 'desc', folder_id } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const sortColumn = sort === 'created_at' ? 'created_at' : 'updated_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.userId];

    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[%_]/g, '\\$&');
      whereClause += ' AND title LIKE ? ESCAPE \'\\\'';
      params.push(`%${escapedSearch}%`);
    }

    if (folder_id !== undefined) {
      if (folder_id === 'null' || folder_id === '') {
        whereClause += ' AND folder_id IS NULL';
      } else {
        whereClause += ' AND folder_id = ?';
        params.push(parseInt(folder_id));
      }
    }

    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM notes ${whereClause}`
    ).get(...params);

    // 列表不返回完整内容，只返回前100字符预览
    const notes = db.prepare(
      `SELECT id, title, SUBSTR(content, 1, 100) as content_preview, format, folder_id, created_at, updated_at
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
    let { title = '未命名', content = '', format = 'markdown', folder_id } = req.body;

    // 输入长度验证
    if (title && title.length > MAX_TITLE_LENGTH) {
      throw new AppError(400, `标题长度不能超过${MAX_TITLE_LENGTH}个字符。`);
    }
    if (content && content.length > MAX_CONTENT_LENGTH) {
      throw new AppError(400, `内容长度不能超过${MAX_CONTENT_LENGTH / 1000}KB。`);
    }

    // 验证文件夹存在且属于当前用户
    if (folder_id) {
      const folder = db.prepare(
        'SELECT id FROM folders WHERE id = ? AND user_id = ?'
      ).get(folder_id, req.user.userId);

      if (!folder) {
        throw new AppError(404, '文件夹不存在。');
      }
    }

    const result = db.prepare(
      'INSERT INTO notes (user_id, title, content, format, folder_id) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.userId, title, content, format, folder_id || null);

    const note = db.prepare(
      'SELECT id, title, content, format, folder_id, created_at, updated_at FROM notes WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: { note } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const note = db.prepare(
      'SELECT id, title, content, format, folder_id, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?'
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
      'SELECT id, title, content, format, folder_id FROM notes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!existing) {
      throw new AppError(404, '笔记不存在。');
    }

    const { title, content, format, folder_id } = req.body;
    const updates = [];
    const params = [];
    let changed = false;

    if (title !== undefined) {
      if (title.length > MAX_TITLE_LENGTH) {
        throw new AppError(400, `标题长度不能超过${MAX_TITLE_LENGTH}个字符。`);
      }
      updates.push('title = ?');
      params.push(title);
      if (title !== existing.title) changed = true;
    }
    if (content !== undefined) {
      if (content.length > MAX_CONTENT_LENGTH) {
        throw new AppError(400, `内容长度不能超过${MAX_CONTENT_LENGTH / 1000}KB。`);
      }
      updates.push('content = ?');
      params.push(content);
      if (content !== existing.content) changed = true;
    }
    if (format !== undefined) {
      updates.push('format = ?');
      params.push(format);
      if (format !== existing.format) changed = true;
    }
    if (folder_id !== undefined) {
      // 验证文件夹存在且属于当前用户
      if (folder_id) {
        const folder = db.prepare(
          'SELECT id FROM folders WHERE id = ? AND user_id = ?'
        ).get(folder_id, req.user.userId);

        if (!folder) {
          throw new AppError(404, '文件夹不存在。');
        }
      }

      updates.push('folder_id = ?');
      params.push(folder_id || null);
      if (folder_id !== existing.folder_id) changed = true;
    }

    if (changed && updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.params.id);

      db.prepare(
        `UPDATE notes SET ${updates.join(', ')} WHERE id = ?`
      ).run(...params);
    }

    const note = db.prepare(
      'SELECT id, title, content, format, folder_id, created_at, updated_at FROM notes WHERE id = ?'
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

// 版本控制

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

router.delete('/:id/versions/:versionId', (req, res, next) => {
  try {
    const note = db.prepare(
      'SELECT id FROM notes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!note) {
      throw new AppError(404, '笔记不存在。');
    }

    const version = db.prepare(
      'SELECT id FROM note_versions WHERE id = ? AND note_id = ?'
    ).get(req.params.versionId, req.params.id);

    if (!version) {
      throw new AppError(404, '版本不存在。');
    }

    db.prepare('DELETE FROM note_versions WHERE id = ?').run(req.params.versionId);

    res.json({ success: true, message: '版本已删除。' });
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
