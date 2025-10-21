# Copilot usage notes for SafeChat (简明要点)

以下说明让 AI 编码代理能快速进入此仓库并安全、高效地更改或补充代码。只记录可被代码/配置证据支持的约定和命令。

- 项目整体：后端使用 Node.js + Express + Socket.IO（MongoDB 持久化），前端有两个变体：轻量静态 `frontend/modern/index.html`（直接打开）和基于 Vite 的应用在 `frontend/im-frontend/`。

- 关键文件/目录（首读顺序）
  - `backend/` — 后端服务镜像/部署所在（Dockerfile、package.json，docker-compose 使用此目录构建）。
  - `backend/app.js` — 单文件示例后端，包含 model helpers、序列化函数与 REST + Socket 逻辑（可快速理解数据流与序列化约定）。
  - `backend/im-backend/` — 模块化后端实现（routes/, controllers/, models/, socket/）。
  - `frontend/modern/index.html` — 静态演示页面（快速手工验证）。
  - `frontend/im-frontend/` — Vite + React 前端（开发用）。
  - `docker-compose.yml` — 本地一键运行（包含 mongodb、backend、frontend）。
  - `deploy/BAOTA_DEPLOY.md` — 打包/部署脚本的说明（用于宝塔/打包部署流程）。

- 快速启动与测试命令（可直接用于自动化任务）
  - 后端（本地 dev）: `cd backend && npm install && npm start`  (reads `package.json` scripts)
  - 前端（Vite dev）: `cd frontend/im-frontend && npm install && npm run dev`
  - 静态前端测试: 打开 `frontend/modern/index.html` 在浏览器中查看演示
  - 一键容器: `docker-compose up --build`（参考 `docker-compose.yml`: mongodb, backend, nginx frontend）
  - 后端测试: `cd backend && npm test`（Jest + mongodb-memory-server）

- 环境变量与约定（非常重要）
  - `MONGODB_URI` — MongoDB 连接字符串，默认 `mongodb://localhost:27017/safechat`。
  - `JWT_SECRET` — 用于签发/验证 JWT；代码示例见 `backend/app.js` 与 `backend/im-backend/controllers/authController.js`。
  - `ALLOWED_ORIGINS` — 逗号分隔的允许跨域列表（或 `*`），影响 Socket.IO 与 CORS 配置，见 `backend/app.js`。
  - `PORT` — 后端监听端口（默认 3001）。
  - `ENABLE_BOSS` — 若为 `true` 则加载 `/superpanel` 管理路由（见 `backend/im-backend/app.js`）。

- API / Socket 使用模式（从代码可观察）
  - 所有 REST 路径以 `/api` 开头（例如 `/api/auth/register`, `/api/login`, `/api/me`, `/api/friends`）。
  - 授权：REST 要求请求头 `Authorization: Bearer <token>`（见 `authMiddleware` 实现）。
  - Socket：使用 Socket.IO，服务器端在连接成功后会自动将 socket 加入会话/房间（查看 `backend/im-backend/socket` 与 `backend/app.js` 的 `setupSocket`／序列化方法）。
  - 上传：单文件上传端点 `POST /upload`，字段名 `file`，文件保存在 `backend/uploads`，静态提供路径 `/uploads`（见 `backend/im-backend/app.js`）。

- 代码模式与常用 helper（便于自动补全/修改）
  - 使用 asyncHandler 包裹异步路由以统一错误流（见 `backend/app.js` 的 `asyncHandler`）。
  - 序列化函数：`serializeUser`, `serializeMessage`, `serializeConversation` —— 修改消息/会话展示层时请优先复用这些函数。
  - 路由组织：`routes/*.js` 只是把请求转给 controllers（函数式导出），controllers 为 async 函数且直接与 models 交互。
  - 数据层：`backend` 使用 Mongoose schema（见 `backend/app.js`），而 `backend/im-backend/models` 中可见另一套更模块化的 model/DAO（注意两者的差异，修改时保持一致性）。

- 测试注意事项
  - 后端单元/集成测试使用 Jest + Supertest 与 `mongodb-memory-server`（参见 `backend/package.json` 的 devDependencies）。
  - 在 CI/本地运行测试时无需外部 MongoDB（memory-server 会在测试启动时启动内存实例），但如果网络或环境阻止下载内置 MongoDB，测试会跳过或失败。

- 修改/新增任务建议（Agent-friendly）
  - 小改动：优先在 `backend/im-backend/` 做模块化改动，保持路由-控制器-model 的分离。
  - 大改动或迁移：若需要统一两份后端实现，先写迁移计划（列出映射：route -> controller -> model）并保留原实现直到迁移完成。
  - Debug：在本地启动 `backend`（npm start）并观察控制台日志；`backend/im-backend/config/logger.js` 提供 httpLogger/logger 用法。

- 参考示例（快速复制粘贴）
  - 授权请求示例头: `Authorization: Bearer ${token}`
  - 文件上传（curl）:
    curl -F "file=@./avatar.png" http://localhost:3001/upload

请审阅这份简短说明并告诉我是否要：
1) 把更多 controller 或 socket 实现摘录为示例；
2) 将说明细化为多个小节（例如“部署”、“本地开发”、“调试”）以便 CI/Agent 使用；
3) 将说明合并进项目的 README（或者保持独立）。
