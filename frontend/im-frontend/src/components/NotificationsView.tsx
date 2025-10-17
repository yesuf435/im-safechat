import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  AppBar,
  Toolbar,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { User } from '../types';

interface NotificationsViewProps {
  user: User;
  onLogout: () => void;
  onUnreadChange?: (count: number) => void;
  onNotificationChange?: (count: number) => void;
}

export default function NotificationsView({ }: NotificationsViewProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6">{t('notifications')}</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
          No notifications
        </Typography>
      </Box>
    </Box>
  );
}
