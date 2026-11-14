import { useEffect, useState, useMemo } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import './Circles.css';

export default function Circles() {
    const [circles, setCircles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Модалка
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ key: '', name: '' });

    // Фильтрация и пагинация
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(5);

    const loadCircles = async () => {
        setLoading(true);
        try {
            const res = await api.get('/circles');
            setCircles(res.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка загрузки');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadCircles(); }, []);

    const filteredCircles = useMemo(() => {
        return circles.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.key.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [circles, searchTerm]);

    const totalPages = Math.ceil(filteredCircles.length / perPage);
    const currentCircles = filteredCircles.slice((page - 1) * perPage, page * perPage);

    useEffect(() => { setPage(1); }, [searchTerm, perPage]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ key: '', name: '' });
        setIsModalOpen(true);
    };

    const handleStartEdit = (circle) => {
        setEditingId(circle.id);
        setFormData({ key: circle.key, name: circle.name });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.key.trim()) return;
        try {
            if (editingId) await api.put(`/circles/${editingId}`, { name: formData.name });
            else await api.post('/circles', formData);
            setIsModalOpen(false);
            loadCircles();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка сохранения');
        }
    };

    const handleToggle = async (id) => {
        try {
            await api.put(`/circles/${id}/toggle`);
            loadCircles();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка переключения');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`⚠️ Удалить круг "${name}"?\n\nВсе заклинания и навыки этого круга будут удалены у ВСЕХ персонажей.`)) return;
        try {
            await api.delete(`/circles/${id}`);
            loadCircles();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка удаления');
        }
    };

    return (
        <div className="circles-page">
            {/* ШАПКА */}
            <div className="page-header-area">
                <div className="header-top">
                    <h1>🔮 Круги магии</h1>
                    <button className="btn-primary" onClick={handleOpenCreate}>➕ Создать круг</button>
                </div>
                <div className="filters-bar">
                    <input 
                        placeholder="🔍 Поиск по названию или ключу..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                        <option value={5}>5 на страницу</option>
                        <option value={10}>10 на страницу</option>
                        <option value={15}>15 на страницу</option>
                    </select>
                </div>
            </div>

            {/* ТАБЛИЦА */}
            <div className="table-scroll-area">
                {error && <p className="error-msg">{error}</p>}
                {loading ? <p>Загрузка...</p> : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Ключ</th>
                                <th>Название</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentCircles.length === 0 ? (
                                <tr><td colSpan="5" style={{textAlign: 'center', color: '#888', padding: '30px'}}>Ничего не найдено</td></tr>
                            ) : currentCircles.map((circle) => (
                                <tr key={circle.id} className={!circle.is_active ? 'inactive-row' : ''}>
                                    <td>{circle.id}</td>
                                    <td><code>{circle.key}</code></td>
                                    <td>{circle.name}</td>
                                    <td>
                                        <span className={`status-badge ${circle.is_active ? 'active' : 'inactive'}`}>
                                            {circle.is_active ? 'Активен' : 'Отключён'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-primary small" onClick={() => handleStartEdit(circle)}>✏️</button>
                                        <button className="btn-secondary small" onClick={() => handleToggle(circle.id)}>
                                            {circle.is_active ? 'Отключить' : 'Включить'}
                                        </button>
                                        <button className="btn-danger small" onClick={() => handleDelete(circle.id, circle.name)}>Удалить</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ПАГИНАЦИЯ */}
            {totalPages > 1 && (
                <div className="pagination-footer">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>◀ Назад</button>
                    <span>Страница {page} из {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Вперед ▶</button>
                </div>
            )}

            {/* МОДАЛКА */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Редактирование круга" : "Новый круг"}>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <label>Системный ключ (латиницей)</label>
                        <input 
                            value={formData.key} 
                            onChange={(e) => setFormData({...formData, key: e.target.value})} 
                            required 
                            disabled={!!editingId}
                            placeholder="Например: fire" 
                        />
                        {editingId && <small style={{color: '#888'}}>Ключ нельзя изменить</small>}
                    </div>
                    <div className="form-row">
                        <label>Отображаемое имя</label>
                        <input 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                            required 
                            placeholder="Например: 🔥 Огонь" 
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn-success">Сохранить</button>
                        <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Отмена</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}