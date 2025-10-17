import { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin, onRegisterClick }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function login() {
    try {
      const { data } = await axios.post(import.meta.env.VITE_API_BASE + '/auth/login', {
        username, password
      });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      alert('登 录 失 败：' + err.response?.data?.message || '未知错误');
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', background: '#fff'
    }}>
      <h2 style={{ color: '#d0021b' }}>登 录</h2>
      <input placeholder="用户名" value={username} onChange={e => setUsername(e.target.value)} style={{ marginBottom: 10, padding: 8, width: 240 }} />
      <input placeholder="密 码" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: 10, padding: 8, width: 240 }} />
      <button onClick={login} style={{ padding: '8px 20px', backgroundColor: '#d0021b', color: '#fff', border: 'none', borderRadius: 4, marginBottom: 10 }}>登 录</button>
      <a href="#" onClick={onRegisterClick} style={{ color: '#666' }}>没 有 账 号？去 注 册</a>
    </div>
  );
}
