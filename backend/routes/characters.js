const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// ================= СПИСОК ПЕРСОНАЖЕЙ =================
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('characters')
        .select('id, character_id, character_name, is_main, stamina, max_stamina, manna, max_manna, blood, max_blood, armor, max_armor, money, jc')
        .order('character_name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// ================= АТРИБУТЫ ПЕРСОНАЖА =================
router.get('/:id', async (req, res) => {
    const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', req.params.id)
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.put('/:id', async (req, res) => {
    try {
        const payload = req.body;
        const { data: char } = await supabase.from('characters').select('*').eq('id', req.params.id).single();
        if (!char) return res.status(404).json({ error: 'Персонаж не найден' });

        const max_stamina = payload.max_stamina !== undefined ? Math.max(0, payload.max_stamina) : char.max_stamina;
        const max_manna = payload.max_manna !== undefined ? Math.max(0, payload.max_manna) : char.max_manna;
        const max_blood = payload.max_blood !== undefined ? Math.max(0, payload.max_blood) : char.max_blood;
        const max_armor = payload.max_armor !== undefined ? Math.max(0, payload.max_armor) : char.max_armor;

        const stamina = Math.max(0, Math.min(payload.stamina !== undefined ? payload.stamina : char.stamina, max_stamina));
        const manna = Math.max(0, Math.min(payload.manna !== undefined ? payload.manna : char.manna, max_manna));
        const blood = Math.max(0, Math.min(payload.blood !== undefined ? payload.blood : char.blood, max_blood));
        const armor = Math.max(0, Math.min(payload.armor !== undefined ? payload.armor : char.armor, max_armor));

        const money = Math.max(0, payload.money !== undefined ? payload.money : char.money);
        const jc = Math.max(0, payload.jc !== undefined ? payload.jc : char.jc);

        const { data, error } = await supabase.from('characters').update({
            stamina, max_stamina, manna, max_manna, blood, max_blood, armor, max_armor, money, jc
        }).eq('id', req.params.id).select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= НАВЫКИ ПЕРСОНАЖА =================
router.get('/:id/skills', async (req, res) => {
    const { data, error } = await supabase
        .from('character_skills')
        .select('*, skills(name, category, magic_circle_id, is_absolute_allowed)')
        .eq('character_id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.post('/:id/skills', async (req, res) => {
    const { skill_id, experience, is_absolute_allowed } = req.body;
    const { data, error } = await supabase
        .from('character_skills')
        .insert([{
            character_id: req.params.id,
            skill_id,
            experience: experience || 0,
            is_absolute_allowed: is_absolute_allowed ?? null
        }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

router.put('/:id/skills/:skill_id', async (req, res) => {
    const { experience, is_absolute_allowed } = req.body;
    const { data, error } = await supabase
        .from('character_skills')
        .update({ experience, is_absolute_allowed })
        .eq('character_id', req.params.id)
        .eq('skill_id', req.params.skill_id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

router.delete('/:id/skills/:skill_id', async (req, res) => {
    const { error } = await supabase
        .from('character_skills')
        .delete()
        .eq('character_id', req.params.id)
        .eq('skill_id', req.params.skill_id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ================= ИНВЕНТАРЬ ПЕРСОНАЖА =================
router.get('/:id/items', async (req, res) => {
    const { data, error } = await supabase
        .from('character_items')
        .select('*, items(name, type, max_durability, damage_dice, guaranteed_damage, magazine_capacity, caliber_id, is_internal_magazine, effect_value, consumable_type)')
        .eq('character_id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.post('/:id/items', async (req, res) => {
    const { item_id, slot, quantity, durability_current, current_ammo } = req.body;
    const qty = quantity || 1;
    const targetSlot = slot || 'storage';

    try {
        const { data: existing } = await supabase
            .from('character_items')
            .select('id, quantity')
            .eq('character_id', req.params.id)
            .eq('item_id', item_id)
            .eq('slot', targetSlot)
            .limit(1);

        if (existing && existing.length > 0) {
            const newQty = existing[0].quantity + qty;
            const { data, error } = await supabase
                .from('character_items')
                .update({ quantity: newQty })
                .eq('id', existing[0].id)
                .select();

            if (error) throw error;
            return res.json(data[0]);
        } else {
            const { data, error } = await supabase
                .from('character_items')
                .insert([{
                    character_id: req.params.id,
                    item_id,
                    slot: targetSlot,
                    quantity: qty,
                    durability_current: durability_current || 0,
                    current_ammo: current_ammo || 0
                }])
                .select();

            if (error) throw error;
            res.json(data[0]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/items/:char_item_id', async (req, res) => {
    try {
        const { data: itemData } = await supabase
            .from('character_items')
            .select('*, items(type, max_durability, magazine_capacity, caliber_id, is_internal_magazine)')
            .eq('id', req.params.char_item_id)
            .single();

        if (!itemData) return res.status(404).json({ error: 'Предмет не найден' });

        let newAmmo = req.body.current_ammo !== undefined ? req.body.current_ammo : itemData.current_ammo;
        let newDur = req.body.durability_current !== undefined ? req.body.durability_current : itemData.durability_current;
        let newQty = req.body.quantity !== undefined ? req.body.quantity : itemData.quantity;

        const maxDur = itemData.items?.max_durability || 0;
        let maxAmmo = itemData.items?.magazine_capacity || 0;
        
        if (itemData.items?.type === 'magic_ranged') {
            if (itemData.current_mag_capacity > 0) {
                maxAmmo = itemData.current_mag_capacity;
            } else {
                const { data: crystals } = await supabase
                    .from('items')
                    .select('effect_value')
                    .eq('consumable_type', 'mana_charge');
                if (crystals && crystals.length > 0) maxAmmo = Math.max(...crystals.map(c => c.effect_value || 0));
                else maxAmmo = 99;
            }
        } else if (itemData.items?.type === 'ranged' && !itemData.items?.is_internal_magazine) {
            if (itemData.current_mag_capacity > 0) {
                maxAmmo = itemData.current_mag_capacity;
            } else {
                const { data: mags } = await supabase
                    .from('items')
                    .select('magazine_capacity')
                    .eq('type', 'magazine')
                    .eq('caliber_id', itemData.items?.caliber_id);
                if (mags && mags.length > 0) maxAmmo = Math.max(...mags.map(m => m.magazine_capacity || 0));
                else maxAmmo = 99;
            }
        }

        newDur = Math.max(0, Math.min(newDur, maxDur));
        newAmmo = Math.max(0, Math.min(newAmmo, maxAmmo));
        newQty = Math.max(1, newQty);

        const { data, error } = await supabase
            .from('character_items')
            .update({ current_ammo: newAmmo, durability_current: newDur, quantity: newQty })
            .eq('id', req.params.char_item_id)
            .select();
            
        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id/items/:char_item_id', async (req, res) => {
    const { error } = await supabase
        .from('character_items')
        .delete()
        .eq('id', req.params.char_item_id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ================= ЗАКЛИНАНИЯ ПЕРСОНАЖА =================
router.get('/:id/spells', async (req, res) => {
    const { data, error } = await supabase
        .from('character_spells')
        .select('spell_id, is_equipped, is_phantom, spells(name, circle_id)')
        .eq('character_id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.post('/:id/spells', async (req, res) => {
    const { spell_id } = req.body;
    const charId = req.params.id;

    const { data: spell } = await supabase.from('spells').select('circle_id').eq('id', spell_id).single();
    if (!spell) return res.status(404).json({ error: 'Заклинание не найдено' });

    let circleLevel = 0;
    const { data: circleSkill } = await supabase.from('skills').select('id').eq('magic_circle_id', spell.circle_id).limit(1);
    if (circleSkill && circleSkill.length > 0) {
        const { data: charCircle } = await supabase.from('character_skills').select('experience').eq('character_id', charId).eq('skill_id', circleSkill[0].id).limit(1);
        const exp = charCircle && charCircle.length > 0 ? charCircle[0].experience : 0;
        if (exp >= 160) circleLevel = 5;
        else if (exp >= 140) circleLevel = 4;
        else if (exp >= 100) circleLevel = 3;
        else if (exp >= 80) circleLevel = 2;
        else if (exp >= 40) circleLevel = 1;
    }

    let maxStorage = 2;
    const { data: memorySkill } = await supabase.from('skills').select('id').ilike('name', '%Память%').limit(1);
    if (memorySkill && memorySkill.length > 0) {
        const { data: charMemory } = await supabase.from('character_skills').select('experience').eq('character_id', charId).eq('skill_id', memorySkill[0].id).limit(1);
        const memExp = charMemory && charMemory.length > 0 ? charMemory[0].experience : 0;
        if (memExp >= 40) maxStorage = Math.min(8, 3 + Math.floor((memExp - 40) / 10));
    }

    const { data: currentSpells } = await supabase.from('character_spells').select('spell_id, is_equipped, is_phantom').eq('character_id', charId);
    
    let equippedCount = 0;
    let memoryCount = 0;
    let phantomCount = 0;
    
    if (currentSpells && currentSpells.length > 0) {
        const spellIds = currentSpells.map(s => s.spell_id);
        const { data: spellsData } = await supabase.from('spells').select('id, circle_id').in_('id', spellIds);
        const spellCircleMap = {};
        if (spellsData) spellsData.forEach(s => spellCircleMap[s.id] = s.circle_id);

        equippedCount = currentSpells.filter(s => s.is_equipped && spellCircleMap[s.spell_id] === spell.circle_id).length;
        memoryCount = currentSpells.filter(s => !s.is_equipped && !s.is_phantom).length;
        phantomCount = currentSpells.filter(s => s.is_phantom).length;
    }

    let is_equipped = false;
    let is_phantom = false;
    
    if (equippedCount < circleLevel) {
        is_equipped = true;
    } else if (memoryCount < maxStorage) {
        is_equipped = false;
    } else if (phantomCount === 0) {
        is_equipped = false;
        is_phantom = true;
    } else {
        return res.status(400).json({ error: 'Нет свободных мест: слоты круга, память и фантомная ячейка заняты.' });
    }

    const { error } = await supabase.from('character_spells').insert([{
        character_id: charId, spell_id, is_equipped, is_phantom
    }]);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, is_equipped, is_phantom });
});

router.put('/:id/spells/:spell_id/status', async (req, res) => {
    const { status } = req.body;
    const charId = req.params.id;
    const spellId = req.params.spell_id;

    if (status === 'equipped') {
        const { error } = await supabase.from('character_spells').update({ is_equipped: true, is_phantom: false }).eq('character_id', charId).eq('spell_id', spellId);
        if (error) return res.status(500).json({ error: error.message });
    } else if (status === 'memory') {
        const { error } = await supabase.from('character_spells').update({ is_equipped: false, is_phantom: false }).eq('character_id', charId).eq('spell_id', spellId);
        if (error) return res.status(500).json({ error: error.message });
    } else if (status === 'phantom') {
        const { error } = await supabase.from('character_spells').update({ is_equipped: false, is_phantom: true }).eq('character_id', charId).eq('spell_id', spellId);
        if (error) return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
});

router.delete('/:id/spells/:spell_id', async (req, res) => {
    const { error } = await supabase.from('character_spells').delete().eq('character_id', req.params.id).eq('spell_id', req.params.spell_id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;