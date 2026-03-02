// src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, Bot, User, Loader2, Menu, X, 
  Wifi, WifiOff, History, PlusCircle, 
  Settings, LogOut, ChevronDown, MoreVertical,
  Hammer, Factory, Beaker, BarChart3, Cog, CheckCircle
} from 'lucide-react';
import axios from 'axios';

const ChatInterface = ({ user, onLogout }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello! I'm your **Steel RAG Assistant**. I can help you with:\n\n• Steel properties and grades\n• Manufacturing processes\n• Technical specifications\n\nWhat would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
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

  useEffect(() => {
    checkBackendConnection();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('User object in ChatInterface:', user);
      fetchChatSessions();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const checkBackendConnection = async () => {
    try {
      await axios.get(`${API_URL}/health`, { timeout: 3000 });
      setBackendStatus('online');
    } catch (err) {
      setBackendStatus('offline');
    }
  };

  const fetchChatSessions = async () => {
    try {
      if (!user || !user.id) {
        console.error('User ID is missing:', user);
        return;
      }
      
      const response = await axios.get(`${API_URL}/chat/sessions`, {
        params: { user_id: user.id }
      });
      
      setChatSessions(response.data || []);
      
      if (response.data && response.data.length > 0) {
        response.data.forEach(session => {
          fetchChatMessages(session._id || session.id);
        });
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    }
  };

  const fetchChatMessages = async (chatId) => {
    try {
      if (!chatId) return;
      
      const response = await axios.get(`${API_URL}/chat/${chatId}/messages`);
      setChatMessages(prev => ({
        ...prev,
        [chatId]: response.data || []
      }));
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  const createNewChat = async () => {
    try {
      if (!user || !user.id) {
        console.error('User ID is missing:', user);
        alert('Please log in again');
        return;
      }
      
      const response = await axios.post(`${API_URL}/chat/create`, {
        user_id: user.id,
        title: 'New Chat'
      });
      
      const newChat = response.data;
      setChatSessions(prev => [newChat, ...prev]);
      setCurrentChatId(newChat._id || newChat.id);
      
      setMessages([{
        id: 1,
        type: 'bot',
        content: "Hello! I'm your **Steel RAG Assistant**. I can help you with:\n\n• Steel properties and grades\n• Manufacturing processes\n• Technical specifications\n\nWhat would you like to know?",
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const loadChat = async (chatId) => {
    setCurrentChatId(chatId);
    
    if (chatMessages[chatId]) {
      setMessages(chatMessages[chatId]);
    } else {
      await fetchChatMessages(chatId);
    }
    
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const saveMessage = async (chatId, messageData) => {
    try {
      await axios.post(`${API_URL}/chat/message`, {
        chat_id: chatId,
        ...messageData
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const updateChatTitle = async (chatId, firstUserMessage) => {
    try {
      const title = firstUserMessage.split(' ').slice(0, 5).join(' ') + '...';
      
      await axios.put(`${API_URL}/chat/${chatId}`, {
        title: title
      });
      
      setChatSessions(prev => 
        prev.map(chat => 
          (chat._id === chatId || chat.id === chatId) ? { ...chat, title: title } : chat
        )
      );
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || backendStatus !== 'online') return;

    let chatId = currentChatId;
    if (!chatId) {
      try {
        if (!user || !user.id) {
          console.error('User ID is missing:', user);
          alert('Please log in again');
          return;
        }
        
        const response = await axios.post(`${API_URL}/chat/create`, {
          user_id: user.id,
          title: 'New Chat'
        });
        
        chatId = response.data._id || response.data.id;
        setCurrentChatId(chatId);
        setChatSessions(prev => [response.data, ...prev]);
      } catch (error) {
        console.error('Error creating chat:', error);
        return;
      }
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      chat_id: chatId
    };

    const isFirstUserMessage = messages.filter(m => m.type === 'user').length === 0;

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    await saveMessage(chatId, {
      type: 'user',
      content: inputMessage
    });

    if (isFirstUserMessage) {
      await updateChatTitle(chatId, inputMessage);
    }

    try {
      const response = await axios.get(`${API_URL}/ask`, {
        params: { 
          question: inputMessage,
          chat_id: chatId
        },
        timeout: 30000
      });

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.answer || "I couldn't find an answer to your question.",
        timestamp: new Date(),
        chat_id: chatId
      };

      setMessages(prev => [...prev, botMessage]);

      setChatMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), userMessage, botMessage]
      }));

    } catch (error) {
      console.error('Error getting answer:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        chat_id: chatId
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      await saveMessage(chatId, {
        type: 'bot',
        content: errorMessage.content
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const groupedChats = chatSessions.reduce((groups, chat) => {
    const dateKey = formatDate(chat.created_at || chat.timestamp || new Date());
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(chat);
    return groups;
  }, {});

  const exploreTopics = [
    { icon: Hammer, text: 'Stainless steel properties' },
    { icon: BarChart3, text: 'Steel grades comparison' },
    { icon: Cog, text: 'Manufacturing techniques' },
    { icon: CheckCircle, text: 'Quality standards' },
  ];

  const getUserInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const hasUserMessages = messages.some(m => m.type === 'user');

  // Custom component to render bot messages with proper format
  const renderBotMessage = (content) => {
    // Split by newlines
    const lines = content.split('\n');
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // First line is the sub-heading (bold)
      if (index === 0 && trimmedLine && !trimmedLine.startsWith('•')) {
        return (
          <p key={index} className="text-gray-800 font-bold text-base mb-3 mt-1">
            {trimmedLine}
          </p>
        );
      }
      // Bullet points
      else if (trimmedLine.startsWith('•')) {
        return (
          <div key={index} className="flex items-start ml-2 mb-2">
            <span className="mr-2 text-gray-700 font-bold">•</span>
            <span className="text-gray-700 flex-1 leading-relaxed">
              {trimmedLine.substring(1).trim()}
            </span>
          </div>
        );
      }
      // Empty line
      else if (trimmedLine === '') {
        return <div key={index} className="h-1" />;
      }
      // Regular text (fallback)
      else {
        return (
          <p key={index} className="text-gray-700 mb-2 leading-relaxed">
            {trimmedLine}
          </p>
        );
      }
    });
  };

  return (
    <div 
      className="flex h-screen bg-gray-100"
      style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition duration-200 ease-in-out
        z-30 w-72 bg-gray-200 shadow-xl
      `}>
        <div className="flex flex-col h-full">
          <div className="py-5 px-4 text-center">
            <h1 className="text-xl font-bold text-gray-900">ANY CHAT</h1>
          </div>

          <div className="px-4 pb-4">
            <button 
              onClick={createNewChat}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition shadow-md"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="text-sm font-medium">New Chat</span>
            </button>
          </div>

          <div className="flex-1 px-4 overflow-y-auto scrollbar-hide">
            {Object.keys(groupedChats).length > 0 ? (
              Object.entries(groupedChats).map(([dateGroup, chats]) => (
                <div key={dateGroup} className="mb-4">
                  <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {dateGroup}
                  </h2>
                  <div className="space-y-1">
                    {chats.map((chat) => (
                      <button
                        key={chat._id || chat.id}
                        onClick={() => loadChat(chat._id || chat.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition group ${
                          currentChatId === (chat._id || chat.id) ? 'bg-gray-300' : 'hover:bg-gray-300'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900 truncate">
                          {chat.title || 'New Chat'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatTime(chat.created_at || chat.timestamp || new Date())}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 text-sm py-4">
                No chat history yet
              </div>
            )}
          </div>

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
                      {user?.full_name || 'User'}
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
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden fixed top-4 left-4 z-10 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4 scrollbar-hide">
          {hasUserMessages ? (
            messages.filter(m => m.type === 'user' || (m.type === 'bot' && m.id !== 1)).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[75%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} space-x-3`}>
                  
                  {/* Message Content */}
                  <div>
                    <div className={`
                      ${message.type === 'user' 
                        ? 'bg-gray-700 text-white rounded-2xl px-4 py-3 shadow-sm' 
                        : 'text-gray-800'}
                    `}>
                      {message.type === 'bot' ? (
                        <div className="prose prose-sm max-w-none">
                          {renderBotMessage(message.content)}
                        </div>
                      ) : (
                        <p className="text-sm text-white whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 ml-1">
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center -mt-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-8">ASK ANYTHING YOU WANT</h2>
              <div className="w-full max-w-md space-y-3">
                {exploreTopics.map((topic, index) => {
                  const IconComponent = topic.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => setInputMessage(topic.text)}
                      className="w-full flex items-center space-x-4 px-5 py-4 bg-white border-2 border-transparent rounded-xl text-gray-900 font-medium hover:border-black transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <IconComponent className="h-5 w-5 text-gray-700" />
                      <span className="text-base">{topic.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex space-x-3">
                <div className="text-gray-800">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-700" />
                    <span className="text-sm text-gray-600">Analyzing documents...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white px-6 py-4 shadow-sm">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about steel documents..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
              disabled={isLoading || backendStatus !== 'online'}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim() || backendStatus !== 'online'}
              className={`
                px-5 py-3 rounded-lg flex items-center justify-center
                ${isLoading || !inputMessage.trim() || backendStatus !== 'online'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-800 transition shadow-md'}
              `}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">
            AI-generated responses may contain inaccuracies
          </p>
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

export default ChatInterface;