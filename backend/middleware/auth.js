require('dotenv').config();

function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Отсутствует токен авторизации' });
    }

    const token = authHeader.split(' ')[1];

    if (token !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Неверный пароль' });
    }

    next();
}

module.exports = authenticateAdmin;