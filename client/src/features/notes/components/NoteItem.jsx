import { useRef } from 'react';

export default function NoteItem({ note, isSelected, onSelect, onDelete }) {
  const dragRef = useRef(null);

  const date = new Date(note.updated_at + 'Z').toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  function handleDelete(e) {
    e.stopPropagation();
    onDelete(note.id);
  }

  function handleDragStart(e) {
    e.dataTransfer.setData('text/note-id', note.id.toString());
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');

    const preview = document.createElement('div');
    preview.className = 'drag-preview';
    preview.textContent = note.title || '未命名';
    document.body.appendChild(preview);
    e.dataTransfer.setDragImage(preview, 10, 10);
    requestAnimationFrame(() => preview.remove());
  }

  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
  }

  return (
    <div
      ref={dragRef}
      className={`note-item${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(note.id)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="note-item-content">
        <div className="note-item-title">{note.title || '未命名'}</div>
        <div className="note-item-date">{date}</div>
      </div>
      <button
        className="note-item-delete"
        onClick={handleDelete}
        title="删除笔记"
      >
        &times;
      </button>
    </div>
  );
}
