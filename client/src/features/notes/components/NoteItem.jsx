import { useRef, memo, useCallback, useMemo } from 'react';

const NoteItem = memo(function NoteItem({
  note,
  isSelected,
  isBatchMode,
  isBatchSelected,
  onSelect,
  onDelete,
  onBatchToggle,
  onEnterBatchMode,
  searchTerm,
}) {
  const longPressTimer = useRef(null);
  const dragPreviewRef = useRef(null);

  const date = useMemo(
    () => new Date(note.updated_at + 'Z').toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    [note.updated_at],
  );

  const titleRegex = useMemo(() => {
    if (!searchTerm || !note.title) return null;
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(${escaped})`, 'gi');
  }, [searchTerm, note.title]);

  const renderedTitle = useMemo(() => {
    if (!titleRegex || !note.title) return note.title || '未命名';
    const parts = note.title.split(titleRegex);
    const testRegex = new RegExp(`^${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    return parts.map((part, i) =>
      testRegex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part,
    );
  }, [titleRegex, note.title, searchTerm]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete(note.id);
  }, [onDelete, note.id]);

  const handleClick = useCallback(() => {
    if (isBatchMode) {
      onBatchToggle(note.id);
    } else {
      onSelect(note.id);
    }
  }, [isBatchMode, onBatchToggle, onSelect, note.id]);

  const handleCheckboxChange = useCallback((e) => {
    e.stopPropagation();
    onBatchToggle(note.id);
  }, [onBatchToggle, note.id]);

  const handleDragStart = useCallback((e) => {
    e.dataTransfer.setData('text/note-id', note.id.toString());
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');

    const preview = document.createElement('div');
    preview.className = 'drag-preview';
    preview.textContent = note.title || '未命名';
    document.body.appendChild(preview);
    e.dataTransfer.setDragImage(preview, 10, 10);
    dragPreviewRef.current = preview;
  }, [note.id, note.title]);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('dragging');
    if (dragPreviewRef.current) {
      dragPreviewRef.current.remove();
      dragPreviewRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      if (!isBatchMode) {
        if (onEnterBatchMode) onEnterBatchMode();
        onBatchToggle(note.id);
      }
    }, 600);
  }, [isBatchMode, onEnterBatchMode, onBatchToggle, note.id]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div
      className={`note-item${isSelected ? ' selected' : ''}${isBatchSelected ? ' batch-selected' : ''}`}
      onClick={handleClick}
      draggable={!isBatchMode}
      onDragStart={!isBatchMode ? handleDragStart : undefined}
      onDragEnd={!isBatchMode ? handleDragEnd : undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {isBatchMode && (
        <label className="note-item-checkbox" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isBatchSelected}
            onChange={handleCheckboxChange}
          />
        </label>
      )}
      <div className="note-item-content">
        <div className="note-item-title">{renderedTitle}</div>
        <div className="note-item-date">{date}</div>
      </div>
      {!isBatchMode && (
        <button
          className="note-item-delete"
          onClick={handleDelete}
          title="删除笔记"
        >
          &times;
        </button>
      )}
    </div>
  );
});

export default NoteItem;
