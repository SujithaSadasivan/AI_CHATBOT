import React, { useState, useEffect } from 'react';
import { Bot, Mail, Lock, Eye, EyeOff, User, ArrowRight, Sparkles, X } from 'lucide-react';
import axios from 'axios';

const LandingPage = ({ onLogin }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });

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
      if (!formData.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (!formData.email.includes('@')) {
        setError('Please enter a valid email');
        return false;
      }
      if (formData.username.length < 3) {
        setError('Username must be at least 3 characters');
        return false;
      }
    }
    if (!formData.username.trim()) {
      setError('Username is required');
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
        // Login - use /api/login/json which returns user data directly
        console.log('Attempting login with username:', formData.username);
        
        const response = await axios.post(`${API_URL}/api/login/json`, {
          username: formData.username,
          password: formData.password
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('Login response:', response.data);

        // Save token and user data
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Call onLogin with user data
        onLogin(response.data.user);
      } else {
        // Register - use /api/register (with /api/ prefix)
        const registrationData = {
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password
        };

        console.log('Registering with data:', registrationData);
        console.log('Sending to:', `${API_URL}/api/register`);

        const response = await axios.post(`${API_URL}/api/register`, registrationData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('Registration response:', response.data);

        setSuccess('Registration successful! Please login.');
        
        // Clear form and switch to login after 2 seconds
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
      
      if (err.response) {
        console.error('Error status:', err.response.status);
        console.error('Error data:', err.response.data);
        
        // Extract error message
        let errorMessage = '';
        
        if (err.response.data) {
          if (typeof err.response.data === 'string') {
            errorMessage = err.response.data;
          } else if (err.response.data.detail) {
            if (Array.isArray(err.response.data.detail)) {
              // Pydantic validation errors - show exactly what's wrong
              errorMessage = err.response.data.detail.map(d => {
                return `${d.loc.join('.')}: ${d.msg}`;
              }).join(', ');
            } else {
              errorMessage = err.response.data.detail;
            }
          } else if (err.response.data.message) {
            errorMessage = err.response.data.message;
          } else {
            errorMessage = JSON.stringify(err.response.data);
          }
        }
        
        setError(errorMessage || 'Authentication failed');
      } else if (err.request) {
        setError('No response from server. Please check if the backend is running.');
      } else {
        setError('An error occurred. Please try again.');
      }
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

  const handleStartChat = () => {
    setShowAuth(true);
    setIsLogin(true);
  };

  const handleCloseAuth = () => {
    setShowAuth(false);
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
    <div
      className="min-h-screen flex relative overflow-hidden"
      style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* Absolute Full Page Background */}
      <div className="absolute inset-0 z-0">
        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
        )}

        {/* Main image with enhanced quality settings */}
        <img
          src="robo2.png"
          alt="Steel Industry"
          className={`w-full h-full transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            minHeight: '100%',
            minWidth: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            imageRendering: 'pixelated',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />

        {/* Fallback gradient if image fails to load */}
        {imageError && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800">
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}

        {/* Subtle overlay gradient to ensure text readability on the right side */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-black/40 pointer-events-none" />
      </div>

      {/* Left Side Spacer and Bottom Text */}
      <div className="hidden lg:flex lg:w-[60%] relative z-10 flex-col justify-end pb-8">
        <div className="w-full flex justify-center">
          <span className="text-black text-2xl font-light tracking-[0.3em] opacity-70">
            STEELVAULT
          </span>
        </div>
      </div>

      {/* Right Side - Content */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 lg:p-12 relative z-10">
        {/* Container with fixed dimensions */}
        <div className="w-full max-w-md min-h-[480px] flex items-center justify-center relative">
          {!showAuth ? (
            /* Hero Content - Start Page */
            <div className="w-full animate-fade-in">
              <div className="space-y-4">
                <h1 className="text-5xl font-bold tracking-tight text-black drop-shadow-md">
                  <span>HI!</span>
                  <br />
                  <span className="text-blue-600">CHAT BOT</span>
                </h1>

                <p className="text-gray-700 text-base leading-relaxed font-light drop-shadow-sm">
                  Your AI-powered assistant for steel industry knowledge. Access technical
                  documents, specifications, and manufacturing insights instantly.
                </p>

                <button
                  onClick={handleStartChat}
                  className="group inline-flex items-center space-x-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-base font-medium"
                >
                  <span>START CHAT</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </button>

                {/* Features */}
                <div className="flex items-center space-x-6 pt-4">
                  <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-300">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-gray-700 font-light">AI-Powered</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-300">
                    <Bot className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-gray-700 font-light">24/7 Available</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Auth Form with background visible */
            <div className="w-full animate-fade-in">
              {/* Close button */}
              <button
                onClick={handleCloseAuth}
                className="absolute top-8 right-8 p-1.5 text-gray-600 hover:text-black hover:bg-gray-200 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Main heading */}
              <div className="space-y-4">
                <h1 className="text-5xl font-bold tracking-tight text-black drop-shadow-md">
                  {isLogin ? (
                    <>
                      <span className="text-black">WELCOME</span>
                      <br />
                      <span className="text-blue-600">BACK</span>
                    </>
                  ) : (
                    <>
                      <span className="text-black">CREATE</span>
                      <br />
                      <span className="text-blue-600">ACCOUNT</span>
                    </>
                  )}
                </h1>

                {/* Simple subtitle */}
                <p className="text-gray-600 text-base leading-relaxed font-light drop-shadow-sm">
                  {isLogin
                    ? 'Sign in to continue your conversation'
                    : 'Join Steel RAG to access AI assistance'}
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  {/* Username */}
                  <div className="relative">
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 pl-10 bg-white/90 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                      placeholder="Username (min. 3 characters)"
                      required
                      style={{ fontFamily: 'inherit' }}
                    />
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  </div>

                  {/* Email - Only for Signup */}
                  {!isLogin && (
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 pl-10 bg-white/90 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                        placeholder="Email"
                        required={!isLogin}
                        style={{ fontFamily: 'inherit' }}
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </div>
                  )}

                  {/* Full Name - Only for Signup */}
                  {!isLogin && (
                    <div className="relative">
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 pl-10 bg-white/90 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                        placeholder="Full Name"
                        required={!isLogin}
                        style={{ fontFamily: 'inherit' }}
                      />
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </div>
                  )}

                  {/* Password */}
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 pl-10 pr-10 bg-white/90 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                      placeholder="Password (min. 6 characters)"
                      required
                      style={{ fontFamily: 'inherit' }}
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Confirm Password - Only for Signup */}
                  {!isLogin && (
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 pl-10 bg-white/90 backdrop-blur-sm text-gray-900 placeholder-gray-500"
                        placeholder="Confirm Password"
                        required={!isLogin}
                        style={{ fontFamily: 'inherit' }}
                      />
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </div>
                  )}

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-light">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 font-light">
                      {success}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full group inline-flex items-center justify-center space-x-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-base font-medium disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="font-light">{isLogin ? 'Signing in...' : 'Creating...'}</span>
                      </div>
                    ) : (
                      <>
                        <span>{isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </>
                    )}
                  </button>

                  {/* Toggle between Login/Signup */}
                  <div className="flex items-center justify-center pt-4">
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium drop-shadow-sm transition"
                    >
                      {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay for Auth */}
      {showAuth && (
        <div className="lg:hidden fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <button
                onClick={handleCloseAuth}
                className="mb-4 text-gray-600 hover:text-gray-900 flex items-center text-sm font-medium"
              >
                ← Back
              </button>

              {/* Simple mobile version */}
              <div className="space-y-4">
                <h1 className="text-5xl font-bold tracking-tight">
                  {isLogin ? (
                    <>
                      <span className="text-gray-900">WELCOME</span>
                      <br />
                      <span className="text-blue-600">BACK</span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-900">CREATE</span>
                      <br />
                      <span className="text-blue-600">ACCOUNT</span>
                    </>
                  )}
                </h1>

                <p className="text-gray-600 text-base leading-relaxed font-light">
                  {isLogin ? 'Sign in to continue' : 'Join Steel RAG today'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-4 py-3 text-sm border rounded-lg pl-10"
                      placeholder="Username"
                      required
                      style={{ fontFamily: 'inherit' }}
                    />
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {!isLogin && (
                    <>
                      <div className="relative">
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 text-sm border rounded-lg pl-10"
                          placeholder="Email"
                          required
                          style={{ fontFamily: 'inherit' }}
                        />
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 text-sm border rounded-lg pl-10"
                          placeholder="Full Name"
                          required
                          style={{ fontFamily: 'inherit' }}
                        />
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </>
                  )}

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 text-sm border rounded-lg pl-10 pr-10"
                      placeholder="Password"
                      required
                      style={{ fontFamily: 'inherit' }}
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {!isLogin && (
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-3 text-sm border rounded-lg pl-10"
                        placeholder="Confirm Password"
                        required
                        style={{ fontFamily: 'inherit' }}
                      />
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full group inline-flex items-center justify-center space-x-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-base font-medium"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="font-light">{isLogin ? 'Signing in...' : 'Creating...'}</span>
                      </div>
                    ) : (
                      <>
                        <span>{isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;