import { memo, useMemo } from 'react';
import NoteList from './NoteList';
import BatchToolbar from './BatchToolbar';

const NotePanel = memo(function NotePanel({
  notes,
  selectedNoteId,
  pagination,
  sort,
  order,
  searchTerm,
  isBatchMode,
  selectedNoteIds,
  folders,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onSortChange,
  onPageChange,
  onEnterBatchMode,
  onExitBatchMode,
  onBatchToggle,
  onSelectAll,
  onDeselectAll,
  onBatchMove,
  onBatchDelete,
}) {
  const { page, totalPages } = pagination;

  const allSelected = useMemo(
    () => notes.length > 0 && notes.every((n) => selectedNoteIds.has(n.id)),
    [notes, selectedNoteIds],
  );

  return (
    <div className={`note-panel${isBatchMode ? ' batch-mode' : ''}`}>
      {isBatchMode ? (
        <BatchToolbar
          selectedCount={selectedNoteIds.size}
          totalCount={notes.length}
          allSelected={allSelected}
          folders={folders}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
          onMove={onBatchMove}
          onDelete={onBatchDelete}
          onCancel={onExitBatchMode}
        />
      ) : (
        <div className="note-panel-header">
          <h2>笔记</h2>
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
          <div className="note-panel-header-actions">
            <button className="btn-new-note" onClick={onCreateNote}>
              + 新建笔记
            </button>
            <button className="btn-batch-mode" onClick={onEnterBatchMode} title="批量操作">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <NoteList
        notes={notes}
        selectedNoteId={selectedNoteId}
        isBatchMode={isBatchMode}
        selectedNoteIds={selectedNoteIds}
        onSelectNote={onSelectNote}
        onDeleteNote={onDeleteNote}
        onBatchToggle={onBatchToggle}
        onEnterBatchMode={onEnterBatchMode}
        searchTerm={searchTerm}
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
});

export default NotePanel;
