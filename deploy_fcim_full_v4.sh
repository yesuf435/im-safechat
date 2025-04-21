#!/bin/bash
echo "🚀 开始部署：fcim_full_system_final_with_server.zip （V4 全功能版本）"

# 清理旧内容
echo "🧹 清理旧部署内容..."
rm -rf /www/wwwroot/fcim_full_7005_7006/im
rm -rf /mnt/data/opt/im-system
pkill -f server.js

# 解压新版包
echo "📦 解压 zip 包..."
unzip -o /www/wwwroot/fcim_full_7005_7006/fcim_full_system_final_with_server.zip -d /mnt/data/

# 拷贝前端
echo "📁 拷贝前端 im/"
cp -r /mnt/data/im /www/wwwroot/fcim_full_7005_7006/

# 拷贝后端
echo "📁 拷贝后端 server/"
mkdir -p /mnt/data/opt/
cp -r /mnt/data/server /mnt/data/opt/im-system/

# 启动后端服务
echo "🔧 安装依赖并启动服务..."
cd /mnt/data/opt/im-system/server
npm install
nohup node server.js > im_server.log 2>&1 &

# 导入数据库
echo "🛠️ 导入数据库结构"
mysql -ufcim -p'MyNew@2025Safe' fcim < /mnt/data/schema.sql

echo "✅ 部署完成！访问地址：http://你的IP:7005/im/index.html"
