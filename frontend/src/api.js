import axios from 'axios';

const api = axios.create({
    // Теперь запросы идут просто на /api. 
    // Браузер сам подставит текущий домен Netlify (https://твой-сайт.netlify.app/api)
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Перехватчик запросов: добавляем токен в каждый запрос, если он есть
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Перехватчик ответов: если сервер вернул 401 (Не авторизован), выкидываем на логин
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('admin_token');
            // Если мы не на странице логина, перенаправляем туда
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;