import apiClient from './api';

export const progressService = {
  getProgress: async (videoId) => {
    const response = await apiClient.get(`/videos/${videoId}/progress`);
    return response.data;
  },

  updateProgress: async (videoId, progressPercentage, lastWatchedPosition) => {
    const response = await apiClient.put(`/videos/${videoId}/progress`, {
      progress_percentage: progressPercentage,
      last_watched_position: lastWatchedPosition,
    });
    return response.data;
  },

  completeVideo: async (videoId) => {
    const response = await apiClient.post(`/videos/${videoId}/complete`);
    return response.data;
  }
};
