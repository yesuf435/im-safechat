import React, { useState, useEffect } from 'react';
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
  Paper,
  Badge,
} from '@mui/material';
import {
  Chat as ChatIcon,
  People as PeopleIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import MessagesView from '../components/MessagesView';
import ContactsView from '../components/ContactsView';
import NotificationsView from '../components/NotificationsView';
import SettingsView from '../components/SettingsView';
import type { User } from '../types';

interface MainLayoutProps {
  user: User;
  onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: MainLayoutProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const tabs = [
    { label: t('messages'), icon: <ChatIcon />, component: MessagesView },
    { label: t('contacts'), icon: <PeopleIcon />, component: ContactsView },
    { label: t('notifications'), icon: <NotificationsIcon />, component: NotificationsView },
    { label: t('settings'), icon: <SettingsIcon />, component: SettingsView },
  ];

  const ActiveComponent = tabs[activeTab].component;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <ActiveComponent 
          user={user} 
          onLogout={onLogout}
          onUnreadChange={setUnreadCount}
          onNotificationChange={setNotificationCount}
        />
      </Box>

      {isMobile && (
        <Paper elevation={3} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
          <BottomNavigation
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            showLabels
          >
            <BottomNavigationAction
              label={tabs[0].label}
              icon={
                <Badge badgeContent={unreadCount} color="error">
                  {tabs[0].icon}
                </Badge>
              }
            />
            <BottomNavigationAction label={tabs[1].label} icon={tabs[1].icon} />
            <BottomNavigationAction
              label={tabs[2].label}
              icon={
                <Badge badgeContent={notificationCount} color="error">
                  {tabs[2].icon}
                </Badge>
              }
            />
            <BottomNavigationAction label={tabs[3].label} icon={tabs[3].icon} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
