import axios from 'axios';

// Берем URL бэка из переменных окружения или формируем динамически:
// используем тот же хост, с которого открыт фронт (localhost или IP локальной сети),
// чтобы бэк был доступен и с других устройств в сети.
const API_URL = import.meta.env.VITE_API_URL || `http://localhost:8000`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // Таймаут 10 секунд
  withCredentials: true, // принимать и отправлять сессионные куки бэка (id_session, csrftoken)
});

export default api;
