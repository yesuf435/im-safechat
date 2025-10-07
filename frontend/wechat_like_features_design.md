# 类微信IM聊天系统设计方案

## 1. 系统概述

本设计方案旨在为现有IM系统添加类似微信的功能，包括好友系统和群聊功能，同时保持酒红+米白的配色方案和适合中老年用户的大字体设计。

## 2. 数据库设计

### 2.1 好友系统相关表

#### 好友关系表 (friendships)
```sql
CREATE TABLE friendships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  friend_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_friendship (user_id, friend_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (friend_id) REFERENCES users(id)
);
```

#### 好友请求表 (friend_requests)
```sql
CREATE TABLE friend_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_request (sender_id, receiver_id),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);
```

### 2.2 群聊系统相关表

#### 群组表 (groups)
```sql
CREATE TABLE groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  creator_id INT NOT NULL,
  avatar VARCHAR(255) DEFAULT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);
```

#### 群组成员表 (group_members)
```sql
CREATE TABLE group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('member', 'admin', 'owner') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_membership (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 群组消息表 (group_messages)
```sql
CREATE TABLE group_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 3. API设计

### 3.1 好友系统API

#### 搜索用户
```
GET /api/users/search?username={username}
```

#### 发送好友请求
```
POST /api/friend-requests
Body: { receiverId: number }
```

#### 获取好友请求列表
```
GET /api/friend-requests
```

#### 处理好友请求
```
PUT /api/friend-requests/{requestId}
Body: { status: 'accepted' | 'rejected' }
```

#### 获取好友列表
```
GET /api/friends
```

#### 删除好友
```
DELETE /api/friends/{friendId}
```

### 3.2 群聊系统API

#### 创建群组
```
POST /api/groups
Body: { name: string, description: string }
```

#### 获取群组列表
```
GET /api/groups
```

#### 获取群组详情
```
GET /api/groups/{groupId}
```

#### 邀请用户加入群组
```
POST /api/groups/{groupId}/members
Body: { userId: number }
```

#### 获取群组成员
```
GET /api/groups/{groupId}/members
```

#### 发送群组消息
```
POST /api/groups/{groupId}/messages
Body: { content: string }
```

#### 获取群组消息
```
GET /api/groups/{groupId}/messages
```

## 4. 前端界面设计

### 4.1 主界面布局

主界面将采用底部导航栏设计，包含以下四个主要Tab：
- 聊天：显示好友和群聊的消息列表
- 通知：显示系统通知和好友请求
- 联系人：显示好友列表和群组列表
- 我的：用户个人设置和信息

### 4.2 好友系统界面

#### 添加好友页面
- 搜索框：用于搜索用户
- 搜索结果列表：显示匹配的用户
- 添加按钮：发送好友请求

#### 好友请求页面
- 收到的请求列表：显示待处理的好友请求
- 接受/拒绝按钮：处理好友请求

#### 好友列表页面
- 好友分组（可选）
- 好友列表：显示所有好友
- 长按菜单：提供删除好友等操作

### 4.3 群聊系统界面

#### 创建群组页面
- 群组名称输入框
- 群组描述输入框
- 选择好友列表：邀请好友加入群组

#### 群组列表页面
- 我创建的群组
- 我加入的群组
- 群组搜索功能

#### 群组聊天页面
- 消息列表：显示群组消息
- 输入框：发送消息
- 群组信息按钮：查看群组详情和成员

#### 群组详情页面
- 群组基本信息
- 成员列表
- 邀请好友按钮
- 退出群组按钮

## 5. 技术实现方案

### 5.1 后端实现

1. 使用Express.js扩展现有后端API
2. 使用Socket.io实现实时消息功能
3. 使用MySQL数据库存储数据
4. 使用JWT进行用户认证

### 5.2 前端实现

1. 使用HTML5、CSS3和JavaScript实现前端界面
2. 使用Fetch API或Axios进行API调用
3. 使用Socket.io-client实现实时消息接收
4. 使用LocalStorage存储用户会话信息

### 5.3 移动端适配

1. 使用响应式设计确保在不同设备上的良好显示
2. 使用大字体和清晰的按钮，适合中老年用户
3. 保持酒红+米白的配色方案
4. 优化触摸交互体验

## 6. 实施计划

### 6.1 第一阶段：好友系统实现
1. 创建好友关系和好友请求数据表
2. 实现好友系统API
3. 开发好友相关前端界面
4. 测试好友功能

### 6.2 第二阶段：群聊系统实现
1. 创建群组相关数据表
2. 实现群聊系统API
3. 开发群聊相关前端界面
4. 测试群聊功能

### 6.3 第三阶段：整合与优化
1. 整合好友系统和群聊系统
2. 优化移动端界面
3. 进行全面测试
4. 部署到生产环境
