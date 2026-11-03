import apiClient from './api';

export const chatService = {
  /**
   * Ask a question about a specific YouTube video via RAG.
   * Returns answer and timestamp citations.
   */
  askVideoQuestion: async (videoId, question, playlistId = null, history = []) => {
    const response = await apiClient.post('/ai/chat', {
      video_id: videoId,
      question,
      playlist_id: playlistId,
      history
    });
    return response.data;
  },

  /**
   * Fetch chat history for this video and current user.
   */
  getChatHistory: async (videoId) => {
    const response = await apiClient.get(`/ai/chat/history/${videoId}`);
    return response.data;
  },

  /**
   * Clear previous conversation history for this video.
   */
  clearChatHistory: async (videoId) => {
    const response = await apiClient.delete(`/ai/chat/history/${videoId}`);
    return response.data;
  }
};
