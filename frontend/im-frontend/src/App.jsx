import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import { useState } from 'react';

export default function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <Routes>
      <Route path="/" element={
        !user
          ? showRegister
            ? <Register onRegister={() => setShowRegister(false)} />
            : <Login onLogin={setUser} onRegisterClick={() => setShowRegister(true)} />
          : <Chat user={user} />
      } />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}
