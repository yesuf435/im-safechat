#!/bin/bash

# 微信风格IM聊天系统部署脚本

echo "开始部署微信风格IM聊天系统..."

# 创建部署目录
DEPLOY_DIR="/www/docker-im/frontend"
echo "检查部署目录: $DEPLOY_DIR"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "部署目录不存在，创建目录..."
    mkdir -p $DEPLOY_DIR
    mkdir -p $DEPLOY_DIR/css
    mkdir -p $DEPLOY_DIR/js
    mkdir -p $DEPLOY_DIR/uploads
fi

# 复制CSS文件
echo "复制CSS文件..."
cp /home/ubuntu/notification_style.css $DEPLOY_DIR/css/
cp /home/ubuntu/mobile_optimization.css $DEPLOY_DIR/css/
cp /home/ubuntu/wechat_style.css $DEPLOY_DIR/css/

# 复制HTML文件
echo "复制HTML文件..."
cp /home/ubuntu/chat_with_notifications.html $DEPLOY_DIR/
cp /home/ubuntu/updated_login.html $DEPLOY_DIR/login.html
cp /home/ubuntu/updated_register.html $DEPLOY_DIR/register.html
cp /home/ubuntu/friend_system_frontend_improvements.html $DEPLOY_DIR/contacts.html
cp /home/ubuntu/group_chat_frontend_improvements.html $DEPLOY_DIR/groups.html

# 复制JS文件
echo "复制JS文件..."
mkdir -p $DEPLOY_DIR/js/api
cp /home/ubuntu/friend_system_improvements.js $DEPLOY_DIR/js/api/
cp /home/ubuntu/group_chat_improvements.js $DEPLOY_DIR/js/api/
cp /home/ubuntu/fix_friend_system.js $DEPLOY_DIR/js/api/
cp /home/ubuntu/chat_media_features.js $DEPLOY_DIR/js/api/

# 复制图片
echo "复制图片..."
if [ -d "/home/ubuntu/upload" ]; then
    cp -r /home/ubuntu/upload/* $DEPLOY_DIR/uploads/
fi

# 设置权限
echo "设置文件权限..."
chmod -R 755 $DEPLOY_DIR
find $DEPLOY_DIR -type f -exec chmod 644 {} \;

echo "微信风格IM聊天系统部署完成！"
echo "系统已部署到: $DEPLOY_DIR"
echo "可通过服务器IP访问: http://120.27.154.62/"
