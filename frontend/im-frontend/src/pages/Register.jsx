import { useState } from 'react';
import axios from 'axios';

export default function Register({ onRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function register(e) {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    if (password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(import.meta.env.VITE_API_BASE + '/auth/register', {
        username, password
      });
      setSuccess(true);
      setTimeout(() => onRegister(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || '注册失败，用户名可能已存在');
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
          创建账号
        </h2>
        <p style={{
          margin: '0 0 32px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '15px'
        }}>
          加入 SafeChat 开始聊天
        </p>

        {success ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
            <div style={{ color: '#16a34a', fontWeight: '600', fontSize: '16px' }}>
              注册成功！正在跳转...
            </div>
          </div>
        ) : (
          <form onSubmit={register} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                placeholder="选择一个用户名"
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
                placeholder="至少6位字符"
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

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                确认密码
              </label>
              <input
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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
              {isLoading ? '注册中...' : '创建账号'}
            </button>
          </form>
        )}

        {/* Login Link */}
        {!success && (
          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--text-secondary)'
          }}>
            已有账号？{' '}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onRegister(); }}
              style={{
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--accent-hover)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--accent)'}
            >
              立即登录
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
