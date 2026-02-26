import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for LLM processing
});

export const ragService = {
  askQuestion: async (question) => {
    try {
      const response = await api.get('/ask', {
        params: { question }
      });
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  checkHealth: async () => {
    try {
      const response = await api.get('/health'); // Add a health endpoint if you have one
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default api;