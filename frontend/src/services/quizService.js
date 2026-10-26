import apiClient from './api';

export const quizService = {
  getUserQuizzes: async () => {
    const response = await apiClient.get('/quizzes/');
    return response.data;
  },

  getQuizById: async (quizId, includeAnswers = false) => {
    const response = await apiClient.get(`/quizzes/${quizId}?include_answers=${includeAnswers}`);
    return response.data;
  },

  saveQuiz: async (title, questions, videoId = null) => {
    const response = await apiClient.post('/quizzes/save', {
      title,
      questions,
      video_id: videoId
    });
    return response.data;
  },

  submitQuizAnswers: async (quizId, answers) => {
    const response = await apiClient.post(`/quizzes/${quizId}/submit`, {
      answers
    });
    return response.data;
  },

  getQuizAttempts: async (quizId) => {
    const response = await apiClient.get(`/quizzes/${quizId}/attempts`);
    return response.data;
  },

  deleteQuiz: async (quizId) => {
    const response = await apiClient.delete(`/quizzes/${quizId}`);
    return response.data;
  }
};
