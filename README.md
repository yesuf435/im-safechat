# SafeChat 现代即时通信系统

SafeChat 是一个功能完整的现代化即时通信系统，提供好友管理、一对一私聊、群聊以及跨设备消息同步功能。

## ✨ 特性

- 🔐 **用户认证**: JWT 令牌的登录和注册系统
- 💬 **实时消息**: 基于 Socket.IO 的实时聊天功能
- 👥 **好友系统**: 好友搜索、发送请求、接受或拒绝
- 🧑‍🤝‍🧑 **群聊功能**: 创建群组并进行实时群聊
- 📱 **响应式设计**: 完美适配手机和桌面端
- 🌍 **国际化**: 支持中文和英文切换
- 🎨 **现代 UI**: 采用 Material Design 设计语言
- 🔄 **数据持久化**: MongoDB 数据库，支持跨设备访问
- 📊 **后台管理**: 实时查看用户、会话、消息等关键指标

## 🏗️ 技术栈

### 后端
- **Node.js + Express**: 服务器框架
- **Socket.IO**: 实时通信
- **MongoDB + Mongoose**: 数据库
- **JWT**: 身份认证
- **bcryptjs**: 密码加密

### 前端
- **React 19**: UI 框架
- **TypeScript**: 类型安全
- **Vite**: 构建工具
- **Material UI**: 组件库
- **Socket.IO Client**: 实时通信客户端
- **React Router**: 路由管理
- **i18next**: 国际化
- **Axios**: HTTP 客户端

## 🚀 快速开始

### 使用 Docker（推荐）

```bash
# 克隆仓库
git clone https://github.com/yesuf435/im-safechat.git
cd im-safechat

# 启动所有服务
docker-compose up -d

# 访问应用
# 打开浏览器访问 http://localhost
```

### 本地开发

详细步骤请查看 [快速开始指南](./QUICKSTART.md)

简要步骤：

1. **安装 MongoDB** 并启动服务
2. **启动后端**:
   ```bash
   cd backend
   npm install
   npm start
   ```
3. **启动前端**:
   ```bash
   cd frontend/im-frontend
   npm install
   npm run dev
   ```
4. **访问应用**: http://localhost:5173

## 📁 目录结构

```
.
├── backend/                 # Node.js 后端
│   ├── app.js              # 主应用文件
│   ├── package.json        # 后端依赖
│   ├── Dockerfile          # Docker 镜像配置
│   └── tests/              # 测试文件
├── frontend/
│   └── im-frontend/        # React + TypeScript 前端
│       ├── src/
│       │   ├── api/        # API 服务层
│       │   ├── components/ # React 组件
│       │   ├── pages/      # 页面组件
│       │   ├── services/   # 业务逻辑服务
│       │   ├── theme/      # Material UI 主题
│       │   └── i18n.ts     # 国际化配置
│       ├── package.json    # 前端依赖
│       ├── Dockerfile      # Docker 镜像配置
│       └── nginx.conf      # Nginx 配置
├── docker-compose.yml      # Docker Compose 配置
├── DEPLOYMENT.md           # 部署指南
├── QUICKSTART.md           # 快速开始指南
└── README.md               # 本文件
```

## 📖 文档

- [快速开始指南](./QUICKSTART.md) - 5 分钟上手
- [完整部署指南](./DEPLOYMENT.md) - 生产环境部署
- [前端文档](./frontend/im-frontend/README.md) - 前端架构和开发

## 🎯 功能概览

### 1. 登录/注册页面
- 现代化的登录和注册表单
- Material UI 设计
- 表单验证和错误提示
- 中英文切换

### 2. 消息列表页面
- 会话列表展示
- 未读消息数量标记
- 用户头像显示
- 最后一条消息预览
- 实时更新

### 3. 聊天窗口页面
- 实时消息发送和接收
- 消息历史记录
- 表情符号支持（UI 已就绪）
- 图片和文件发送（UI 已就绪）
- 语音消息（UI 已就绪）
- 回车发送消息

### 4. 联系人页面
- 好友列表展示
- 搜索和添加好友
- 好友请求管理
- 发起私聊

### 5. 通知页面
- 系统通知（占位符）
- 好友请求通知
- 消息通知

### 6. 设置页面
- 个人资料显示
- 语言切换（中文/英文）
- 主题切换（UI 已就绪）
- 通知设置
- 退出登录

## 🧪 自动化测试

后端提供基于 Jest + Supertest 的端到端测试用例。

```bash
cd backend
npm test
```

## 🌍 环境变量

### 后端 (.env)

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/safechat
JWT_SECRET=your_super_secret_key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5175
```

### 前端 (.env)

```env
VITE_API_BASE=http://localhost:3001
```

## 📱 浏览器支持

- Chrome/Edge（最新版）
- Firefox（最新版）
- Safari（最新版）
- 移动浏览器（iOS Safari、Chrome）

## 🐛 问题反馈

遇到问题？请在 [GitHub Issues](https://github.com/yesuf435/im-safechat/issues) 提交。

---

**SafeChat** - 让沟通更简单 💬
