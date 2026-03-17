// src/components/FeedbackModal.jsx
import React, { useState, useEffect } from 'react';
import { Star, X, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const FeedbackModal = ({ isOpen, onClose, message, chatId, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);

  const API_URL = 'http://127.0.0.1:8000';

  const categories = [
    { value: 'accurate', label: 'Accurate', color: 'bg-green-100 text-green-800' },
    { value: 'inaccurate', label: 'Inaccurate', color: 'bg-red-100 text-red-800' },
    { value: 'helpful', label: 'Helpful', color: 'bg-blue-100 text-blue-800' },
    { value: 'unhelpful', label: 'Unhelpful', color: 'bg-orange-100 text-orange-800' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setFeedbackText('');
      setCategory('');
      setError('');
      setShowThankYou(false);
      
      // Log the message object for debugging
      console.log('FeedbackModal opened with message:', message);
      console.log('Message ID:', message?.id || message?._id);
    }
  }, [isOpen, message]);

  // Check for token when modal opens
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to submit feedback');
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    setShowThankYou(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent any default form submission
    
    // Validate rating
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    // Check for token
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to submit feedback');
      return;
    }

    // Check for message ID
    const messageId = message?.id || message?._id;
    if (!messageId) {
      setError('Message ID is missing. Cannot submit feedback.');
      console.error('Message object without ID:', message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('Submitting feedback with chatId:', chatId);
      console.log('Message ID:', messageId);
      console.log('Token exists:', !!token);

      const payload = {
        chat_id: chatId,
        message_id: messageId,
        rating: rating,
        feedback_text: feedbackText || null,
        category: category || null
      };

      console.log('Payload being sent:', payload);

      const response = await axios.post(
        `${API_URL}/api/feedback`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Feedback response:', response.data);

      if (response.data) {
        // Show thank you message instead of closing immediately
        setShowThankYou(true);
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }
        
        // Reset form
        setRating(0);
        setFeedbackText('');
        setCategory('');
        
        // Auto close after 2 seconds
        setTimeout(() => {
          setShowThankYou(false);
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      
      // Ensure error is always a string
      let errorMessage = 'Failed to submit feedback. Please try again.';
      
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Your session has expired. Please login again.';
          setTimeout(() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }, 2000);
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to submit feedback';
        } else if (err.response.status === 404) {
          errorMessage = 'Chat session or message not found';
        } else if (err.response.data?.detail) {
          // Convert any non-string error detail to string
          errorMessage = String(err.response.data.detail);
        } else if (err.response.data?.message) {
          errorMessage = String(err.response.data.message);
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
        {!showThankYou ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Rate this response</h3>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Message preview */}
            {message && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {message.content}
                </p>
              </div>
            )}

            {/* Rating stars */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none"
                    disabled={isSubmitting}
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            </div>

            {/* Category selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                    disabled={isSubmitting}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      category === cat.value
                        ? cat.color + ' ring-2 ring-offset-2 ring-gray-400'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback text */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional feedback (optional)
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us more about your experience..."
                rows="3"
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Error message - Fixed to handle any error type */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs">{String(error)}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition flex items-center space-x-2 ${
                  isSubmitting || rating === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-800'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>

            {/* Loading overlay */}
            {isSubmitting && (
              <div className="absolute inset-0 bg-white bg-opacity-90 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-3"></div>
                  <p className="text-gray-700 font-medium">Submitting feedback...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Thank You Message */
          <div className="text-center py-8">
            <div className="mb-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
            <p className="text-gray-600 mb-6">
              Your feedback has been submitted successfully. We appreciate your help in improving our service.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;