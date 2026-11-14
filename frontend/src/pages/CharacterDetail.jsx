import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import './CharacterDetail.css';

export default function CharacterDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [char, setChar] = useState(null);
    const [skills, setSkills] = useState([]);
    const [items, setItems] = useState([]);
    const [spells, setSpells] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [allSpells, setAllSpells] = useState([]);
    const [circles, setCircles] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('attributes');

    // Модалки
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [isSpellModalOpen, setIsSpellModalOpen] = useState(false);
    
    // Форма выдачи предмета
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemSlot, setItemSlot] = useState('storage');
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemSearch, setItemSearch] = useState('');
    const [itemFilterType, setItemFilterType] = useState('all');

    // Форма выдачи навыка
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [skillExp, setSkillExp] = useState(0);
    const [modalSearch, setModalSearch] = useState('');
    const [modalCategory, setModalCategory] = useState('all');

    // Форма выдачи заклинания
    const [selectedSpell, setSelectedSpell] = useState(null);
    const [spellSearch, setSpellSearch] = useState('');
    const [spellFilterCircle, setSpellFilterCircle] = useState('all');
    const [spellPage, setSpellPage] = useState(1);
    const [spellPerPage, setSpellPerPage] = useState(10);

    // Фильтры для таблицы навыков персонажа
    const [charSkillSearch, setCharSkillSearch] = useState('');
    const [charSkillCategory, setCharSkillCategory] = useState('all');
    const [charSkillPage, setCharSkillPage] = useState(1);
    const [charSkillPerPage, setCharSkillPerPage] = useState(10);

    // Фильтры для инвентаря
    const [invSearch, setInvSearch] = useState('');
    const [invFilterType, setInvFilterType] = useState('all');
    const [invPage, setInvPage] = useState(1);
    const [invPerPage, setInvPerPage] = useState(10);

    const loadData = async () => {
        setLoading(true);
        try {
            const [charRes, skillsRes, itemsRes, spellsRes, allSkillsRes, allItemsRes, allSpellsRes, circlesRes] = await Promise.all([
                api.get(`/characters/${id}`),
                api.get(`/characters/${id}/skills`),
                api.get(`/characters/${id}/items`),
                api.get(`/characters/${id}/spells`),
                api.get('/skills'),
                api.get('/items'),
                api.get('/spells'),
                api.get('/circles')
            ]);
            setChar(charRes.data);
            setSkills(skillsRes.data);
            setItems(itemsRes.data);
            setSpells(spellsRes.data);
            setAllSkills(allSkillsRes.data);
            setAllItems(allItemsRes.data);
            setAllSpells(allSpellsRes.data);
            setCircles(circlesRes.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    const getCircleName = (circleId) => circles.find(c => c.id === circleId)?.name || '—';

    // --- ДИНАМИЧЕСКАЯ ВМЕСТИМОСТЬ ---
    const getMaxAmmo = (charItem) => {
        const it = charItem.items;
        if (!it) return 0;
        
        if (it.type === 'magazine') return it.magazine_capacity || 0;
        
        if (it.type === 'magic_ranged') {
            // Если в оружии уже есть кристалл (или остатки от него) - показываем его вместимость
            if (charItem.current_mag_capacity > 0) return charItem.current_mag_capacity;
            
            // Если оружие пустое, ищем самый большой кристалл в каталоге
            const crystals = allItems.filter(i => i.consumable_type === 'mana_charge');
            if (crystals.length > 0) {
                const maxCap = Math.max(...crystals.map(c => c.effect_value || 0));
                return maxCap > 0 ? maxCap : '?';
            }
            return '?';
        }
        
        if (it.type === 'ranged') {
            if (it.is_internal_magazine) return it.magazine_capacity || 0;
            
            // Если бот уже вставил магазин, показываем ЕГО вместимость
            if (charItem.current_mag_capacity > 0) return charItem.current_mag_capacity;
            
            // Если в оружии пусто, ищем в каталоге самый большой магазин под этот калибр
            const mags = allItems.filter(i => i.type === 'magazine' && String(i.caliber_id) === String(it.caliber_id));
            if (mags.length > 0) {
                const maxCap = Math.max(...mags.map(m => m.magazine_capacity || 0));
                return maxCap > 0 ? maxCap : '?';
            }
            return '?';
        }
        return 0;
    };

    // --- ВИЗУАЛЬНОЕ ОБЪЕДИНЕНИЕ СТАКОВ ---
    const mergedItems = useMemo(() => {
        const map = new Map();
        items.forEach(it => {
            const key = `${it.item_id}-${it.slot}-${it.quick_slot}-${it.current_ammo}-${it.durability_current}`;
            if (map.has(key)) {
                map.get(key).quantity += it.quantity;
                map.get(key).allIds.push(it.id);
            } else {
                map.set(key, { ...it, allIds: [it.id] });
            }
        });
        return Array.from(map.values());
    }, [items]);

    // --- ФИЛЬТРАЦИЯ ДЛЯ ТАБЛИЦ ---
    const filteredCharSkills = useMemo(() => {
        return skills.filter(s => {
            const name = s.skills?.name || '';
            const cat = s.skills?.category || '';
            return name.toLowerCase().includes(charSkillSearch.toLowerCase()) && (charSkillCategory === 'all' || cat === charSkillCategory);
        });
    }, [skills, charSkillSearch, charSkillCategory]);

    const filteredCharSpells = useMemo(() => {
        return spells.filter(s => {
            const name = s.spells?.name || '';
            const circleName = getCircleName(s.spells?.circle_id);
            return name.toLowerCase().includes(spellSearch.toLowerCase()) && (spellFilterCircle === 'all' || circleName === spellFilterCircle);
        });
    }, [spells, spellSearch, spellFilterCircle, circles]);

    const filteredInventory = useMemo(() => {
        return mergedItems.filter(it => {
            const itemName = it.items?.name || '';
            const itemType = it.items?.type || '';
            const matchesSearch = itemName.toLowerCase().includes(invSearch.toLowerCase());
            const matchesType = invFilterType === 'all' || itemType === invFilterType;
            return matchesSearch && matchesType;
        });
    }, [mergedItems, invSearch, invFilterType]);

    // --- ФИЛЬТРАЦИЯ ДЛЯ МОДАЛОК ---
    const filteredItemsToGive = useMemo(() => {
        return allItems.filter(it => {
            const matchesSearch = it.name.toLowerCase().includes(itemSearch.toLowerCase());
            const matchesType = itemFilterType === 'all' || it.type === itemFilterType;
            return matchesSearch && matchesType;
        });
    }, [allItems, itemSearch, itemFilterType]);

    const filteredSkillsForModal = useMemo(() => {
        const available = allSkills.filter(s => !skills.some(cs => cs.skill_id === s.id));
        return available.filter(s => s.name.toLowerCase().includes(modalSearch.toLowerCase()) && (modalCategory === 'all' || s.category === modalCategory));
    }, [allSkills, skills, modalSearch, modalCategory]);

    const filteredSpellsForModal = useMemo(() => {
        const available = allSpells.filter(s => !spells.some(cs => cs.spell_id === s.id));
        return available.filter(s => s.name.toLowerCase().includes(modalSearch.toLowerCase()) && (modalCategory === 'all' || getCircleName(s.circle_id) === modalCategory));
    }, [allSpells, spells, modalSearch, modalCategory, circles]);

    // --- ПАГИНАЦИЯ ---
    const charSkillTotalPages = Math.ceil(filteredCharSkills.length / charSkillPerPage);
    const currentCharSkills = filteredCharSkills.slice((charSkillPage - 1) * charSkillPerPage, charSkillPage * charSkillPerPage);

    const spellTotalPages = Math.ceil(filteredCharSpells.length / spellPerPage);
    const currentCharSpells = filteredCharSpells.slice((spellPage - 1) * spellPerPage, spellPage * spellPerPage);

    const invTotalPages = Math.ceil(filteredInventory.length / invPerPage);
    const currentInventory = filteredInventory.slice((invPage - 1) * invPerPage, invPage * invPerPage);

    useEffect(() => { setCharSkillPage(1); }, [charSkillSearch, charSkillCategory, charSkillPerPage]);
    useEffect(() => { setSpellPage(1); }, [spellSearch, spellFilterCircle, spellPerPage]);
    useEffect(() => { setInvPage(1); }, [invSearch, invFilterType, invPerPage]);

    // --- ОБРАБОТЧИКИ АТРИБУТОВ ---
    const handleAttrChange = (field, value) => {
        setChar(prev => {
            const num = Math.max(0, Number(value) || 0);
            let updated = { ...prev, [field]: num };
            if (field.startsWith('max_')) {
                const baseField = field.replace('max_', '');
                if (updated[baseField] > num) updated[baseField] = num;
            } else {
                const maxField = `max_${field}`;
                if (updated[maxField] !== undefined && num > updated[maxField]) updated[field] = updated[maxField];
            }
            return updated;
        });
    };
    
    const saveAttributes = async () => {
        try {
            await api.put(`/characters/${id}`, { 
                stamina: char.stamina, max_stamina: char.max_stamina, 
                manna: char.manna, max_manna: char.max_manna, 
                blood: char.blood, max_blood: char.max_blood, 
                armor: char.armor, max_armor: char.max_armor, 
                money: char.money, jc: char.jc 
            });
            alert('Атрибуты сохранены!');
        } catch (err) { alert('Ошибка сохранения атрибутов'); }
    };

    // --- ОБРАБОТЧИКИ ИНВЕНТАРЯ ---
    const handleUpdateItem = async (charItemId, field, value) => {
        const item = items.find(i => i.id === charItemId);
        let num = Number(value);
        if (isNaN(num)) return;

        if (field === 'quantity') {
            num = Math.max(1, num);
        } else if (field === 'durability_current') {
            const max = item.items?.max_durability || 0;
            num = Math.max(0, Math.min(num, max));
        } else if (field === 'current_ammo') {
            let max = getMaxAmmo(item);
            if (max === '?') max = 99;
            num = Math.max(0, Math.min(num, max));
        }

        const payload = { 
            current_ammo: item.current_ammo, 
            durability_current: item.durability_current, 
            quantity: item.quantity 
        };
        payload[field] = num;

        try {
            await api.put(`/characters/${id}/items/${charItemId}`, payload);
            setItems(prev => prev.map(i => i.id === charItemId ? { ...i, [field]: num } : i));
        } catch (err) { alert('Ошибка обновления предмета'); }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!selectedItem) return;
        await api.post(`/characters/${id}/items`, { 
            item_id: selectedItem.id, slot: itemSlot, quantity: itemQuantity, 
            durability_current: selectedItem.max_durability || 0, current_ammo: 0 
        });
        setIsItemModalOpen(false); setSelectedItem(null); setItemQuantity(1); loadData();
    };

    const handleRemoveItem = async (charItemId, name) => {
        if (!window.confirm(`Забрать "${name}"?`)) return;
        await api.delete(`/characters/${id}/items/${charItemId}`);
        loadData();
    };

    // --- ОБРАБОТЧИКИ НАВЫКОВ ---
    const handleAddSkill = async () => {
        if (!selectedSkill) return;
        await api.post(`/characters/${id}/skills`, { skill_id: selectedSkill.id, experience: skillExp, is_absolute_allowed: null });
        setIsSkillModalOpen(false); setSelectedSkill(null); loadData();
    };

    const handleUpdateSkill = async (skillId, field, value) => {
        const skill = skills.find(s => s.skill_id === skillId);
        const payload = { experience: skill.experience, is_absolute_allowed: skill.is_absolute_allowed, [field]: value };
        await api.put(`/characters/${id}/skills/${skillId}`, payload);
        setSkills(prev => prev.map(s => s.skill_id === skillId ? { ...s, [field]: value } : s));
    };

    const handleDeleteSkill = async (skillId, name) => {
        if (!window.confirm(`Забрать навык "${name}"?`)) return;
        await api.delete(`/characters/${id}/skills/${skillId}`);
        loadData();
    };

    // --- ОБРАБОТЧИКИ ЗАКЛИНАНИЙ ---
    const handleAddSpell = async () => {
        if (!selectedSpell) return;
        try {
            await api.post(`/characters/${id}/spells`, { spell_id: selectedSpell.id });
            setIsSpellModalOpen(false); setSelectedSpell(null); loadData();
        } catch (err) { alert(err.response?.data?.error || 'Ошибка выдачи заклинания'); }
    };

    const handleChangeSpellStatus = async (spellId, status) => {
        try {
            await api.put(`/characters/${id}/spells/${spellId}/status`, { status });
            loadData();
        } catch (err) { alert(err.response?.data?.error || 'Ошибка смены статуса'); }
    };

    const handleDeleteSpell = async (spellId, name) => {
        if (!window.confirm(`Забрать заклинание "${name}"?`)) return;
        await api.delete(`/characters/${id}/spells/${spellId}`);
        loadData();
    };

    if (loading) return <p style={{ padding: '32px' }}>Загрузка...</p>;
    if (error) return <p style={{ padding: '32px', color: '#f04747' }}>{error}</p>;

    return (
        <div className="page-container">
            <div className="page-header-area">
                <div className="header-top">
                    <div>
                        <button className="btn-secondary small" onClick={() => navigate('/characters')} style={{ marginBottom: '10px' }}>🔙 Назад</button>
                        <h1>👤 {char.character_name} <span style={{fontSize: '14px', color: '#888'}}>({char.character_id})</span></h1>
                    </div>
                </div>
                <div className="tabs-bar">
                    <button className={activeTab === 'attributes' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('attributes')}>⚡ Атрибуты</button>
                    <button className={activeTab === 'inventory' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('inventory')}>🎒 Инвентарь</button>
                    <button className={activeTab === 'skills' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('skills')}>📝 Навыки</button>
                    <button className={activeTab === 'spells' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('spells')}>📜 Заклинания</button>
                </div>
            </div>

            <div className="table-scroll-area" style={{ padding: 0 }}>
                {/* 1. АТРИБУТЫ */}
                {activeTab === 'attributes' && (
                    <div className="attributes-grid" style={{ padding: '32px' }}>
                        {['stamina', 'manna', 'blood', 'armor'].map(stat => (
                            <div className="attr-card" key={stat}>
                                <h3>{stat === 'stamina' ? '⚡ Выносливость' : stat === 'manna' ? '🔮 Мана' : stat === 'blood' ? '🩸 Кровь' : '🛡️ Броня'}</h3>
                                <div className="attr-row">
                                    <input type="number" value={char[stat]} onChange={(e) => handleAttrChange(stat, e.target.value)} />
                                    <span>/</span>
                                    <input type="number" className="max-input" value={char[`max_${stat}`]} onChange={(e) => handleAttrChange(`max_${stat}`, e.target.value)} />
                                </div>
                            </div>
                        ))}
                        <div className="attr-card"><h3>💰 Деньги</h3><div className="attr-row"><input type="number" value={char.money} onChange={(e) => handleAttrChange('money', e.target.value)} /></div></div>
                        <div className="attr-card"><h3>👑 Иудакоины</h3><div className="attr-row"><input type="number" value={char.jc} onChange={(e) => handleAttrChange('jc', e.target.value)} /></div></div>
                        <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}><button className="btn-success" onClick={saveAttributes}>💾 Сохранить</button></div>
                    </div>
                )}

                {/* 2. ИНВЕНТАРЬ */}
                {activeTab === 'inventory' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 32px' }}>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexShrink: 0 }}>
                            <input placeholder="🔍 Поиск..." value={invSearch} onChange={(e) => setInvSearch(e.target.value)} style={{ flex: 1 }} />
                            <select value={invFilterType} onChange={(e) => setInvFilterType(e.target.value)}>
                                <option value="all">Все типы</option>
                                <option value="weapon">Оружие</option>
                                <option value="ranged">Стрелковое</option>
                                <option value="magic_ranged">Маг. стрелковое</option>
                                <option value="staff">Посохи</option>
                                <option value="shield">Щиты</option>
                                <option value="magazine">Магазины</option>
                                <option value="consumable">Расходники</option>
                            </select>
                            <select value={invPerPage} onChange={(e) => setInvPerPage(Number(e.target.value))}>
                                <option value={5}>5</option><option value={10}>10</option><option value={15}>15</option>
                            </select>
                            <button className="btn-primary" onClick={() => { setIsItemModalOpen(true); setItemSearch(''); setItemFilterType('all'); setItemQuantity(1); }}>➕ Выдать</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            <table className="data-table">
                                <thead><tr><th>Название</th><th>Слот</th><th>Кол-во</th><th>Прочность</th><th>Патроны</th><th>Действия</th></tr></thead>
                                <tbody>
                                    {currentInventory.length === 0 ? <tr><td colSpan="6" style={{textAlign: 'center', color: '#888'}}>Ничего не найдено</td></tr> : currentInventory.map(item => (
                                        <tr key={item.id}>
                                            <td><strong>{item.items?.name || '???'}</strong></td>
                                            <td><code>{item.slot}</code></td>
                                            <td><input type="number" style={{ width: '60px', padding: '4px' }} value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))} /></td>
                                            <td>{item.items?.max_durability > 0 ? (<div style={{ display: 'flex', alignItems: 'center' }}><input type="number" style={{ width: '60px', padding: '4px', marginRight: '4px' }} value={item.durability_current} onChange={(e) => handleUpdateItem(item.id, 'durability_current', Number(e.target.value))} />/ {item.items.max_durability}</div>) : '—'}</td>
                                            
                                            <td>
                                                {['ranged', 'magazine', 'magic_ranged'].includes(item.items?.type) ? (
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        <input 
                                                            type="number" 
                                                            style={{ width: '60px', padding: '4px', marginRight: '4px' }} 
                                                            value={item.current_ammo} 
                                                            onChange={(e) => handleUpdateItem(item.id, 'current_ammo', Number(e.target.value))} 
                                                        />
                                                        / {getMaxAmmo(item)}
                                                    </div>
                                                ) : 
                                                ['stripper_clip', 'mana_charge'].includes(item.items?.consumable_type) ? (
                                                    <span>{item.items?.effect_value} шт.</span>
                                                ) : '—'}
                                            </td>

                                            <td><button className="btn-danger small" onClick={() => handleRemoveItem(item.id, item.items?.name)}>Забрать</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {invTotalPages > 1 && (
                            <div className="pagination-footer" style={{ borderTop: 'none', paddingTop: '10px' }}>
                                <button disabled={invPage === 1} onClick={() => setInvPage(p => p - 1)}>◀ Назад</button>
                                <span>Страница {invPage} из {invTotalPages}</span>
                                <button disabled={invPage === invTotalPages} onClick={() => setInvPage(p => p + 1)}>Вперед ▶</button>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. НАВЫКИ */}
                {activeTab === 'skills' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 32px' }}>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexShrink: 0 }}>
                            <input placeholder="🔍 Поиск..." value={charSkillSearch} onChange={(e) => setCharSkillSearch(e.target.value)} style={{ flex: 1 }} />
                            <select value={charSkillCategory} onChange={(e) => setCharSkillCategory(e.target.value)}><option value="all">Все категории</option><option value="base">Базовые</option><option value="attack">Атаки</option><option value="magic">Магия</option></select>
                            <select value={charSkillPerPage} onChange={(e) => setCharSkillPerPage(Number(e.target.value))}><option value={5}>5</option><option value={10}>10</option><option value={15}>15</option></select>
                            <button className="btn-primary" onClick={() => setIsSkillModalOpen(true)}>➕ Выдать</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            <table className="data-table">
                                <thead><tr><th>Навык</th><th>Категория</th><th>ОП</th><th>Абсолют</th><th></th></tr></thead>
                                <tbody>
                                    {currentCharSkills.map(s => (
                                        <tr key={s.skill_id}>
                                            <td><strong>{s.skills?.name}</strong></td>
                                            <td>{s.skills?.category}</td>
                                            <td><input type="number" style={{ width: '80px', padding: '6px' }} value={s.experience} onChange={(e) => handleUpdateSkill(s.skill_id, 'experience', Number(e.target.value))} onBlur={() => loadData()} /></td>
                                            <td>{s.skills?.category === 'magic' ? 'Н/Д' : <select value={s.is_absolute_allowed === null ? 'default' : (s.is_absolute_allowed ? 'allow' : 'deny')} onChange={(e) => handleUpdateSkill(s.skill_id, 'is_absolute_allowed', e.target.value === 'default' ? null : e.target.value === 'allow')}><option value="default">По умолч.</option><option value="allow">Разрешён</option><option value="deny">Запрещён</option></select>}</td>
                                            <td><button className="btn-danger small" onClick={() => handleDeleteSkill(s.skill_id, s.skills?.name)}>Забрать</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {charSkillTotalPages > 1 && <div className="pagination-footer" style={{ borderTop: 'none', paddingTop: '10px' }}><button disabled={charSkillPage === 1} onClick={() => setCharSkillPage(p => p - 1)}>◀</button><span>{charSkillPage} / {charSkillTotalPages}</span><button disabled={charSkillPage === charSkillTotalPages} onClick={() => setCharSkillPage(p => p + 1)}>▶</button></div>}
                    </div>
                )}

                {/* 4. ЗАКЛИНАНИЯ */}
                {activeTab === 'spells' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 32px' }}>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexShrink: 0 }}>
                            <input placeholder="🔍 Поиск..." value={spellSearch} onChange={(e) => setSpellSearch(e.target.value)} style={{ flex: 1 }} />
                            <select value={spellFilterCircle} onChange={(e) => setSpellFilterCircle(e.target.value)}><option value="all">Все круги</option>{circles.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                            <select value={spellPerPage} onChange={(e) => setSpellPerPage(Number(e.target.value))}><option value={5}>5</option><option value={10}>10</option><option value={15}>15</option></select>
                            <button className="btn-primary" onClick={() => setIsSpellModalOpen(true)}>➕ Выдать</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            <table className="data-table">
                                <thead><tr><th>Название</th><th>Круг</th><th>Статус</th><th>Действия</th></tr></thead>
                                <tbody>
                                    {currentCharSpells.map(s => {
                                        let status = s.is_equipped ? 'equipped' : (s.is_phantom ? 'phantom' : 'memory');
                                        return (
                                            <tr key={s.spell_id}>
                                                <td><strong>{s.spells?.name}</strong></td>
                                                <td>{getCircleName(s.spells?.circle_id)}</td>
                                                <td>
                                                    <select value={status} onChange={(e) => handleChangeSpellStatus(s.spell_id, e.target.value)} style={{ padding: '6px', background: status === 'equipped' ? '#1a6b3c' : status === 'phantom' ? '#6b1a1a' : '#2b2d31', color: 'white' }}>
                                                        <option value="equipped">⚔️ Экипировано</option>
                                                        <option value="memory">📚 В памяти</option>
                                                        <option value="phantom">👻 Фантом</option>
                                                    </select>
                                                </td>
                                                <td><button className="btn-danger small" onClick={() => handleDeleteSpell(s.spell_id, s.spells?.name)}>Забрать</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {spellTotalPages > 1 && <div className="pagination-footer" style={{ borderTop: 'none', paddingTop: '10px' }}><button disabled={spellPage === 1} onClick={() => setSpellPage(p => p - 1)}>◀</button><span>{spellPage} / {spellTotalPages}</span><button disabled={spellPage === spellTotalPages} onClick={() => setSpellPage(p => p + 1)}>▶</button></div>}
                    </div>
                )}
            </div>

            {/* МОДАЛКА ВЫДАЧИ ПРЕДМЕТА */}
            <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title="Выдать предмет">
                <div className="modal-form">
                    <div className="filters-bar" style={{ padding: '10px', background: '#1e1f22', marginBottom: '10px' }}>
                        <input placeholder="Поиск предмета..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} className="search-input" />
                        <select value={itemFilterType} onChange={(e) => setItemFilterType(e.target.value)}>
                            <option value="all">Все</option>
                            <option value="weapon">Оружие</option>
                            <option value="ranged">Стрелковое</option>
                            <option value="magic_ranged">Маг. стрелк.</option>
                            <option value="staff">Посохи</option>
                            <option value="shield">Щиты</option>
                            <option value="magazine">Магазины</option>
                            <option value="consumable">Расходники</option>
                        </select>
                    </div>
                    
                    <div className="modal-skill-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {filteredItemsToGive.length === 0 ? (
                            <p style={{textAlign: 'center', color: '#888'}}>Ничего не найдено</p>
                        ) : filteredItemsToGive.map(it => (
                            <div key={it.id} className={`modal-skill-item ${selectedItem?.id === it.id ? 'selected' : ''}`} onClick={() => { setSelectedItem(it); setItemSlot('storage'); }}>
                                <div><strong>{it.name}</strong> <span style={{color:'#888', fontSize:'12px'}}>({it.type})</span></div>
                                <span>{selectedItem?.id === it.id ? '✅' : '➕'}</span>
                            </div>
                        ))}
                    </div>

                    <div className="form-row-split" style={{ marginTop: '16px' }}>
                        <div className="form-row">
                            <label>Слот</label>
                            <select value={itemSlot} onChange={(e) => setItemSlot(e.target.value)}>
                                <option value="storage">📦 Хранилище</option>
                                {selectedItem && !['consumable', 'magazine'].includes(selectedItem.type) && (
                                    <>
                                        <option value="belt">🎽 Пояс</option>
                                        {selectedItem.is_two_handed ? (
                                            <option value="both_hands">🗡️ Обе руки</option>
                                        ) : (
                                            <>
                                                <option value="left_hand">⚔️ Левая рука</option>
                                                <option value="right_hand">🛡️ Правая рука</option>
                                            </>
                                        )}
                                    </>
                                )}
                            </select>
                        </div>
                        <div className="form-row">
                            <label>Количество</label>
                            <input type="number" min="1" value={itemQuantity} onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))} />
                        </div>
                    </div>
                    
                    <div className="form-actions">
                        <button type="button" className="btn-success" onClick={handleAddItem} disabled={!selectedItem}>Выдать</button>
                    </div>
                </div>
            </Modal>

            {/* МОДАЛКА ВЫДАЧИ НАВЫКА */}
            <Modal isOpen={isSkillModalOpen} onClose={() => setIsSkillModalOpen(false)} title="Выдать навык">
                <div className="modal-form">
                    <div className="filters-bar" style={{ padding: '10px', background: '#1e1f22' }}>
                        <input placeholder="Поиск..." value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} className="search-input" />
                        <select value={modalCategory} onChange={(e) => setModalCategory(e.target.value)}><option value="all">Все</option><option value="base">Базовые</option><option value="attack">Атаки</option><option value="magic">Магия</option></select>
                    </div>
                    <div className="modal-skill-list">
                        {filteredSkillsForModal.length === 0 ? <p style={{textAlign:'center', color:'#888'}}>Нет доступных навыков</p> : filteredSkillsForModal.map(s => (
                            <div key={s.id} className={`modal-skill-item ${selectedSkill?.id === s.id ? 'selected' : ''}`} onClick={() => setSelectedSkill(s)}>
                                <div><strong>{s.name}</strong> <span style={{color:'#888', fontSize:'12px'}}>({s.category})</span></div>
                                <span>{selectedSkill?.id === s.id ? '✅' : '➕'}</span>
                            </div>
                        ))}
                    </div>
                    <div className="form-row"><label>Начальный ОП:</label><input type="number" value={skillExp} onChange={(e) => setSkillExp(Number(e.target.value))} /></div>
                    <div className="form-actions"><button className="btn-success" onClick={handleAddSkill} disabled={!selectedSkill}>Выдать</button></div>
                </div>
            </Modal>

            {/* МОДАЛКА ВЫДАЧИ ЗАКЛИНАНИЯ */}
            <Modal isOpen={isSpellModalOpen} onClose={() => setIsSpellModalOpen(false)} title="Выдать заклинание">
                <div className="modal-form">
                    <div className="filters-bar" style={{ padding: '10px', background: '#1e1f22' }}>
                        <input placeholder="Поиск..." value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} className="search-input" />
                        <select value={modalCategory} onChange={(e) => setModalCategory(e.target.value)}><option value="all">Все круги</option>{circles.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                    </div>
                    <div className="modal-skill-list">
                        {filteredSpellsForModal.length === 0 ? <p style={{textAlign:'center', color:'#888'}}>Нет доступных заклинаний</p> : filteredSpellsForModal.map(s => (
                            <div key={s.id} className={`modal-skill-item ${selectedSpell?.id === s.id ? 'selected' : ''}`} onClick={() => setSelectedSpell(s)}>
                                <div><strong>{s.name}</strong> <span style={{color:'#888', fontSize:'12px'}}>({getCircleName(s.circle_id)})</span></div>
                                <span>{selectedSpell?.id === s.id ? '✅' : '➕'}</span>
                            </div>
                        ))}
                    </div>
                    <div className="form-actions"><button className="btn-success" onClick={handleAddSpell} disabled={!selectedSpell}>Выдать</button></div>
                </div>
            </Modal>
        </div>
    );
}