# 个人工具箱 — 开发规范

> 本文档供 AI 助手在新会话中快速理解项目约定，确保代码风格和架构一致。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite + React Router v7 |
| 后端 | Express.js |
| 数据库 | SQLite via `better-sqlite3` |
| 认证 | JWT + bcryptjs |
| Markdown | marked + highlight.js |
| 样式 | 纯 CSS (CSS 变量, 无框架) |

---

## 项目结构

```
toolbox/
├── server/src/
│   ├── index.js              # Express 入口
│   ├── db.js                 # better-sqlite3 初始化
│   ├── middleware/
│   │   ├── auth.js           # JWT Bearer 验证
│   │   └── errorHandler.js   # AppError 类 + 全局错误处理
│   └── routes/
│       ├── auth.js           # 认证 API
│       └── notes.js          # 笔记 CRUD + 版本 API
│
└── client/src/
    ├── App.jsx               # 顶层路由定义
    ├── main.jsx              # 入口
    ├── shared/               # 跨工具共享
    │   ├── api/client.js     # fetch 封装
    │   ├── context/AuthContext.jsx
    │   ├── components/       # AppLayout, ProtectedRoute, ErrorBoundary
    │   └── styles/shared.css # CSS 变量, 重置, 导航栏, 认证表单
    ├── pages/                # 应用级页面 (HomePage, Login, Register)
    └── features/             # 工具模块
        └── notes/
            ├── pages/NotesLayout.jsx
            ├── components/   # Sidebar, Editor, NoteList 等
            └── styles/notes.css
```

---

## 核心约定

### 前端

#### 组件规范
- 所有组件使用 `export default function` 函数组件
- 共享组件放 `shared/components/`，工具专属组件放 `features/<tool>/components/`
- Context 用 `createContext` + 自定义 hook 模式（见 `AuthContext.jsx`）

#### 路由
- 公共页面直接挂在 `<Routes>` 下
- 受保护页面统一包裹在 `<ProtectedRoute><AppLayout /></ProtectedRoute>` 布局路由内
- 新工具路由格式：`/tools/<tool-name>`
- 旧路径用 `<Navigate>` 重定向，保留向后兼容

#### API 调用
- 统一使用 `shared/api/client.js` 的 `get/post/put/del` 封装
- 自动附带 JWT，401 时清除 token 跳到 `/login`
- 响应格式：服务端返回 `{ success, data, message }`，封装自动解包返回 `data`

#### CSS
- `shared.css` 放 CSS 变量、重置、导航栏、认证表单、通用组件样式
- 每个 feature 有独立 CSS 文件，在 `NotesLayout.jsx` 中 import
- 类名使用 kebab-case
- 顶部导航高度固定 48px，工具区高度用 `calc(100vh - 48px)`

#### 自动保存模式 (NotesLayout)
项目中使用了一套 ref 防抖自动保存模式，新工具如需要自动保存可复用：
- `noteRef` / `selectedIdRef` — 保持最新值的引用，供定时器和 beforeunload 使用
- `saveTimerRef` — 1 秒防抖定时器
- `flushSave` — 立即刷新（切换笔记/创建新笔记前调用）
- `beforeunload` — 用 `keepalive: true` 发送最终保存
- `skipEffectRef` — handler 调用 fetch 前设为 true，阻止 useEffect 重复请求
- `fetchIdRef` — 递增计数器，防止异步竞态

#### 语言
- 用户界面和提示信息用中文
- 代码标识符用英文

### 后端

#### 路由
- 每个资源一个路由文件，`router.use(auth)` 保护所有接口
- 错误通过 `throw new AppError(statusCode, message)` 抛出
- 同步操作直接用 try/catch + `next(err)`，不用 express-async-errors

#### 数据库
- `better-sqlite3` 同步 API（不是 `async/await`）
- WAL 模式 + 外键约束
- 所有 SQL 参数用 `?` 占位符，禁止字符串拼接
- 迁移：ALTER TABLE 用 try/catch 忽略已存在的列

#### 响应格式
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "错误描述" }
```

#### 认证
- JWT 密钥默认 `dev-secret-change-in-production`，生产环境用环境变量
- `req.user = { userId, username }`

---

## 添加新工具步骤

1. 在 `client/src/features/` 下新建目录，如 `features/kanban/`
2. 创建页面组件和内部组件
3. 在 `AppLayout.jsx` 的 `tools` 数组中添加 `{ path: '/tools/kanban', label: '看板' }`
4. 在 `App.jsx` 的布局路由内添加 `<Route path="/tools/kanban" element={<KanbanLayout />} />`
5. 在 `HomePage.jsx` 的 `tools` 数组中添加卡片
6. 如需要后端 API，在 `server/src/routes/` 新建路由文件，在 `index.js` 中注册

---

## 常见模式速查

| 场景 | 做法 |
|------|------|
| 需要认证的页面 | 放入 `<ProtectedRoute><AppLayout>` 内 |
| 调用 API | `import { get, post, put, del } from 'path/to/shared/api/client'` |
| 全局状态 | Context + Provider（如 AuthContext） |
| 工具内部状态 | 在工具页面组件中用 useState 管理 |
| 路径别名 | `@shared` → `src/shared`, `@features` → `src/features` |
| 生产构建 | `server/src/index.js` 已配置 SPA fallback |
| 开发代理 | Vite proxy 将 `/api` 转发到 `localhost:3000` |

---

## 注意事项

- 不要为不需要的场景添加错误处理、fallback 或验证
- 不要编写解释性注释，除非代码意图不明确
- 不要引入新的依赖，除非确实必要
- CSS 不使用框架，直接写 CSS 变量和选择器
- 不要为一次性操作创建辅助函数，三行相似代码不急于抽象
