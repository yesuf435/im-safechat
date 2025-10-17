# SafeChat Deployment Guide

Complete guide for deploying the SafeChat modern instant messaging system.

## System Architecture

```
Frontend (React + TypeScript + Material UI)
    ↓ HTTP/HTTPS
Backend (Node.js + Express + Socket.IO)
    ↓
MongoDB Database
```

## Prerequisites

### For Development
- Node.js 18+ and npm
- MongoDB 4.4+
- Git

### For Production
- Linux server (Ubuntu 20.04+ or CentOS 7+)
- Domain name (optional but recommended)
- SSL certificate (for HTTPS)
- Nginx (for reverse proxy)

## Local Development Setup

### 1. Install MongoDB

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
Download and install from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

### 2. Backend Setup

```bash
cd backend
npm install

# Configure environment variables
cat > .env << 'EOL'
PORT=3001
MONGODB_URI=mongodb://localhost:27017/safechat
JWT_SECRET=your_super_secret_jwt_key_change_this
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5175
EOL

# Start the backend
npm start
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend/im-frontend
npm install

# Configure environment variables
cat > .env << 'EOL'
VITE_API_BASE=http://localhost:3001
EOL

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173` (or another port if 5173 is in use)

### 4. Access the Application

1. Open your browser and navigate to `http://localhost:5173`
2. Register a new account
3. Login and start chatting!

## Production Deployment

### Option 1: Docker Deployment (Recommended)

Create a `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: safechat-mongodb
    restart: always
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=safechat
    ports:
      - "27017:27017"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: safechat-backend
    restart: always
    environment:
      - PORT=3001
      - MONGODB_URI=mongodb://mongodb:27017/safechat
      - JWT_SECRET=${JWT_SECRET}
      - ALLOWED_ORIGINS=https://yourdomain.com
    ports:
      - "3001:3001"
    depends_on:
      - mongodb

  frontend:
    build:
      context: ./frontend/im-frontend
      dockerfile: Dockerfile
    container_name: safechat-frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend

volumes:
  mongo_data:
```

Backend Dockerfile:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "app.js"]
```

Frontend Dockerfile:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Deploy:
```bash
docker-compose up -d
```

### Option 2: Manual Deployment on Linux Server

#### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx
sudo apt-get install -y nginx
```

#### 2. Deploy Backend

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/yesuf435/im-safechat.git
cd im-safechat/backend

# Install dependencies
sudo npm install --production

# Configure environment
sudo tee .env << 'EOL'
PORT=3001
MONGODB_URI=mongodb://localhost:27017/safechat
JWT_SECRET=CHANGE_THIS_TO_RANDOM_SECRET
ALLOWED_ORIGINS=https://yourdomain.com
EOL

# Create systemd service
sudo tee /etc/systemd/system/safechat-backend.service << 'EOL'
[Unit]
Description=SafeChat Backend
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/im-safechat/backend
ExecStart=/usr/bin/node app.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Start service
sudo systemctl daemon-reload
sudo systemctl start safechat-backend
sudo systemctl enable safechat-backend
```

#### 3. Build and Deploy Frontend

```bash
cd /opt/im-safechat/frontend/im-frontend

# Configure API endpoint
sudo tee .env << 'EOL'
VITE_API_BASE=https://yourdomain.com/api
EOL

# Build
sudo npm install
sudo npm run build

# Copy to nginx directory
sudo rm -rf /var/www/safechat
sudo mkdir -p /var/www/safechat
sudo cp -r dist/* /var/www/safechat/
```

#### 4. Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/safechat << 'EOL'
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    root /var/www/safechat;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.IO WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOL

# Enable site
sudo ln -s /etc/nginx/sites-available/safechat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
sudo systemctl reload nginx
```

## Environment Variables

### Backend (.env)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Backend server port | 3001 | No |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/safechat | Yes |
| JWT_SECRET | Secret key for JWT tokens | - | Yes |
| ALLOWED_ORIGINS | Comma-separated list of allowed origins | * | No |

### Frontend (.env)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| VITE_API_BASE | Backend API base URL | http://localhost:3001 | Yes |

## Monitoring and Maintenance

### Check Service Status

```bash
# Backend
sudo systemctl status safechat-backend

# MongoDB
sudo systemctl status mongod

# Nginx
sudo systemctl status nginx
```

### View Logs

```bash
# Backend logs
sudo journalctl -u safechat-backend -f

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Backup

```bash
# Backup
mongodump --db safechat --out /backup/mongodb/$(date +%Y%m%d)

# Restore
mongorestore --db safechat /backup/mongodb/20231201/safechat
```

## Troubleshooting

### Backend won't start
- Check MongoDB is running: `sudo systemctl status mongod`
- Check environment variables are set correctly
- Check logs: `sudo journalctl -u safechat-backend -n 50`

### Frontend shows connection error
- Verify backend is running and accessible
- Check CORS settings in backend
- Verify VITE_API_BASE is set correctly
- Check browser console for errors

### Socket.IO connection fails
- Ensure WebSocket traffic is allowed through firewall
- Check Nginx WebSocket proxy configuration
- Verify ALLOWED_ORIGINS includes the frontend domain

### MongoDB connection issues
- Verify MongoDB is running: `sudo systemctl status mongod`
- Check MongoDB URI is correct
- Ensure MongoDB is binding to the correct interface

## Performance Optimization

### Backend
- Enable gzip compression
- Implement Redis for session management
- Use PM2 for process management
- Set up database indexes

### Frontend
- Enable Nginx gzip compression
- Configure browser caching
- Use CDN for static assets
- Implement code splitting

### Database
- Create indexes on frequently queried fields
- Enable MongoDB profiling
- Regular database optimization
- Implement data retention policies

## Security Recommendations

1. **Change default JWT secret** to a strong random value
2. **Use HTTPS** in production with valid SSL certificates
3. **Configure firewall** to allow only necessary ports (80, 443, 22)
4. **Regular updates** of all dependencies
5. **Enable MongoDB authentication** in production
6. **Rate limiting** on API endpoints
7. **Input validation** and sanitization
8. **Regular security audits**

## Support

For issues and questions:
- GitHub Issues: https://github.com/yesuf435/im-safechat/issues
- Documentation: See README.md files in each component

## License

Part of the SafeChat project.
