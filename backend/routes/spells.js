const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// 1. Получить все заклинания
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('spells')
        .select('*, magic_circles(name)')
        .order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 2. Создать новое заклинание
router.post('/', async (req, res) => {
    const { 
        name, circle_id, damage_dice, guaranteed_damage, 
        mana_cost, stamina_cost, threshold, effect_text 
    } = req.body;

    if (!name || !circle_id) {
        return res.status(400).json({ error: 'Поля "name" и "circle_id" обязательны' });
    }

    const { data, error } = await supabase
        .from('spells')
        .insert([{
            name, 
            circle_id, 
            damage_dice: damage_dice || 0, 
            guaranteed_damage: guaranteed_damage || 0,
            mana_cost: mana_cost || 0, 
            stamina_cost: stamina_cost || 0,
            threshold: threshold || 10,
            effect_text: effect_text || ''
        }])
        .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 3. Обновить заклинание
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { 
        name, circle_id, damage_dice, guaranteed_damage, 
        mana_cost, stamina_cost, threshold, effect_text 
    } = req.body;

    if (!name || !circle_id) {
        return res.status(400).json({ error: 'Поля "name" и "circle_id" обязательны' });
    }

    const { data, error } = await supabase
        .from('spells')
        .update({
            name, 
            circle_id, 
            damage_dice: damage_dice || 0, 
            guaranteed_damage: guaranteed_damage || 0,
            mana_cost: mana_cost || 0, 
            stamina_cost: stamina_cost || 0,
            threshold: threshold || 10,
            effect_text: effect_text || ''
        })
        .eq('id', id)
        .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 4. Удалить заклинание
router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    // Удаляем у персонажей
    await supabase.from('character_spells').delete().eq('spell_id', id);

    // Удаляем само заклинание
    const { error } = await supabase.from('spells').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;