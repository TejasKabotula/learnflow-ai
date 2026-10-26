import apiClient from './api';

export const notesService = {
  getAllNotes: async (playlistId = null, q = '') => {
    let url = '/notes/';
    const params = new URLSearchParams();
    if (playlistId) params.append('playlist_id', playlistId);
    if (q) params.append('q', q);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },

  getNoteById: async (noteId) => {
    const response = await apiClient.get(`/notes/detail/${noteId}`);
    return response.data;
  },

  getNotesByVideo: async (playlistId, videoId) => {
    const response = await apiClient.get(`/notes/${playlistId}/${videoId}`);
    return response.data;
  },

  createStandaloneNote: async (title, content, playlistId = null, videoId = null) => {
    const response = await apiClient.post('/notes/', {
      title,
      content,
      playlist_id: playlistId,
      video_id: videoId
    });
    return response.data;
  },

  createOrUpdateNote: async (playlistId, videoId, content, timestamp = 0, title = null) => {
    const response = await apiClient.post(`/notes/${playlistId}/${videoId}`, {
      title,
      content,
      video_id: videoId,
      timestamp
    });
    return response.data;
  },

  updateNote: async (noteId, title, content) => {
    const response = await apiClient.put(`/notes/${noteId}`, {
      title,
      content
    });
    return response.data;
  },

  deleteNote: async (noteId) => {
    const response = await apiClient.delete(`/notes/${noteId}`);
    return response.data;
  }
};
