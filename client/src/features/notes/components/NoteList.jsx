import NoteItem from './NoteItem';

export default function NoteList({
  notes,
  selectedNoteId,
  isBatchMode,
  selectedNoteIds,
  onSelectNote,
  onDeleteNote,
  onBatchToggle,
  onEnterBatchMode,
  searchTerm,
}) {
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
          isBatchMode={isBatchMode}
          isBatchSelected={selectedNoteIds.has(note.id)}
          onSelect={onSelectNote}
          onDelete={onDeleteNote}
          onBatchToggle={onBatchToggle}
          onEnterBatchMode={onEnterBatchMode}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
}
