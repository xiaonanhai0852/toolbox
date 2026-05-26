import { NavLink } from 'react-router-dom';

const tools = [
  {
    path: '/tools/notes',
    icon: '📝',
    name: 'Markdown 笔记',
    desc: '在线 Markdown 编辑器，支持分屏预览、自动保存、版本历史。',
  },
  {
    path: '/tools/clipboard',
    icon: '📋',
    name: '剪贴板历史',
    desc: '自动捕获 Windows 剪贴板内容，支持搜索、回写和去重管理。',
  },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="home-hero">
        <h1>个人工具箱</h1>
        <p>一个汇集各类实用工具的个人网站</p>
      </div>
      <div className="home-grid">
        {tools.map((tool) => (
          <NavLink key={tool.path} to={tool.path} className="tool-card">
            <div className="tool-card-icon">{tool.icon}</div>
            <div className="tool-card-name">{tool.name}</div>
            <div className="tool-card-desc">{tool.desc}</div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
