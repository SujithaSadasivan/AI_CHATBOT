// src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, Bot, User, Loader2, Menu, X, 
  Wifi, WifiOff, History, PlusCircle 
} from 'lucide-react';
import axios from 'axios';

const ChatInterface = () => {
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const API_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    checkBackendConnection();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkBackendConnection = async () => {
    try {
      await axios.get(`${API_URL}/health`, { timeout: 3000 });
      setBackendStatus('online');
    } catch (err) {
      setBackendStatus('offline');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || backendStatus !== 'online') return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.get(`${API_URL}/ask`, {
        params: { question: inputMessage },
        timeout: 30000
      });

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.answer || "I couldn't find an answer to your question.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const suggestions = [
    { icon: '🔧', text: 'Stainless steel properties' },
    { icon: '🏭', text: 'Hot rolling process' },
    { icon: '🔬', text: 'Heat treatment' },
    { icon: '📊', text: 'Steel grades comparison' }
  ];

  const recentChats = [
    { id: 1, title: 'Steel Properties', time: '2h ago' },
    { id: 2, title: 'Manufacturing', time: '1d ago' },
    { id: 3, title: 'Quality Standards', time: '2d ago' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition duration-200 ease-in-out
        z-30 w-72 bg-white border-r border-gray-200 shadow-lg
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-800">Steel RAG</h1>
                <p className="text-xs text-gray-500">Intelligent Assistant</p>
              </div>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button 
              onClick={() => setMessages([messages[0]])}
              className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="text-sm font-medium">New Chat</span>
            </button>
          </div>

          {/* Recent Chats */}
          <div className="flex-1 px-4">
            <div className="flex items-center space-x-2 mb-3">
              <History className="h-4 w-4 text-gray-400" />
              <h2 className="text-xs font-medium text-gray-400 uppercase">Recent</h2>
            </div>
            <div className="space-y-1">
              {recentChats.map((chat) => (
                <button
                  key={chat.id}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  <p className="text-sm font-medium text-gray-700">{chat.title}</p>
                  <p className="text-xs text-gray-400">{chat.time}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">System Status</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  backendStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-xs text-gray-600">
                  {backendStatus === 'online' ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-gray-100">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                backendStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {backendStatus === 'online' ? 'Connected to database' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[75%] space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${message.type === 'user' ? 'bg-blue-100' : 'bg-gray-200'}
                `}>
                  {message.type === 'user' ? (
                    <User className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Bot className="h-4 w-4 text-gray-600" />
                  )}
                </div>
                
                {/* Message Content */}
                <div>
                  <div className={`
                    rounded-2xl px-4 py-3
                    ${message.type === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}
                  `}>
                    {message.type === 'bot' ? (
                      <ReactMarkdown 
                        className="prose prose-sm max-w-none prose-p:text-gray-700 prose-p:leading-relaxed"
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm text-white">{message.content}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-1">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-gray-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">Analyzing documents...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && backendStatus === 'online' && (
          <div className="px-6 pb-4">
            <p className="text-xs text-gray-400 mb-2">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(suggestion.text)}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition shadow-sm"
                >
                  <span>{suggestion.icon}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about steel documents..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={isLoading || backendStatus !== 'online'}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim() || backendStatus !== 'online'}
              className={`
                px-5 py-2.5 rounded-lg flex items-center space-x-2 text-sm font-medium
                ${isLoading || !inputMessage.trim() || backendStatus !== 'online'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm'}
              `}
            >
              <span>Send</span>
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Responses are generated from your document database
          </p>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;