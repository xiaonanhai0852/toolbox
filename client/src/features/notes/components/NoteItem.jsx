export default function NoteItem({ note, isSelected, onSelect, onDelete }) {
  const date = new Date(note.updated_at + 'Z').toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  function handleDelete(e) {
    e.stopPropagation();
    onDelete(note.id);
  }

  return (
    <div
      className={`note-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(note.id)}
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
