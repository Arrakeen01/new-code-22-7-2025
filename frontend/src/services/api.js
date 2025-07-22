import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Advanced AI API Services
export class AIService {
  
  // Comprehensive Analysis - runs all AI agents
  static async runComprehensiveAnalysis(sessionId, model = 'gpt-4o') {
    try {
      const response = await api.post('/ai/comprehensive-analysis', null, {
        params: { session_id: sessionId, model }
      });
      return response.data;
    } catch (error) {
      console.error('Comprehensive analysis error:', error);
      throw error;
    }
  }

  // Traceability Matrix
  static async getTraceabilityMatrix(sessionId) {
    try {
      const response = await api.get(`/ai/traceability-matrix/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Traceability matrix error:', error);
      throw error;
    }
  }

  // Health Metrics
  static async getHealthMetrics(sessionId) {
    try {
      const response = await api.get(`/ai/health-metrics/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Health metrics error:', error);
      throw error;
    }
  }

  // Chat with AI Assistant
  static async chatWithAssistant(sessionId, message) {
    try {
      const response = await api.post('/ai/chat', null, {
        params: { session_id: sessionId, message }
      });
      return response.data;
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }

  // Get Chat History
  static async getChatHistory(sessionId, limit = 20) {
    try {
      const response = await api.get(`/ai/chat-history/${sessionId}`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Chat history error:', error);
      throw error;
    }
  }

  // Generate Comprehensive Report
  static async generateComprehensiveReport(sessionId, options = {}) {
    try {
      const response = await api.post('/ai/comprehensive-report', null, {
        params: {
          session_id: sessionId,
          include_traceability: options.includeTraceability ?? true,
          include_health_metrics: options.includeHealthMetrics ?? true,
          format_type: options.formatType ?? 'json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Comprehensive report error:', error);
      throw error;
    }
  }

  // Get Code Suggestions
  static async getCodeSuggestions(sessionId, fileName, codeSnippet, cursorPosition = 0) {
    try {
      const response = await api.post('/ai/code-suggestions', null, {
        params: {
          session_id: sessionId,
          file_name: fileName,
          code_snippet: codeSnippet,
          cursor_position: cursorPosition
        }
      });
      return response.data;
    } catch (error) {
      console.error('Code suggestions error:', error);
      throw error;
    }
  }

  // Get AI Dashboard Data
  static async getDashboard(sessionId) {
    try {
      const response = await api.get(`/ai/dashboard/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Dashboard error:', error);
      throw error;
    }
  }
}

// Original API functions (keeping for compatibility)
export const createSession = async () => {
  try {
    const response = await api.post('/session/create');
    return response.data;
  } catch (error) {
    console.error('Session creation error:', error);
    throw error;
  }
};

export const uploadFile = async (fileData, sessionId) => {
  try {
    const response = await api.post('/files/upload', fileData, {
      params: { session_id: sessionId }
    });
    return response.data;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

export const getSessionFiles = async (sessionId) => {
  try {
    const response = await api.get(`/files/session/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Get session files error:', error);
    throw error;
  }
};

export const generateChecklist = async (sessionId, model = 'gpt-4o') => {
  try {
    const response = await api.post('/analysis/generate-checklist', null, {
      params: { session_id: sessionId, model }
    });
    return response.data;
  } catch (error) {
    console.error('Generate checklist error:', error);
    throw error;
  }
};

export const analyzeCode = async (sessionId, model = 'gpt-4o') => {
  try {
    const response = await api.post('/analysis/analyze-code', {
      session_id: sessionId,
      model
    });
    return response.data;
  } catch (error) {
    console.error('Code analysis error:', error);
    throw error;
  }
};

export const getAnalysisResults = async (sessionId) => {
  try {
    const response = await api.get(`/analysis/results/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Get analysis results error:', error);
    throw error;
  }
};

export const downloadFilesAsZip = async (sessionId) => {
  try {
    const response = await api.get(`/files/download-zip/${sessionId}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Download zip error:', error);
    throw error;
  }
};

export default api;