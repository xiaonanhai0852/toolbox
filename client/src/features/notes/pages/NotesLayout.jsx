import { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/notes.css';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post, put, del } from '../../../shared/api/client';
import Sidebar from '../components/Sidebar';
import Editor from '../components/Editor';
import ConfirmDialog from '../components/ConfirmDialog';

export default function NotesLayout() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('updated_at');
  const [order, setOrder] = useState('desc');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const noteRef = useRef(null);
  const saveTimerRef = useRef(null);
  const selectedIdRef = useRef(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    noteRef.current = selectedNote;
    selectedIdRef.current = selectedNote?.id;
  }, [selectedNote]);

  const skipEffectRef = useRef(false);

  const fetchNotes = useCallback((overrides = {}) => {
    const id = ++fetchIdRef.current;
    const p = overrides.page ?? page;
    const s = overrides.sort ?? sort;
    const o = overrides.order ?? order;
    const params = new URLSearchParams({
      page: p,
      limit: 20,
      sort: s,
      order: o,
    });
    if (searchTerm) params.set('search', searchTerm);

    get(`/api/notes?${params}`)
      .then((data) => {
        if (id === fetchIdRef.current) {
          setNotes(data.notes);
          setPagination(data.pagination);
        }
      })
      .catch((err) => setError(err.message));
  }, [page, searchTerm, sort, order]);

  // Fetch on mount and when deps change (for search, page changes)
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

  function handleSelectNote(noteId) {
    if (selectedNote && selectedNote.id !== noteId) {
      flushSave();
    }
    navigate(`/tools/notes/${noteId}`);
  }

  async function handleCreateNote() {
    await flushSave();
    try {
      const data = await post('/api/notes', { title: '未命名', content: '', format: 'markdown' });
      setPage(1);
      skipEffectRef.current = true;
      fetchNotes({ page: 1 });
      navigate(`/tools/notes/${data.note.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDeleteNote(noteId) {
    setDeleteTargetId(noteId);
  }

  async function confirmDelete() {
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
    } catch (err) {
      setError(err.message);
    }
  }

  function handleTitleChange(newTitle) {
    setSelectedNote((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, title: newTitle };
      doSave(updated);
      return updated;
    });
  }

  function handleContentChange(newContent) {
    setSelectedNote((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, content: newContent };
      doSave(updated);
      return updated;
    });
  }

  function handleFormatChange(newFormat) {
    setSelectedNote((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, format: newFormat };
      doSave(updated);
      return updated;
    });
  }

  function handleSearch(term) {
    setSearchTerm(term);
    setPage(1);
  }

  function handleSortChange(newSort, newOrder) {
    setSort(newSort);
    setOrder(newOrder);
    setPage(1);
    skipEffectRef.current = true;
    fetchNotes({ page: 1, sort: newSort, order: newOrder });
  }

  return (
    <div className="app-layout">
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
      <Sidebar
        notes={notes}
        selectedNoteId={selectedNote?.id}
        pagination={pagination}
        sort={sort}
        order={order}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onSearch={handleSearch}
        onSortChange={handleSortChange}
        onPageChange={setPage}
      />
      <Editor
        note={selectedNote}
        saving={saving}
        onTitleChange={handleTitleChange}
        onContentChange={handleContentChange}
        onFormatChange={handleFormatChange}
      />

      {deleteTargetId && (
        <ConfirmDialog
          title="删除笔记"
          message={`确认删除「${notes.find((n) => n.id === deleteTargetId)?.title || '未命名'}」？此操作不可撤销。`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  );
}
