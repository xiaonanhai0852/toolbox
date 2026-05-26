import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../styles/clipboard.css';
import { get, post, patch, del } from '../../../shared/api/client';
import Toolbar from '../components/Toolbar';
import ClipboardCard from '../components/ClipboardCard';
import ConfirmDialog from '../components/ConfirmDialog';

function groupByDate(items) {
  const groups = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  for (const item of items) {
    const d = new Date(item.created_at + 'Z');
    const dateKey = d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

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
  const [error, setError] = useState('');
  const [autoMonitoring, setAutoMonitoring] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [clearAllTarget, setClearAllTarget] = useState(false);

  const pollTimerRef = useRef(null);
  const fetchIdRef = useRef(0);

  const fetchItems = useCallback(() => {
    const id = ++fetchIdRef.current;
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (favoriteFilter) params.set('favorite', '1');
    if (dateFilter) params.set('date', dateFilter);

    get(`/api/clipboard?${params}`)
      .then((data) => {
        if (id === fetchIdRef.current) {
          setItems(data.items);
        }
      })
      .catch((err) => setError(err.message));
  }, [searchTerm, favoriteFilter, dateFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const captureOnce = useCallback(async () => {
    try {
      const data = await post('/api/clipboard/capture');
      if (!data.duplicate && data.item) {
        setItems((prev) => [data.item, ...prev]);
      }
    } catch (err) {
      if (err.message) setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (autoMonitoring) {
      pollTimerRef.current = setInterval(() => {
        captureOnce();
      }, 2000);
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

  function handleDateFilterChange(value) {
    setDateFilter(value);
  }

  const groups = useMemo(() => groupByDate(items), [items]);

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
              暂无剪贴板记录，点击「捕获剪贴板」开始记录。
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
