import { useState, useRef, useEffect } from 'react';

export default function BatchToolbar({
  selectedCount,
  totalCount,
  allSelected,
  folders,
  onSelectAll,
  onDeselectAll,
  onMove,
  onDelete,
  onCancel,
}) {
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowFolderMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleMove(folderId) {
    onMove(folderId);
    setShowFolderMenu(false);
  }

  return (
    <div className="batch-toolbar">
      <label className="batch-select-all">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => (e.target.checked ? onSelectAll() : onDeselectAll())}
        />
        <span>全选</span>
      </label>
      <span className="batch-count">已选 {selectedCount} 项</span>
      <div className="batch-actions">
        <div className="batch-move-wrapper" ref={menuRef}>
          <button
            className="batch-btn batch-btn-move"
            disabled={selectedCount === 0}
            onClick={() => setShowFolderMenu((v) => !v)}
          >
            移动到...
          </button>
          {showFolderMenu && (
            <div className="batch-folder-menu">
              <div
                className="batch-folder-option"
                onClick={() => handleMove(null)}
              >
                移出文件夹
              </div>
              {folders.map((f) => (
                <div
                  key={f.id}
                  className="batch-folder-option"
                  onClick={() => handleMove(f.id)}
                >
                  {f.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          className="batch-btn batch-btn-delete"
          disabled={selectedCount === 0}
          onClick={onDelete}
        >
          删除
        </button>
        <button className="batch-btn batch-btn-cancel" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
