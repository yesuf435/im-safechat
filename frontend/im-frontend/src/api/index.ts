import axios, { AxiosError } from 'axios';
import type { 
  User, 
  Message, 
  Conversation, 
  FriendRequest, 
  AuthResponse 
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/login', { username, password });
    return data;
  },
  
  register: async (username: string, password: string, displayName?: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/register', { 
      username, 
      password, 
      displayName 
    });
    return data;
  },
  
  getMe: async (): Promise<{ user: User; friends: User[] }> => {
    const { data } = await api.get('/api/me');
    return data;
  }
};

// User APIs
export const userApi = {
  search: async (query: string): Promise<{ users: User[] }> => {
    const { data } = await api.get('/api/users/search', { params: { query } });
    return data;
  }
};

// Friend APIs
export const friendApi = {
  getFriends: async (): Promise<{ friends: User[] }> => {
    const { data } = await api.get('/api/friends');
    return data;
  },
  
  sendRequest: async (toUserId: string): Promise<{ request: FriendRequest }> => {
    const { data } = await api.post('/api/friends/requests', { toUserId });
    return data;
  },
  
  getRequests: async (): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> => {
    const { data } = await api.get('/api/friends/requests');
    return data;
  },
  
  acceptRequest: async (requestId: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/api/friends/requests/${requestId}/accept`);
    return data;
  },
  
  rejectRequest: async (requestId: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/api/friends/requests/${requestId}/reject`);
    return data;
  }
};

// Conversation APIs
export const conversationApi = {
  getConversations: async (): Promise<{ conversations: Conversation[] }> => {
    const { data } = await api.get('/api/conversations');
    return data;
  },
  
  getOrCreatePrivate: async (participantId: string): Promise<{ conversation: Conversation }> => {
    const { data } = await api.post('/api/conversations/private', { participantId });
    return data;
  },
  
  createGroup: async (name: string, participantIds: string[]): Promise<{ conversation: Conversation }> => {
    const { data } = await api.post('/api/conversations/group', { name, participantIds });
    return data;
  }
};

// Message APIs
export const messageApi = {
  getMessages: async (conversationId: string, page = 1, limit = 50): Promise<{ messages: Message[] }> => {
    const { data } = await api.get(`/api/conversations/${conversationId}/messages`, {
      params: { page, limit }
    });
    return data;
  },
  
  sendMessage: async (conversationId: string, content: string, type: 'text' | 'image' | 'file' | 'voice' = 'text'): Promise<{ message: Message }> => {
    const { data } = await api.post(`/api/conversations/${conversationId}/messages`, {
      content,
      type
    });
    return data;
  },
  
  markAsRead: async (conversationId: string): Promise<void> => {
    await api.post(`/api/conversations/${conversationId}/read`);
  }
};

export default api;
