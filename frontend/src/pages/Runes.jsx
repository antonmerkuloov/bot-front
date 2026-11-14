import { useEffect, useState, useMemo } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const RUNE_TYPES = [
    { value: 'melee_bonus', label: '⚔️ Гарант урона' },
    { value: 'passive_durability', label: '🛡️ Прочность (+ к макс.)' },
    { value: 'durability_threshold', label: '🔨 Порог ломки (35 вм. 25)' },
];

export default function Runes() {
    const [runes, setRunes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', type: 'melee_bonus', value: 5 });

    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const loadRunes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/runes');
            setRunes(res.data.filter(r => r.type !== 'ranged'));
        } catch (err) {
            alert('Ошибка загрузки рун');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRunes(); }, []);

    const filteredRunes = useMemo(() => {
        return runes.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [runes, searchTerm]);

    const totalPages = Math.ceil(filteredRunes.length / perPage);
    const currentRunes = filteredRunes.slice((page - 1) * perPage, page * perPage);

    useEffect(() => { setPage(1); }, [searchTerm, perPage]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return;
        await api.post('/runes', formData);
        setIsModalOpen(false);
        loadRunes();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить руну?')) return;
        await api.delete(`/runes/${id}`);
        loadRunes();
    };

    return (
        <div className="page-container">
            <div className="page-header-area">
                <div className="header-top">
                    <h1>📖 Пассивные руны</h1>
                    <button className="btn-primary" onClick={() => { setFormData({ name: '', type: 'melee_bonus', value: 5 }); setIsModalOpen(true); }}>➕ Создать руну</button>
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

            <div className="table-scroll-area">
                {loading ? <p>Загрузка...</p> : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Название</th>
                                <th>Тип</th>
                                <th>Значение</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRunes.length === 0 ? (
                                <tr><td colSpan="5" style={{textAlign: 'center', color: '#888'}}>Руны не найдены</td></tr>
                            ) : currentRunes.map(r => (
                                <tr key={r.id}>
                                    <td>{r.id}</td>
                                    <td><strong>{r.name}</strong></td>
                                    <td>{RUNE_TYPES.find(t => t.value === r.type)?.label || r.type}</td>
                                    <td>{r.type === 'melee_bonus' ? `+${r.guaranteed_damage} урона` : `+${r.durability_bonus} прочности`}</td>
                                    <td>
                                        <button className="btn-danger small" onClick={() => handleDelete(r.id)}>Удалить</button>
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Новая руна">
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <label>Название</label>
                        <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div className="form-row">
                        <label>Тип</label>
                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                            {RUNE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    {formData.type !== 'durability_threshold' && (
                        <div className="form-row">
                            <label>Значение</label>
                            <input type="number" value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} />
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