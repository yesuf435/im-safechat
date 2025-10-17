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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  Tab,
  Tabs,
  Badge,
  Chip,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { friendApi, userApi, conversationApi } from '../api';
import type { User, FriendRequest } from '../types';

interface ContactsViewProps {
  user: User;
  onLogout: () => void;
  onUnreadChange?: (count: number) => void;
  onNotificationChange?: (count: number) => void;
}

export default function ContactsView({ user, onNotificationChange }: ContactsViewProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({
    incoming: [],
    outgoing: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  useEffect(() => {
    onNotificationChange?.(requests.incoming.length);
  }, [requests.incoming.length]);

  const loadFriends = async () => {
    try {
      const { friends } = await friendApi.getFriends();
      setFriends(friends);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const data = await friendApi.getRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { users } = await userApi.search(query);
      setSearchResults(users.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleSendRequest = async (toUserId: string) => {
    try {
      await friendApi.sendRequest(toUserId);
      setSearchResults(prev => prev.filter(u => u.id !== toUserId));
      await loadRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friendApi.acceptRequest(requestId);
      await loadFriends();
      await loadRequests();
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendApi.rejectRequest(requestId);
      await loadRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleStartChat = async (friend: User) => {
    try {
      await conversationApi.getOrCreatePrivate(friend.id);
      // Navigate to messages view would be handled by parent
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t('contacts')}
          </Typography>
          <IconButton onClick={() => setOpenAddDialog(true)}>
            <PersonAddIcon />
          </IconButton>
        </Toolbar>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
          <Tab label={t('myFriends')} />
          <Tab 
            label={
              <Badge badgeContent={requests.incoming.length} color="error">
                {t('notifications')}
              </Badge>
            } 
          />
        </Tabs>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tab === 0 ? (
          <List>
            {friends.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">{t('noFriends')}</Typography>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  sx={{ mt: 2 }}
                  onClick={() => setOpenAddDialog(true)}
                >
                  {t('addFriend')}
                </Button>
              </Box>
            ) : (
              friends.map((friend) => (
                <ListItem
                  key={friend.id}
                  secondaryAction={
                    <Button size="small" onClick={() => handleStartChat(friend)}>
                      {t('send')}
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar>{friend.displayName?.[0]?.toUpperCase()}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={friend.displayName || friend.username}
                    secondary={`@${friend.username}`}
                  />
                </ListItem>
              ))
            )}
          </List>
        ) : (
          <Box>
            {requests.incoming.length > 0 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Incoming Requests
                </Typography>
                <List>
                  {requests.incoming.map((req) => (
                    <ListItem
                      key={req.id}
                      secondaryAction={
                        <Box>
                          <IconButton
                            edge="end"
                            color="success"
                            onClick={() => handleAcceptRequest(req.id)}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => handleRejectRequest(req.id)}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>{req.from.displayName?.[0]?.toUpperCase()}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={req.from.displayName || req.from.username}
                        secondary={`@${req.from.username}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {requests.outgoing.length > 0 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Sent Requests
                </Typography>
                <List>
                  {requests.outgoing.map((req) => (
                    <ListItem key={req.id}>
                      <ListItemAvatar>
                        <Avatar>{req.to?.displayName?.[0]?.toUpperCase()}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={req.to?.displayName || req.to?.username}
                        secondary={
                          <Chip label="Pending" size="small" color="warning" />
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {requests.incoming.length === 0 && requests.outgoing.length === 0 && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No pending requests</Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth>
        <DialogTitle>{t('addFriend')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            margin="dense"
            placeholder={t('searchUsers')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <List>
            {searchResults.map((u) => (
              <ListItem
                key={u.id}
                secondaryAction={
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleSendRequest(u.id)}
                  >
                    Add
                  </Button>
                }
              >
                <ListItemAvatar>
                  <Avatar>{u.displayName?.[0]?.toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={u.displayName || u.username}
                  secondary={`@${u.username}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>{t('cancel')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
