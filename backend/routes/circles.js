const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// 1. Получить все круги
router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('magic_circles').select('*').order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 2. Создать новый круг
router.post('/', async (req, res) => {
    const { key, name } = req.body;
    if (!key || !name) {
        return res.status(400).json({ error: 'Поля "key" и "name" обязательны' });
    }
    const { data, error } = await supabase
        .from('magic_circles')
        .insert([{ key, name }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 3. Отключить/Включить круг
router.put('/:id/toggle', async (req, res) => {
    const circleId = req.params.id;

    const { data: circle, error: fetchError } = await supabase
        .from('magic_circles')
        .select('is_active')
        .eq('id', circleId)
        .single();
    if (fetchError) return res.status(500).json({ error: fetchError.message });

    const newState = !circle.is_active;

    await supabase.from('magic_circles').update({ is_active: newState }).eq('id', circleId);

    // При отключении — забираем заклинания этого круга у всех персонажей
    if (!newState) {
        const { data: spells } = await supabase
            .from('spells')
            .select('id')
            .eq('circle_id', circleId);
        if (spells && spells.length > 0) {
            const spellIds = spells.map(s => s.id);
            await supabase.from('character_spells').delete().in('spell_id', spellIds);
        }
    }

    res.json({ success: true, is_active: newState });
});

// 4. Обновить название круга
router.put('/:id', async (req, res) => {
    const circleId = req.params.id;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Поле "name" обязательно' });
    }

    const { data, error } = await supabase
        .from('magic_circles')
        .update({ name })
        .eq('id', circleId)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 5. УДАЛИТЬ круг (каскадно)
router.delete('/:id', async (req, res) => {
    const circleId = req.params.id;

    // 1. Удаляем связи и сами заклинания
    const { data: spells } = await supabase
        .from('spells')
        .select('id')
        .eq('circle_id', circleId);
    if (spells && spells.length > 0) {
        const spellIds = spells.map(s => s.id);
        await supabase.from('character_spells').delete().in('spell_id', spellIds);
        await supabase.from('spells').delete().in('id', spellIds);
    }

    // 2. Удаляем связи и сами навыки
    const { data: skills } = await supabase
        .from('skills')
        .select('id')
        .eq('magic_circle_id', circleId);
    if (skills && skills.length > 0) {
        const skillIds = skills.map(s => s.id);
        await supabase.from('character_skills').delete().in('skill_id', skillIds);
        await supabase.from('skills').delete().in('id', skillIds);
    }

    // 3. Удаляем сам круг
    const { error } = await supabase.from('magic_circles').delete().eq('id', circleId);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true });
});

module.exports = router;