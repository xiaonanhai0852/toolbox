import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import NoteList from './NoteList';
import BatchToolbar from './BatchToolbar';

const SORT_OPTIONS = [
  { value: 'updated_at::desc', label: '最后修改', icon: '↓' },
  { value: 'updated_at::asc', label: '最后修改', icon: '↑' },
  { value: 'created_at::desc', label: '创建时间', icon: '↓' },
  { value: 'created_at::asc', label: '创建时间', icon: '↑' },
];

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
  folderPanelCollapsed,
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
  onToggleFolderPanel,
}) {
  const { page, totalPages } = pagination;
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentSort = SORT_OPTIONS.find(o => o.value === `${sort}::${order}`);

  const handleSortSelect = useCallback((value) => {
    const [s, o] = value.split('::');
    onSortChange(s, o);
    setSortDropdownOpen(false);
  }, [onSortChange]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <div className="note-panel-header-top">
            {folderPanelCollapsed && (
              <button className="btn-toggle-folder" onClick={onToggleFolderPanel} title="展开文件夹">
                ›
              </button>
            )}
            <h2>笔记</h2>
          </div>
          <div className="sort-row" ref={dropdownRef}>
            <button
              className="sort-select"
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            >
              <span className="sort-select-text">{currentSort?.label}</span>
              <span className="sort-select-arrow">▾</span>
            </button>
            {sortDropdownOpen && (
              <div className="sort-dropdown">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`sort-dropdown-item ${option.value === `${sort}::${order}` ? 'active' : ''}`}
                    onClick={() => handleSortSelect(option.value)}
                  >
                    <span>{option.label}</span>
                    <span className="sort-dropdown-icon">{option.icon}</span>
                  </button>
                ))}
              </div>
            )}
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
