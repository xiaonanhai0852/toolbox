import SearchBar from './SearchBar';
import NoteList from './NoteList';
import FolderTree from './FolderTree';

export default function Sidebar({
  notes,
  selectedNoteId,
  folders,
  selectedFolderId,
  pagination,
  sort,
  order,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onSearch,
  onSortChange,
  onPageChange,
  onSelectFolder,
  onFolderChange,
  onDropNote,
}) {
  const { page, totalPages } = pagination;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
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

      <FolderTree
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={onSelectFolder}
        onFolderChange={onFolderChange}
        onDropNote={onDropNote}
      />

      <NoteList
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelectNote={onSelectNote}
        onDeleteNote={onDeleteNote}
      />

      {totalPages > 1 && (
        <div className="sidebar-pagination">
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
