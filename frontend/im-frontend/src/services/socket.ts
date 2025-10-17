import { io, Socket } from 'socket.io-client';
import type { Message } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

    this.socket = io(API_BASE, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('new_message', (message: Message) => {
      this.emit('message', message);
    });

    this.socket.on('conversation_updated', (data: any) => {
      this.emit('conversation_updated', data);
    });

    this.socket.on('friend_request', (data: any) => {
      this.emit('friend_request', data);
    });

    this.socket.on('friend_request_accepted', (data: any) => {
      this.emit('friend_request_accepted', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  joinConversation(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  leaveConversation(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  sendMessage(conversationId: string, content: string): void {
    if (this.socket) {
      this.socket.emit('send_message', { conversationId, content });
    }
  }
}

export const socketService = new SocketService();
