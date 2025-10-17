# SafeChat 生产环境部署指南

本指南详细说明如何将 SafeChat 部署到生产环境，重点介绍前后端连接配置。

## 快速开始

### 前提条件

- Node.js 14+ 
- MongoDB 4.4+
- 用于前端的 Web 服务器（Nginx、Apache 或其他）

### 部署步骤

#### 1. 后端部署

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install --production

# 配置环境变量
export MONGODB_URI="mongodb://your-mongodb-host:27017/safechat"
export JWT_SECRET="your-secret-key-here"
export PORT=3001
export ALLOWED_ORIGINS="https://yourdomain.com"

# 启动服务（生产环境建议使用 pm2）
npm install -g pm2
pm2 start app.js --name safechat-backend
```

#### 2. 前端部署

前端是纯静态文件，可以部署到任何 Web 服务器。

```bash
# 进入前端目录
cd frontend/modern

# 配置 API 连接
# 根据部署场景选择配置方式（见下文）
```

## 前后端连接配置

SafeChat 支持多种部署场景，通过 `config.js` 文件进行配置。

### 场景 1：同域部署（推荐）

**架构**：前端和后端通过 Nginx 反向代理部署在同一域名下

```
https://yourdomain.com/          → 前端静态文件
https://yourdomain.com/api/      → 后端 API（Nginx 反向代理到 localhost:3001）
https://yourdomain.com/socket.io → Socket.IO（Nginx 反向代理到 localhost:3001）
```

**前端配置**（保持默认，无需修改）：
```javascript
// frontend/modern/config.js
const SafeChatConfig = {
  apiBaseUrl: '',        // 空字符串，使用相对路径
  socketUrl: undefined,  // 使用当前域
  socketOptions: {
    transports: ['websocket', 'polling']
  }
};
```

**Nginx 配置示例**：
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/modern;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO 反向代理
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**后端配置**：
```bash
export ALLOWED_ORIGINS="*"  # 同域部署可以使用 *
# 或者明确指定
export ALLOWED_ORIGINS="https://yourdomain.com"
```

### 场景 2：独立域名部署

**架构**：前端和后端部署在不同的域名

```
https://chat.yourdomain.com/     → 前端
https://api.yourdomain.com/      → 后端
```

**前端配置**：
```javascript
// frontend/modern/config.js
const SafeChatConfig = {
  apiBaseUrl: 'https://api.yourdomain.com',
  socketUrl: 'https://api.yourdomain.com',
  socketOptions: {
    transports: ['websocket', 'polling']
  }
};
```

**后端配置**：
```bash
# 必须明确指定允许的前端域名
export ALLOWED_ORIGINS="https://chat.yourdomain.com"
```

### 场景 3：不同端口（开发/测试环境）

**架构**：前端和后端在同一主机但不同端口

```
http://yourdomain.com:8080/      → 前端
http://yourdomain.com:3001/      → 后端
```

**前端配置**：
```javascript
// frontend/modern/config.js
const SafeChatConfig = {
  apiBaseUrl: 'http://yourdomain.com:3001',
  socketUrl: 'http://yourdomain.com:3001',
  socketOptions: {
    transports: ['websocket', 'polling']
  }
};
```

**后端配置**：
```bash
export PORT=3001
export ALLOWED_ORIGINS="http://yourdomain.com:8080"
```

## 配置文件使用

1. **复制示例配置文件**：
   ```bash
   cd frontend/modern
   # 开发环境
   cp config.example.development.js config.js
   # 或生产环境
   cp config.example.production.js config.js
   ```

2. **编辑配置文件**：
   根据实际部署场景修改 `config.js` 中的 `apiBaseUrl` 和 `socketUrl`。

3. **验证配置**：
   在浏览器中打开前端页面，检查浏览器控制台是否有连接错误。

## 常见问题

### 问题 1：无法连接后端 API

**症状**：前端显示"无法连接服务器"或网络错误

**解决方案**：
1. 检查 `config.js` 中的 `apiBaseUrl` 是否正确
2. 检查后端是否正常运行：`curl http://localhost:3001/api/health`
3. 检查后端 `ALLOWED_ORIGINS` 是否包含前端域名
4. 检查防火墙和安全组是否开放相应端口

### 问题 2：Socket.IO 连接失败

**症状**：登录后立即断开连接，提示"Socket 认证失败"

**解决方案**：
1. 检查 `config.js` 中的 `socketUrl` 是否正确
2. 如果使用 Nginx，确保正确配置了 WebSocket 支持
3. 检查浏览器控制台的 WebSocket 连接日志

### 问题 3：跨域请求被阻止

**症状**：浏览器控制台显示 CORS 错误

**解决方案**：
1. 确保后端 `ALLOWED_ORIGINS` 包含前端完整地址（含协议和端口）
2. 如果使用 Nginx，确保代理头正确配置
3. 检查是否有多层代理导致的头信息丢失

## 安全建议

1. **使用 HTTPS**：生产环境必须使用 HTTPS
2. **设置强 JWT 密钥**：`JWT_SECRET` 应该是随机生成的长字符串
3. **限制 CORS**：不要在生产环境使用 `ALLOWED_ORIGINS="*"`
4. **定期更新依赖**：运行 `npm audit` 检查安全漏洞
5. **MongoDB 认证**：生产环境的 MongoDB 必须启用认证

## 性能优化

1. **启用 Gzip 压缩**（Nginx）
2. **使用 CDN** 加速静态资源
3. **启用 HTTP/2**
4. **使用 pm2 集群模式** 运行多个后端进程
5. **配置 MongoDB 索引** 优化查询性能

## 监控和维护

1. **使用 pm2 监控**：
   ```bash
   pm2 monit
   pm2 logs safechat-backend
   ```

2. **设置日志轮转**：
   ```bash
   pm2 install pm2-logrotate
   ```

3. **定期备份 MongoDB**：
   ```bash
   mongodump --uri="mongodb://localhost:27017/safechat" --out=/backup/$(date +%Y%m%d)
   ```

## 完整部署示例（宝塔面板）

详见 `deploy/BAOTA_DEPLOY.md`

## 技术支持

如遇到部署问题，请：
1. 查看浏览器控制台错误信息
2. 查看后端日志：`pm2 logs safechat-backend`
3. 检查 MongoDB 连接状态
4. 参考本文档的常见问题部分

---

**最后更新**：2025-10-17
