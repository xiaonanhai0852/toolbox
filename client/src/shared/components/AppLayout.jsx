import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const tools = [
  { path: '/tools/notes', label: '笔记' },
  { path: '/tools/clipboard', label: '剪贴板' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <>
      <nav className="topnav">
        <NavLink to="/" className="topnav-brand">工具箱</NavLink>
        <div className="topnav-links">
          {tools.map((tool) => (
            <NavLink
              key={tool.path}
              to={tool.path}
              className={({ isActive }) =>
                `topnav-link${isActive ? ' active' : ''}`
              }
            >
              {tool.label}
            </NavLink>
          ))}
        </div>
        <div className="topnav-user">
          <span>{user?.username}</span>
          <button className="topnav-logout" onClick={logout}>退出</button>
        </div>
      </nav>
      <Outlet />
    </>
  );
}
