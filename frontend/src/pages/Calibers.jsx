import { useEffect, useState, useMemo } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import './Calibers.css';

const CALIBER_TYPES = [
    { value: 'bullet', label: '🔫 Пуля' },
    { value: 'arrow', label: '🏹 Стрела' },
    { value: 'bolt', label: '🎯 Болт' },
    { value: 'throwable', label: '💣 Метательное' },
];

export default function Calibers() {
    const [calibers, setCalibers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', type: 'bullet' });

    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(5);

    const loadCalibers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/calibers');
            setCalibers(res.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка загрузки');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadCalibers(); }, []);

    const filteredCalibers = useMemo(() => {
        return calibers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [calibers, searchTerm]);

    const totalPages = Math.ceil(filteredCalibers.length / perPage);
    const currentCalibers = filteredCalibers.slice((page - 1) * perPage, page * perPage);

    useEffect(() => { setPage(1); }, [searchTerm, perPage]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ name: '', type: 'bullet' });
        setIsModalOpen(true);
    };

    const handleStartEdit = (cal) => {
        setEditingId(cal.id);
        setFormData({ name: cal.name, type: cal.type });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        try {
            if (editingId) await api.put(`/calibers/${editingId}`, formData);
            else await api.post('/calibers', formData);
            setIsModalOpen(false);
            loadCalibers();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка сохранения');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Удалить калибр "${name}"?`)) return;
        try {
            await api.delete(`/calibers/${id}`);
            loadCalibers();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка удаления');
        }
    };

    const getTypeLabel = (type) => CALIBER_TYPES.find(t => t.value === type)?.label || type;

    return (
        <div className="calibers-page">
            {/* ШАПКА */}
            <div className="page-header-area">
                <div className="header-top">
                    <h1>🔫 Калибры</h1>
                    <button className="btn-primary" onClick={handleOpenCreate}>➕ Создать калибр</button>
                </div>
                <div className="filters-bar">
                    <input 
                        placeholder="🔍 Поиск по названию..." 
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
                                <th>Название</th>
                                <th>Тип</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentCalibers.length === 0 ? (
                                <tr><td colSpan="4" style={{textAlign: 'center', color: '#888', padding: '30px'}}>Ничего не найдено</td></tr>
                            ) : currentCalibers.map((cal) => (
                                <tr key={cal.id}>
                                    <td>{cal.id}</td>
                                    <td>{cal.name}</td>
                                    <td>{getTypeLabel(cal.type)}</td>
                                    <td>
                                        <button className="btn-primary small" onClick={() => handleStartEdit(cal)}>✏️</button>
                                        <button className="btn-danger small" onClick={() => handleDelete(cal.id, cal.name)}>Удалить</button>
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
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Редактирование калибра" : "Новый калибр"}>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <label>Название</label>
                        <input 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                            required 
                            placeholder="Например: 5.56x45" 
                        />
                    </div>
                    <div className="form-row">
                        <label>Тип боеприпаса</label>
                        <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                            {CALIBER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
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