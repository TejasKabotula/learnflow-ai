import apiClient from './api';

export const aiService = {
  processVideo: async (youtubeUrl, level = 'medium') => {
    const response = await apiClient.post('/ai/process', {
      youtube_url: youtubeUrl,
      level: level
    });
    return response.data;
  },

  regenerateQuiz: async (videoId, difficulty = 'mixed', count = 4, offset = 0) => {
    const response = await apiClient.post('/ai/regenerate-quiz', {
      video_id: videoId,
      difficulty,
      count,
      offset
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
