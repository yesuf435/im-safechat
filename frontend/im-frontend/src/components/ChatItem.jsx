import React from 'react';
import '../styles/theme.css';

export default function ChatItem({ msg, self }) {
  return (
    <div style={{
      textAlign: self ? 'right' : 'left',
      marginBottom: 10
    }}>
      <div style={{
        display: 'inline-block',
        background: self ? 'var(--bubble-right)' : 'var(--bubble-left)',
        padding: '8px 12px',
        borderRadius: 8,
        maxWidth: '70%'
      }}>
        {msg.content}
      </div>
    </div>
  );
}
