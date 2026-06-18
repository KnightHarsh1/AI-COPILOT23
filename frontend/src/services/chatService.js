import api from './api';

const ChatService = {
  sendMessage: async (message) => {
    const response = await api.post('/chat/', { message });
    return response.data;
  },
};

export default ChatService;
