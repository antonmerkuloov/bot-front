const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// 1. Получить все калибры
router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('calibers').select('*').order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 2. Создать новый калибр
router.post('/', async (req, res) => {
    const { name, type } = req.body;
    if (!name) return res.status(400).json({ error: 'Поле "name" обязательно' });
    
    const { data, error } = await supabase
        .from('calibers')
        .insert([{ name, type: type || 'bullet' }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 3. Обновить калибр
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { name, type } = req.body;

    if (!name) return res.status(400).json({ error: 'Поле "name" обязательно' });

    const { data, error } = await supabase
        .from('calibers')
        .update({ name, type })
        .eq('id', id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 4. Удалить калибр
router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    // Проверяем, не используется ли калибр в предметах
    const { data: items } = await supabase
        .from('items')
        .select('id, name')
        .eq('caliber_id', id)
        .limit(1);

    if (items && items.length > 0) {
        return res.status(400).json({ 
            error: `Калибр используется в предмете "${items[0].name}". Сначала уберите связь.` 
        });
    }

    const { error } = await supabase.from('calibers').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;