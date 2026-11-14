import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import Circles from './pages/Circles';
import Calibers from './pages/Calibers';
import Skills from './pages/Skills';
import Spells from './pages/Spells';
import Items from './pages/Items';
import Runes from './pages/Runes';
import Characters from './pages/Characters';         // <-- РАСКОММЕНТИРОВАНО
import CharacterDetail from './pages/CharacterDetail'; // <-- РАСКОММЕНТИРОВАНО
import Economy from './pages/Economy';               // <-- РАСКОММЕНТИРОВАНО

function PrivateRoute({ children }) {
    const token = localStorage.getItem('admin_token');
    return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Dashboard />} />
                
                <Route path="catalogs/circles" element={<Circles />} />
                <Route path="catalogs/calibers" element={<Calibers />} />
                <Route path="catalogs/skills" element={<Skills />} />
                <Route path="catalogs/spells" element={<Spells />} />
                <Route path="catalogs/items" element={<Items />} />
                <Route path="catalogs/runes" element={<Runes />} />
                
                <Route path="characters" element={<Characters />} />           {/* <-- ВЕРНУЛИ */}
                <Route path="characters/:id" element={<CharacterDetail />} /> {/* <-- ВЕРНУЛИ */}
                <Route path="economy" element={<Economy />} />                 {/* <-- ВЕРНУЛИ */}
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}