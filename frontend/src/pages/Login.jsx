import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Login.css';

export default function Login() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const res = await api.post('/login', { password });
            localStorage.setItem('admin_token', res.data.token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка входа');
        } finally { setLoading(false); }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleSubmit}>
                <h1>Админ-панель</h1>
                <p className="login-subtitle">Введите пароль администратора</p>
                <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
                {error && <p className="login-error">{error}</p>}
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Проверка...' : 'Войти'}
                </button>
            </form>
        </div>
    );
}