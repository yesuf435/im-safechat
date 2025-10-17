import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  AppBar,
  Toolbar,
  Divider,
  Switch,
  Button,
  ListItemButton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Language as LanguageIcon,
  Brightness4 as ThemeIcon,
  Notifications as NotificationsIcon,
  Lock as LockIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { User } from '../types';

interface SettingsViewProps {
  user: User;
  onLogout: () => void;
  onUnreadChange?: (count: number) => void;
  onNotificationChange?: (count: number) => void;
}

export default function SettingsView({ user, onLogout }: SettingsViewProps) {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6">{t('settings')}</Typography>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Avatar
          sx={{
            width: 80,
            height: 80,
            margin: '0 auto',
            mb: 2,
            bgcolor: 'primary.main',
            fontSize: '2rem',
          }}
        >
          {user.displayName?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
        </Avatar>
        <Typography variant="h6">{user.displayName || user.username}</Typography>
        <Typography variant="body2" color="text.secondary">
          @{user.username}
        </Typography>
      </Box>

      <Divider />

      <List>
        <ListItemButton>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary={t('profile')} />
        </ListItemButton>

        <ListItemButton onClick={handleLanguageChange}>
          <ListItemIcon>
            <LanguageIcon />
          </ListItemIcon>
          <ListItemText 
            primary={t('language')} 
            secondary={i18n.language === 'zh' ? '中文' : 'English'}
          />
        </ListItemButton>

        <ListItem>
          <ListItemIcon>
            <ThemeIcon />
          </ListItemIcon>
          <ListItemText primary={t('theme')} />
          <Switch />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <NotificationsIcon />
          </ListItemIcon>
          <ListItemText primary={t('notifications_settings')} />
          <Switch defaultChecked />
        </ListItem>

        <ListItemButton>
          <ListItemIcon>
            <LockIcon />
          </ListItemIcon>
          <ListItemText primary={t('privacy')} />
        </ListItemButton>
      </List>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={onLogout}
        >
          {t('logout')}
        </Button>
      </Box>
    </Box>
  );
}
