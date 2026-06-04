import { useMemo } from 'react';
import SearchBar from './SearchBar';

function getBeijingDate(date = new Date()) {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getQuickDates() {
  const today = getBeijingDate();
  const todayStr = formatDate(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = formatDate(yesterday);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const wFrom = formatDate(weekStart);

  return [
    { label: '今天', date: todayStr },
    { label: '昨天', date: yStr },
    { label: '本周', dateFrom: wFrom, dateTo: todayStr },
  ];
}

export default function Toolbar({
  autoMonitoring,
  capturing,
  favoriteFilter,
  dateFilter,
  dateFrom,
  dateTo,
  onSearch,
  onCapture,
  onClearAll,
  onToggleAutoMonitoring,
  onToggleFavoritesFilter,
  onDateFilterChange,
}) {
  const quickDates = useMemo(() => getQuickDates(), []);

  const isQuickActive = (qd) => {
    if (qd.date) return dateFilter === qd.date;
    if (qd.dateFrom) return dateFrom === qd.dateFrom && dateTo === qd.dateTo;
    return false;
  };

  const handleQuickClick = (qd) => {
    if (isQuickActive(qd)) {
      onDateFilterChange({ date: '', dateFrom: '', dateTo: '' });
    } else if (qd.date) {
      onDateFilterChange({ date: qd.date, dateFrom: '', dateTo: '' });
    } else {
      onDateFilterChange({ date: '', dateFrom: qd.dateFrom, dateTo: qd.dateTo });
    }
  };

  const hasDateFilter = dateFilter || dateFrom;

  return (
    <div className="clipboard-toolbar">
      <SearchBar onSearch={onSearch} placeholder="搜索剪贴板记录..." />
      <div className="toolbar-group">
        <div className="date-filter-group">
          <input
            type="date"
            className="date-filter"
            value={dateFilter}
            onChange={(e) => onDateFilterChange({ date: e.target.value, dateFrom: '', dateTo: '' })}
          />
          {quickDates.map((qd) => (
            <button
              key={qd.label}
              className={`date-quick-btn${isQuickActive(qd) ? ' active' : ''}`}
              onClick={() => handleQuickClick(qd)}
            >
              {qd.label}
            </button>
          ))}
          {hasDateFilter && (
            <button
              className="date-clear-btn"
              onClick={() => onDateFilterChange({ date: '', dateFrom: '', dateTo: '' })}
              title="清除日期筛选"
            >
              ✕
            </button>
          )}
        </div>
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
