import { useState, useCallback } from 'react';
import { post, put, del } from '../../../shared/api/client';

export default function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onFolderChange,
  onDropNote,
}) {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  const toggleExpand = useCallback((folderId) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    try {
      await post('/api/folders', {
        name: newFolderName.trim(),
        parent_id: newFolderParentId,
      });
      setNewFolderName('');
      setNewFolderParentId(null);
      setCreatingFolder(false);
      onFolderChange();
    } catch (err) {
      console.error('创建文件夹失败:', err);
    }
  }, [newFolderName, newFolderParentId, onFolderChange]);

  const handleUpdateFolder = useCallback(async (folderId) => {
    if (!editingName.trim()) return;

    try {
      await put(`/api/folders/${folderId}`, { name: editingName.trim() });
      setEditingFolderId(null);
      setEditingName('');
      onFolderChange();
    } catch (err) {
      console.error('更新文件夹失败:', err);
    }
  }, [editingName, onFolderChange]);

  const handleDeleteFolder = useCallback(async (folderId) => {
    if (!confirm('确定删除此文件夹？文件夹内的笔记将移出到根目录。')) return;

    try {
      await del(`/api/folders/${folderId}`);
      if (selectedFolderId === folderId) {
        onSelectFolder(null);
      }
      onFolderChange();
    } catch (err) {
      console.error('删除文件夹失败:', err);
    }
  }, [selectedFolderId, onSelectFolder, onFolderChange]);

  const handleDragOver = useCallback((e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  }, []);

  const handleDrop = useCallback((e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    const noteId = e.dataTransfer.getData('text/note-id');
    if (noteId) {
      onDropNote(parseInt(noteId), folderId);
    }
  }, [onDropNote]);

  const startCreatingFolder = useCallback((parentId = null) => {
    setCreatingFolder(true);
    setNewFolderParentId(parentId);
    setNewFolderName('');
  }, []);

  const startEditingFolder = useCallback((folder) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  }, []);

  const buildFolderTree = (parentId = null, level = 0) => {
    const children = folders.filter((f) => f.parent_id === parentId);

    if (children.length === 0) return null;

    return children.map((folder) => {
      const hasChildren = folders.some((f) => f.parent_id === folder.id);
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;
      const isDragOver = dragOverFolderId === folder.id;

      return (
        <div key={folder.id} className="folder-tree-item">
          <div
            className={`folder-item ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => onSelectFolder(isSelected ? null : folder.id)}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
          >
            {hasChildren ? (
              <span
                className={`folder-expand ${isExpanded ? 'expanded' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(folder.id);
                }}
              >
                ▶
              </span>
            ) : (
              <span className="folder-expand-placeholder" />
            )}

            {editingFolderId === folder.id ? (
              <input
                className="folder-name-input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleUpdateFolder(folder.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateFolder(folder.id);
                  if (e.key === 'Escape') {
                    setEditingFolderId(null);
                    setEditingName('');
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <span className="folder-name">
                📁 {folder.name}
              </span>
            )}

            <span className="folder-actions">
              <button
                className="folder-action-btn"
                title="新建子文件夹"
                onClick={(e) => {
                  e.stopPropagation();
                  startCreatingFolder(folder.id);
                }}
              >
                +
              </button>
              <button
                className="folder-action-btn"
                title="重命名"
                onClick={(e) => {
                  e.stopPropagation();
                  startEditingFolder(folder);
                }}
              >
                ✏️
              </button>
              <button
                className="folder-action-btn"
                title="删除"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder.id);
                }}
              >
                🗑️
              </button>
            </span>
          </div>

          {isExpanded && hasChildren && (
            <div className="folder-children">
              {buildFolderTree(folder.id, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="folder-tree">
      <div className="folder-tree-header">
        <span className="folder-tree-title">文件夹</span>
        <button
          className="folder-add-btn"
          title="新建文件夹"
          onClick={() => startCreatingFolder(null)}
        >
          +
        </button>
      </div>

      <div
        className={`folder-root ${selectedFolderId === null ? 'selected' : ''} ${dragOverFolderId === null ? 'drag-over' : ''}`}
        onClick={() => onSelectFolder(null)}
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
      >
        📋 全部笔记
      </div>

      {creatingFolder && (
        <div className="folder-create-form" style={{ paddingLeft: '8px' }}>
          <input
            className="folder-name-input"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') {
                setCreatingFolder(false);
                setNewFolderName('');
              }
            }}
            placeholder="文件夹名称..."
            autoFocus
          />
        </div>
      )}

      {buildFolderTree()}

      <div className="folder-tree-footer">
        <button
          className="folder-add-root-btn"
          onClick={() => startCreatingFolder(null)}
        >
          + 新建文件夹
        </button>
      </div>
    </div>
  );
}
