import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Fab,
  Badge,
  AppBar,
  Toolbar,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Send as SendIcon,
  EmojiEmotions as EmojiIcon,
  AttachFile as AttachFileIcon,
  Mic as MicIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { conversationApi, messageApi } from '../api';
import { socketService } from '../services/socket';
import type { User, Conversation, Message } from '../types';

interface MessagesViewProps {
  user: User;
  onLogout: () => void;
  onUnreadChange?: (count: number) => void;
  onNotificationChange?: (count: number) => void;
}

export default function MessagesView({ user, onUnreadChange }: MessagesViewProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    
    const handleMessage = (message: Message) => {
      if (selectedConv && message.conversationId === selectedConv.id) {
        setMessages(prev => [...prev, message]);
      }
      loadConversations(); // Refresh conversation list
    };

    socketService.on('message', handleMessage);
    return () => socketService.off('message', handleMessage);
  }, [selectedConv]);

  const loadConversations = async () => {
    try {
      const { conversations } = await conversationApi.getConversations();
      setConversations(conversations);
      
      const unread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
      onUnreadChange?.(unread);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversation: Conversation) => {
    try {
      const { messages } = await messageApi.getMessages(conversation.id);
      setMessages(messages);
      await messageApi.markAsRead(conversation.id);
      socketService.joinConversation(conversation.id);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    if (selectedConv) {
      socketService.leaveConversation(selectedConv.id);
    }
    setSelectedConv(conv);
    loadMessages(conv);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConv) return;

    try {
      const { message } = await messageApi.sendMessage(selectedConv.id, messageText);
      setMessages(prev => [...prev, message]);
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getOtherParticipant = (conv: Conversation): User | null => {
    if (conv.type === 'private') {
      return conv.participants.find(p => p.id !== user.id) || null;
    }
    return null;
  };

  const ConversationList = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t('messages')}
          </Typography>
          <IconButton>
            <AddIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder={t('searchFriends')}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <List sx={{ flex: 1, overflow: 'auto' }}>
        {conversations.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">{t('noConversations')}</Typography>
          </Box>
        ) : (
          conversations.map((conv) => {
            const other = getOtherParticipant(conv);
            const displayName = conv.type === 'group' ? conv.name : other?.displayName || other?.username;
            
            return (
              <ListItem
                key={conv.id}
                button
                selected={selectedConv?.id === conv.id}
                onClick={() => handleSelectConversation(conv)}
              >
                <ListItemAvatar>
                  <Badge badgeContent={conv.unreadCount} color="error">
                    <Avatar>{displayName?.[0]?.toUpperCase()}</Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={displayName}
                  secondary={conv.lastMessage?.content || t('noConversations')}
                  secondaryTypographyProps={{
                    noWrap: true,
                  }}
                />
              </ListItem>
            );
          })
        )}
      </List>
    </Box>
  );

  const ChatWindow = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {selectedConv ? (
        <>
          <AppBar position="static" color="default" elevation={1}>
            <Toolbar>
              <Avatar sx={{ mr: 2 }}>
                {(getOtherParticipant(selectedConv)?.displayName || selectedConv.name)?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="h6">
                {selectedConv.type === 'group' 
                  ? selectedConv.name 
                  : getOtherParticipant(selectedConv)?.displayName || getOtherParticipant(selectedConv)?.username
                }
              </Typography>
            </Toolbar>
          </AppBar>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
            {messages.map((msg, idx) => {
              const isOwn = msg.sender.id === user.id;
              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    mb: 1,
                  }}
                >
                  {!isOwn && (
                    <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                      {msg.sender.displayName?.[0]?.toUpperCase()}
                    </Avatar>
                  )}
                  <Box
                    sx={{
                      maxWidth: '70%',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: isOwn ? 'primary.main' : 'white',
                      color: isOwn ? 'white' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2">{msg.content}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <IconButton size="small">
                <EmojiIcon />
              </IconButton>
              <IconButton size="small">
                <AttachFileIcon />
              </IconButton>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder={t('typeMessage')}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                size="small"
              />
              <IconButton size="small">
                <MicIcon />
              </IconButton>
              <IconButton 
                color="primary" 
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </>
      ) : (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary">{t('selectContact')}</Typography>
        </Box>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <Box sx={{ height: 'calc(100vh - 56px)' }}>
        {!selectedConv ? <ConversationList /> : <ChatWindow />}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Box sx={{ width: 360, borderRight: 1, borderColor: 'divider' }}>
        <ConversationList />
      </Box>
      <Box sx={{ flex: 1 }}>
        <ChatWindow />
      </Box>
    </Box>
  );
}
