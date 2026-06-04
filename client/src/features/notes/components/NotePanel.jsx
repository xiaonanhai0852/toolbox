import SearchBar from './SearchBar';
import NoteList from './NoteList';

export default function NotePanel({
  notes,
  selectedNoteId,
  pagination,
  sort,
  order,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onSearch,
  onSortChange,
  onPageChange,
}) {
  const { page, totalPages } = pagination;

  return (
    <div className="note-panel">
      <div className="note-panel-header">
        <h2>笔记</h2>
        <SearchBar onSearch={onSearch} />
        <div className="sort-row">
          <select
            className="sort-select"
            value={`${sort}::${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split('::');
              onSortChange(s, o);
            }}
          >
            <option value="updated_at::desc">最后修改 ↓</option>
            <option value="updated_at::asc">最后修改 ↑</option>
            <option value="created_at::desc">创建时间 ↓</option>
            <option value="created_at::asc">创建时间 ↑</option>
          </select>
        </div>
        <button className="btn-new-note" onClick={onCreateNote}>
          + 新建笔记
        </button>
      </div>

      <NoteList
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelectNote={onSelectNote}
        onDeleteNote={onDeleteNote}
      />

      {totalPages > 1 && (
        <div className="note-panel-pagination">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            上一页
          </button>
          <span>{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
