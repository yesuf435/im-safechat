import React from 'react';
import '../styles/theme.css';

export default function Sidebar({ contacts, current, onSelect }) {
  return (
    <aside style={{ width: 260, borderRight: '1px solid var(--border-color)', background: '#fff', padding: 10 }}>
      <h3 style={{ color: 'var(--primary-color)' }}>联系人</h3>
      {contacts.map(c => (
        <div key={c.id}
             onClick={() => onSelect(c)}
             style={{
               padding: 10,
               cursor: 'pointer',
               background: current?.id === c.id ? '#fff1f1' : 'transparent',
               borderBottom: '1px solid #f0f0f0'
             }}>
          {c.username}
        </div>
      ))}
    </aside>
  );
}
