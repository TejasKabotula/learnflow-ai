import apiClient from './api';

export const searchService = {
  globalSearch: async (query) => {
    if (!query || !query.trim()) {
      return { courses: [], notes: [], saved: [], quizzes: [] };
    }
    const response = await apiClient.get(`/search/?q=${encodeURIComponent(query.trim())}`);
    return response.data;
  }
};
