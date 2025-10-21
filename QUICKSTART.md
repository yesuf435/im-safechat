# 前后端联通配置快速参考

## 问题：前后端联通测试能不能直接上线使用？

**答案**：可以，但需要正确配置前后端连接。

## 配置步骤（3 步完成）

### 步骤 1：选择部署场景

| 场景 | 说明 | 配置难度 |
|------|------|----------|
| 同域部署 | 前后端在同一域名（推荐）| ⭐ 简单 |
| 独立域名 | 前后端不同域名 | ⭐⭐ 中等 |
| 不同端口 | 开发/测试环境 | ⭐⭐ 中等 |

### 步骤 2：配置前端

```bash
cd frontend/modern

# 开发环境（后端在 localhost:3001）
cp config.example.development.js config.js

# 或生产环境（根据场景修改）
cp config.example.production.js config.js
# 然后编辑 config.js
```

**同域部署**（无需修改）：
```javascript
apiBaseUrl: '',
socketUrl: undefined,
```

**独立域名**：
```javascript
apiBaseUrl: 'https://api.yourdomain.com',
socketUrl: 'https://api.yourdomain.com',
```

### 步骤 3：配置后端

```bash
# 设置允许的前端地址
export ALLOWED_ORIGINS="https://yourdomain.com"

# 如果前后端同域，可以用 *
export ALLOWED_ORIGINS="*"
```

## 验证部署

1. 打开前端页面
2. 打开浏览器开发者工具（F12）
3. 尝试注册/登录
4. 检查 Network 标签，确认 API 请求成功
5. 检查 Console 标签，确认无错误

## 常见错误排查

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| CORS error | 后端未允许前端域名 | 设置 ALLOWED_ORIGINS |
| Network error | API 地址错误 | 检查 config.js 的 apiBaseUrl |
| Socket disconnected | WebSocket 连接失败 | 检查 config.js 的 socketUrl |
| 401 Unauthorized | JWT 过期或无效 | 重新登录 |

## 完整文档

- 详细部署指南：`DEPLOYMENT.md`
- 宝塔部署指南：`deploy/BAOTA_DEPLOY.md`
- 项目说明：`README.md`

## 技术栈

- 前端：纯 JavaScript + HTML + CSS
- 后端：Node.js + Express + Socket.IO
- 数据库：MongoDB
- 实时通信：Socket.IO

## 支持的功能

✅ 用户注册和登录  
✅ 好友管理  
✅ 一对一私聊  
✅ 群聊  
✅ 实时消息推送  
✅ 跨设备消息同步  
✅ 后台管理控制台  

---

**核心改进**：添加了前端配置系统，支持灵活的部署场景，无需修改代码即可适配不同环境。
