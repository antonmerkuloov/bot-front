import { useEffect, useState, useMemo } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import './Skills.css';

const CATEGORIES = [
    { value: 'base', label: '⚙️ Базовые' },
    { value: 'attack', label: '⚔️ Атаки' },
    { value: 'magic', label: '🔮 Магия' },
    { value: 'custom', label: '🎨 Кастомные' },
];

export default function Skills() {
    const [skills, setSkills] = useState([]);
    const [circles, setCircles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Модалка
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', category: 'base', is_absolute_allowed: true, magic_circle_id: ''
    });

    // Фильтрация и пагинация
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(5);

    const loadData = async () => {
        setLoading(true);
        try {
            const [skillsRes, circlesRes] = await Promise.all([
                api.get('/skills'),
                api.get('/circles')
            ]);
            setSkills(skillsRes.data);
            setCircles(circlesRes.data.filter(c => c.is_active));
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка загрузки');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filteredSkills = useMemo(() => {
        return skills.filter(skill => {
            const matchesCat = filterCategory === 'all' || skill.category === filterCategory;
            const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [skills, filterCategory, searchTerm]);

    const totalPages = Math.ceil(filteredSkills.length / perPage);
    const currentSkills = filteredSkills.slice((page - 1) * perPage, page * perPage);

    useEffect(() => { setPage(1); }, [filterCategory, searchTerm, perPage]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ name: '', category: 'base', is_absolute_allowed: true, magic_circle_id: '' });
        setIsModalOpen(true);
    };

    const handleStartEdit = (skill) => {
        setEditingId(skill.id);
        setFormData({
            name: skill.name, category: skill.category,
            is_absolute_allowed: skill.is_absolute_allowed,
            magic_circle_id: skill.magic_circle_id || ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        try {
            if (editingId) await api.put(`/skills/${editingId}`, formData);
            else await api.post('/skills', formData);
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка сохранения');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Удалить навык "${name}" у всех персонажей?`)) return;
        try {
            await api.delete(`/skills/${id}`);
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка удаления');
        }
    };

    const getCategoryLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat;

    return (
        <div className="skills-page">
            {/* ВЕРХНЯЯ ШАПКА (не скроллится) */}
            <div className="page-header-area">
                <div className="header-top">
                    <h1>📝 Навыки</h1>
                    <button className="btn-primary" onClick={handleOpenCreate}>➕ Создать навык</button>
                </div>
                
                <div className="filters-bar">
                    <input 
                        placeholder="🔍 Поиск по названию..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                        <option value="all">Все категории</option>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                        <option value={5}>5 на страницу</option>
                        <option value={10}>10 на страницу</option>
                        <option value={15}>15 на страницу</option>
                    </select>
                </div>
            </div>

            {/* СКРОЛЛЯЩАЯСЯ ТАБЛИЦА */}
            <div className="table-scroll-area">
                {error && <p className="error-msg">{error}</p>}
                {loading ? <p>Загрузка...</p> : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Категория</th>
                                <th>Круг</th>
                                <th>Абсолют</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentSkills.length === 0 ? (
                                <tr><td colSpan="5" style={{textAlign: 'center', color: '#888', padding: '30px'}}>Ничего не найдено</td></tr>
                            ) : currentSkills.map((skill) => (
                                <tr key={skill.id}>
                                    <td><strong>{skill.name}</strong></td>
                                    <td>{getCategoryLabel(skill.category)}</td>
                                    <td>{skill.magic_circles ? skill.magic_circles.name : '—'}</td>
                                    <td>
                                        {skill.category === 'magic' ? <span style={{color: '#888'}}>Н/Д</span> : 
                                         (skill.is_absolute_allowed ? '✅ Да' : '❌ Нет')}
                                    </td>
                                    <td>
                                        <button className="btn-primary small" onClick={() => handleStartEdit(skill)}>✏️</button>
                                        <button className="btn-danger small" onClick={() => handleDelete(skill.id, skill.name)}>Удалить</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* НИЖНЯЯ ПАНЕЛЬ (не скроллится) */}
            {totalPages > 1 && (
                <div className="pagination-footer">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>◀ Назад</button>
                    <span>Страница {page} из {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Вперед ▶</button>
                </div>
            )}

            {/* Модалка */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Редактирование навыка" : "Новый навык"}>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <label>Название</label>
                        <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Например: Скрытность" />
                    </div>
                    <div className="form-row">
                        <label>Категория</label>
                        <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    {formData.category === 'magic' && (
                        <div className="form-row">
                            <label>Круг магии</label>
                            <select value={formData.magic_circle_id} onChange={(e) => setFormData({...formData, magic_circle_id: e.target.value})} required>
                                <option value="">-- Выберите круг --</option>
                                {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    {formData.category !== 'magic' && (
                        <div className="form-row checkbox-row">
                            <input type="checkbox" id="abs-check" checked={formData.is_absolute_allowed} onChange={(e) => setFormData({...formData, is_absolute_allowed: e.target.checked})} />
                            <label htmlFor="abs-check">Может достичь Абсолюта (100+ ОП)</label>
                        </div>
                    )}
                    <div className="form-actions">
                        <button type="submit" className="btn-success">Сохранить</button>
                        <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Отмена</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}