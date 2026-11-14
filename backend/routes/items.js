const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// 1. Получить все предметы
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('items')
        .select('*, skills(name), calibers(name)')
        .order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 2. Создать предмет
router.post('/', async (req, res) => {
    const itemData = req.body;
    if (!itemData.name || !itemData.type) return res.status(400).json({ error: 'Поля "name" и "type" обязательны' });

    // Кто наносит урон?
    const isDamageItem = ['weapon', 'ranged', 'magic_ranged', 'magic_weapon', 'staff', 'shield'].includes(itemData.type) || 
                         (itemData.type === 'consumable' && ['throwable', 'one_time_use', 'ammo'].includes(itemData.consumable_type));

    if (!isDamageItem) {
        itemData.damage_dice = 0;
        itemData.guaranteed_damage = 0;
    }
    
    // Очистка полей навыков для всего, кроме оружия, посохов и щитов
    if (!['weapon', 'ranged', 'magic_ranged', 'magic_weapon', 'staff', 'shield'].includes(itemData.type)) {
        itemData.skill_id = null;
        itemData.is_two_handed = false;
        itemData.rune_slots_max = 0;
        itemData.is_firearm = false;
    }

    // Очистка калибров и магазинов (сохраняем для стрелкового, магазинов, патронов И ОБОЙМ)
    if (!['ranged', 'magazine'].includes(itemData.type) && !(itemData.type === 'consumable' && ['ammo', 'stripper_clip'].includes(itemData.consumable_type))) {
        itemData.caliber_id = null;
        itemData.magazine_capacity = 0;
        itemData.is_internal_magazine = true;
    }

    // Специфичные проверки для типов
    if (itemData.type === 'magic_ranged') {
        itemData.caliber_id = null;
        itemData.magazine_capacity = 0;
        itemData.is_internal_magazine = true;
        itemData.is_firearm = false;
    }
    if (itemData.type === 'staff') {
        itemData.rune_slots_max = 0;
        itemData.caliber_id = null;
        itemData.magazine_capacity = 0;
        itemData.is_firearm = false;
    }
    if (itemData.type === 'shield') {
        itemData.is_two_handed = false; // Щит не двуручный
        itemData.rune_slots_max = 0;
        itemData.caliber_id = null;
        itemData.magazine_capacity = 0;
        itemData.is_firearm = false;
        itemData.is_internal_magazine = true;
    }
    if (itemData.type === 'ranged') {
        if (!itemData.is_internal_magazine) {
            itemData.magazine_capacity = 0; // Вместимость только для встроенных
        }
    }

    // Очистка полей расходника (включая текстовое описание эффекта)
    if (itemData.type !== 'consumable') {
        itemData.consumable_type = null;
        itemData.effect_value = 0;
        itemData.effect_text = null;
        itemData.consumable_effects = null;
    } else if (itemData.consumable_type !== 'combined') {
        // Если это не комбинированный, то объект эффектов не нужен
        itemData.consumable_effects = null;
    }

    const { data, error } = await supabase.from('items').insert([itemData]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 3. Обновить предмет
router.put('/:id', async (req, res) => {
    const itemData = req.body;
    if (!itemData.name || !itemData.type) return res.status(400).json({ error: 'Поля "name" и "type" обязательны' });

    const isDamageItem = ['weapon', 'ranged', 'magic_ranged', 'magic_weapon', 'staff', 'shield'].includes(itemData.type) || 
                         (itemData.type === 'consumable' && ['throwable', 'one_time_use', 'ammo'].includes(itemData.consumable_type));

    if (!isDamageItem) {
        itemData.damage_dice = 0;
        itemData.guaranteed_damage = 0;
    }
    
    if (!['weapon', 'ranged', 'magic_ranged', 'magic_weapon', 'staff', 'shield'].includes(itemData.type)) {
        itemData.skill_id = null;
        itemData.is_two_handed = false;
        itemData.rune_slots_max = 0;
        itemData.is_firearm = false;
    }

    if (!['ranged', 'magazine'].includes(itemData.type) && !(itemData.type === 'consumable' && ['ammo', 'stripper_clip'].includes(itemData.consumable_type))) {
        itemData.caliber_id = null;
        itemData.magazine_capacity = 0;
        itemData.is_internal_magazine = true;
    }

    if (itemData.type === 'magic_ranged') {
        itemData.caliber_id = null;
        itemData.magazine_capacity = 0;
        itemData.is_internal_magazine = true;
        itemData.is_firearm = false;
    }
    if (itemData.type === 'staff') {
        itemData.rune_slots_max = 0;
        itemData.caliber_id = null;
        itemData.magazine_capacity = 0;
        itemData.is_firearm = false;
    }
    if (itemData.type === 'shield') {
        itemData.is_two_handed = false;
        itemData.rune_slots_max = 0;
        itemData.caliber_id = null;
        itemData.magazine_capacity = 0;
        itemData.is_firearm = false;
        itemData.is_internal_magazine = true;
    }
    if (itemData.type === 'ranged') {
        if (!itemData.is_internal_magazine) {
            itemData.magazine_capacity = 0;
        }
    }

    // Очистка полей расходника
    // Очистка полей расходника
    if (itemData.type !== 'consumable') {
        itemData.consumable_type = null;
        itemData.effect_value = 0;
        itemData.effect_text = null;
        itemData.consumable_effects = null;
    } else if (itemData.consumable_type !== 'combined') {
        // Если это не комбинированный, то объект эффектов не нужен
        itemData.consumable_effects = null;
    }

    const { data, error } = await supabase.from('items').update(itemData).eq('id', Number(req.params.id)).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 4. Удалить предмет
router.delete('/:id', async (req, res) => {
    const { data: check } = await supabase.from('character_items').select('id').eq('item_id', Number(req.params.id)).limit(1);
    if (check && check.length > 0) return res.status(400).json({ error: 'Предмет в инвентаре игрока.' });

    await supabase.from('item_runes').delete().eq('item_id', Number(req.params.id));
    const { error } = await supabase.from('items').delete().eq('id', Number(req.params.id));
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ==================== РУНЫ НА ОРУЖИИ ====================

// Получить руны предмета
router.get('/:id/runes', async (req, res) => {
    const itemId = Number(req.params.id);
    const { data, error } = await supabase
        .from('item_runes')
        .select('id, rune_id, slot_index, runes(name, type, guaranteed_damage, durability_bonus)')
        .eq('item_id', itemId)
        .order('slot_index');
        
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Вставить руну в предмет (С ЗАЩИТОЙ ЛИМИТА)
router.post('/:id/runes', async (req, res) => {
    const itemId = Number(req.params.id);
    const { rune_id, slot_index } = req.body;

    try {
        // 1. Узнаём, сколько слотов у предмета
        const { data: item, error: itemErr } = await supabase
            .from('items')
            .select('rune_slots_max')
            .eq('id', itemId)
            .single();

        if (itemErr || !item) {
            return res.status(404).json({ error: 'Предмет не найден' });
        }

        // 2. Узнаём, сколько уже занято
        const { count, error: countErr } = await supabase
            .from('item_runes')
            .select('id', { count: 'exact', head: true })
            .eq('item_id', itemId);

        if (countErr) {
            return res.status(500).json({ error: countErr.message });
        }

        // 3. Если слотов нет или они заняты — не даём вставить
        if ((count || 0) >= (item.rune_slots_max || 0)) {
            return res.status(400).json({
                error: `У предмета нет свободных слотов под руны (макс: ${item.rune_slots_max})`
            });
        }

        // 4. Вставляем
        const { data, error } = await supabase
            .from('item_runes')
            .insert([{ item_id: itemId, rune_id, slot_index: slot_index || 1 }])
            .select();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удалить руну из предмета
router.delete('/:id/runes/:rune_link_id', async (req, res) => {
    const linkId = Number(req.params.rune_link_id);
    const { error } = await supabase.from('item_runes').delete().eq('id', linkId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;