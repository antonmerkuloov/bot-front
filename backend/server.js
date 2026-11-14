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
// Позже сюда добавим:
// app.use('/api/skills', authenticateAdmin, require('./routes/skills'));
// app.use('/api/items', authenticateAdmin, require('./routes/items'));
// app.use('/api/calibers', authenticateAdmin, require('./routes/calibers'));
// app.use('/api/characters', authenticateAdmin, require('./routes/characters'));
// app.use('/api/economy', authenticateAdmin, require('./routes/economy'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Бэкенд запущен на порту ${PORT}`);
});