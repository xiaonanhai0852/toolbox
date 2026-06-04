import { useState, useCallback, useRef } from 'react';
import { post, put, del } from '../../../shared/api/client';
import SearchBar from './SearchBar';

const ALL_NOTES_HOVER_ID = 'all';

export default function FolderPanel({
  folders,
  selectedFolderId,
  onSelectFolder,
  onFolderChange,
  onDropNote,
  onSearch,
  collapsed,
  onToggleCollapse,
}) {
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      await post('/api/folders', { name: newFolderName.trim() });
      setNewFolderName('');
      setCreatingFolder(false);
      onFolderChange();
    } catch (err) {
      console.error('创建文件夹失败:', err);
    }
  }, [newFolderName, onFolderChange]);

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
      const folderName = folderId === null
        ? '全部笔记'
        : (folders.find(f => f.id === folderId)?.name || '文件夹');
      showToast(`已移至「${folderName}」`);
    }
  }, [onDropNote, folders, showToast]);

  return (
    <div className="folder-panel">
      <div className="folder-panel-header">
        <span className="folder-panel-title">文件夹</span>
        <div style={{ display: 'flex', gap: '0.125rem' }}>
          <button
            className="folder-add-btn"
            title="新建文件夹"
            onClick={() => { setCreatingFolder(true); setNewFolderName(''); }}
          >
            +
          </button>
          <button
            className="folder-collapse-btn"
            title="折叠文件夹面板"
            onClick={onToggleCollapse}
          >
            ‹
          </button>
        </div>
      </div>

      <div className="folder-panel-search">
        <SearchBar onSearch={onSearch} />
      </div>

      <div className="folder-panel-list">
        <div
          className={`folder-panel-item ${selectedFolderId === null ? 'selected' : ''} ${dragOverFolderId === ALL_NOTES_HOVER_ID ? 'drag-over' : ''}`}
          onClick={() => onSelectFolder(null)}
          onDragOver={(e) => handleDragOver(e, ALL_NOTES_HOVER_ID)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
        >
          <span className="folder-panel-item-icon">📋</span>
          <span className="folder-panel-item-name" title="全部笔记">全部笔记</span>
        </div>

        {creatingFolder && (
          <div className="folder-create-form">
            <input
              className="folder-name-input"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
              }}
              placeholder="文件夹名称..."
              autoFocus
            />
          </div>
        )}

        {folders.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          const isDragOver = dragOverFolderId === folder.id;

          return (
            <div
              key={folder.id}
              className={`folder-panel-item ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
              onClick={() => onSelectFolder(isSelected ? null : folder.id)}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id)}
            >
              <span className="folder-panel-item-icon">📁</span>

              {editingFolderId === folder.id ? (
                <input
                  className="folder-name-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleUpdateFolder(folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateFolder(folder.id);
                    if (e.key === 'Escape') { setEditingFolderId(null); setEditingName(''); }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span className="folder-panel-item-name" title={folder.name}>{folder.name}</span>
              )}

              <span className="folder-actions">
                <button
                  className="folder-action-btn"
                  title="重命名"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolderId(folder.id);
                    setEditingName(folder.name);
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
          );
        })}
      </div>

      <div className="folder-panel-footer">
        <button
          className="folder-add-root-btn"
          onClick={() => { setCreatingFolder(true); setNewFolderName(''); }}
        >
          + 新建文件夹
        </button>
      </div>

      {toast && (
        <div className="drag-toast" key={toast}>
          <span className="drag-toast-icon">&#10003;</span>
          {toast}
        </div>
      )}
    </div>
  );
}
