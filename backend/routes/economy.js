const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// 1. Получить текущие курсы
router.get('/rates', async (req, res) => {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'currency_rates')
        .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data?.value || { gold_to_silver: 20, silver_to_copper: 10 });
});

// 2. Обновить курсы
router.put('/rates', async (req, res) => {
    const { gold_to_silver, silver_to_copper } = req.body;

    if (!gold_to_silver || !silver_to_copper) {
        return res.status(400).json({ error: 'Поля "gold_to_silver" и "silver_to_copper" обязательны' });
    }

    const newRates = { gold_to_silver: Number(gold_to_silver), silver_to_copper: Number(silver_to_copper) };

    const { error } = await supabase
        .from('settings')
        .update({ value: newRates })
        .eq('key', 'currency_rates');

    if (error) return res.status(500).json({ error: error.message });
    res.json(newRates);
});

module.exports = router;