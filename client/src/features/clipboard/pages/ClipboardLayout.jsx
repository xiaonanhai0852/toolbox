import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../styles/clipboard.css';
import { get, post, patch, del } from '../../../shared/api/client';
import Toolbar from '../components/Toolbar';
import ClipboardCard from '../components/ClipboardCard';
import ConfirmDialog from '../components/ConfirmDialog';

const POLL_INTERVAL_MS = 5000;

function getBeijingDate(date = new Date()) {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
}

function formatDateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}

function groupByDate(items) {
  const groups = [];
  const now = getBeijingDate();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  for (const item of items) {
    const utcDate = new Date(item.created_at + 'Z');
    const d = getBeijingDate(utcDate);
    const dateKey = formatDateKey(d);

    let label;
    const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (itemDate.getTime() === today.getTime()) {
      label = '今天';
    } else if (itemDate.getTime() === yesterday.getTime()) {
      label = '昨天';
    } else {
      label = dateKey;
    }

    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, dateKey, items: [item] });
    }
  }
  return groups;
}

export default function ClipboardLayout() {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');
  const [autoMonitoring, setAutoMonitoring] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [clearAllTarget, setClearAllTarget] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);

  const pollTimerRef = useRef(null);
  const fetchIdRef = useRef(0);

  const fetchDates = useCallback(() => {
    get('/api/clipboard/dates')
      .then((data) => setAvailableDates(data.dates))
      .catch(() => {});
  }, []);

  const fetchItems = useCallback(() => {
    const id = ++fetchIdRef.current;
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (favoriteFilter) params.set('favorite', '1');
    if (dateFilter) params.set('date', dateFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    get(`/api/clipboard?${params}`)
      .then((data) => {
        if (id === fetchIdRef.current) {
          setItems(data.items);
        }
      })
      .catch((err) => setError(err.message));
  }, [searchTerm, favoriteFilter, dateFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchItems();
    fetchDates();
  }, [fetchItems, fetchDates]);

  const captureOnce = useCallback(async () => {
    try {
      const data = await post('/api/clipboard/capture');
      if (!data.duplicate && data.item) {
        setItems((prev) => [data.item, ...prev]);
        fetchDates();
      }
    } catch (err) {
      if (err.message) setError(err.message);
    }
  }, [fetchDates]);

  useEffect(() => {
    if (autoMonitoring) {
      pollTimerRef.current = setInterval(() => {
        captureOnce();
      }, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [autoMonitoring, captureOnce]);

  function handleCapture() {
    setCapturing(true);
    captureOnce().finally(() => setCapturing(false));
  }

  async function handleCopy(id) {
    try {
      const data = await post(`/api/clipboard/${id}/copy`);
      await navigator.clipboard.writeText(data.content);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleToggleFavorite(id) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, is_favorite: it.is_favorite ? 0 : 1 } : it
      )
    );
    patch(`/api/clipboard/${id}`).catch((err) => {
      setError(err.message);
      fetchItems();
    });
  }

  function handleDelete(id) {
    setDeleteTargetId(id);
  }

  async function confirmDelete() {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await del(`/api/clipboard/${id}`);
      fetchItems();
      fetchDates();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleClearAll() {
    setClearAllTarget(true);
  }

  async function confirmClearAll() {
    setClearAllTarget(false);
    try {
      await del('/api/clipboard');
      setItems([]);
      setAvailableDates([]);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSearch(term) {
    setSearchTerm(term);
  }

  function handleToggleAutoMonitoring() {
    setAutoMonitoring((prev) => !prev);
  }

  function handleToggleFavoritesFilter() {
    setFavoriteFilter((prev) => !prev);
  }

  function handleDateFilterChange({ date, dateFrom, dateTo }) {
    setDateFilter(date);
    setDateFrom(dateFrom);
    setDateTo(dateTo);
  }

  const groups = useMemo(() => groupByDate(items), [items]);
  const hasDateFilter = dateFilter || dateFrom;

  return (
    <div className="clipboard-layout">
      {error && (
        <div className="error-banner" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            &times;
          </button>
        </div>
      )}

      <Toolbar
        autoMonitoring={autoMonitoring}
        capturing={capturing}
        favoriteFilter={favoriteFilter}
        dateFilter={dateFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearch={handleSearch}
        onCapture={handleCapture}
        onClearAll={handleClearAll}
        onToggleAutoMonitoring={handleToggleAutoMonitoring}
        onToggleFavoritesFilter={handleToggleFavoritesFilter}
        onDateFilterChange={handleDateFilterChange}
      />

      <div className="clipboard-scroll">
        <div className="clipboard-scroll-inner">
          {groups.length === 0 ? (
            <div className="clipboard-grid-empty">
              {hasDateFilter ? '该日期无剪贴板记录' : '暂无剪贴板记录，点击「捕获剪贴板」开始记录。'}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.dateKey} className="day-group">
                <div className="day-divider">
                  <span className="day-divider-label">{group.label}</span>
                  <span className="day-divider-count">{group.items.length} 条</span>
                </div>
                <div className="clipboard-grid">
                  {group.items.map((item) => (
                    <ClipboardCard
                      key={item.id}
                      item={item}
                      onToggleFavorite={handleToggleFavorite}
                      onCopy={handleCopy}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {availableDates.length > 0 && dateFilter && (
        <div className="date-nav">
          <button
            className="date-nav-btn"
            disabled={!dateFilter || availableDates.indexOf(dateFilter) >= availableDates.length - 1}
            onClick={() => {
              const idx = availableDates.indexOf(dateFilter);
              if (idx < 0) {
                handleDateFilterChange({ date: availableDates[availableDates.length - 1], dateFrom: '', dateTo: '' });
              } else if (idx < availableDates.length - 1) {
                handleDateFilterChange({ date: availableDates[idx + 1], dateFrom: '', dateTo: '' });
              }
            }}
          >
            ‹
          </button>
          <button
            className="date-nav-current"
            onClick={() => {
              if (dateFilter) {
                handleDateFilterChange({ date: '', dateFrom: '', dateTo: '' });
              }
            }}
          >
            {dateFilter || '全部记录'}
          </button>
          <button
            className="date-nav-btn"
            disabled={!dateFilter || availableDates.indexOf(dateFilter) <= 0}
            onClick={() => {
              const idx = availableDates.indexOf(dateFilter);
              if (idx > 0) {
                handleDateFilterChange({ date: availableDates[idx - 1], dateFrom: '', dateTo: '' });
              }
            }}
          >
            ›
          </button>
        </div>
      )}

      {deleteTargetId && (
        <ConfirmDialog
          title="删除记录"
          message="确认删除这条剪贴板记录？此操作不可撤销。"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}

      {clearAllTarget && (
        <ConfirmDialog
          title="清空全部记录"
          message="确认清空所有剪贴板记录？此操作不可撤销。"
          confirmLabel="确认清空"
          onConfirm={confirmClearAll}
          onCancel={() => setClearAllTarget(false)}
        />
      )}
    </div>
  );
}
