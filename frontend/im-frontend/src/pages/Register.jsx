import { useState } from 'react';
import axios from 'axios';

export default function Register({ onRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function register() {
    try {
      const res = await axios.post(import.meta.env.VITE_API_BASE + '/auth/register', {
        username, password
      });
      alert('注 册 成 功，请 登录');
      onRegister();
    } catch (err) {
      alert('注 册 失 败：' + err.response?.data?.message || '未知错误');
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', background: '#fff'
    }}>
      <h2 style={{ color: '#d0021b' }}>注 册</h2>
      <input placeholder="用户名" value={username} onChange={e => setUsername(e.target.value)} style={{ marginBottom: 10, padding: 8, width: 240 }} />
      <input placeholder="密 码" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: 10, padding: 8, width: 240 }} />
      <button onClick={register} style={{ padding: '8px 20px', backgroundColor: '#d0021b', color: '#fff', border: 'none', borderRadius: 4 }}>注 册</button>
    </div>
  );
}
