import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { get, post } from '../../../shared/api/client';

marked.setOptions({ breaks: true, gfm: true });

const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }) {
  if (lang && hljs.getLanguage(lang)) {
    const highlighted = hljs.highlight(text, { language: lang }).value;
    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
  }
  const autoHighlighted = hljs.highlightAuto(text).value;
  return `<pre><code class="hljs">${autoHighlighted}</code></pre>`;
};
marked.setOptions({ renderer });

function addHeadingIds(html, headings) {
  let i = 0;
  return html.replace(/<h([1-4])(\s[^>]*)?>/gi, (match, level, attrs) => {
    const slug = i < headings.length ? headings[i].slug : '';
    i++;
    if (attrs && /id\s*=\s*["']/.test(attrs)) return match;
    return `<h${level} id="${slug}"${attrs || ''}>`;
  });
}

function makeSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractHeadings(content) {
  if (!content) return [];
  const headings = [];
  const regex = /^(#{1,4})\s+(.+)$/gm;
  const fenceRegex = /```[\s\S]*?```/g;
  const cleaned = content.replace(fenceRegex, '');
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    const text = match[2].replace(/[#*_`~\[\]]/g, '').trim();
    headings.push({
      level: match[1].length,
      text,
      slug: makeSlug(text),
    });
  }
  return headings;
}

export default function Editor({
  note,
  saving,
  onTitleChange,
  onContentChange,
  onFormatChange,
}) {
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const autoEditedRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const savingRef = useRef(saving);

  useEffect(() => {
    if (textareaRef.current && note && isEditing) {
      textareaRef.current.focus();
    }
  }, [note?.id, isEditing]);

  useEffect(() => {
    if (saving === false && savingRef.current === true) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
    savingRef.current = saving;
  }, [saving]);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (textareaRef.current && note && isEditing) {
      textareaRef.current.focus();
    }
  }, [note?.id, isEditing]);

  useEffect(() => {
    const isNew = note && !note.content && note.title === '未命名' && autoEditedRef.current !== note.id;
    if (isNew) {
      autoEditedRef.current = note.id;
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
    setShowVersions(false);
    setPreviewVersion(null);
    setVersions([]);
  }, [note?.id]);

  useEffect(() => {
    if (!note?.id) return;
    (async () => {
      try {
        const data = await get(`/api/notes/${note.id}/versions`);
        setVersions(data.versions);
      } catch (e) {
        setVersions([]);
      }
    })();
  }, [note?.id]);

  const format = note?.format || 'markdown';
  const displayContent = previewVersion ? previewVersion.content : note?.content;
  const displayFormat = previewVersion ? (previewVersion.format || 'markdown') : format;

  const headings = useMemo(
    () => (displayFormat === 'markdown' ? extractHeadings(displayContent) : []),
    [displayContent, displayFormat],
  );

  const htmlContent = useMemo(() => {
    try {
      if (displayFormat === 'plaintext') {
        return `<pre class="plaintext-preview">${escapeHtml(displayContent || '')}</pre>`;
      }
      const raw = marked.parse(displayContent || '');
      return addHeadingIds(raw, headings);
    } catch (e) {
      console.error('Markdown render error:', e);
      return `<pre class="plaintext-preview">${escapeHtml(displayContent || '')}</pre>`;
    }
  }, [displayContent, displayFormat, headings]);

  const setPreviewRef = useCallback((el) => {
    if (el) {
      previewRef.current = el;
      el.innerHTML = htmlContent;
    }
  }, [htmlContent]);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.innerHTML = htmlContent;
    }
  }, [htmlContent]);

  if (!note) {
    return (
      <div className="editor">
        <div className="editor-empty">选择一篇笔记或新建一篇开始写作。</div>
      </div>
    );
  }

  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = note.content.substring(0, start) + '\t' + note.content.substring(end);
      onContentChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      });
    }
  }

  function handleTocClick(slug) {
    if (!slug || !previewRef.current) return;
    try {
      const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(slug) : slug.replace(/[^\w-]/g, '');
      const el = previewRef.current.querySelector(`#${escaped}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {
      // ignore TOC navigation errors
    }
  }

  async function handleSaveVersion() {
    try {
      await post(`/api/notes/${note.id}/versions`);
      setShowVersions(true);
      await loadVersions();
    } catch (e) {}
  }

  async function loadVersions() {
    setVersionsLoading(true);
    try {
      const data = await get(`/api/notes/${note.id}/versions`);
      setVersions(data.versions);
    } catch (e) {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }

  function handleToggleVersions() {
    if (!showVersions) loadVersions();
    setShowVersions(!showVersions);
    setPreviewVersion(null);
  }

  async function handleRestoreVersion(version) {
    setRestoring(true);
    try {
      const data = await post(`/api/notes/${note.id}/versions/${version.id}/restore`);
      onTitleChange(data.note.title);
      onContentChange(data.note.content);
      if (data.note.format !== format) {
        onFormatChange(data.note.format);
      }
      setShowVersions(false);
      setPreviewVersion(null);
    } catch (e) {} finally {
      setRestoring(false);
    }
  }

  const suppressEdit = previewVersion || showVersions;

  return (
    <div className="editor" key={note.id}>
      <div className="editor-toolbar">
        <input
          className="editor-title"
          type="text"
          value={previewVersion ? previewVersion.title : note.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="笔记标题..."
          readOnly={!!previewVersion || !isEditing}
        />

        <select
          className="format-select"
          value={format}
          onChange={(e) => onFormatChange(e.target.value)}
        >
          <option value="markdown">Markdown</option>
          <option value="plaintext">纯文本</option>
        </select>

        <button
          className={`btn-edit-mode ${isEditing ? 'active' : ''}`}
          onClick={() => setIsEditing(!isEditing)}
          disabled={suppressEdit}
        >
          {isEditing ? '退出编辑' : '编辑'}
        </button>

        <button className="btn-version" onClick={handleSaveVersion} title="保存当前版本">
          保存版本
        </button>

        <button
          className={`btn-version ${showVersions ? 'active' : ''}`}
          onClick={handleToggleVersions}
          title="版本历史"
        >
          版本历史 ({versions.length})
        </button>

        {(saving || showSaved) && (
          <span className={`save-indicator ${showSaved ? 'saved' : ''}`}>
            {saving ? '保存中...' : '已保存'}
          </span>
        )}
      </div>

      <div className="editor-main">
        {/* ── Reading markdown mode ── */}
        {!isEditing && displayFormat === 'markdown' && (
          <div key="reading-md" className="editor-split">
            {headings.length > 0 && (
              <div className="toc-sidebar">
                <div className="toc-title">目录</div>
                {headings.map((h, i) => (
                  <div
                    key={i}
                    className={`toc-item toc-level-${h.level}`}
                    onClick={() => handleTocClick(h.slug)}
                  >
                    {h.text}
                  </div>
                ))}
              </div>
            )}
            <div
              className="markdown-preview reading-preview"
              ref={setPreviewRef}
            />
          </div>
        )}

        {/* ── Reading plaintext mode ── */}
        {!isEditing && displayFormat === 'plaintext' && (
          <div
            key="reading-txt"
            className="markdown-preview reading-preview"
            ref={setPreviewRef}
          />
        )}

        {/* ── Editing markdown mode ── */}
        {isEditing && displayFormat === 'markdown' && (
          <div key="editing-md" className="editor-split">
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              value={displayContent}
              onChange={(e) => onContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="在此编写 Markdown..."
              readOnly={!!previewVersion}
            />
            <div
              className="markdown-preview"
              ref={setPreviewRef}
            />
          </div>
        )}

        {/* ── Editing plaintext mode ── */}
        {isEditing && displayFormat === 'plaintext' && (
          <textarea
            key="editing-txt"
            ref={textareaRef}
            className="editor-textarea plaintext-mode full-width"
            value={displayContent}
            onChange={(e) => onContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在此编写纯文本..."
            readOnly={!!previewVersion}
          />
        )}

        {/* ── Version panel ── */}
        {showVersions && (
          <div key="versions" className="version-panel">
            <div className="version-panel-header">
              <h3>版本历史</h3>
              <button className="version-panel-close" onClick={() => setShowVersions(false)}>
                &times;
              </button>
            </div>
            {previewVersion && (
              <div className="version-preview-banner">
                正在预览版本 — {new Date(previewVersion.saved_at + 'Z').toLocaleString('zh-CN')}
                <button
                  className="btn-restore"
                  onClick={() => handleRestoreVersion(previewVersion)}
                  disabled={restoring}
                >
                  {restoring ? '恢复中...' : '恢复此版本'}
                </button>
                <button className="btn-cancel-preview" onClick={() => setPreviewVersion(null)}>
                  取消预览
                </button>
              </div>
            )}
            <div className="version-list">
              {versionsLoading && <div className="version-loading">加载中...</div>}
              {!versionsLoading && versions.length === 0 && (
                <div className="version-empty">暂无保存的版本</div>
              )}
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`version-item ${previewVersion?.id === v.id ? 'active' : ''}`}
                  onClick={() => setPreviewVersion(v)}
                >
                  <div className="version-item-title">{v.title}</div>
                  <div className="version-item-meta">
                    <span>{new Date(v.saved_at + 'Z').toLocaleString('zh-CN')}</span>
                    <span className="version-format-badge">
                      {v.format === 'plaintext' ? '纯文本' : 'MD'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (c) => map[c]);
}
