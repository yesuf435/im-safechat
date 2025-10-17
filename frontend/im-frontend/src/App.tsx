import { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import './i18n';
import { theme } from './theme';
import Auth from './pages/Auth';
import MainLayout from './pages/MainLayout';
import { socketService } from './services/socket';
import type { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Try to validate token and get user info
      // For now, we'll just connect the socket
      socketService.connect(token);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    socketService.connect(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    socketService.disconnect();
    setUser(null);
  };

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        {user ? (
          <MainLayout user={user} onLogout={handleLogout} />
        ) : (
          <Auth onLogin={handleLogin} />
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}
