# SafeChat Quick Start Guide

Get SafeChat up and running in minutes!

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- 2GB free RAM
- Ports 80, 3001, and 27017 available

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/yesuf435/im-safechat.git
cd im-safechat
```

2. **Set environment variables** (Optional)
```bash
# Create .env file
cat > .env << 'EOL'
JWT_SECRET=your_super_secret_key_change_this
ALLOWED_ORIGINS=http://localhost,http://localhost:80
EOL
```

3. **Start all services**
```bash
docker-compose up -d
```

4. **Access the application**
- Open your browser: http://localhost
- Register a new account
- Start chatting!

5. **View logs** (Optional)
```bash
docker-compose logs -f
```

6. **Stop services**
```bash
docker-compose down
```

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+
- MongoDB 4.4+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOL'
PORT=3001
MONGODB_URI=mongodb://localhost:27017/safechat
JWT_SECRET=dev_secret_key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5175
EOL

# Start MongoDB (if not running)
# Ubuntu/Debian:
sudo systemctl start mongod
# macOS:
brew services start mongodb-community

# Start backend
npm start
```

Backend will run on http://localhost:3001

### Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend/im-frontend

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOL'
VITE_API_BASE=http://localhost:3001
EOL

# Start development server
npm run dev
```

Frontend will run on http://localhost:5173

### Test the Application

1. Open http://localhost:5173
2. Click "Register" tab
3. Create a new account:
   - Username: testuser1
   - Display Name: Test User
   - Password: password123
4. Login and explore!

To test messaging, create a second account in an incognito window.

## 📱 Features to Try

### Authentication
- ✅ Register with username/password
- ✅ Login and logout
- ✅ Session management with JWT

### Messaging
- ✅ Send real-time messages
- ✅ View conversation history
- ✅ See unread message counts
- ✅ Multiple conversations

### Contacts
- ✅ Search for users
- ✅ Send friend requests
- ✅ Accept/reject requests
- ✅ View friend list
- ✅ Start private chats

### Settings
- ✅ Switch language (Chinese/English)
- ✅ View profile
- ✅ Logout

## 🔧 Troubleshooting

### Backend Issues

**Error: Cannot connect to MongoDB**
```bash
# Check if MongoDB is running
sudo systemctl status mongod  # Linux
brew services list  # macOS

# Start MongoDB if needed
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

**Error: Port 3001 already in use**
```bash
# Find and kill the process
lsof -i :3001  # Get PID
kill -9 <PID>  # Replace <PID> with actual process ID

# Or change the port in backend/.env
PORT=3002
```

### Frontend Issues

**Error: Connection refused to backend**
- Ensure backend is running on http://localhost:3001
- Check `VITE_API_BASE` in frontend/.env
- Verify CORS settings in backend

**Error: Port 5173 already in use**
- Vite will automatically try the next available port
- Or specify a different port:
```bash
npm run dev -- --port 5174
```

### Docker Issues

**Error: Port already allocated**
```bash
# Stop services using the ports
docker-compose down
sudo lsof -i :80  # Find what's using port 80
sudo kill -9 <PID>
```

**Error: Cannot connect to Docker daemon**
```bash
# Start Docker
sudo systemctl start docker  # Linux
open -a Docker  # macOS
```

## 🎯 Next Steps

1. **Customize the theme**: Edit `frontend/im-frontend/src/theme/index.ts`
2. **Add features**: Check the component files in `frontend/im-frontend/src/components/`
3. **Deploy to production**: See DEPLOYMENT.md
4. **Enable HTTPS**: Use Let's Encrypt (see DEPLOYMENT.md)
5. **Add more users**: Create multiple accounts to test messaging

## 📚 Documentation

- [Complete Deployment Guide](./DEPLOYMENT.md)
- [Frontend README](./frontend/im-frontend/README.md)
- [Main README](./README.md)

## 🐛 Getting Help

- Check existing issues: https://github.com/yesuf435/im-safechat/issues
- Create a new issue with details about your problem
- Include error messages and logs

## 📄 Default Credentials for Testing

**Note**: These are for development only. Create your own accounts!

| Username | Password |
|----------|----------|
| Create your own | - |

## 🔒 Security Notes

- Change JWT_SECRET before deploying to production
- Use HTTPS in production
- Don't commit .env files with secrets
- Enable MongoDB authentication in production

Enjoy using SafeChat! 🎉
