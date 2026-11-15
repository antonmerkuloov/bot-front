const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Функция для получения системного имени круга (elemental, blood и т.д.) по его ID
async function getCircleKey(circle_id) {
    if (!circle_id) return 'elemental'; // Значение по умолчанию
    try {
        const { data } = await supabase.from('magic_circles').select('name').eq('id', circle_id).single();
        if (!data || !data.name) return 'elemental';
        
        const name = data.name.toLowerCase();
        if (name.includes('стихий')) return 'elemental';
        if (name.includes('разруш')) return 'destruction';
        if (name.includes('кровав')) return 'blood';
        if (name.includes('свет')) return 'light';
        if (name.includes('тьм')) return 'darkness';
        if (name.includes('дракон')) return 'dragon';
        return 'elemental';
    } catch {
        return 'elemental';
    }
}

// 1. Получить все заклинания
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('spells')
        .select('*, magic_circles(name)')
        .order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 2. Создать заклинание
router.post('/', async (req, res) => {
    const spellData = req.body;
    if (!spellData.name || !spellData.circle_id) {
        return res.status(400).json({ error: 'Поля "name" и "circle_id" обязательны' });
    }

    // Автоматически вычисляем текстовое поле circle
    spellData.circle = await getCircleKey(spellData.circle_id);

    const { data, error } = await supabase.from('spells').insert([spellData]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 3. Обновить заклинание
router.put('/:id', async (req, res) => {
    const spellData = req.body;
    if (!spellData.name || !spellData.circle_id) {
        return res.status(400).json({ error: 'Поля "name" и "circle_id" обязательны' });
    }

    // Автоматически вычисляем текстовое поле circle
    spellData.circle = await getCircleKey(spellData.circle_id);

    const { data, error } = await supabase
        .from('spells')
        .update(spellData)
        .eq('id', Number(req.params.id))
        .select();
        
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 4. Удалить заклинание
router.delete('/:id', async (req, res) => {
    // Сначала отвязываем заклинание от персонажей
    await supabase.from('character_spells').delete().eq('spell_id', Number(req.params.id));
    
    const { error } = await supabase.from('spells').delete().eq('id', Number(req.params.id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;