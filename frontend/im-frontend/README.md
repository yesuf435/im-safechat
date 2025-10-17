# SafeChat Modern Frontend

A modern, responsive instant messaging frontend built with React, TypeScript, Vite, and Material UI.

## Features

- 🔐 **Authentication**: Login and registration with JWT
- 💬 **Real-time Messaging**: Socket.IO powered chat with friends
- 👥 **Contact Management**: Add friends, manage friend requests
- 📱 **Responsive Design**: Optimized for both mobile and desktop
- 🌍 **Internationalization**: Support for Chinese and English
- 🎨 **Material UI**: Modern, clean interface with Material Design

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Material UI** - Component library
- **Socket.IO Client** - Real-time communication
- **React Router** - Navigation
- **i18next** - Internationalization
- **Axios** - HTTP client

## Project Structure

```
src/
├── api/              # API service layer
├── components/       # React components
│   ├── MessagesView.tsx
│   ├── ContactsView.tsx
│   ├── NotificationsView.tsx
│   └── SettingsView.tsx
├── pages/            # Page components
│   ├── Auth.tsx
│   └── MainLayout.tsx
├── services/         # Business logic services
│   └── socket.ts
├── theme/            # Material UI theme configuration
├── i18n.ts           # Internationalization setup
├── types.ts          # TypeScript type definitions
├── App.tsx           # Main app component
└── main.tsx          # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- Backend server running on http://localhost:3001

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_BASE=http://localhost:3001
```

## Available Pages

1. **Authentication** - Login/Register with modern UI
2. **Messages** - Chat conversations with real-time updates
3. **Contacts** - Friend list and friend request management
4. **Notifications** - System notifications (placeholder)
5. **Settings** - User settings and language switcher

## Features Implemented

### Authentication
- Login with username/password
- Registration with optional display name
- JWT token management
- Auto-logout on token expiry

### Messaging
- Real-time chat with Socket.IO
- Message history
- Unread message badges
- Conversation list with last message preview
- Support for private and group conversations
- Message sending with Enter key
- Emoji, file, and voice controls (UI ready)

### Contacts
- Friend list display
- Add friends by username search
- Friend request management (send, accept, reject)
- Start private chats with friends

### UI/UX
- Responsive design (mobile and desktop)
- Bottom navigation on mobile
- Material Design components
- Loading states
- Error handling
- Language switching (Chinese/English)

## API Integration

The frontend integrates with the following backend endpoints:

- `POST /api/login` - User authentication
- `POST /api/register` - User registration
- `GET /api/me` - Get current user info
- `GET /api/friends` - Get friend list
- `POST /api/friends/requests` - Send friend request
- `GET /api/friends/requests` - Get pending requests
- `POST /api/friends/requests/:id/accept` - Accept friend request
- `POST /api/friends/requests/:id/reject` - Reject friend request
- `GET /api/conversations` - Get conversation list
- `POST /api/conversations/private` - Create/get private conversation
- `POST /api/conversations/group` - Create group conversation
- `GET /api/conversations/:id/messages` - Get message history
- `POST /api/conversations/:id/messages` - Send message
- `POST /api/conversations/:id/read` - Mark messages as read

## Socket.IO Events

- `connect` - Connection established
- `disconnect` - Connection lost
- `new_message` - New message received
- `conversation_updated` - Conversation updated
- `friend_request` - New friend request
- `friend_request_accepted` - Friend request accepted

## Development Tips

- The app uses TypeScript for type safety
- Material UI theme is customizable in `src/theme/index.ts`
- Add new translations in `src/i18n.ts`
- Socket service is a singleton in `src/services/socket.ts`
- API calls are centralized in `src/api/index.ts`

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome)

## License

Part of the SafeChat project.
