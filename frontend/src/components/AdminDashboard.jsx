import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Users, MessageSquare, Search, Calendar, Clock,
  TrendingUp, Activity, UserCheck, LogOut, Menu,
  BarChart3, PieChart, Download, Filter, ChevronDown,
  Settings, User, MoreVertical, X, Loader2, Bot
} from 'lucide-react';

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivity, setUserActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState(7);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const API_URL = 'http://127.0.0.1:8000';

  // Add SF Pro Display font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.cdnfonts.com/css/sf-pro-display';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
    fetchRecentSearches();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching users with token:', token ? 'Token exists' : 'No token');
      
      const response = await axios.get(`${API_URL}/admin/users?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Users API response:', response.data);
      
      // The backend returns: { total: X, users: [...], skip: Y, limit: Z }
      if (response.data && response.data.users && Array.isArray(response.data.users)) {
        console.log(`Found ${response.data.users.length} users`);
        setUsers(response.data.users);
      } else {
        console.error('Unexpected response format:', response.data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSearches = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching recent searches with token:', token ? 'Token exists' : 'No token');
      
      const response = await axios.get(`${API_URL}/admin/searches/recent?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Searches API response:', response.data);
      
      // The backend returns an array directly for searches
      if (Array.isArray(response.data)) {
        console.log(`Found ${response.data.length} searches`);
        setRecentSearches(response.data);
      } else {
        console.error('Unexpected response format for searches:', response.data);
        setRecentSearches([]);
      }
    } catch (error) {
      console.error('Error fetching searches:', error);
      setRecentSearches([]);
    }
  };

  const fetchUserActivity = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/admin/users/${userId}/activity?days=${dateRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserActivity(response.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error fetching user activity:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Invalid time';
    }
  };

  const getUserInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'A';
  };

  // Helper function to safely get user display name from search item
  const getUserDisplayName = (searchItem) => {
    if (searchItem.user) {
      return searchItem.user.full_name || searchItem.user.username || 'Unknown User';
    }
    return 'Unknown User';
  };

  // Helper function to safely get user email from search item
  const getUserEmail = (searchItem) => {
    if (searchItem.user && searchItem.user.email) {
      return searchItem.user.email;
    }
    return '';
  };

  // Helper function to safely get chat title
  const getChatTitle = (searchItem) => {
    if (searchItem.chat_title) {
      return searchItem.chat_title;
    }
    return 'General Chat';
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value || 0}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className="flex h-screen bg-gray-100"
      style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* Sidebar - Medium Gray theme (same as ChatInterface) */}
      <div className={`
        fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition duration-200 ease-in-out
        z-30 w-72 bg-gray-200 shadow-xl
      `}>
        <div className="flex flex-col h-full">
          {/* Header - ADMIN PANEL centered */}
          <div className="py-5 px-4 text-center">
            <h1 className="text-xl font-bold text-gray-900">ADMIN PANEL</h1>
            <p className="text-xs text-gray-600 mt-1">Steel RAG Assistant</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'dashboard' ? 'bg-gray-300 text-gray-900' : 'text-gray-700 hover:bg-gray-300'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'users' ? 'bg-gray-300 text-gray-900' : 'text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Users</span>
            </button>
            <button
              onClick={() => setActiveTab('searches')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'searches' ? 'bg-gray-300 text-gray-900' : 'text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Search className="h-5 w-5" />
              <span className="text-sm font-medium">Searches</span>
            </button>
          </nav>

          {/* User Profile - Same as ChatInterface */}
          <div className="p-4" ref={userMenuRef}>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {getUserInitials()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.full_name || 'Admin'}
                    </p>
                    <p className="text-xs text-gray-600 truncate max-w-[120px]">
                      {user?.email}
                    </p>
                  </div>
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <MoreVertical className="h-5 w-5 text-gray-700" />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.email}
                        </p>
                      </div>
                      
                      <div className="py-1">
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </button>
                      </div>
                      
                      <div className="border-t border-gray-100 pt-1">
                        <button
                          onClick={onLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-gray-50">
        {/* Mobile Menu Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden fixed top-4 left-4 z-10 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin text-gray-700" />
                <span className="text-sm text-gray-600">Loading dashboard...</span>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && stats && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      title="Total Users"
                      value={stats.total_users}
                      icon={Users}
                      color="bg-gray-700"
                    />
                    <StatCard
                      title="Total Chats"
                      value={stats.total_chats}
                      icon={MessageSquare}
                      color="bg-gray-700"
                    />
                    <StatCard
                      title="Total Messages"
                      value={stats.total_messages}
                      icon={Activity}
                      color="bg-gray-700"
                    />
                    <StatCard
                      title="Today's Activity"
                      value={stats.today_messages}
                      icon={TrendingUp}
                      color="bg-gray-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Stats</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">New Users</span>
                          <span className="font-semibold text-gray-900">{stats.today_users || 0}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">New Chats</span>
                          <span className="font-semibold text-gray-900">{stats.today_chats || 0}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">Messages Today</span>
                          <span className="font-semibold text-gray-900">{stats.today_messages || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => setActiveTab('users')}
                          className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition text-gray-700 font-medium"
                        >
                          View All Users
                        </button>
                        <button
                          onClick={() => setActiveTab('searches')}
                          className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition text-gray-700 font-medium"
                        >
                          View Recent Searches
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Users Management</h2>
                    <div className="flex items-center space-x-2">
                      <select
                        value={dateRange}
                        onChange={(e) => setDateRange(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
                      >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chats</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {users.length > 0 ? (
                            users.map((userItem) => (
                              <tr key={userItem.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="font-medium text-gray-900">{userItem.full_name || 'N/A'}</div>
                                    <div className="text-sm text-gray-500">@{userItem.username || 'unknown'}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{userItem.email || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {formatDate(userItem.created_at)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{userItem.chat_count || 0}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{userItem.message_count || 0}</td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => fetchUserActivity(userItem.id)}
                                    className="text-gray-700 hover:text-gray-900 text-sm font-medium bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200 transition"
                                  >
                                    View Activity
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                No users found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* User Activity Modal */}
                  {userActivity && selectedUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
                          <button
                            onClick={() => setSelectedUser(null)}
                            className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-lg transition"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="p-6">
                          {userActivity.activity && userActivity.activity.length > 0 ? (
                            <div className="space-y-4">
                              {userActivity.activity.map((item, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-gray-900">{item.title || 'Chat Session'}</h4>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(item.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    <span className="font-medium">Query:</span> {item.search_query || 'N/A'}
                                  </p>
                                  <div className="flex space-x-4 text-xs text-gray-500">
                                    <span>Messages: {item.message_count || 0}</span>
                                    <span>Duration: {item.duration ? Math.round(item.duration / 60) : 0} min</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-8">No activity found</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'searches' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-800">Recent Searches</h2>
                  
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Search Query</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chat</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {recentSearches.length > 0 ? (
                            recentSearches.map((search, index) => (
                              <tr key={search.id || index} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900">
                                    {getUserDisplayName(search)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {getUserEmail(search)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {search.query || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {getChatTitle(search)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {formatDate(search.timestamp)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                No recent searches found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;