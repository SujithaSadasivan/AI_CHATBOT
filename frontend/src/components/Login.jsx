import React, { useState } from 'react';
import { Bot, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, User as UserIcon } from 'lucide-react';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });

  const API_URL = 'http://127.0.0.1:8000';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (!formData.full_name.trim()) {
        setError('Full name is required');
        return false;
      }
    }
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // Login
        const response = await axios.post(`${API_URL}/api/login/json`, {
          username: formData.username,
          password: formData.password
        });

        // Store token
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        onLogin(response.data.user);
      } else {
        // Register
        const response = await axios.post(`${API_URL}/api/register`, {
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password
        });

        setSuccess('Registration successful! Please login.');
        setTimeout(() => {
          setIsLogin(true);
          setFormData({
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            full_name: ''
          });
        }, 2000);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      full_name: ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Steel RAG</h1>
          <p className="text-gray-600 mt-2">Intelligent Document Assistant</p>
        </div>

        {/* Login/Register Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pl-10"
                  placeholder="johndoe"
                  required
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Full Name - Only for Registration */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pl-10"
                    placeholder="John Doe"
                    required={!isLogin}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pl-10"
                  placeholder="you@example.com"
                  required
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password - Only for Registration */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pl-10 pr-10"
                    placeholder="••••••••"
                    required={!isLogin}
                    minLength={6}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password - Only for Login */}
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full py-3 px-4 rounded-lg font-medium text-white
                ${loading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:transform active:scale-[0.98]'}
                transition-all duration-200 shadow-lg
              `}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isLogin ? 'Logging in...' : 'Creating account...'}</span>
                </div>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>

            {/* Toggle Mode */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">Demo Credentials</p>
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
              <p className="text-gray-600"><span className="font-medium">Username:</span> demo</p>
              <p className="text-gray-600"><span className="font-medium">Password:</span> demo123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;