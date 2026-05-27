const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.use(auth);

const MAX_FOLDER_NAME_LENGTH = 100;

// 获取所有文件夹（树形结构）
router.get('/', (req, res, next) => {
  try {
    const folders = db.prepare(
      `SELECT id, name, parent_id, created_at, updated_at
       FROM folders
       WHERE user_id = ?
       ORDER BY name`
    ).all(req.user.userId);

    res.json({ success: true, data: { folders } });
  } catch (err) {
    next(err);
  }
});

// 创建文件夹
router.post('/', (req, res, next) => {
  try {
    const { name, parent_id } = req.body;

    if (!name || !name.trim()) {
      throw new AppError(400, '文件夹名称不能为空。');
    }

    if (name.trim().length > MAX_FOLDER_NAME_LENGTH) {
      throw new AppError(400, `文件夹名称长度不能超过${MAX_FOLDER_NAME_LENGTH}个字符。`);
    }

    // 验证父文件夹存在且属于当前用户
    if (parent_id) {
      const parent = db.prepare(
        'SELECT id FROM folders WHERE id = ? AND user_id = ?'
      ).get(parent_id, req.user.userId);

      if (!parent) {
        throw new AppError(404, '父文件夹不存在。');
      }
    }

    const result = db.prepare(
      'INSERT INTO folders (user_id, name, parent_id) VALUES (?, ?, ?)'
    ).run(req.user.userId, name.trim(), parent_id || null);

    const folder = db.prepare(
      'SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: { folder } });
  } catch (err) {
    next(err);
  }
});

// 更新文件夹
router.put('/:id', (req, res, next) => {
  try {
    const existing = db.prepare(
      'SELECT id, name, parent_id FROM folders WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!existing) {
      throw new AppError(404, '文件夹不存在。');
    }

    const { name, parent_id } = req.body;

    if (name !== undefined && !name.trim()) {
      throw new AppError(400, '文件夹名称不能为空。');
    }

    if (name !== undefined && name.trim().length > MAX_FOLDER_NAME_LENGTH) {
      throw new AppError(400, `文件夹名称长度不能超过${MAX_FOLDER_NAME_LENGTH}个字符。`);
    }

    // 验证不能将文件夹移动到自己或自己的子文件夹下
    if (parent_id !== undefined) {
      if (parent_id === existing.id) {
        throw new AppError(400, '不能将文件夹移动到自己下面。');
      }

      if (parent_id) {
        const parent = db.prepare(
          'SELECT id FROM folders WHERE id = ? AND user_id = ?'
        ).get(parent_id, req.user.userId);

        if (!parent) {
          throw new AppError(404, '父文件夹不存在。');
        }

        // 检查是否是子文件夹（防止循环引用）
        const isChildFolder = checkIsChildFolder(existing.id, parent_id);
        if (isChildFolder) {
          throw new AppError(400, '不能将文件夹移动到自己的子文件夹下。');
        }
      }
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (parent_id !== undefined) {
      updates.push('parent_id = ?');
      params.push(parent_id || null);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.params.id);

      db.prepare(
        `UPDATE folders SET ${updates.join(', ')} WHERE id = ?`
      ).run(...params);
    }

    const folder = db.prepare(
      'SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE id = ?'
    ).get(req.params.id);

    res.json({ success: true, data: { folder } });
  } catch (err) {
    next(err);
  }
});

// 删除文件夹
router.delete('/:id', (req, res, next) => {
  try {
    const existing = db.prepare(
      'SELECT id FROM folders WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.userId);

    if (!existing) {
      throw new AppError(404, '文件夹不存在。');
    }

    db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: '文件夹已删除。' });
  } catch (err) {
    next(err);
  }
});

// 将笔记移动到文件夹
router.post('/:folderId/notes/:noteId', (req, res, next) => {
  try {
    const folder = db.prepare(
      'SELECT id FROM folders WHERE id = ? AND user_id = ?'
    ).get(req.params.folderId, req.user.userId);

    if (!folder) {
      throw new AppError(404, '文件夹不存在。');
    }

    const note = db.prepare(
      'SELECT id FROM notes WHERE id = ? AND user_id = ?'
    ).get(req.params.noteId, req.user.userId);

    if (!note) {
      throw new AppError(404, '笔记不存在。');
    }

    db.prepare(
      'UPDATE notes SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(req.params.folderId, req.params.noteId);

    res.json({ success: true, message: '笔记已移动到文件夹。' });
  } catch (err) {
    next(err);
  }
});

// 将笔记从文件夹移出
router.delete('/:folderId/notes/:noteId', (req, res, next) => {
  try {
    const note = db.prepare(
      'SELECT id FROM notes WHERE id = ? AND user_id = ? AND folder_id = ?'
    ).get(req.params.noteId, req.user.userId, req.params.folderId);

    if (!note) {
      throw new AppError(404, '笔记不在该文件夹中。');
    }

    db.prepare(
      'UPDATE notes SET folder_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(req.params.noteId);

    res.json({ success: true, message: '笔记已从文件夹移出。' });
  } catch (err) {
    next(err);
  }
});

// 检查是否是子文件夹
function checkIsChildFolder(parentId, potentialChildId) {
  const children = db.prepare(
    'SELECT id FROM folders WHERE parent_id = ?'
  ).all(parentId);

  for (const child of children) {
    if (child.id === potentialChildId) return true;
    if (checkIsChildFolder(child.id, potentialChildId)) return true;
  }

  return false;
}

module.exports = router;
