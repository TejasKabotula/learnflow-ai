import apiClient from './api';

export const savedService = {
  getSavedResources: async (type = 'all', q = '') => {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('resource_type', type);
    if (q) params.append('q', q);
    const queryString = params.toString();
    const url = queryString ? `/saved/?${queryString}` : '/saved/';
    const response = await apiClient.get(url);
    return response.data;
  },

  getSavedResourceById: async (savedId) => {
    const response = await apiClient.get(`/saved/${savedId}`);
    return response.data;
  },

  saveResource: async ({ title, type, content, video_id = null, playlist_id = null, metadata = null }) => {
    const response = await apiClient.post('/saved/', {
      title,
      type,
      content,
      video_id,
      playlist_id,
      metadata
    });
    return response.data;
  },

  deleteSavedResource: async (savedId) => {
    const response = await apiClient.delete(`/saved/${savedId}`);
    return response.data;
  }
};
