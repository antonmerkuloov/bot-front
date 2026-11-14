import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './Layout.css';

export default function Layout() {
    const navigate = useNavigate();
    
    const handleLogout = () => { 
        localStorage.removeItem('admin_token'); 
        navigate('/login'); 
    };

    return (
        <div className="layout">
            <aside className="sidebar">
                <h2 className="sidebar-title">Админ-панель</h2>
                <nav className="sidebar-nav">
                    <NavLink to="/characters" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        👤 Персонажи
                    </NavLink>
                    <NavLink to="/catalogs/items" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        ⚔️ Предметы
                    </NavLink>
                    <NavLink to="/catalogs/skills" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        📝 Навыки
                    </NavLink>
                    <NavLink to="/catalogs/spells" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        📜 Заклинания
                    </NavLink>
                    <NavLink to="/catalogs/circles" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        🔮 Круги магии
                    </NavLink>
                    <NavLink to="/catalogs/calibers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        🔫 Калибры
                    </NavLink>
                    <NavLink to="/catalogs/runes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        📖 Руны
                    </NavLink>
                    <NavLink to="/economy" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        💰 Экономика
                    </NavLink>
                </nav>
                <button className="btn-danger logout-btn" onClick={handleLogout}>Выйти</button>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}