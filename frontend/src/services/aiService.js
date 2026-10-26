import apiClient from './api';

export const aiService = {
  processVideo: async (youtubeUrl) => {
    const response = await apiClient.post('/ai/process', {
      youtube_url: youtubeUrl
    });
    return response.data;
  },

  summarizeText: async (text, title) => {
    const response = await apiClient.post('/ai/summarize', {
      text,
      title
    });
    return response.data;
  },

  generateQuiz: async (text, title) => {
    const response = await apiClient.post('/ai/quiz', {
      text,
      title
    });
    return response.data;
  },

  clarifyConcept: async (concept, context) => {
    const response = await apiClient.post('/ai/clarify', {
      concept,
      context
    });
    return response.data;
  }
};
