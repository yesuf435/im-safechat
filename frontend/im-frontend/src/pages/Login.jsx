import { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin, onRegisterClick }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function login(e) {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const { data } = await axios.post(import.meta.env.VITE_API_BASE + '/auth/login', {
        username, password
      });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-xl)',
        padding: '48px 40px',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid rgba(255, 255, 255, 0.8)'
      }}>
        {/* Logo */}
        <div style={{
          width: '72px',
          height: '72px',
          margin: '0 auto 24px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          boxShadow: '0 12px 24px rgba(215, 0, 53, 0.3)'
        }}>
          💬
        </div>

        {/* Title */}
        <h2 style={{
          margin: '0 0 8px',
          fontSize: '28px',
          fontWeight: '700',
          textAlign: 'center',
          color: 'var(--text-primary)'
        }}>
          欢迎回来
        </h2>
        <p style={{
          margin: '0 0 32px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '15px'
        }}>
          登录到 SafeChat 继续聊天
        </p>

        {/* Form */}
        <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)'
            }}>
              用户名
            </label>
            <input
              type="text"
              placeholder="输入你的用户名"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: '1.5px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                transition: 'var(--transition)',
                background: 'var(--bg-secondary)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-medium)'}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)'
            }}>
              密码
            </label>
            <input
              type="password"
              placeholder="输入你的密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: '1.5px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                transition: 'var(--transition)',
                background: 'var(--bg-secondary)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-medium)'}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '8px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#fff',
              background: isLoading ? 'var(--text-tertiary)' : 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'var(--transition)',
              boxShadow: isLoading ? 'none' : '0 4px 12px rgba(215, 0, 53, 0.3)'
            }}
            onMouseEnter={(e) => !isLoading && (e.target.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => !isLoading && (e.target.style.background = 'var(--accent)')}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* Register Link */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          还没有账号？{' '}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onRegisterClick(); }}
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--accent-hover)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--accent)'}
          >
            立即注册
          </a>
        </div>
      </div>
    </div>
  );
}
