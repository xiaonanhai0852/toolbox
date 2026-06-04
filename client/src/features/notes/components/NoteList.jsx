import NoteItem from './NoteItem';

export default function NoteList({ notes, selectedNoteId, onSelectNote, onDeleteNote, searchTerm }) {
  if (notes.length === 0) {
    return (
      <div className="note-list-empty">
        {searchTerm ? `没有找到包含「${searchTerm}」的笔记` : '暂无笔记，创建你的第一篇笔记吧！'}
      </div>
    );
  }

  return (
    <div className="note-list">
      {notes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          isSelected={note.id === selectedNoteId}
          onSelect={onSelectNote}
          onDelete={onDeleteNote}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
}
