import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github-dark.css';
import { get, post, del } from '../../../shared/api/client';
import { escapeHtml } from '../../../shared/utils/html';

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
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
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

const SAVE_DEBOUNCE_MS = 1000;
const SAVED_INDICATOR_MS = 2000;

export default function Editor({
  note,
  saving,
  onTitleChange,
  onContentChange,
  onFormatChange,
  onExitEdit,
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
      const timer = setTimeout(() => setShowSaved(false), SAVED_INDICATOR_MS);
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
      const withIds = addHeadingIds(raw, headings);
      return DOMPurify.sanitize(withIds, {
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
      });
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
      const value = textarea.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onContentChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }

  function handleTocClick(slug) {
    const el = document.getElementById(slug);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function handleSaveVersion() {
    try {
      await post(`/api/notes/${note.id}/versions`);
      const data = await get(`/api/notes/${note.id}/versions`);
      setVersions(data.versions);
    } catch (e) {
      // 忽略版本保存失败
    }
  }

  async function handleRestoreVersion(version) {
    setRestoring(true);
    try {
      await post(`/api/notes/${note.id}/versions/${version.id}/restore`);
      const data = await get(`/api/notes/${note.id}`);
      setPreviewVersion(null);
      window.location.reload();
    } catch (e) {
      // 忽略恢复失败
    } finally {
      setRestoring(false);
    }
  }

  async function handleDeleteVersion(versionId) {
    try {
      await del(`/api/notes/${note.id}/versions/${versionId}`);
      setVersions((prev) => prev.filter((v) => v.id !== versionId));
      if (previewVersion?.id === versionId) setPreviewVersion(null);
    } catch (e) {
      // 忽略删除失败
    }
  }

  const showToc = headings.length > 0 && displayFormat === 'markdown';

  return (
    <div className="editor">
      <div className="editor-header">
        <input
          className="editor-title"
          value={note.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="笔记标题"
        />
        <div className="editor-actions">
          <select
            className="format-select"
            value={note.format || 'markdown'}
            onChange={(e) => onFormatChange(e.target.value)}
          >
            <option value="markdown">Markdown</option>
            <option value="plaintext">纯文本</option>
          </select>
          <button
            className="btn-icon"
            onClick={() => {
              if (isEditing && onExitEdit) onExitEdit();
              setIsEditing(!isEditing);
            }}
            title={isEditing ? '阅读模式' : '编辑模式'}
          >
            {isEditing ? '📖' : '✏️'}
          </button>
          <button
            className="btn-icon"
            onClick={() => setShowVersions(!showVersions)}
            title="版本历史"
          >
            🕒
          </button>
          <button
            className="btn-icon"
            onClick={handleSaveVersion}
            title="保存版本快照"
          >
            💾
          </button>
        </div>
      </div>

      {/* TOC — floating island on the right */}
      {showToc && (
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

      <div className={`editor-body${showToc ? '' : ' editor-body--no-toc'}`}>
        {/* 阅读模式 Markdown */}
        {!isEditing && displayFormat === 'markdown' && (
          <div
            key="reading-md"
            className="markdown-preview reading-preview"
            ref={setPreviewRef}
          />
        )}

        {/* 阅读模式 纯文本 */}
        {!isEditing && displayFormat === 'plaintext' && (
          <div
            key="reading-txt"
            className="markdown-preview reading-preview"
            ref={setPreviewRef}
          />
        )}

        {/* 编辑模式 Markdown */}
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

        {/* 编辑模式 纯文本 */}
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

        {/* 版本面板 */}
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
                  {restoring ? '恢复中..' : '恢复此版本'}
                </button>
                <button className="btn-cancel-preview" onClick={() => setPreviewVersion(null)}>
                  取消预览
                </button>
              </div>
            )}
            <div className="version-list">
              {versionsLoading && <div className="version-loading">加载中..</div>}
              {!versionsLoading && versions.length === 0 && (
                <div className="version-empty">暂无保存的版本</div>
              )}
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`version-item ${previewVersion?.id === v.id ? 'active' : ''}`}
                  onClick={() => setPreviewVersion(v)}
                >
                  <div className="version-item-row">
                    <div className="version-item-title">{v.title}</div>
                    <button
                      className="version-item-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteVersion(v.id); }}
                      title="删除版本"
                    >
                      &times;
                    </button>
                  </div>
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

      {(saving || showSaved) && (
        <div className={`save-indicator ${showSaved ? 'saved' : ''}`}>
          {saving ? '保存中..' : '已保存'}
        </div>
      )}
    </div>
  );
}
