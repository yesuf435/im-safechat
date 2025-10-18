import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { getSocket } from '../socket';

export default function Chat({ user }) {
  const [contacts, setContacts] = useState([]);
  const [current, setCurrent] = useState(null);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [msgs]);

  useEffect(() => {
    // Demo mode - show sample contacts
    if (user.id === 'demo') {
      setContacts([
        { id: '1', username: '张三' },
        { id: '2', username: '李四' },
        { id: '3', username: 'Alice' },
        { id: '4', username: 'Bob' },
        { id: '5', username: '王小明' },
      ]);
      return;
    }

    const token = localStorage.getItem('token');
    axios.get(import.meta.env.VITE_API_BASE + '/auth/all', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setContacts(res.data.filter(u => u.id !== user.id));
    }).catch(err => {
      console.error('Failed to fetch contacts:', err);
    });

    const socket = getSocket();
    socket.on('private_message', msg => {
      if (msg.from === current?.id || msg.from === user.id)
        setMsgs(prev => [...prev, msg]);
    });
  }, [current]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !current) return;
    
    // Demo mode - just add message locally
    if (user.id === 'demo') {
      setMsgs(prev => [...prev, { from: user.id, content: text, timestamp: new Date() }]);
      setText('');
      
      // Simulate a response after 2 seconds
      setTimeout(() => {
        setMsgs(prev => [...prev, { 
          from: current.id, 
          content: '这是一个演示回复 😊', 
          timestamp: new Date() 
        }]);
      }, 2000);
      return;
    }
    
    getSocket().emit('private_message', { toUserId: current.id, content: text });
    setMsgs(prev => [...prev, { from: user.id, content: text, timestamp: new Date() }]);
    setText('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(e);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const filteredContacts = contacts.filter(c =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name) => {
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '320px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--surface)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: getAvatarColor(user.username),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '600',
                fontSize: '16px'
              }}>
                {getInitials(user.username)}
              </div>
              <div>
                <div style={{
                  fontWeight: '600',
                  fontSize: '16px',
                  color: 'var(--text-primary)'
                }}>
                  {user.username}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#22c55e'
                  }}></span>
                  在线
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                padding: '8px 12px',
                background: 'var(--accent-light)',
                color: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--accent-medium)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--accent-light)'}
            >
              退出
            </button>
          </div>
          
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="搜索联系人..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                fontSize: '14px',
                border: '1.5px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                transition: 'var(--transition)',
                background: 'var(--bg-secondary)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
            />
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '16px'
            }}>
              🔍
            </span>
          </div>
        </div>

        {/* Contacts List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px'
        }}>
          <div style={{
            padding: '12px 12px 8px',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            联系人 ({filteredContacts.length})
          </div>
          {filteredContacts.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: '14px'
            }}>
              {searchQuery ? '未找到匹配的联系人' : '暂无联系人'}
            </div>
          ) : (
            filteredContacts.map(c => (
              <div
                key={c.id}
                onClick={() => { setCurrent(c); setMsgs([]); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  margin: '4px 0',
                  cursor: 'pointer',
                  background: current?.id === c.id ? 'var(--accent-light)' : 'transparent',
                  borderRadius: 'var(--radius-md)',
                  transition: 'var(--transition)',
                  border: current?.id === c.id ? '1px solid var(--accent-medium)' : '1px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (current?.id !== c.id) {
                    e.currentTarget.style.background = 'var(--bg-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (current?.id !== c.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: getAvatarColor(c.username),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '16px',
                  flexShrink: 0
                }}>
                  {getInitials(c.username)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '15px',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {c.username}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    点击开始聊天
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)'
      }}>
        {current ? (
          <>
            {/* Chat Header */}
            <header style={{
              padding: '20px 24px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: getAvatarColor(current.username),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '600',
                fontSize: '16px'
              }}>
                {getInitials(current.username)}
              </div>
              <div>
                <div style={{
                  fontWeight: '600',
                  fontSize: '16px',
                  color: 'var(--text-primary)'
                }}>
                  {current.username}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#22c55e'
                  }}></span>
                  在线
                </div>
              </div>
            </header>

            {/* Messages */}
            <section style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              background: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {msgs.length === 0 ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '12px',
                  color: 'var(--text-tertiary)'
                }}>
                  <div style={{ fontSize: '48px' }}>💬</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>
                    开始对话
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    发送消息给 {current.username}
                  </div>
                </div>
              ) : (
                msgs.map((m, i) => {
                  const isOwn = m.from === user.id;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        gap: '8px'
                      }}
                    >
                      {!isOwn && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: getAvatarColor(current.username),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: '600',
                          fontSize: '13px',
                          flexShrink: 0
                        }}>
                          {getInitials(current.username)}
                        </div>
                      )}
                      <div style={{
                        maxWidth: '60%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{
                          padding: '12px 16px',
                          background: isOwn ? 'var(--accent)' : 'var(--bg-secondary)',
                          color: isOwn ? '#fff' : 'var(--text-primary)',
                          borderRadius: isOwn
                            ? 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)'
                            : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
                          wordBreak: 'break-word',
                          fontSize: '15px',
                          lineHeight: '1.5',
                          boxShadow: isOwn ? '0 2px 8px rgba(215, 0, 53, 0.2)' : 'var(--shadow-sm)'
                        }}>
                          {m.content}
                        </div>
                      </div>
                      {isOwn && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: getAvatarColor(user.username),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: '600',
                          fontSize: '13px',
                          flexShrink: 0
                        }}>
                          {getInitials(user.username)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </section>

            {/* Input Footer */}
            <footer style={{
              padding: '20px 24px',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-light)',
              boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <form onSubmit={send} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`发送消息给 ${current.username}...`}
                    rows={1}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      border: '1.5px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      maxHeight: '120px',
                      transition: 'var(--transition)',
                      background: 'var(--bg-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!text.trim()}
                  style={{
                    padding: '12px 24px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#fff',
                    background: text.trim() ? 'var(--accent)' : 'var(--text-tertiary)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: text.trim() ? 'pointer' : 'not-allowed',
                    transition: 'var(--transition)',
                    boxShadow: text.trim() ? '0 4px 12px rgba(215, 0, 53, 0.3)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => text.trim() && (e.target.style.background = 'var(--accent-hover)')}
                  onMouseLeave={(e) => text.trim() && (e.target.style.background = 'var(--accent)')}
                >
                  发送
                </button>
              </form>
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                textAlign: 'center'
              }}>
                按 Enter 发送，Shift + Enter 换行
              </div>
            </footer>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
            color: 'var(--text-tertiary)'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '56px',
              boxShadow: '0 12px 32px rgba(215, 0, 53, 0.3)'
            }}>
              💬
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              欢迎使用 SafeChat
            </div>
            <div style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              maxWidth: '400px'
            }}>
              从左侧选择一个联系人开始聊天
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
