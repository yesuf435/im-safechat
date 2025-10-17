# SafeChat 开发指南

## 🚀 快速开始

### 本地开发环境

#### 方式一：使用 Docker Compose（推荐）

```bash
# 一键启动所有服务（MongoDB + 后端 + 前端）
docker-compose up --build

# 访问应用
# - 前端: http://localhost:80
# - 后端 API: http://localhost:3000
# - MongoDB: localhost:27017
```

#### 方式二：手动启动各服务

**1. 启动 MongoDB**
```bash
# 使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:7

# 或安装本地 MongoDB
# macOS: brew install mongodb-community
# Ubuntu: sudo apt install mongodb
```

**2. 启动后端**
```bash
cd backend
npm install
npm start

# 后端将在 http://localhost:3001 启动
```

**3. 启动前端（两种选择）**

**静态前端（快速预览）：**
```bash
# 使用任意 HTTP 服务器
cd frontend/modern
python3 -m http.server 8080
# 或
npx serve .

# 访问 http://localhost:8080
```

**Vite + React 前端（开发版）：**
```bash
cd frontend/im-frontend
npm install
npm run dev

# 访问 http://localhost:5173
```

## 🧪 测试

### 后端测试

```bash
cd backend
npm test
```

**注意事项：**
- 测试使用 `mongodb-memory-server` 自动启动内存 MongoDB
- 在受限网络环境中，MongoDB 二进制下载可能失败，测试会自动跳过
- Codespaces 环境可能遇到权限问题，建议使用 Docker 进行集成测试

### 前端测试

```bash
cd frontend/im-frontend
npm run lint  # ESLint 检查
```

## 🔧 环境变量配置

### 后端环境变量

创建 `backend/.env` 文件：

```bash
# 数据库
MONGODB_URI=mongodb://localhost:27017/safechat

# 认证
JWT_SECRET=your_super_secret_key_here

# 服务器
PORT=3001

# CORS（开发环境可设为 *，生产环境需指定具体域名）
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080

# 可选：启用管理面板
ENABLE_BOSS=true

# 文件上传限制（MB）
MAX_FILE_SIZE=10
```

### 前端配置

**开发环境：** `frontend/modern/config.js`
```javascript
window.CONFIG = {
  apiBaseUrl: 'http://localhost:3001',
  socketUrl: 'http://localhost:3001'
};
```

**生产环境：** 
```javascript
window.CONFIG = {
  apiBaseUrl: '',  // 同域部署无需配置
  socketUrl: ''
};
```

## 📁 项目结构

```
im-safechat/
├── backend/                 # 后端服务
│   ├── app.js              # 单文件后端（示例）
│   ├── im-backend/         # 模块化后端（推荐）
│   │   ├── routes/         # 路由定义
│   │   ├── controllers/    # 业务逻辑
│   │   ├── models/         # 数据模型
│   │   ├── socket/         # Socket.IO 处理
│   │   ├── middleware/     # 中间件
│   │   └── config/         # 配置文件
│   └── tests/              # 测试文件
│
├── frontend/
│   ├── modern/             # 静态前端（HTML/CSS/JS）
│   │   ├── index.html      # 登录页
│   │   ├── app.js          # 主应用逻辑
│   │   └── admin.html      # 管理后台
│   │
│   └── im-frontend/        # Vite + React 前端
│       ├── src/
│       └── package.json
│
├── deploy/                 # 部署相关
│   ├── BAOTA_DEPLOY.md     # 宝塔部署指南
│   └── create-baota-package.sh
│
├── docker-compose.yml      # Docker 编排
└── .github/
    └── copilot-instructions.md  # AI 助手指南
```

## 🔄 开发工作流

### 1. 功能开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 开发并测试
npm test  # 后端测试

# 3. 提交代码
git add .
git commit -m "feat: add your feature description"

# 4. 推送并创建 PR
git push origin feature/your-feature-name
```

### 2. 代码规范

**后端路由组织：**
```javascript
// routes/xxxRoutes.js - 只负责路由定义
router.post('/register', AuthController.register);

// controllers/xxxController.js - 业务逻辑
const AuthController = {
  async register(req, res) {
    // 业务逻辑
  }
};

// models/xxxModel.js - 数据层操作
const UserModel = {
  async createUser(username, password) {
    // 数据库操作
  }
};
```

**错误处理：**
```javascript
// 使用 asyncHandler 包裹异步路由
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json({ users });
}));
```

**序列化函数（重要）：**
```javascript
// 统一使用序列化函数处理数据输出
function serializeUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName || user.username
  };
}

function serializeMessage(message) {
  return {
    id: message._id.toString(),
    conversationId: message.conversation.toString(),
    sender: serializeUser(message.sender),
    content: message.content,
    createdAt: message.createdAt
  };
}
```

### 3. API 使用规范

**认证请求：**
```javascript
// 前端请求示例
fetch('http://localhost:3001/api/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

**文件上传：**
```bash
curl -X POST http://localhost:3001/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@avatar.png"
```

**Socket.IO 连接：**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('已连接到服务器');
});

socket.on('newMessage', (message) => {
  console.log('收到新消息:', message);
});
```

## 🐛 调试

### 后端调试

```bash
# 启动后端时查看日志
npm start

# 日志工具位于 backend/im-backend/config/logger.js
# 使用示例：
const { logger } = require('./config/logger');
logger.info('用户登录', { username: 'alice' });
logger.error('数据库错误', { error: err.message });
```

### 前端调试

**浏览器开发者工具：**
- Network 标签：查看 API 请求/响应
- Console 标签：查看 Socket 连接状态和消息日志
- Application 标签：检查 localStorage 中的 token

**常见问题：**
- Token 过期：检查 localStorage.getItem('token')
- CORS 错误：检查后端 ALLOWED_ORIGINS 配置
- Socket 连接失败：检查认证 token 和后端 Socket.IO 配置

## 📦 部署

### Docker 部署（推荐）

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f backend

# 停止服务
docker-compose down
```

### 宝塔面板部署

详见 `deploy/BAOTA_DEPLOY.md`

```bash
# 生成部署包
bash deploy/create-baota-package.sh

# 上传 dist/safechat-baota-release.tar.gz 到服务器
```

## 🎯 待办事项

查看 `frontend/todo.md` 了解项目待完成功能列表。

## 📚 参考资源

- [Express.js 文档](https://expressjs.com/)
- [Socket.IO 文档](https://socket.io/docs/)
- [Mongoose 文档](https://mongoosejs.com/)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)

---

**最后更新：** 2025-10-17  
**维护者：** SafeChat 开发团队
