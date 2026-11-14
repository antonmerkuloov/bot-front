const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authenticateAdmin = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Открытый маршрут: проверка пароля
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        return res.json({ token: password });
    }
    res.status(401).json({ error: 'Неверный пароль' });
});

// Защищённые маршруты
app.use('/api/circles', authenticateAdmin, require('./routes/circles'));
app.use('/api/calibers', authenticateAdmin, require('./routes/calibers'));
app.use('/api/skills', authenticateAdmin, require('./routes/skills'));
app.use('/api/spells', authenticateAdmin, require('./routes/spells'));
app.use('/api/items', authenticateAdmin, require('./routes/items'));
app.use('/api/characters', authenticateAdmin, require('./routes/characters'));
app.use('/api/economy', authenticateAdmin, require('./routes/economy'));
app.use('/api/runes', authenticateAdmin, require('./routes/runes'));

// ЭКСПОРТИРУЕМ app, чтобы Netlify Functions (serverless-http) могли его подхватить
module.exports = app;

// Запускаем сервер на порту, ТОЛЬКО если мы работаем локально (а не на Netlify)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Локальный бэкенд запущен на порту ${PORT}`);
    });
}