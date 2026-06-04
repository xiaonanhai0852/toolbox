import { useState } from 'react';

function getBeijingTime(dateStr) {
  const utcDate = new Date(dateStr + 'Z');
  return utcDate.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClipboardCard({ item, onToggleFavorite, onCopy, onDelete }) {
  const [copied, setCopied] = useState(false);

  const time = getBeijingTime(item.created_at);

  const handleCopy = (e) => {
    e.stopPropagation();
    onCopy(item.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="clipboard-card">
      <div className="clipboard-card-body">
        <pre className="clipboard-card-content">{item.content || item.truncated_preview || '(空内容)'}</pre>
      </div>
      <div className="clipboard-card-meta">
        <span>{time}</span>
        <span>{item.char_count} 字符</span>
      </div>
      <div className="clipboard-card-actions">
        <button
          className={`btn-favorite${item.is_favorite ? ' active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          title={item.is_favorite ? '取消收藏' : '收藏'}
        >
          {item.is_favorite ? '★' : '☆'}
        </button>
        <button
          className={`btn-card-copy${copied ? ' copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '已复制' : '复制'}
        </button>
        <button
          className="btn-card-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          title="删除"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
