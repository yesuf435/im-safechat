import { useEffect, useState } from 'react';
import axios from 'axios';
import { getSocket } from '../socket';

export default function Chat({ user }) {
  const [contacts, setContacts] = useState([]);
  const [current, setCurrent] = useState(null);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(import.meta.env.VITE_API_BASE + '/auth/all', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setContacts(res.data.filter(u => u.id !== user.id));
    });

    const socket = getSocket();
    socket.on('private_message', msg => {
      if (msg.from === current?.id || msg.from === user.id)
        setMsgs(prev => [...prev, msg]);
    });
  }, [current]);

  const send = () => {
    if (!text.trim()) return;
    getSocket().emit('private_message', { toUserId: current.id, content: text });
    setMsgs(prev => [...prev, { from: user.id, content: text }]);
    setText('');
  };

  return (
    <div style={{
      display: 'flex', height: '100vh', fontFamily: 'Arial',
      background: '#f5f5f5'
    }}>
      <aside style={{
        width: 260, borderRight: '1px solid #ddd', background: '#fff',
        padding: 10, overflowY: 'auto'
      }}>
        <h3 style={{ color: '#d0021b' }}>联系人</h3>
        {contacts.map(c => (
          <div key={c.id}
            onClick={() => { setCurrent(c); setMsgs([]); }}
            style={{
              padding: 12, cursor: 'pointer', background: current?.id === c.id ? '#ffeaea' : 'transparent',
              borderBottom: '1px solid #eee', color: '#333'
            }}>
            {c.username}
          </div>
        ))}
      </aside>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: 10, borderBottom: '1px solid #ddd', background: '#fff' }}>
          <strong style={{ color: '#d0021b' }}>{current ? current.username : '请选择联系人'}</strong>
        </header>
        <section style={{
          flex: 1, padding: 12, overflowY: 'auto', background: '#fff'
        }}>
          {msgs.map((m, i) => (
            <div key={i} style={{
              textAlign: m.from === user.id ? 'right' : 'left',
              marginBottom: 10
            }}>
              <span style={{
                display: 'inline-block', padding: '10px 14px',
                background: m.from === user.id ? '#d0021b' : '#f1f0f0',
                color: m.from === user.id ? '#fff' : '#000',
                borderRadius: 10, maxWidth: '60%', wordBreak: 'break-word'
              }}>
                {m.content}
              </span>
            </div>
          ))}
        </section>
        <footer style={{
          padding: 10, borderTop: '1px solid #ddd', background: '#fff',
          display: 'flex'
        }}>
          <input value={text} onChange={e => setText(e.target.value)}
            style={{
              flex: 1, padding: 10, fontSize: 16,
              border: '1px solid #ccc', borderRadius: 6
            }} />
          <button onClick={send} style={{
            padding: '10px 18px', marginLeft: 10,
            background: '#d0021b', color: '#fff', border: 'none',
            borderRadius: 6, fontWeight: 'bold'
          }}>发送</button>
        </footer>
      </main>
    </div>
  );
}
