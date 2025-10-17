export interface User {
  id: string;
  username: string;
  displayName?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: User;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice';
  createdAt: string;
  read?: boolean;
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  name?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequest {
  id: string;
  from: User;
  to?: User;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  code?: string;
}
