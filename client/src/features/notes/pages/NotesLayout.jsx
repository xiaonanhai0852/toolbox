import { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/notes.css';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post, put, del } from '../../../shared/api/client';
import NotePanel from '../components/NotePanel';
import FolderPanel from '../components/FolderPanel';
import Editor from '../components/Editor';
import ConfirmDialog from '../components/ConfirmDialog';

export default function NotesLayout() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('updated_at');
  const [order, setOrder] = useState('desc');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(true);
  const [mobileView, setMobileView] = useState('notes');
  const [allNotesCount, setAllNotesCount] = useState(0);

  const noteRef = useRef(null);
  const saveTimerRef = useRef(null);
  const selectedIdRef = useRef(null);
  const fetchIdRef = useRef(0);
  const hasChangesRef = useRef(false);

  useEffect(() => {
    noteRef.current = selectedNote;
  }, [selectedNote]);

  useEffect(() => {
    selectedIdRef.current = selectedNote?.id;
    hasChangesRef.current = false;
  }, [selectedNote?.id]);

  const skipEffectRef = useRef(false);
  const folderIdRef = useRef(null);

  const fetchFolders = useCallback(() => {
    get('/api/folders')
      .then((data) => setFolders(data.folders))
      .catch((err) => setError(err.message));
  }, []);

  const fetchNotes = useCallback((overrides = {}) => {
    const id = ++fetchIdRef.current;
    const p = overrides.page ?? page;
    const s = overrides.sort ?? sort;
    const o = overrides.order ?? order;
    const f = overrides.folder_id !== undefined ? overrides.folder_id : folderIdRef.current;
    const params = new URLSearchParams({
      page: p,
      limit: 20,
      sort: s,
      order: o,
    });
    if (searchTerm) params.set('search', searchTerm);
    if (f !== null && f !== undefined) params.set('folder_id', f);

    get(`/api/notes?${params}`)
      .then((data) => {
        if (id === fetchIdRef.current) {
          setNotes(data.notes);
          setPagination(data.pagination);
          if (f === null || f === undefined) {
            setAllNotesCount(data.pagination.total);
          }
        }
      })
      .catch((err) => setError(err.message));
  }, [page, searchTerm, sort, order]);

  // Fetch on mount and when deps change (for search, page changes)
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    if (skipEffectRef.current) {
      skipEffectRef.current = false;
      return;
    }
    fetchNotes();
  }, [fetchNotes]);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const note = noteRef.current;
    if (!note) return;

    try {
      await put(`/api/notes/${note.id}`, {
        title: note.title,
        content: note.content,
        format: note.format,
      });
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const doSave = useCallback((note) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        await put(`/api/notes/${note.id}`, {
          title: note.title,
          content: note.content,
          format: note.format,
        });
        setSaving(false);
      } catch (err) {
        setError(err.message);
        setSaving(false);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    if (id) {
      get(`/api/notes/${id}`)
        .then((data) => setSelectedNote(data.note))
        .catch((err) => {
          setError(err.message);
          navigate('/tools/notes');
        });
    }
  }, [id, navigate]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const note = noteRef.current;
      if (!note) return;
      const token = localStorage.getItem('token');
      fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: note.title, content: note.content, format: note.format }),
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleSelectNote = useCallback(async (noteId) => {
    if (selectedNote && selectedNote.id !== noteId) {
      await flushSave();
      if (hasChangesRef.current && selectedNote.id) {
        try {
          await post(`/api/notes/${selectedNote.id}/versions`);
        } catch (err) {
          // 忽略版本保存失败
        }
        hasChangesRef.current = false;
      }
    }
    navigate(`/tools/notes/${noteId}`);
    if (window.innerWidth < 768) {
      setMobileView('editor');
    }
  }, [selectedNote, flushSave, navigate]);

  const handleCreateNote = useCallback(async () => {
    await flushSave();
    try {
      const data = await post('/api/notes', { title: '未命名', content: '', format: 'markdown' });
      setPage(1);
      skipEffectRef.current = true;
      fetchNotes({ page: 1 });
      fetchFolders();
      setAllNotesCount((prev) => prev + 1);
      navigate(`/tools/notes/${data.note.id}`);
      if (window.innerWidth < 768) {
        setMobileView('editor');
      }
    } catch (err) {
      setError(err.message);
    }
  }, [flushSave, fetchNotes, fetchFolders, navigate]);

  const handleDeleteNote = useCallback((noteId) => {
    setDeleteTargetId(noteId);
  }, []);

  const confirmDelete = useCallback(async () => {
    const noteId = deleteTargetId;
    setDeleteTargetId(null);
    await flushSave();

    try {
      await del(`/api/notes/${noteId}`);
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        navigate('/tools/notes');
      }
      fetchNotes();
      fetchFolders();
      setAllNotesCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message);
    }
  }, [deleteTargetId, flushSave, selectedNote, navigate, fetchNotes, fetchFolders]);

  const handleTitleChange = useCallback((newTitle) => {
    hasChangesRef.current = true;
    setSelectedNote((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, title: newTitle };
      doSave(updated);
      return updated;
    });
  }, [doSave]);

  const handleContentChange = useCallback((newContent) => {
    hasChangesRef.current = true;
    setSelectedNote((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, content: newContent };
      doSave(updated);
      return updated;
    });
  }, [doSave]);

  const handleFormatChange = useCallback((newFormat) => {
    hasChangesRef.current = true;
    setSelectedNote((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, format: newFormat };
      doSave(updated);
      return updated;
    });
  }, [doSave]);

  const handleExitEdit = useCallback(async () => {
    if (selectedNote && hasChangesRef.current) {
      await flushSave();
      try {
        await post(`/api/notes/${selectedNote.id}/versions`);
      } catch (err) {
        // 忽略版本保存失败
      }
      hasChangesRef.current = false;
    }
  }, [selectedNote, flushSave]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((newSort, newOrder) => {
    setSort(newSort);
    setOrder(newOrder);
    setPage(1);
    skipEffectRef.current = true;
    fetchNotes({ page: 1, sort: newSort, order: newOrder });
  }, [fetchNotes]);

  const handleSelectFolder = useCallback((folderId) => {
    setSelectedFolderId(folderId);
    folderIdRef.current = folderId;
    setPage(1);
    skipEffectRef.current = true;
    fetchNotes({ page: 1, folder_id: folderId });
    if (window.innerWidth < 768) {
      setMobileView('notes');
    }
  }, [fetchNotes]);

  const handleDropNote = useCallback(async (noteId, folderId) => {
    try {
      await put(`/api/notes/${noteId}`, { folder_id: folderId });
      fetchNotes();
      fetchFolders();
      if (selectedNote?.id === noteId) {
        setSelectedNote((prev) => prev ? { ...prev, folder_id: folderId } : prev);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [fetchNotes, fetchFolders, selectedNote]);

  // 批量操作

  const handleEnterBatchMode = useCallback(() => {
    setIsBatchMode(true);
    setSelectedNoteIds(new Set());
  }, []);

  const handleExitBatchMode = useCallback(() => {
    setIsBatchMode(false);
    setSelectedNoteIds(new Set());
  }, []);

  const handleBatchToggle = useCallback((noteId) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedNoteIds(new Set(notes.map((n) => n.id)));
  }, [notes]);

  const handleDeselectAll = useCallback(() => {
    setSelectedNoteIds(new Set());
  }, []);

  const handleBatchMove = useCallback(async (folderId) => {
    const ids = Array.from(selectedNoteIds);
    try {
      await post('/api/notes/batch-move', { noteIds: ids, folderId });
      handleExitBatchMode();
      fetchNotes();
      fetchFolders();
    } catch (err) {
      setError(err.message);
    }
  }, [selectedNoteIds, handleExitBatchMode, fetchNotes, fetchFolders]);

  const handleBatchDelete = useCallback(() => {
    setBatchDeleteConfirm(true);
  }, []);

  const confirmBatchDelete = useCallback(async () => {
    const ids = Array.from(selectedNoteIds);
    setBatchDeleteConfirm(false);
    await flushSave();

    try {
      await post('/api/notes/batch-delete', { noteIds: ids });
      if (selectedNote && selectedNoteIds.has(selectedNote.id)) {
        setSelectedNote(null);
        navigate('/tools/notes');
      }
      handleExitBatchMode();
      fetchNotes();
      fetchFolders();
    } catch (err) {
      setError(err.message);
    }
  }, [selectedNoteIds, flushSave, selectedNote, navigate, handleExitBatchMode, fetchNotes, fetchFolders]);

  return (
    <div className={`app-layout${folderPanelCollapsed ? ' folder-panel-collapsed' : ''} mobile-view-${mobileView}`}>
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
      <FolderPanel
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={handleSelectFolder}
        onFolderChange={fetchFolders}
        onDropNote={handleDropNote}
        onSearch={handleSearch}
        collapsed={folderPanelCollapsed}
        onToggleCollapse={() => setFolderPanelCollapsed(!folderPanelCollapsed)}
        totalNoteCount={allNotesCount}
      />
      <NotePanel
        notes={notes}
        selectedNoteId={selectedNote?.id}
        pagination={pagination}
        sort={sort}
        order={order}
        searchTerm={searchTerm}
        isBatchMode={isBatchMode}
        selectedNoteIds={selectedNoteIds}
        folders={folders}
        folderPanelCollapsed={folderPanelCollapsed}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onSortChange={handleSortChange}
        onPageChange={setPage}
        onEnterBatchMode={handleEnterBatchMode}
        onExitBatchMode={handleExitBatchMode}
        onBatchToggle={handleBatchToggle}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onBatchMove={handleBatchMove}
        onBatchDelete={handleBatchDelete}
        onToggleFolderPanel={() => setFolderPanelCollapsed(false)}
      />
      <Editor
        note={selectedNote}
        saving={saving}
        onTitleChange={handleTitleChange}
        onContentChange={handleContentChange}
        onFormatChange={handleFormatChange}
        onExitEdit={handleExitEdit}
      />

      <nav className="mobile-bottom-nav">
        <button
          className={mobileView === 'folders' ? 'active' : ''}
          onClick={() => setMobileView('folders')}
        >
          <span className="mobile-bottom-nav-icon">📁</span>
          <span className="mobile-bottom-nav-label">文件夹</span>
        </button>
        <button
          className={mobileView === 'notes' ? 'active' : ''}
          onClick={() => setMobileView('notes')}
        >
          <span className="mobile-bottom-nav-icon">📝</span>
          <span className="mobile-bottom-nav-label">笔记</span>
        </button>
        <button
          className={mobileView === 'editor' ? 'active' : ''}
          onClick={() => setMobileView('editor')}
        >
          <span className="mobile-bottom-nav-icon">✏️</span>
          <span className="mobile-bottom-nav-label">编辑</span>
        </button>
      </nav>

      {deleteTargetId && (
        <ConfirmDialog
          title="删除笔记"
          message={`确认删除「${notes.find((n) => n.id === deleteTargetId)?.title || '未命名'}」？此操作不可撤销。`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}

      {batchDeleteConfirm && (
        <ConfirmDialog
          title="批量删除笔记"
          message={`确认删除选中的 ${selectedNoteIds.size} 篇笔记？此操作不可撤销。`}
          onConfirm={confirmBatchDelete}
          onCancel={() => setBatchDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
