// src/components/admin/FeedbackList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  Star, Download, Loader2, Filter, 
  ChevronDown, ThumbsUp, ThumbsDown, 
  MessageCircle, User, Calendar, Clock, AlertTriangle, RefreshCw
} from 'lucide-react';

const FeedbackList = ({ token, currentUser }) => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [downloading, setDownloading] = useState({
    all: false,
    single: null
  });
  const [debugInfo, setDebugInfo] = useState(null);

  const API_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    if (token) {
      fetchFeedback();
    } else {
      setError('No authentication token found. Please log in again.');
      setLoading(false);
    }
  }, [token]);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      // Check if token exists
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('Fetching feedback with token:', token.substring(0, 20) + '...');
      console.log('Current user:', currentUser);
      
      // Log the full URL being called
      const url = `${API_URL}/admin/feedback`;
      console.log('Calling URL:', url);
      
      const response = await axios.get(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Feedback API response status:', response.status);
      console.log('Feedback API response headers:', response.headers);
      console.log('Feedback API response data:', response.data);
      
      // Store debug info
      setDebugInfo({
        status: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        hasFeedback: response.data && response.data.feedback ? true : false,
        feedbackLength: response.data?.feedback?.length || response.data?.length || 0
      });
      
      // Handle the response format: { total: X, feedback: [...], ... }
      if (response.data && response.data.feedback && Array.isArray(response.data.feedback)) {
        setFeedback(response.data.feedback);
        console.log(`Loaded ${response.data.feedback.length} feedback items from feedback array`);
      } else if (Array.isArray(response.data)) {
        // Fallback for direct array format
        setFeedback(response.data);
        console.log(`Loaded ${response.data.length} feedback items from direct array`);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Another possible format
        setFeedback(response.data.data);
        console.log(`Loaded ${response.data.data.length} feedback items from data array`);
      } else {
        console.error('Unexpected response format:', response.data);
        setFeedback([]);
        
        // If response.data is an object but not empty, try to see what's in it
        if (response.data && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
          setError(`Received data in unexpected format. Available keys: ${Object.keys(response.data).join(', ')}`);
        } else {
          setError('Received invalid data format from server');
        }
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
      
      // Store error debug info
      setDebugInfo({
        error: true,
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        } : null,
        request: err.request ? 'Request was made but no response' : null
      });
      
      // Handle different error types
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 401) {
          setError('Unauthorized access. Please log in again.');
          // Optionally redirect to login after a delay
          setTimeout(() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }, 3000);
        } else if (err.response.status === 403) {
          setError('You do not have permission to view feedback. Admin access required.');
        } else if (err.response.status === 404) {
          setError('Feedback endpoint not found. Please check if the backend route exists.');
        } else {
          const errorDetail = err.response.data?.detail || err.response.data?.message || err.response.statusText;
          setError(`Server error (${err.response.status}): ${errorDetail}. Please try again later.`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError('Cannot connect to server. Please check if the backend is running at ' + API_URL);
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('An unexpected error occurred: ' + err.message);
      }
      
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  };

  // Download single feedback as PDF (matches the format in FeedbackModal)
  const downloadSingleFeedbackPDF = async (item) => {
    setDownloading(prev => ({ ...prev, single: item.id }));
    
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(24);
      doc.setTextColor(33, 33, 33);
      doc.text('Feedback Details', 20, 20);
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
      doc.text(`Generated by: ${currentUser?.full_name || currentUser?.email || 'Admin'}`, 20, 37);
      
      // User Information
      doc.setFontSize(16);
      doc.setTextColor(33, 33, 33);
      doc.text('User Information', 20, 55);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Name: ${item.user?.full_name || item.user?.username || 'Unknown'}`, 25, 70);
      doc.text(`Email: ${item.user?.email || 'N/A'}`, 25, 80);
      
      // Feedback Details
      doc.setFontSize(16);
      doc.setTextColor(33, 33, 33);
      doc.text('Feedback Details', 20, 100);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Rating stars
      const ratingText = 'Rating: ' + '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
      doc.text(ratingText, 25, 115);
      
      if (item.category) {
        doc.text(`Category: ${item.category}`, 25, 125);
      }
      
      if (item.feedback_text) {
        doc.text('Feedback:', 25, 135);
        
        // Split long text into multiple lines
        const splitText = doc.splitTextToSize(item.feedback_text, 160);
        doc.text(splitText, 30, 145);
        
        // Adjust Y position based on text length
        const yPos = 145 + (splitText.length * 7);
        doc.text(`Submitted: ${new Date(item.created_at).toLocaleString()}`, 25, yPos);
      } else {
        doc.text(`Submitted: ${new Date(item.created_at).toLocaleString()}`, 25, 135);
      }
      
      // Chat Information
      if (item.chat) {
        doc.setFontSize(16);
        doc.setTextColor(33, 33, 33);
        doc.text('Chat Information', 20, 165);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Chat Title: ${item.chat.title || 'General Chat'}`, 25, 180);
        if (item.message?.content) {
          const messageContent = doc.splitTextToSize(`Message: ${item.message.content}`, 160);
          doc.text(messageContent, 25, 190);
        }
      }
      
      doc.save(`feedback_${item.id}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error downloading feedback PDF:', error);
    } finally {
      setDownloading(prev => ({ ...prev, single: null }));
    }
  };

  // Download all feedback as PDF (matches the format in FeedbackModal)
  const downloadAllFeedbackPDF = async () => {
    setDownloading(prev => ({ ...prev, all: true }));
    
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(33, 33, 33);
      doc.text('All Feedback Report', 20, 20);
      
      // Date and metadata
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
      doc.text(`Total Feedback Items: ${feedback.length}`, 20, 37);
      doc.text(`Generated by: ${currentUser?.full_name || currentUser?.email || 'Admin'}`, 20, 44);
      
      // Table headers - Simplified to match the other module
      const tableColumn = ['User', 'Rating', 'Category', 'Feedback', 'Date'];
      const tableRows = [];
      
      feedback.forEach(item => {
        const feedbackRow = [
          item.user?.full_name || item.user?.username || item.user?.email || 'Unknown User',
          '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating),
          item.category || 'N/A',
          item.feedback_text?.substring(0, 100) + (item.feedback_text?.length > 100 ? '...' : '') || 'No feedback provided',
          new Date(item.created_at).toLocaleDateString()
        ];
        tableRows.push(feedbackRow);
      });
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 52,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      doc.save(`feedback_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error downloading all feedback PDF:', error);
    } finally {
      setDownloading(prev => ({ ...prev, all: false }));
    }
  };

  const getRatingStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Safely get unique categories
  const getCategories = () => {
    try {
      const cats = feedback.map(f => f.category).filter(Boolean);
      return ['all', ...new Set(cats)];
    } catch (e) {
      return ['all'];
    }
  };

  const filteredFeedback = filter === 'all' 
    ? feedback 
    : feedback.filter(item => item.category === filter);

  // Show error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Feedback</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        
        {/* Debug info - only show in development */}
        {debugInfo && process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg text-left">
            <h4 className="font-medium text-gray-700 mb-2">Debug Info:</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
        
        <button
          onClick={fetchFeedback}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition flex items-center justify-center space-x-2 mx-auto"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      

      {feedback.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Feedback Available</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            There are no feedback submissions yet. Feedback from users will appear here once they submit ratings and comments.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFeedback.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {item.user?.full_name || item.user?.username || item.user?.email || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.user?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRatingStars(item.rating)}
                    </td>
                    <td className="px-6 py-4">
                      {item.category ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                      {item.feedback_text || 'No additional feedback'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Summary footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Showing {filteredFeedback.length} of {feedback.length} feedback items</span>
              <div className="flex items-center space-x-4">
                <span>Average Rating: {(feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length).toFixed(1)} ★</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackList;