# 个人工具箱 — 项目结构

> 个人工具网站，支持用户认证，可扩展多个工具模块。当前包含 Markdown 笔记功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite + React Router v7 |
| 后端 | Express.js |
| 数据库 | SQLite via `better-sqlite3` |
| 认证 | JWT (`jsonwebtoken`) + `bcryptjs` |
| Markdown | `marked` + `highlight.js` |
| 样式 | CSS (无框架, CSS 变量) |

---

## 目录树

```
toolbox/
├── package.json                            # 根：concurrently 同时启动前后端
├── .gitignore
│
├── server/                                 # ── Express 后端 ──
│   ├── package.json
│   ├── data/                               #   SQLite 数据库文件 (.gitignore)
│   └── src/
│       ├── index.js                        #   Express 入口 + production 静态文件服务
│       ├── db.js                           #   better-sqlite3 初始化, WAL 模式, 建表
│       ├── middleware/
│       │   ├── auth.js                     #   JWT 验证中间件 (Bearer token)
│       │   └── errorHandler.js             #   AppError 类 + 全局错误处理中间件
│       └── routes/
│           ├── auth.js                     #   POST /register, /login, GET /me
│           └── notes.js                    #   CRUD + 版本控制 API
│
└── client/                                 # ── React 前端 ──
    ├── package.json
    ├── vite.config.js                      #   proxy /api → localhost:3000 + path aliases
    ├── index.html
    ├── eslint.config.js
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    └── src/
        ├── main.jsx                        #   StrictMode + BrowserRouter 挂载
        ├── App.jsx                         #   顶层路由：首页, 登录, 注册, 工具模块
        ├── shared/                         #   ── 共享基础设施 ──
        │   ├── api/
        │   │   └── client.js               #     fetch 封装：自动附 JWT, 401 跳转
        │   ├── context/
        │   │   └── AuthContext.jsx          #     user 状态, login/register/logout
        │   ├── components/
        │   │   ├── AppLayout.jsx            #     顶部导航栏 + Outlet
        │   │   ├── ErrorBoundary.jsx        #     全局错误边界
        │   │   └── ProtectedRoute.jsx       #     未登录 → 重定向到 /login
        │   └── styles/
        │       └── shared.css              #     CSS 变量, 重置, 导航栏, 认证表单, 通用组件
        ├── pages/                           #   ── 应用级页面 ──
        │   ├── HomePage.jsx                 #     首页仪表盘，展示工具卡片
        │   ├── LoginPage.jsx                #     登录表单
        │   └── RegisterPage.jsx             #     注册表单
        └── features/                        #   ── 工具模块 (可扩展) ──
            └── notes/                       #     📝 Markdown 笔记模块
                ├── index.jsx                #       模块入口 (re-export)
                ├── pages/
                │   └── NotesLayout.jsx      #       主状态管理：列表, 排序, 搜索, 分页, 自动保存
                ├── components/
                │   ├── Sidebar.jsx          #       左侧栏：搜索, 排序, 新建, 笔记列表, 分页
                │   ├── SearchBar.jsx        #       搜索输入框 (300ms 防抖)
                │   ├── NoteList.jsx         #       笔记列表容器 (空状态提示)
                │   ├── NoteItem.jsx         #       单条笔记：标题, 日期, 删除按钮
                │   ├── Editor.jsx           #       编辑器：分屏/纯文本, TOC, 版本历史
                │   └── ConfirmDialog.jsx    #       确认删除对话框 (模态框)
                └── styles/
                    └── notes.css            #       笔记模块样式
```

---

## 前端路由

| 路径 | 组件 | 受保护 | 说明 |
|------|------|--------|------|
| `/` | HomePage | 否 | 首页仪表盘 |
| `/login` | LoginPage | 否 | 登录 |
| `/register` | RegisterPage | 否 | 注册 |
| `/tools/notes` | NotesLayout | 是 | 笔记列表 |
| `/tools/notes/:id` | NotesLayout | 是 | 笔记详情 |
| `/notes` → `/tools/notes` | Redirect | — | 兼容旧路径 |
| `/notes/:id` → `/tools/notes/:id` | Redirect | — | 兼容旧路径 |

---

## 布局架构

```
┌──────────────────────────────────────────────────┐
│ 🧰 工具箱    📝笔记                   用户名 ▼  │  ← AppLayout (顶部导航)
├──────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────────────────────────┐   │
│  │ Sidebar  │ │ Editor                       │   │  ← NotesLayout
│  └──────────┘ └──────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

未来添加新工具：在 `features/` 下新建目录，在 AppLayout 的 tools 列表和 App.jsx 路由中各加一项即可。

---

## 数据库表结构

### users
| 字段 | 类型 | 约束 |
|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| username | TEXT | UNIQUE NOT NULL |
| email | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### notes
| 字段 | 类型 | 约束 |
|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_id | INTEGER | NOT NULL, FOREIGN KEY → users |
| title | TEXT | NOT NULL DEFAULT 'Untitled' |
| content | TEXT | DEFAULT '' |
| format | TEXT | NOT NULL DEFAULT 'markdown' |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### note_versions
| 字段 | 类型 | 约束 |
|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| note_id | INTEGER | NOT NULL, FOREIGN KEY → notes ON DELETE CASCADE |
| title | TEXT | NOT NULL |
| content | TEXT | DEFAULT '' |
| format | TEXT | NOT NULL DEFAULT 'markdown' |
| saved_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

## API 接口

所有响应格式：`{ success: boolean, data?: any, message?: string }`

### 认证 (`/api/auth`)
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/register` | 否 | 注册，返回 JWT |
| POST | `/login` | 否 | 登录，返回 JWT |
| GET | `/me` | 是 | 获取当前用户信息 |

### 笔记 (`/api/notes`)
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | 是 | 列表，支持 `?search=&page=&limit=&sort=&order=` |
| POST | `/` | 是 | 新建笔记 |
| GET | `/:id` | 是 | 获取单条笔记 |
| PUT | `/:id` | 是 | 更新笔记（自动保存） |
| DELETE | `/:id` | 是 | 删除笔记 |

### 版本 (`/api/notes/:id`)
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/versions` | 是 | 保存当前内容为版本快照 |
| GET | `/versions` | 是 | 获取版本列表 |
| GET | `/versions/:versionId` | 是 | 获取单个版本内容 |
| POST | `/versions/:versionId/restore` | 是 | 恢复到指定版本 |

---

## 如何添加新工具

1. 在 `client/src/features/` 下新建目录，如 `features/kanban/`
2. 创建页面组件和内部路由
3. 在 `shared/components/AppLayout.jsx` 的 `tools` 数组中添加一项
4. 在 `App.jsx` 的 `<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>` 中添加子路由
5. 在 `pages/HomePage.jsx` 的 `tools` 数组中添加卡片

---

## 启动命令

```bash
npm run install:all      # 安装所有依赖
npm run dev              # 开发模式 (前后端同时启动)
npm run dev:server       # → http://localhost:3000
npm run dev:client       # → http://localhost:5173
```
