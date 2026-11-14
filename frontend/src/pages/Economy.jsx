import { useEffect, useState, useMemo } from 'react';
import api from '../api';
import './Economy.css';

export default function Economy() {
    const [activeTab, setActiveTab] = useState('rates');
    
    // Состояние для курсов
    const [rates, setRates] = useState({ gold_to_silver: 20, silver_to_copper: 10 });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Состояние для калькулятора
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]); // Массив { item, quantity }

    useEffect(() => {
        const loadData = async () => {
            try {
                const [ratesRes, itemsRes] = await Promise.all([
                    api.get('/economy/rates'),
                    api.get('/items')
                ]);
                setRates(ratesRes.data);
                setItems(itemsRes.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Ошибка загрузки');
            }
        };
        loadData();
    }, []);

    // ================= КУРСЫ =================
    const handleSaveRates = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');
        try {
            await api.put('/economy/rates', rates);
            setMessage('✅ Курсы сохранены');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    // ================= КАЛЬКУЛЯТОР =================
    const filteredItems = useMemo(() => {
        return items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [items, searchTerm]);

    const addToCart = (item) => {
        const existing = cart.find(c => c.item.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { item, quantity: 1 }]);
        }
    };

    const removeFromCart = (itemId) => {
        setCart(cart.filter(c => c.item.id !== itemId));
    };

    const updateQuantity = (itemId, qty) => {
        const q = Math.max(1, Number(qty));
        setCart(cart.map(c => c.item.id === itemId ? { ...c, quantity: q } : c));
    };

    const totalPrice = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);

    // Форматирование цены (например, 150 -> 1 золотой, 5 серебра, 10 меди)
    const formatCurrency = (amount) => {
        if (amount === 0) return '0 🥉';
        const gold = Math.floor(amount / (rates.gold_to_silver * rates.silver_to_copper));
        const remainder = amount % (rates.gold_to_silver * rates.silver_to_copper);
        const silver = Math.floor(remainder / rates.silver_to_copper);
        const copper = remainder % rates.silver_to_copper;
        
        let parts = [];
        if (gold > 0) parts.push(`${gold} 🥇`);
        if (silver > 0) parts.push(`${silver} 🥈`);
        if (copper > 0) parts.push(`${copper} 🥉`);
        return parts.join(' ');
    };

    return (
        <div className="economy-page">
            <div className="page-header-area">
                <div className="header-top">
                    <h1>💰 Экономика</h1>
                </div>
                <div className="tabs-bar">
                    <button className={activeTab === 'rates' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('rates')}>
                        ⚖️ Курсы валют
                    </button>
                    <button className={activeTab === 'calc' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('calc')}>
                        🧮 Калькулятор и Прайс-лист
                    </button>
                </div>
            </div>

            <div className="table-scroll-area">
                {activeTab === 'rates' && (
                    <div className="economy-card">
                        <h2>Курсы валют</h2>
                        <p className="economy-hint">Определите, сколько единиц младшей валюты содержится в одной единице старшей.</p>

                        <form onSubmit={handleSaveRates} className="economy-form">
                            <div className="form-row">
                                <label>🥇 1 Золото = ? 🥈 Серебра</label>
                                <input type="number" min="1" value={rates.gold_to_silver} onChange={(e) => setRates({ ...rates, gold_to_silver: Number(e.target.value) })} required />
                            </div>
                            <div className="form-row">
                                <label>🥈 1 Серебро = ? 🥉 Меди</label>
                                <input type="number" min="1" value={rates.silver_to_copper} onChange={(e) => setRates({ ...rates, silver_to_copper: Number(e.target.value) })} required />
                            </div>
                            <div className="form-row">
                                <label>🥇 1 Золото = ? 🥉 Меди (вычислено)</label>
                                <input type="text" value={rates.gold_to_silver * rates.silver_to_copper} disabled style={{ background: '#1e1f22', color: '#888' }} />
                            </div>
                            {message && <p className="success-msg">{message}</p>}
                            {error && <p className="error-msg">{error}</p>}
                            <div className="form-actions">
                                <button type="submit" className="btn-success" disabled={saving}>{saving ? 'Сохранение...' : '💾 Сохранить курсы'}</button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'calc' && (
                    <div className="calc-layout">
                        {/* Прайс-лист (Слева) */}
                        <div className="calc-items">
                            <h2>Прайс-лист предметов</h2>
                            <input 
                                placeholder="🔍 Поиск предмета..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ marginBottom: '16px' }}
                            />
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Предмет</th>
                                        <th>Стоимость</th>
                                        <th>Действие</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.name}</td>
                                            <td>{formatCurrency(item.price)}</td>
                                            <td>
                                                <button className="btn-primary small" onClick={() => addToCart(item)}>➕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Корзина (Справа) */}
                        <div className="calc-cart">
                            <h2>Корзина</h2>
                            {cart.length === 0 ? (
                                <p style={{ color: '#888' }}>Добавьте предметы для расчёта.</p>
                            ) : (
                                <div className="cart-list">
                                    {cart.map(c => (
                                        <div key={c.item.id} className="cart-item">
                                            <div style={{ flex: 1 }}>{c.item.name}</div>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={c.quantity} 
                                                onChange={(e) => updateQuantity(c.item.id, e.target.value)}
                                                style={{ width: '60px', padding: '4px', marginRight: '10px' }}
                                            />
                                            <div style={{ width: '100px', textAlign: 'right', marginRight: '10px' }}>
                                                {formatCurrency(c.item.price * c.quantity)}
                                            </div>
                                            <button className="btn-danger small" onClick={() => removeFromCart(c.item.id)}>✖</button>
                                        </div>
                                    ))}
                                    <div className="cart-total">
                                        <strong>Итого: {formatCurrency(totalPrice)}</strong>
                                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                                            (Всего в меди: {totalPrice} 🥉)
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}