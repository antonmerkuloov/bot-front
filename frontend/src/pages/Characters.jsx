import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Characters.css';

export default function Characters() {
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    
    const navigate = useNavigate();

    useEffect(() => {
        const loadCharacters = async () => {
            try {
                const res = await api.get('/characters');
                setCharacters(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Ошибка загрузки');
            } finally {
                setLoading(false);
            }
        };
        loadCharacters();
    }, []);

    const filteredChars = useMemo(() => {
        return characters.filter(c => {
            const search = searchTerm.toLowerCase();
            return c.character_name.toLowerCase().includes(search) || 
                   c.character_id.toLowerCase().includes(search);
        });
    }, [characters, searchTerm]);

    const totalPages = Math.ceil(filteredChars.length / perPage);
    const currentChars = filteredChars.slice((page - 1) * perPage, page * perPage);

    useEffect(() => { setPage(1); }, [searchTerm, perPage]);

    return (
        <div className="page-container">
            <div className="page-header-area">
                <div className="header-top">
                    <h1>👤 Персонажи</h1>
                </div>
                <div className="filters-bar">
                    <input 
                        placeholder="🔍 Поиск по имени или ID..." 
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
                {error && <p className="error-msg">{error}</p>}
                {loading ? <p>Загрузка...</p> : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Имя</th>
                                <th>ID (Код)</th>
                                <th>Основной</th>
                                <th>Статы (Вын / Мана / Кровь)</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentChars.length === 0 ? (
                                <tr><td colSpan="5" style={{textAlign: 'center', color: '#888', padding: '30px'}}>Персонажи не найдены</td></tr>
                            ) : currentChars.map(char => (
                                <tr key={char.id} onClick={() => navigate(`/characters/${char.id}`)} className="clickable-row">
                                    <td><strong>{char.character_name}</strong></td>
                                    <td><code>{char.character_id}</code></td>
                                    <td>{char.is_main ? '⭐ Да' : '—'}</td>
                                    <td>
                                        <span title="Выносливость">⚡{char.stamina}/{char.max_stamina}</span> | 
                                        <span title="Мана"> 🔮{char.manna}/{char.max_manna}</span> | 
                                        <span title="Кровь"> 🩸{char.blood}/{char.max_blood}</span>
                                    </td>
                                    <td>
                                        <button className="btn-primary small" onClick={(e) => { e.stopPropagation(); navigate(`/characters/${char.id}`); }}>
                                            Открыть
                                        </button>
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
        </div>
    );
}