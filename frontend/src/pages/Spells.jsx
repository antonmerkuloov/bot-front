import { useEffect, useState, useMemo } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import './Spells.css';

export default function Spells() {
    const [spells, setSpells] = useState([]);
    const [circles, setCircles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', circle_id: '', damage_dice: 0, guaranteed_damage: 0,
        mana_cost: 0, stamina_cost: 0, threshold: 10, effect_text: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCircle, setFilterCircle] = useState('all');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const loadData = async () => {
        setLoading(true);
        try {
            const [spellsRes, circlesRes] = await Promise.all([
                api.get('/spells'),
                api.get('/circles')
            ]);
            setSpells(spellsRes.data);
            setCircles(circlesRes.data.filter(c => c.is_active));
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка загрузки');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filteredSpells = useMemo(() => {
        return spells.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCircle = filterCircle === 'all' || s.circle_id === Number(filterCircle);
            return matchesSearch && matchesCircle;
        });
    }, [spells, searchTerm, filterCircle]);

    const totalPages = Math.ceil(filteredSpells.length / perPage);
    const currentSpells = filteredSpells.slice((page - 1) * perPage, page * perPage);

    useEffect(() => { setPage(1); }, [searchTerm, filterCircle, perPage]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            name: '', circle_id: circles[0]?.id || '', damage_dice: 0, guaranteed_damage: 0,
            mana_cost: 0, stamina_cost: 0, threshold: 10, effect_text: ''
        });
        setIsModalOpen(true);
    };

    const handleStartEdit = (spell) => {
        setEditingId(spell.id);
        setFormData({
            name: spell.name, circle_id: spell.circle_id,
            damage_dice: spell.damage_dice, guaranteed_damage: spell.guaranteed_damage,
            mana_cost: spell.mana_cost, stamina_cost: spell.stamina_cost,
            threshold: spell.threshold, effect_text: spell.effect_text || ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.circle_id) return;
        try {
            if (editingId) await api.put(`/spells/${editingId}`, formData);
            else await api.post('/spells', formData);
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка сохранения');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Удалить заклинание "${name}" у всех персонажей?`)) return;
        try {
            await api.delete(`/spells/${id}`);
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка удаления');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header-area">
                <div className="header-top">
                    <h1>📜 Заклинания</h1>
                    <button className="btn-primary" onClick={handleOpenCreate}>➕ Создать заклинание</button>
                </div>
                <div className="filters-bar">
                    <input 
                        placeholder="🔍 Поиск по названию..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select value={filterCircle} onChange={(e) => setFilterCircle(e.target.value)}>
                        <option value="all">Все круги</option>
                        {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                        <option value={5}>5 на страницу</option>
                        <option value={10}>10 на страницу</option>
                        <option value={15}>15 на страницу</option>
                    </select>
                </div>
            </div>

            <div className="table-scroll-area">
                {error && <p className="error-msg">{error}</p>}
                {loading ? <p>Загрузка...</p> : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Круг</th>
                                <th>Урон</th>
                                <th>Мана</th>
                                <th>Вын-ть</th>
                                <th>Сложность</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentSpells.length === 0 ? (
                                <tr><td colSpan="7" style={{textAlign: 'center', color: '#888', padding: '30px'}}>Ничего не найдено</td></tr>
                            ) : currentSpells.map((spell) => (
                                <tr key={spell.id}>
                                    <td><strong>{spell.name}</strong></td>
                                    <td>{spell.magic_circles ? spell.magic_circles.name : '—'}</td>
                                    <td>D{spell.damage_dice}+{spell.guaranteed_damage}</td>
                                    <td>{spell.mana_cost}</td>
                                    <td>{spell.stamina_cost}</td>
                                    <td>{spell.threshold}</td>
                                    <td>
                                        <button className="btn-primary small" onClick={() => handleStartEdit(spell)}>✏️</button>
                                        <button className="btn-danger small" onClick={() => handleDelete(spell.id, spell.name)}>Удалить</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination-footer">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>◀ Назад</button>
                    <span>Страница {page} из {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Вперед ▶</button>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Редактирование заклинания" : "Новое заклинание"}>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <label>Название</label>
                        <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Например: Огненный шар" />
                    </div>
                    <div className="form-row">
                        <label>Круг магии</label>
                        <select value={formData.circle_id} onChange={(e) => setFormData({...formData, circle_id: e.target.value})} required>
                            <option value="">-- Выберите круг --</option>
                            {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="form-row-split">
                        <div className="form-row">
                            <label>Кубик урона</label>
                            <input type="number" min="0" value={formData.damage_dice} onChange={(e) => setFormData({...formData, damage_dice: Number(e.target.value)})} />
                        </div>
                        <div className="form-row">
                            <label>Гарант урона</label>
                            <input type="number" min="0" value={formData.guaranteed_damage} onChange={(e) => setFormData({...formData, guaranteed_damage: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div className="form-row-split">
                        <div className="form-row">
                            <label>Стоимость маны</label>
                            <input type="number" min="0" value={formData.mana_cost} onChange={(e) => setFormData({...formData, mana_cost: Number(e.target.value)})} />
                        </div>
                        <div className="form-row">
                            <label>Стоимость выносливости</label>
                            <input type="number" min="0" value={formData.stamina_cost} onChange={(e) => setFormData({...formData, stamina_cost: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div className="form-row">
                        <label>Сложность (порог)</label>
                        <input type="number" min="1" max="30" value={formData.threshold} onChange={(e) => setFormData({...formData, threshold: Number(e.target.value)})} />
                    </div>
                    <div className="form-row">
                        <label>Эффект заклинания (текст)</label>
                        <textarea rows="4" value={formData.effect_text} onChange={(e) => setFormData({...formData, effect_text: e.target.value})} placeholder="Описание того, что делает заклинание..." />
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