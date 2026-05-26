import SearchBar from './SearchBar';

export default function Toolbar({
  autoMonitoring,
  capturing,
  favoriteFilter,
  dateFilter,
  onSearch,
  onCapture,
  onClearAll,
  onToggleAutoMonitoring,
  onToggleFavoritesFilter,
  onDateFilterChange,
}) {
  return (
    <div className="clipboard-toolbar">
      <SearchBar onSearch={onSearch} placeholder="搜索剪贴板记录..." />
      <div className="toolbar-group">
        <input
          type="date"
          className="date-filter"
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
        />
        <button
          className={`favorite-filter-toggle${favoriteFilter ? ' active' : ''}`}
          onClick={onToggleFavoritesFilter}
        >
          {favoriteFilter ? '★' : '☆'} {favoriteFilter ? '仅收藏' : '全部'}
        </button>
        <button
          className={`auto-monitor-toggle${autoMonitoring ? ' active' : ''}`}
          onClick={onToggleAutoMonitoring}
        >
          <span className="auto-monitor-dot" />
          自动监控: {autoMonitoring ? '开' : '关'}
        </button>
      </div>
      <div className="toolbar-group">
        <button
          className="btn-capture"
          onClick={onCapture}
          disabled={capturing}
        >
          {capturing ? '捕获中...' : '捕获剪贴板'}
        </button>
        <button className="btn-clear-all" onClick={onClearAll}>
          清空全部
        </button>
      </div>
    </div>
  );
}
