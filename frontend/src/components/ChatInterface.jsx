// src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, Bot, User, Loader2, Menu, X, 
  Wifi, WifiOff, History, PlusCircle, 
  Settings, LogOut, ChevronDown, MoreVertical,
  Hammer, Factory, Beaker, BarChart3, Cog, CheckCircle,
  Download, Share2, Pin, Trash2, AlertTriangle, CheckCircle as CheckCircleIcon,
  MessageCircle, Volume2, VolumeX, Mic, Copy, Check,
  Smile, ThumbsUp, ThumbsDown, Heart, Star, Award
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import FeedbackModal from './FeedbackModal';

const ChatInterface = ({ user, onLogout }) => {
  // Generate a truly unique ID for messages
  const generateUniqueId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Initialize messages with proper IDs
  const [messages, setMessages] = useState([
    {
      id: 'welcome_1',
      type: 'bot',
      content: "Hello! I'm your **Steel RAG Assistant**. I can help you with:\n\n• Steel properties and grades\n• Manufacturing processes\n• Technical specifications\n\nWhat would you like to know?",
      timestamp: new Date(),
      reactions: {}
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
  const [downloadingChat, setDownloadingChat] = useState(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, chatId: null, chatTitle: '' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, message: null, chatId: null });
  const [speakingId, setSpeakingId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionTimeout, setRecognitionTimeout] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  // State for reactions
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const userMenuRef = useRef(null);
  const chatMenuRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const recognitionRef = useRef(null);
  const reactionPickerRef = useRef(null);

  const API_URL = 'http://127.0.0.1:8000';

  // Available reactions - FIXED: Made emojis unique by adding a unique key
  const reactions = [
    { id: 'like', emoji: '👍', icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
    { id: 'love', emoji: '❤️', icon: Heart, label: 'Love', color: 'text-red-500' },
    { id: 'smile', emoji: '😊', icon: Smile, label: 'Smile', color: 'text-yellow-500' },
    { id: 'celebrate', emoji: '🎉', icon: Award, label: 'Celebrate', color: 'text-green-500' },
    { id: 'helpful', emoji: '👍', icon: ThumbsUp, label: 'Helpful', color: 'text-purple-500' },
    { id: 'unhelpful', emoji: '👎', icon: ThumbsDown, label: 'Not helpful', color: 'text-gray-500' },
  ];

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
    const interval = setInterval(checkBackendConnection, 30000);
    return () => clearInterval(interval);
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

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target)) {
        setChatMenuOpen(null);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Recognition cleanup error:', e);
        }
      }
      if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
      }
    };
  }, [recognitionTimeout]);

  // Auto-hide toast
  useEffect(() => {
    if (toast.show) {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 3000);
    }
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [toast.show]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const checkBackendConnection = async () => {
    try {
      console.log('Checking backend connection...');
      const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
      console.log('Backend response:', response.data);
      setBackendStatus('online');
    } catch (err) {
      console.error('Backend connection failed:', err.message);
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
      const messagesWithIds = (response.data || []).map(msg => ({
        ...msg,
        id: msg.id || msg._id || generateUniqueId(),
        reactions: msg.reactions || {}
      }));
      
      setChatMessages(prev => ({
        ...prev,
        [chatId]: messagesWithIds
      }));

      const reactionsMap = {};
      messagesWithIds.forEach(msg => {
        if (msg.reactions && Object.keys(msg.reactions).length > 0) {
          reactionsMap[msg.id] = msg.reactions;
        }
      });
      setMessageReactions(prev => ({ ...prev, ...reactionsMap }));
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  // ============= REACTION FUNCTIONS =============
  const handleReaction = async (messageId, reactionEmoji) => {
    if (!user || !user.id) {
      showToast('Please log in to react', 'error');
      return;
    }

    // Only allow reactions on bot messages
    const message = messages.find(m => m.id === messageId);
    if (!message || message.type !== 'bot') {
      showToast('You can only react to bot messages', 'error');
      return;
    }

    try {
      const currentReactions = messageReactions[messageId] || {};
      const userReacted = currentReactions[user.id] === reactionEmoji;
      
      let updatedReactions;
      
      if (userReacted) {
        updatedReactions = { ...currentReactions };
        delete updatedReactions[user.id];
      } else {
        updatedReactions = {
          ...currentReactions,
          [user.id]: reactionEmoji
        };
      }

      // Update local state
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: updatedReactions
      }));

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, reactions: updatedReactions }
          : msg
      ));

      if (currentChatId) {
        setChatMessages(prev => ({
          ...prev,
          [currentChatId]: prev[currentChatId]?.map(msg =>
            msg.id === messageId
              ? { ...msg, reactions: updatedReactions }
              : msg
          )
        }));
      }

      // Save to backend (commented out until endpoint is ready)
      // try {
      //   await axios.post(`${API_URL}/chat/message/${messageId}/reaction`, {
      //     user_id: user.id,
      //     reaction: userReacted ? null : reactionEmoji,
      //     chat_id: currentChatId
      //   });
      // } catch (error) {
      //   console.error('Error saving reaction to backend:', error);
      //   // Don't show error toast as we already updated UI
      // }

      showToast(userReacted ? 'Reaction removed' : 'Reaction added', 'success');
      setShowReactionPicker(null);

    } catch (error) {
      console.error('Error handling reaction:', error);
      showToast('Failed to save reaction', 'error');
    }
  };

  const getReactionCounts = (messageId) => {
    const reactions = messageReactions[messageId] || {};
    const counts = {};
    
    Object.values(reactions).forEach(emoji => {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });
    
    return counts;
  };

  const getUserReaction = (messageId) => {
    if (!user || !user.id) return null;
    const reactions = messageReactions[messageId] || {};
    return reactions[user.id] || null;
  };

  const createNewChat = async () => {
    if (isCreatingChat) return;
    
    try {
      setIsCreatingChat(true);
      
      if (!user || !user.id) {
        console.error('User ID is missing:', user);
        alert('Please log in again');
        return;
      }

      const hasEmptyChat = chatSessions.some(chat => {
        const chatId = chat._id || chat.id;
        const messages = chatMessages[chatId] || [];
        const hasOnlyWelcomeMessage = messages.length === 1 && messages[0]?.id === 'welcome_1';
        const hasNoUserMessages = !messages.some(m => m.type === 'user');
        return (chat.title === 'New Chat' || chat.title?.startsWith('New Chat')) && 
               (messages.length === 0 || hasOnlyWelcomeMessage || hasNoUserMessages);
      });

      if (hasEmptyChat) {
        const emptyChat = chatSessions.find(chat => {
          const chatId = chat._id || chat.id;
          const messages = chatMessages[chatId] || [];
          const hasOnlyWelcomeMessage = messages.length === 1 && messages[0]?.id === 'welcome_1';
          const hasNoUserMessages = !messages.some(m => m.type === 'user');
          return (chat.title === 'New Chat' || chat.title?.startsWith('New Chat')) && 
                 (messages.length === 0 || hasOnlyWelcomeMessage || hasNoUserMessages);
        });
        
        if (emptyChat) {
          const emptyChatId = emptyChat._id || emptyChat.id;
          setCurrentChatId(emptyChatId);
          
          if (chatMessages[emptyChatId]) {
            setMessages(chatMessages[emptyChatId]);
          } else {
            await fetchChatMessages(emptyChatId);
          }
          
          showToast('Switched to existing empty chat');
          setIsCreatingChat(false);
          return;
        }
      }
      
      const response = await axios.post(`${API_URL}/chat/create`, {
        user_id: user.id,
        title: 'New Chat'
      });
      
      const newChat = response.data;
      setChatSessions(prev => [newChat, ...prev]);
      setCurrentChatId(newChat._id || newChat.id);
      
      const welcomeMessage = {
        id: 'welcome_1',
        type: 'bot',
        content: "Hello! I'm your **Steel RAG Assistant**. I can help you with:\n\n• Steel properties and grades\n• Manufacturing processes\n• Technical specifications\n\nWhat would you like to know?",
        timestamp: new Date(),
        reactions: {}
      };
      
      setMessages([welcomeMessage]);
      
      setChatMessages(prev => ({
        ...prev,
        [newChat._id || newChat.id]: [welcomeMessage]
      }));
      
      showToast('New chat created');
      
    } catch (error) {
      console.error('Error creating new chat:', error);
      showToast('Failed to create new chat', 'error');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const loadChat = async (chatId) => {
    setCurrentChatId(chatId);
    
    if (chatMessages[chatId]) {
      const messagesWithIds = chatMessages[chatId].map(msg => ({
        ...msg,
        id: msg.id || msg._id || generateUniqueId(),
        reactions: msg.reactions || {}
      }));
      setMessages(messagesWithIds);
      
      const reactionsMap = {};
      messagesWithIds.forEach(msg => {
        if (msg.reactions && Object.keys(msg.reactions).length > 0) {
          reactionsMap[msg.id] = msg.reactions;
        }
      });
      setMessageReactions(prev => ({ ...prev, ...reactionsMap }));
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
        ...messageData,
        reactions: {}
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

  const openFeedbackModal = (message) => {
    if (!currentChatId) {
      showToast('Please start a chat first', 'error');
      return;
    }
    
    const messageWithId = {
      ...message,
      id: message.id || message._id || generateUniqueId()
    };
    
    console.log('Opening feedback modal for message:', messageWithId);
    setFeedbackModal({ isOpen: true, message: messageWithId, chatId: currentChatId });
  };

  const handleFeedbackSuccess = () => {
    showToast('Thank you for your feedback!', 'success');
  };

  const speakMessage = (text, messageId) => {
    window.speechSynthesis.cancel();
    
    if (speakingId === messageId) {
      setSpeakingId(null);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    
    window.speechSynthesis.speak(utterance);
    setSpeakingId(messageId);
  };

  const copyToClipboard = (text, messageId) => {
    console.log('Copy button clicked for message ID:', messageId);
    
    if (!messageId) {
      console.error('Message ID is undefined!');
      showToast('Error: Message ID not found', 'error');
      return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(messageId);
      showToast('📋 Message copied to clipboard!', 'success');
      
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    }).catch((err) => {
      console.error('Copy failed:', err);
      showToast('Failed to copy message', 'error');
    });
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Please use Chrome or Edge for voice input', 'error');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Error stopping recognition:', e);
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    setIsRecording(true);
    showToast('🎤 Listening... Speak now', 'success');

    const timeout = setTimeout(() => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Timeout stop error:', e);
        }
      }
      setIsRecording(false);
      showToast('⏰ No speech detected. Please try again.', 'error');
    }, 5000);
    setRecognitionTimeout(timeout);

    recognition.onresult = (event) => {
      if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
        setRecognitionTimeout(null);
      }

      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript = event.results[i][0].transcript;
          break;
        }
      }

      if (transcript) {
        setInputMessage(transcript);
        setIsRecording(false);
        showToast('✅ Voice captured! Click send to ask', 'success');
      }
    };

    recognition.onspeechend = () => {
      console.log('Speech ended');
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
        setRecognitionTimeout(null);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
        setRecognitionTimeout(null);
      }

      setIsRecording(false);
      
      if (event.error === 'not-allowed') {
        showToast(
          '❌ Microphone blocked. Click the lock icon in address bar → Site Settings → Microphone → Allow',
          'error'
        );
      } else if (event.error === 'no-speech') {
        showToast('No speech detected. Please try again and speak clearly.', 'error');
      } else if (event.error === 'audio-capture') {
        showToast('No microphone found. Please check your microphone.', 'error');
      } else if (event.error === 'network') {
        showToast('Network error. Please check your connection.', 'error');
      } else {
        showToast(`Error: ${event.error}. Please try again.`, 'error');
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setIsRecording(false);
      if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
        setRecognitionTimeout(null);
      }
      showToast('Failed to start voice input', 'error');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    if (backendStatus !== 'online') {
      showToast('Backend server is not connected. Please check if the server is running.', 'error');
      return;
    }

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
        showToast('Failed to create chat session', 'error');
        return;
      }
    }

    const userMessage = {
      id: generateUniqueId(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      chat_id: chatId,
      reactions: {}
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
        id: generateUniqueId(),
        type: 'bot',
        content: response.data.answer || "I couldn't find an answer to your question.",
        timestamp: new Date(),
        chat_id: chatId,
        sources: response.data.sources || [],
        reactions: {}
      };

      setMessages(prev => [...prev, botMessage]);

      setChatMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), userMessage, botMessage]
      }));

    } catch (error) {
      console.error('Error getting answer:', error);
      
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      
      if (error.response && error.response.data && error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please try again.";
      }
      
      const botErrorMessage = {
        id: generateUniqueId(),
        type: 'bot',
        content: errorMessage,
        timestamp: new Date(),
        chat_id: chatId,
        reactions: {}
      };
      
      setMessages(prev => [...prev, botErrorMessage]);
      
      await saveMessage(chatId, {
        type: 'bot',
        content: botErrorMessage.content
      });
    } finally {
      setIsLoading(false);
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

  const downloadChatAsPDF = async (chatId, chatTitle) => {
    try {
      setDownloadingChat(chatId);
      
      let messagesToDownload = chatMessages[chatId];
      
      if (!messagesToDownload || messagesToDownload.length === 0) {
        const response = await axios.get(`${API_URL}/chat/${chatId}/messages`);
        messagesToDownload = response.data;
      }
      
      if (!messagesToDownload || messagesToDownload.length === 0) {
        showToast('No messages to download', 'error');
        setDownloadingChat(null);
        return;
      }

      const doc = new jsPDF();
      
      doc.setFont('helvetica');
      
      doc.setFontSize(20);
      doc.setTextColor(33, 33, 33);
      doc.text('Chat History', 20, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Chat: ${chatTitle}`, 20, 30);
      doc.text(`Downloaded: ${new Date().toLocaleString()}`, 20, 37);
      doc.text(`User: ${user?.full_name || user?.email || 'Unknown'}`, 20, 44);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 50, 190, 50);
      
      let yPosition = 60;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      
      messagesToDownload.forEach((message, index) => {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(11);
        doc.setTextColor(message.type === 'user' ? (33, 150, 243) : (76, 175, 80));
        doc.setFont('helvetica', 'bold');
        const sender = message.type === 'user' ? 'You' : 'Steel RAG Assistant';
        doc.text(`${sender} - ${formatTime(message.timestamp)}`, margin, yPosition);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        
        const contentLines = doc.splitTextToSize(message.content, 170);
        
        if (yPosition + (contentLines.length * lineHeight) > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.text(contentLines, margin, yPosition + 5);
        
        yPosition += (contentLines.length * lineHeight) + 15;
        
        if (index < messagesToDownload.length - 1) {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          } else {
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, yPosition - 8, 190, yPosition - 8);
          }
        }
      });
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, 190 - 20, doc.internal.pageSize.height - 10);
      }
      
      const fileName = `${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showToast('Chat downloaded successfully!');
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showToast('Failed to download chat as PDF', 'error');
    } finally {
      setDownloadingChat(null);
    }
  };

  const handleShareChat = (chatId, chatTitle) => {
    const shareText = `Check out my chat: ${chatTitle}`;
    const url = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: chatTitle,
        text: shareText,
        url: url,
      }).then(() => {
        showToast('Shared successfully!');
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${shareText}\n${url}`).then(() => {
        showToast('Chat link copied to clipboard!');
      }).catch(() => {
        showToast('Unable to share', 'error');
      });
    }
    
    setChatMenuOpen(null);
  };

  const handlePinChat = (chatId) => {
    setChatSessions(prev => 
      prev.map(chat => {
        if (chat._id === chatId || chat.id === chatId) {
          return { ...chat, isPinned: !chat.isPinned };
        }
        return chat;
      }).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      })
    );
    
    const chat = chatSessions.find(c => c._id === chatId || c.id === chatId);
    showToast(chat?.isPinned ? 'Chat unpinned' : 'Chat pinned');
    setChatMenuOpen(null);
  };

  const confirmDeleteChat = (chatId, chatTitle) => {
    setDeleteModal({ isOpen: true, chatId, chatTitle });
    setChatMenuOpen(null);
  };

  const handleDeleteChat = async () => {
    const { chatId, chatTitle } = deleteModal;
    
    try {
      await axios.delete(`${API_URL}/chat/${chatId}`);
      
      setChatSessions(prev => prev.filter(chat => (chat._id !== chatId && chat.id !== chatId)));
      setChatMessages(prev => {
        const newState = { ...prev };
        delete newState[chatId];
        return newState;
      });
      
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([{
          id: 'welcome_1',
          type: 'bot',
          content: "Hello! I'm your **Steel RAG Assistant**. I can help you with:\n\n• Steel properties and grades\n• Manufacturing processes\n• Technical specifications\n\nWhat would you like to know?",
          timestamp: new Date(),
          reactions: {}
        }]);
      }
      
      showToast(`Chat "${chatTitle}" deleted successfully`);
      
    } catch (error) {
      console.error('Error deleting chat:', error);
      showToast('Failed to delete chat', 'error');
    } finally {
      setDeleteModal({ isOpen: false, chatId: null, chatTitle: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, chatId: null, chatTitle: '' });
  };

  const groupedChats = chatSessions.reduce((groups, chat) => {
    const dateKey = formatDate(chat.created_at || chat.timestamp || new Date());
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(chat);
    return groups;
  }, {});

  Object.keys(groupedChats).forEach(key => {
    groupedChats[key].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  });

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

  const renderBotMessage = (content) => {
    const lines = content.split('\n');
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      if (index === 0 && trimmedLine && !trimmedLine.startsWith('•')) {
        return (
          <p key={index} className="text-gray-800 font-bold text-base mb-3 mt-1">
            {trimmedLine}
          </p>
        );
      }
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
      else if (trimmedLine === '') {
        return <div key={index} className="h-1" />;
      }
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
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg animate-slide-down ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={cancelDelete}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Delete Chat</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">"{deleteModal.chatTitle}"</span>? 
              This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteChat}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ isOpen: false, message: null, chatId: null })}
        message={feedbackModal.message}
        chatId={feedbackModal.chatId}
        onSuccess={handleFeedbackSuccess}
      />

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
              disabled={isCreatingChat}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition shadow-md ${
                isCreatingChat ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isCreatingChat ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isCreatingChat ? 'Creating...' : 'New Chat'}
              </span>
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
                      <div
                        key={chat._id || chat.id}
                        className={`group relative flex items-center rounded-lg ${
                          currentChatId === (chat._id || chat.id) ? 'bg-gray-300' : 'hover:bg-gray-300'
                        }`}
                      >
                        <button
                          onClick={() => loadChat(chat._id || chat.id)}
                          className="flex-1 text-left px-3 py-2 truncate"
                        >
                          <div className="flex items-center space-x-2">
                            {chat.isPinned && (
                              <Pin className="h-3 w-3 text-gray-600 fill-current" />
                            )}
                            <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900 truncate">
                              {chat.title || 'New Chat'}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600">
                            {formatTime(chat.created_at || chat.timestamp || new Date())}
                          </p>
                        </button>
                        
                        <div className="absolute right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => downloadChatAsPDF(chat._id || chat.id, chat.title || 'New Chat')}
                            disabled={downloadingChat === (chat._id || chat.id)}
                            className="p-1.5 bg-gray-400 hover:bg-gray-500 rounded-md disabled:opacity-50"
                            title="Download chat as PDF"
                          >
                            {downloadingChat === (chat._id || chat.id) ? (
                              <Loader2 className="h-3 w-3 text-white animate-spin" />
                            ) : (
                              <Download className="h-3 w-3 text-white" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => setChatMenuOpen(chatMenuOpen === (chat._id || chat.id) ? null : (chat._id || chat.id))}
                            className="p-1.5 bg-gray-400 hover:bg-gray-500 rounded-md"
                            title="More options"
                          >
                            <MoreVertical className="h-3 w-3 text-white" />
                          </button>
                        </div>

                        {chatMenuOpen === (chat._id || chat.id) && (
                          <div
                            ref={chatMenuRef}
                            className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                          >
                            <button
                              onClick={() => handleShareChat(chat._id || chat.id, chat.title || 'New Chat')}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <Share2 className="h-4 w-4" />
                              <span>Share</span>
                            </button>
                            <button
                              onClick={() => handlePinChat(chat._id || chat.id)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <Pin className={`h-4 w-4 ${chat.isPinned ? 'fill-current' : ''}`} />
                              <span>{chat.isPinned ? 'Unpin' : 'Pin'}</span>
                            </button>
                            <button
                              onClick={() => confirmDeleteChat(chat._id || chat.id, chat.title || 'New Chat')}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
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
                          <LogOut className="w-4 w-4" />
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
            messages.filter(m => m.type === 'user' || (m.type === 'bot' && m.id !== 'welcome_1')).map((message) => {
              const messageId = message.id || message._id || generateUniqueId();
              const reactionCounts = getReactionCounts(messageId);
              const userReaction = getUserReaction(messageId);
              
              return (
                <div
                  key={messageId}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[75%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} space-x-3`}>
                    
                    {/* Message Content */}
                    <div className="relative group">
                      <div className={`
                        ${message.type === 'user' 
                          ? 'bg-gray-700 text-white rounded-2xl px-4 py-3 shadow-sm' 
                          : 'text-gray-800'}
                      `}>
                        {message.type === 'bot' ? (
                          <div>
                            <div className="prose prose-sm max-w-none">
                              {renderBotMessage(message.content)}
                            </div>
                            
                            {/* Sources - if available */}
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Sources:</p>
                                <div className="flex flex-wrap gap-1">
                                  {message.sources.map((source, idx) => (
                                    <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      📄 {source}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-white whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      
                      {/* Reactions Display - Only for bot messages */}
                      {message.type === 'bot' && Object.keys(reactionCounts).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(reactionCounts).map(([emoji, count]) => (
                            <span
                              key={`${messageId}-${emoji}`} // FIXED: Added messageId to make key unique
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs ${
                                userReaction === emoji
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span>{count}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Message Actions - Different for user vs bot messages */}
                      <div className="flex items-center space-x-2 mt-2">
                        {/* Reaction Button - Only for bot messages */}
                        {message.type === 'bot' && (
                          <div className="relative">
                            <button
                              onClick={() => setShowReactionPicker(showReactionPicker === messageId ? null : messageId)}
                              className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                              title="Add reaction"
                            >
                              <Smile className="h-3 w-3" />
                              <span>React</span>
                            </button>
                            
                            {/* Reaction Picker */}
                            {showReactionPicker === messageId && (
                              <div
                                ref={reactionPickerRef}
                                className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 flex space-x-1"
                              >
                                {reactions.map((reaction) => {
                                  const IconComponent = reaction.icon;
                                  const isActive = userReaction === reaction.emoji;
                                  return (
                                    <button
                                      key={reaction.id} // FIXED: Using unique id instead of emoji
                                      onClick={() => handleReaction(messageId, reaction.emoji)}
                                      className={`p-2 rounded-lg transition hover:bg-gray-100 ${
                                        isActive ? 'bg-blue-100' : ''
                                      }`}
                                      title={reaction.label}
                                    >
                                      <IconComponent className={`h-4 w-4 ${reaction.color}`} />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Feedback button - only for bot messages */}
                        {message.type === 'bot' && message.id !== 'welcome_1' && (
                          <button
                            onClick={() => openFeedbackModal(message)}
                            className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            title="Give feedback"
                          >
                            <MessageCircle className="h-3 w-3" />
                            <span>Feedback</span>
                          </button>
                        )}
                        
                        {/* Copy button - for all messages */}
                        <button
                          onClick={() => copyToClipboard(message.content, messageId)}
                          className={`flex items-center space-x-1 px-2 py-1 text-xs rounded-lg transition ${
                            copiedMessageId === messageId
                              ? 'bg-green-100 text-green-600'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                          title="Copy message"
                        >
                          {copiedMessageId === messageId ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedMessageId === messageId ? 'Copied!' : 'Copy'}</span>
                        </button>
                        
                        {/* Voice button - for all messages */}
                        <button
                          onClick={() => speakMessage(message.content, messageId)}
                          className={`flex items-center space-x-1 px-2 py-1 text-xs rounded-lg transition ${
                            speakingId === messageId
                              ? 'bg-red-100 text-red-600'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                          title={speakingId === messageId ? 'Stop speaking' : 'Listen to response'}
                        >
                          {speakingId === messageId ? (
                            <VolumeX className="h-3 w-3" />
                          ) : (
                            <Volume2 className="h-3 w-3" />
                          )}
                          <span>{speakingId === messageId ? 'Stop' : 'Listen'}</span>
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-400 mt-1 ml-1">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
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
              placeholder={backendStatus === 'online' ? "Ask about steel documents..." : "Backend disconnected - Type to test..."}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
              disabled={isLoading}
            />
            
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={startVoiceInput}
              disabled={isRecording || isLoading}
              className={`px-5 py-3 rounded-lg flex items-center justify-center transition ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              } ${(isRecording || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Click and speak your question"
            >
              <Mic className="h-5 w-5" />
            </button>
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className={`
                px-5 py-3 rounded-lg flex items-center justify-center
                ${isLoading || !inputMessage.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : backendStatus === 'online'
                    ? 'bg-gray-700 text-white hover:bg-gray-800 transition shadow-md'
                    : 'bg-yellow-500 text-white hover:bg-yellow-600 transition shadow-md'}
              `}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="flex items-center justify-center mt-2 space-x-2">
            {backendStatus !== 'online' && (
              <span className="text-xs text-yellow-600">
                ⚠️ Backend disconnected - Messages won't be sent
              </span>
            )}
            <p className="text-xs text-gray-400">
              AI-generated responses may contain inaccuracies
            </p>
          </div>
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