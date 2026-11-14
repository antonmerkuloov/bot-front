const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Получить все ПАССИВНЫЕ руны
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('runes')
        .select('*')
        .neq('type', 'ranged') // <-- Исключаем активные руны
        .order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Создать руну
router.post('/', async (req, res) => {
    const { name, type, value } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Поля "name" и "type" обязательны' });

    const durability_bonus = (type === 'passive_durability' || type === 'durability_threshold') ? value : 0;
    const guaranteed_damage = (type === 'melee_bonus') ? value : 0;

    const { data, error } = await supabase.from('runes').insert([{
        name, type, guaranteed_damage, durability_bonus,
        damage_dice: 0, mana_cost: 0, stamina_cost: 0, effect_text: '', threshold: 10, circle: 'elemental'
    }]).select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Удалить руну
router.delete('/:id', async (req, res) => {
    await supabase.from('item_runes').delete().eq('rune_id', req.params.id);
    const { error } = await supabase.from('runes').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;