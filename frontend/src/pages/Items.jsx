import { useEffect, useState, useMemo } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import './Items.css';

const ITEM_TYPES = [
    { value: 'weapon', label: '⚔️ Оружие' },
    { value: 'ranged', label: '🏹 Стрелковое' },
    { value: 'magic_ranged', label: '✨ Магическое стрелковое' },
    { value: 'magazine', label: '📦 Магазин' },
    { value: 'shield', label: '🛡️ Щит' },
    { value: 'consumable', label: '🍎 Расходник' },
    { value: 'staff', label: '🪄 Посох (Жезл)' },
    { value: 'magic_weapon', label: '✨ Магическое оружие' },
];

const CONSUMABLE_TYPES = [
    { value: 'food', label: '🍖 Еда (Выносливость)' },
    { value: 'medicine', label: '💊 Медицина (Кровь)' },
    { value: 'mana', label: '🔮 Манна (Восст.)' },
    { value: 'combined', label: '🧪 Комбинированный (2 атрибута)' },
    { value: 'mana_charge', label: '✨ Манна-заряд (для оружия)' },
    { value: 'ammo', label: '💣 Боеприпасы' },
    { value: 'stripper_clip', label: '📦 Обойма' },
    { value: 'repair', label: '🔧 Ремкомплект' },
    { value: 'throwable', label: '🤾 Метательное' },
    { value: 'one_time_use', label: '📜 Одноразовое' },
];

const EMPTY_FORM = {
    name: '',
    type: 'weapon',
    price: 0,
    max_durability: 0,
    damage_dice: 0,
    guaranteed_damage: 0,
    damage_stat: 'strength',
    skill_id: '',
    is_two_handed: false,
    rune_slots_max: 0,
    is_firearm: false,
    is_internal_magazine: true,
    caliber_id: '',
    magazine_capacity: 0,
    consumable_type: 'food',
    effect_value: 0,
    effect_text: '',
    consumable_effects: null,
    skill_bonus: 0,
    intelligence_bonus: 0,
};

export default function Items() {
    const [items, setItems] = useState([]);
    const [skills, setSkills] = useState([]);
    const [calibers, setCalibers] = useState([]);
    const [rates, setRates] = useState({ gold_to_silver: 20, silver_to_copper: 10 });
    const [allRunes, setAllRunes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [skillSearch, setSkillSearch] = useState('');
    const [selectedRunes, setSelectedRunes] = useState([]);
    const [runeToAdd, setRuneToAdd] = useState('');
    
    // Состояние для комбинированных эффектов (по умолчанию 2)
    const [combinedEffects, setCombinedEffects] = useState([
        { stat: 'stamina', value: 0 },
        { stat: 'manna', value: 0 }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(5);

    const loadData = async () => {
        setLoading(true);
        try {
            const [itemsRes, skillsRes, calibersRes, ratesRes, runesRes] = await Promise.all([
                api.get('/items'),
                api.get('/skills'),
                api.get('/calibers'),
                api.get('/economy/rates'),
                api.get('/runes'),
            ]);
            setItems(itemsRes.data);
            setSkills(skillsRes.data);
            setCalibers(calibersRes.data);
            setRates(ratesRes.data);
            setAllRunes(runesRes.data.filter((r) => r.type !== 'ranged'));
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка загрузки');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const formatPrice = (amount) => {
        if (!amount || amount === 0) return '0 🥉';
        const gold = Math.floor(amount / (rates.gold_to_silver * rates.silver_to_copper));
        const remainder = amount % (rates.gold_to_silver * rates.silver_to_copper);
        const silver = Math.floor(remainder / rates.silver_to_copper);
        const copper = remainder % rates.silver_to_copper;
        const parts = [];
        if (gold > 0) parts.push(`${gold} 🥇`);
        if (silver > 0) parts.push(`${silver} 🥈`);
        if (copper > 0) parts.push(`${copper} 🥉`);
        return parts.join(' ');
    };

    const filteredItems = useMemo(() => items.filter((i) => {
        const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || i.type === filterType;
        return matchesSearch && matchesType;
    }), [items, searchTerm, filterType]);

    const totalPages = Math.ceil(filteredItems.length / perPage);
    const currentItems = filteredItems.slice((page - 1) * perPage, page * perPage);

    useEffect(() => { setPage(1); }, [searchTerm, filterType, perPage]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setSkillSearch('');
        setSelectedRunes([]);
        setRuneToAdd('');
        setCombinedEffects([{ stat: 'stamina', value: 0 }, { stat: 'manna', value: 0 }]);
        setFormData(EMPTY_FORM);
        setIsModalOpen(true);
    };

    const handleStartEdit = async (item) => {
        setEditingId(item.id);
        setSkillSearch('');
        setRuneToAdd('');
        try {
            const res = await api.get(`/items/${item.id}/runes`);
            setSelectedRunes(res.data.map((r) => r.rune_id));
        } catch {
            setSelectedRunes([]);
        }

        // Восстанавливаем комбинированные эффекты из JSON
        if (item.consumable_type === 'combined' && item.consumable_effects) {
            const effectsArray = Object.entries(item.consumable_effects).map(([stat, value]) => ({ stat, value }));
            // Добиваем до 2 штук, если в базе лежит только 1 эффект
            while (effectsArray.length < 2) {
                effectsArray.push({ stat: 'stamina', value: 0 });
            }
            setCombinedEffects(effectsArray);
        } else {
            setCombinedEffects([{ stat: 'stamina', value: 0 }, { stat: 'manna', value: 0 }]);
        }

        setFormData({
            name: item.name,
            type: item.type,
            price: item.price || 0,
            max_durability: item.max_durability || 0,
            damage_dice: item.damage_dice || 0,
            guaranteed_damage: item.guaranteed_damage || 0,
            damage_stat: item.damage_stat || 'strength',
            skill_id: item.skill_id || '',
            is_two_handed: item.is_two_handed || false,
            rune_slots_max: item.rune_slots_max || 0,
            is_firearm: item.is_firearm || false,
            is_internal_magazine: item.is_internal_magazine !== false,
            caliber_id: item.caliber_id || '',
            magazine_capacity: item.magazine_capacity || 0,
            consumable_type: item.consumable_type || 'food',
            effect_value: item.effect_value || 0,
            effect_text: item.effect_text || '',
            consumable_effects: item.consumable_effects || null,
            skill_bonus: item.skill_bonus || 0,
            intelligence_bonus: item.intelligence_bonus || 0,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const payload = { ...formData };
        if (!payload.skill_id) payload.skill_id = null;
        if (!payload.caliber_id) payload.caliber_id = null;

        // Собираем JSON эффектов, если это комбинированный расходник
        if (payload.type === 'consumable' && payload.consumable_type === 'combined') {
            const effectObj = {};
            combinedEffects.forEach(e => {
                if (e.value > 0) effectObj[e.stat] = Number(e.value);
            });
            payload.consumable_effects = Object.keys(effectObj).length > 0 ? effectObj : null;
        } else {
            payload.consumable_effects = null;
        }

        try {
            let itemId = editingId;
            if (editingId) {
                await api.put(`/items/${editingId}`, payload);
            } else {
                const res = await api.post('/items', payload);
                itemId = res.data.id;
            }

            const runesToSave = selectedRunes.slice(0, formData.rune_slots_max || 0);
            const currentRunes = await api.get(`/items/${itemId}/runes`);
            for (const r of currentRunes.data) {
                await api.delete(`/items/${itemId}/runes/${r.id}`);
            }
            for (let i = 0; i < runesToSave.length; i++) {
                await api.post(`/items/${itemId}/runes`, {
                    rune_id: runesToSave[i],
                    slot_index: i + 1,
                });
            }

            setIsModalOpen(false);
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка сохранения');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить предмет?')) return;
        try {
            await api.delete(`/items/${id}`);
            loadData();
        } catch {
            alert('Ошибка удаления');
        }
    };

    const handleRuneSlotsChange = (value) => {
        const newMax = Math.max(0, Math.min(3, Number(value) || 0));
        setFormData((prev) => ({ ...prev, rune_slots_max: newMax }));
        setSelectedRunes((prev) => prev.slice(0, newMax));
    };

    const getTypeLabel = (type) => ITEM_TYPES.find((t) => t.value === type)?.label || type;

    const getAvailableSkills = (itemType) => {
        let base = [];
        if (itemType === 'staff') base = skills.filter((s) => s.name.toLowerCase().includes('посох'));
        else if (itemType === 'shield') base = skills.filter((s) => s.name.toLowerCase().includes('щит'));
        else base = skills.filter((s) => s.category === 'attack');
        return base.filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()));
    };

    const canHaveRunes = ['weapon', 'magic_weapon', 'ranged', 'magic_ranged'].includes(formData.type);

    const renderParams = (item) => {
        if (item.type === 'magazine') {
            return <span>Калибр: {item.calibers?.name || '—'} [{item.magazine_capacity}]</span>;
        }
        if (item.type === 'consumable') {
            let base = '';
            if (item.consumable_type === 'ammo') {
                base = `Патрон (${item.calibers?.name || '—'}) | Урон: D${item.damage_dice}+${item.guaranteed_damage}`;
            } else if (item.consumable_type === 'stripper_clip') {
                base = `Обойма (${item.calibers?.name || '—'}) | Патронов: ${item.effect_value}`;
            } else if (item.consumable_type === 'combined' && item.consumable_effects) {
                const effectsStr = Object.entries(item.consumable_effects)
                    .map(([stat, val]) => `${stat === 'stamina' ? '⚡' : stat === 'manna' ? '🔮' : stat === 'blood' ? '🩸' : '🛡️'}+${val}`)
                    .join(' ');
                base = `Комбо: ${effectsStr}`;
            } else {
                base = `Эффект: +${item.effect_value}`;
            }
            
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>{base}</span>
                    {item.effect_text && <small style={{ color: '#a0a0a0', fontStyle: 'italic' }}>{item.effect_text}</small>}
                </div>
            );
        }
        if (item.type === 'ranged') {
            return (
                <span>
                    Калибр: {item.calibers?.name || '—'}{' '}
                    {item.is_internal_magazine ? `[Встр. ${item.magazine_capacity}]` : '(Съемн.)'}
                </span>
            );
        }
        if (item.type === 'magic_ranged') {
            return <span>Урон: D{item.damage_dice}+{item.guaranteed_damage}</span>;
        }
        if (item.type === 'shield') {
            return <span>Урон: D{item.damage_dice}+{item.guaranteed_damage} | Блок: +{item.skill_bonus}</span>;
        }
        if (item.type === 'staff') {
            return <span>Урон: D{item.damage_dice}+{item.guaranteed_damage} | Инт: +{item.intelligence_bonus}</span>;
        }
        if (item.damage_dice > 0) {
            return `Урон: D${item.damage_dice}+${item.guaranteed_damage}`;
        }
        return '—';
    };

    return (
        <div className="page-container">
            <div className="page-header-area">
                <div className="header-top">
                    <h1>⚔️ Предметы</h1>
                    <button className="btn-primary" onClick={handleOpenCreate}>➕ Создать предмет</button>
                </div>
                <div className="filters-bar">
                    <input
                        placeholder="🔍 Поиск..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="all">Все типы</option>
                        {ITEM_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                    <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
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
                                <th>Тип</th>
                                <th>Цена</th>
                                <th>Параметры</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#888' }}>Ничего не найдено</td></tr>
                            ) : currentItems.map((item) => (
                                <tr key={item.id}>
                                    <td><strong>{item.name}</strong></td>
                                    <td>{getTypeLabel(item.type)}</td>
                                    <td>{formatPrice(item.price)}</td>
                                    <td>{renderParams(item)}</td>
                                    <td>
                                        <button className="btn-primary small" onClick={() => handleStartEdit(item)}>✏️</button>
                                        <button className="btn-danger small" onClick={() => handleDelete(item.id)}>✖</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination-footer">
                    <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>◀ Назад</button>
                    <span>Страница {page} из {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Вперед ▶</button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Редактирование предмета' : 'Новый предмет'}
            >
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-row-split">
                        <div className="form-row">
                            <label>Название</label>
                            <input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <label>Цена (в меди)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            />
                            <small style={{ color: '#4ade80' }}>= {formatPrice(formData.price)}</small>
                        </div>
                    </div>

                    <div className="form-row">
                        <label>Тип предмета</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            {ITEM_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {formData.type === 'magazine' && (
                        <>
                            <div className="form-row">
                                <label>Калибр</label>
                                <select
                                    value={formData.caliber_id}
                                    onChange={(e) => setFormData({ ...formData, caliber_id: e.target.value })}
                                    required
                                >
                                    <option value="">-- Выберите --</option>
                                    {calibers.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <label>Вместимость (до 20)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={formData.magazine_capacity}
                                    onChange={(e) => setFormData({ ...formData, magazine_capacity: Number(e.target.value) })}
                                />
                            </div>
                        </>
                    )}

                    {['weapon', 'magic_weapon'].includes(formData.type) && (
                        <>
                            <div className="form-row-split">
                                <div className="form-row">
                                    <label>Кубик урона (D)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.damage_dice}
                                        onChange={(e) => setFormData({ ...formData, damage_dice: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Гарант урона</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.guaranteed_damage}
                                        onChange={(e) => setFormData({ ...formData, guaranteed_damage: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="form-row-split">
                                <div className="form-row">
                                    <label>Характеристика</label>
                                    <select
                                        value={formData.damage_stat}
                                        onChange={(e) => setFormData({ ...formData, damage_stat: e.target.value })}
                                    >
                                        <option value="strength">💪 Сила</option>
                                        <option value="dexterity">🏃 Ловкость</option>
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label>Макс. прочность</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.max_durability}
                                        onChange={(e) => setFormData({ ...formData, max_durability: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.is_two_handed}
                                    onChange={(e) => setFormData({ ...formData, is_two_handed: e.target.checked })}
                                />
                                <span>Двуручное оружие</span>
                            </label>

                            <div className="form-row">
                                <label>Навык владения</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Поиск навыка..."
                                        value={skillSearch}
                                        onChange={(e) => setSkillSearch(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <select
                                        value={formData.skill_id}
                                        onChange={(e) => setFormData({ ...formData, skill_id: e.target.value })}
                                        style={{ flex: 2 }}
                                    >
                                        <option value="">-- Без навыка --</option>
                                        {getAvailableSkills(formData.type).map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <label>Слотов под руны (0-3)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="3"
                                    value={formData.rune_slots_max}
                                    onChange={(e) => handleRuneSlotsChange(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {formData.type === 'staff' && (
                        <>
                            <div className="form-row-split">
                                <div className="form-row">
                                    <label>Кубик урона (D)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.damage_dice}
                                        onChange={(e) => setFormData({ ...formData, damage_dice: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Гарант урона</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.guaranteed_damage}
                                        onChange={(e) => setFormData({ ...formData, guaranteed_damage: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="form-row-split">
                                <div className="form-row">
                                    <label>Макс. прочность</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.max_durability}
                                        onChange={(e) => setFormData({ ...formData, max_durability: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Бонус к интеллекту</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.intelligence_bonus}
                                        onChange={(e) => setFormData({ ...formData, intelligence_bonus: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.is_two_handed}
                                    onChange={(e) => setFormData({ ...formData, is_two_handed: e.target.checked })}
                                />
                                <span>Двуручный посох (для жезлов снимите галочку)</span>
                            </label>

                            <div className="form-row">
                                <label>Навык владения</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Поиск навыка..."
                                        value={skillSearch}
                                        onChange={(e) => setSkillSearch(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <select
                                        value={formData.skill_id}
                                        onChange={(e) => setFormData({ ...formData, skill_id: e.target.value })}
                                        style={{ flex: 2 }}
                                    >
                                        <option value="">-- Без навыка --</option>
                                        {getAvailableSkills(formData.type).map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {formData.type === 'shield' && (
                        <>
                            <div className="form-row-split">
                                <div className="form-row">
                                    <label>Кубик урона (D)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.damage_dice}
                                        onChange={(e) => setFormData({ ...formData, damage_dice: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Гарант урона</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.guaranteed_damage}
                                        onChange={(e) => setFormData({ ...formData, guaranteed_damage: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="form-row-split">
                                <div className="form-row">
                                    <label>Макс. прочность</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.max_durability}
                                        onChange={(e) => setFormData({ ...formData, max_durability: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Бонус к блоку</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.skill_bonus}
                                        onChange={(e) => setFormData({ ...formData, skill_bonus: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <label>Навык владения</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Поиск навыка..."
                                        value={skillSearch}
                                        onChange={(e) => setSkillSearch(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <select
                                        value={formData.skill_id}
                                        onChange={(e) => setFormData({ ...formData, skill_id: e.target.value })}
                                        style={{ flex: 2 }}
                                    >
                                        <option value="">-- Без навыка --</option>
                                        {getAvailableSkills(formData.type).map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {formData.type === 'ranged' && (
                        <>
                            <div className="form-row-split">
                                <div className="form-row">
                                    <label>Калибр</label>
                                    <select
                                        value={formData.caliber_id}
                                        onChange={(e) => setFormData({ ...formData, caliber_id: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Выберите --</option>
                                        {calibers.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label>Макс. прочность</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.max_durability}
                                        onChange={(e) => setFormData({ ...formData, max_durability: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.is_firearm}
                                    onChange={(e) => setFormData({ ...formData, is_firearm: e.target.checked })}
                                />
                                <span>Огнестрельное (осечки)</span>
                            </label>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.is_two_handed}
                                    onChange={(e) => setFormData({ ...formData, is_two_handed: e.target.checked })}
                                />
                                <span>Двуручное оружие</span>
                            </label>

                            <div className="form-row">
                                <label>Навык владения</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Поиск навыка..."
                                        value={skillSearch}
                                        onChange={(e) => setSkillSearch(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <select
                                        value={formData.skill_id}
                                        onChange={(e) => setFormData({ ...formData, skill_id: e.target.value })}
                                        style={{ flex: 2 }}
                                    >
                                        <option value="">-- Без навыка --</option>
                                        {getAvailableSkills(formData.type).map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <label>Слотов под руны (0-3)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="3"
                                    value={formData.rune_slots_max}
                                    onChange={(e) => handleRuneSlotsChange(e.target.value)}
                                />
                            </div>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.is_internal_magazine}
                                    onChange={(e) => setFormData({ ...formData, is_internal_magazine: e.target.checked })}
                                />
                                <span>Встроенный магазин</span>
                            </label>

                            {formData.is_internal_magazine && (
                                <div className="form-row">
                                    <label>Вместимость (до 20)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        value={formData.magazine_capacity}
                                        onChange={(e) => setFormData({ ...formData, magazine_capacity: Number(e.target.value) })}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {formData.type === 'magic_ranged' && (
                        <>
                            <div className="form-row-split">
                                <div className="form-row">
                                    <label>Кубик урона (D)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.damage_dice}
                                        onChange={(e) => setFormData({ ...formData, damage_dice: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Гарант урона</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.guaranteed_damage}
                                        onChange={(e) => setFormData({ ...formData, guaranteed_damage: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <label>Макс. прочность</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.max_durability}
                                    onChange={(e) => setFormData({ ...formData, max_durability: Number(e.target.value) })}
                                />
                            </div>
                            
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.is_two_handed}
                                    onChange={(e) => setFormData({ ...formData, is_two_handed: e.target.checked })}
                                />
                                <span>Двуручное оружие</span>
                            </label>

                            <div className="form-row">
                                <label>Навык владения</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Поиск навыка..."
                                        value={skillSearch}
                                        onChange={(e) => setSkillSearch(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <select
                                        value={formData.skill_id}
                                        onChange={(e) => setFormData({ ...formData, skill_id: e.target.value })}
                                        style={{ flex: 2 }}
                                    >
                                        <option value="">-- Без навыка --</option>
                                        {getAvailableSkills(formData.type).map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <label>Слотов под руны (0-3)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="3"
                                    value={formData.rune_slots_max}
                                    onChange={(e) => handleRuneSlotsChange(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {formData.type === 'consumable' && (
                        <>
                            <div className="form-row">
                                <label>Эффект</label>
                                <select
                                    value={formData.consumable_type}
                                    onChange={(e) => setFormData({ ...formData, consumable_type: e.target.value })}
                                >
                                    {CONSUMABLE_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {formData.consumable_type === 'ammo' && (
                                <>
                                    <div className="form-row">
                                        <label>Калибр</label>
                                        <select
                                            value={formData.caliber_id}
                                            onChange={(e) => setFormData({ ...formData, caliber_id: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Выберите --</option>
                                            {calibers.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-row-split">
                                        <div className="form-row">
                                            <label>Кубик урона (D)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.damage_dice}
                                                onChange={(e) => setFormData({ ...formData, damage_dice: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="form-row">
                                            <label>Гарант урона</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.guaranteed_damage}
                                                onChange={(e) => setFormData({ ...formData, guaranteed_damage: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {formData.consumable_type === 'stripper_clip' && (
                                <>
                                    <div className="form-row">
                                        <label>Калибр</label>
                                        <select
                                            value={formData.caliber_id}
                                            onChange={(e) => setFormData({ ...formData, caliber_id: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Выберите --</option>
                                            {calibers.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-row">
                                        <label>Количество патронов в обойме</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.effect_value}
                                            onChange={(e) => setFormData({ ...formData, effect_value: Number(e.target.value) })}
                                        />
                                    </div>
                                </>
                            )}

                            {formData.consumable_type === 'mana_charge' && (
                                <div className="form-row">
                                    <label>Выстрелов в 1 шт.</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.effect_value}
                                        onChange={(e) => setFormData({ ...formData, effect_value: Number(e.target.value) })}
                                    />
                                </div>
                            )}

                            {['food', 'medicine', 'mana', 'repair'].includes(formData.consumable_type) && (
                                <div className="form-row">
                                    <label>Значение эффекта</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.effect_value}
                                        onChange={(e) => setFormData({ ...formData, effect_value: Number(e.target.value) })}
                                    />
                                </div>
                            )}

                            {/* БЛОК ДЛЯ КОМБИНИРОВАННЫХ РАСХОДНИКОВ */}
                            {formData.consumable_type === 'combined' && (
                                <div style={{ padding: '10px', background: '#1e1f22', borderRadius: '6px', border: '1px solid #3f4147' }}>
                                    <label style={{ marginBottom: '8px', display: 'block', color: '#b5bac1', fontSize: '13px' }}>
                                        Восстанавливаемые атрибуты (2 шт.)
                                    </label>
                                    {combinedEffects.map((eff, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <select
                                                value={eff.stat}
                                                onChange={(e) => {
                                                    const newEff = [...combinedEffects];
                                                    newEff[idx].stat = e.target.value;
                                                    setCombinedEffects(newEff);
                                                }}
                                                style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #3f4147', background: '#2b2d31', color: '#fff' }}
                                            >
                                                <option value="stamina">⚡ Выносливость</option>
                                                <option value="manna">🔮 Манна</option>
                                                <option value="blood">🩸 Кровь</option>
                                                <option value="armor">🛡️ Броня</option>
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                value={eff.value}
                                                onChange={(e) => {
                                                    const newEff = [...combinedEffects];
                                                    newEff[idx].value = Number(e.target.value);
                                                    setCombinedEffects(newEff);
                                                }}
                                                placeholder="Значение"
                                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #3f4147', background: '#2b2d31', color: '#fff' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {['throwable', 'one_time_use'].includes(formData.consumable_type) && (
                                <div className="form-row-split">
                                    <div className="form-row">
                                        <label>Кубик урона (D)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.damage_dice}
                                            onChange={(e) => setFormData({ ...formData, damage_dice: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="form-row">
                                        <label>Гарант урона</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.guaranteed_damage}
                                            onChange={(e) => setFormData({ ...formData, guaranteed_damage: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="form-row">
                                <label>Текстовое описание эффекта (необязательно)</label>
                                <textarea
                                    rows="2"
                                    value={formData.effect_text}
                                    onChange={(e) => setFormData({ ...formData, effect_text: e.target.value })}
                                    placeholder="Например: При броске наносит 2d10 урона по площади..."
                                />
                            </div>
                        </>
                    )}

                    {canHaveRunes && formData.rune_slots_max > 0 && (
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: '#1e1f22',
                            borderRadius: '8px',
                            border: '1px solid #3f4147',
                        }}>
                            <h4 style={{ marginBottom: '10px', color: '#fff' }}>
                                🔮 Встроенные руны ({selectedRunes.length} / {formData.rune_slots_max})
                            </h4>

                            {selectedRunes.map((runeId, idx) => {
                                const r = allRunes.find((x) => x.id === runeId);
                                return (
                                    <div key={idx} className="rune-slot-row">
                                        <span>{r?.name || 'Руна'}</span>
                                        <button
                                            type="button"
                                            className="btn-danger small"
                                            onClick={() => setSelectedRunes(selectedRunes.filter((id) => id !== runeId))}
                                        >
                                            ✖
                                        </button>
                                    </div>
                                );
                            })}

                            {selectedRunes.length < formData.rune_slots_max && (
                                <div className="rune-add-row">
                                    <select value={runeToAdd} onChange={(e) => setRuneToAdd(e.target.value)}>
                                        <option value="">-- Выберите руну --</option>
                                        {allRunes
                                            .filter((r) => !selectedRunes.includes(r.id))
                                            .map((r) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn-success"
                                        onClick={() => {
                                            if (runeToAdd) {
                                                setSelectedRunes([...selectedRunes, Number(runeToAdd)]);
                                                setRuneToAdd('');
                                            }
                                        }}
                                        disabled={!runeToAdd}
                                    >
                                        Добавить
                                    </button>
                                </div>
                            )}
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