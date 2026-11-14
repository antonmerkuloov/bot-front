const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// 1. Получить все навыки
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('skills')
        .select('*, magic_circles(name)')
        .order('category')
        .order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 2. Создать новый навык
router.post('/', async (req, res) => {
    const { name, category, is_absolute_allowed, magic_circle_id } = req.body;
    if (!name || !category) {
        return res.status(400).json({ error: 'Поля "name" и "category" обязательны' });
    }

    const { data, error } = await supabase
        .from('skills')
        .insert([{
            name,
            category,
            is_absolute_allowed: is_absolute_allowed !== false, // по умолчанию true
            magic_circle_id: category === 'magic' ? magic_circle_id : null
        }])
        .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 3. Обновить навык
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { name, category, is_absolute_allowed, magic_circle_id } = req.body;
    
    if (!name || !category) {
        return res.status(400).json({ error: 'Поля "name" и "category" обязательны' });
    }

    const { data, error } = await supabase
        .from('skills')
        .update({
            name,
            category,
            is_absolute_allowed: is_absolute_allowed !== false,
            magic_circle_id: category === 'magic' ? magic_circle_id : null
        })
        .eq('id', id)
        .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 4. Удалить навык (с каскадным удалением у персонажей)
router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    // Удаляем у персонажей
    await supabase.from('character_skills').delete().eq('skill_id', id);

    // Удаляем сам навык
    const { error } = await supabase.from('skills').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;