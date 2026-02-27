import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.is_admin || false); // Check if user is admin
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    // userData should contain: id, username, email, full_name, is_admin, access_token
    console.log('Login data received:', userData); // Debug log
    
    setUser(userData);
    setIsAuthenticated(true);
    setIsAdmin(userData.is_admin || false);
    
    // Save to localStorage
    if (userData.access_token) {
      localStorage.setItem('token', userData.access_token);
    }
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="App">
      {!isAuthenticated ? (
        <LandingPage onLogin={handleLogin} />
      ) : isAdmin ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <ChatInterface user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;