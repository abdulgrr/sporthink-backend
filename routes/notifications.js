const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/notifications — Kullanıcının bildirimlerini getir (filtreli)
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const filter = req.query.filter || 'all'; // 'all', 'system', 'interaction'

    console.log(`[Bildirimler] GET isteği alındı. Kullanıcı ID: ${userId}, Filtre: ${filter}`);

    try {
        let typeFilter = '';
        if (filter === 'system') {
            typeFilter = "AND type IN ('system', 'leaderboard', 'quest')";
        } else if (filter === 'interaction') {
            typeFilter = "AND type IN ('like', 'comment', 'reaction')";
        }

        const start = Date.now();
        const [notifications] = await db.query(`
            SELECT * FROM notifications 
            WHERE user_id = ? ${typeFilter}
            ORDER BY created_at DESC 
            LIMIT 50
        `, [userId]);
        console.log(`[Bildirimler] Veritabanından ${notifications.length} bildirim çekildi. Süre: ${Date.now() - start}ms`);

        // Okunmamış bildirimleri arka planda okundu yapalım
        const updateStart = Date.now();
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        console.log(`[Bildirimler] Bildirimler okundu yapıldı. Süre: ${Date.now() - updateStart}ms`);

        res.status(200).json(notifications);
    } catch (error) {
        console.error('Bildirimleri getirme hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

// GET /api/notifications/unread-count — Okunmamış sayısı
router.get('/unread-count', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        res.status(200).json({ count: result[0].count });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

// POST /api/notifications/read — Tek bildirimi okundu yap
router.post('/read', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { notification_id } = req.body;
    try {
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notification_id, userId]
        );
        res.status(200).json({ message: 'Bildirim okundu.' });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

// POST /api/notifications/read-all — Tümünü okundu yap
router.post('/read-all', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    console.log(`[Bildirimler] POST read-all isteği alındı. Kullanıcı ID: ${userId}`);
    try {
        const start = Date.now();
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        console.log(`[Bildirimler] Tüm bildirimler okundu yapıldı. Süre: ${Date.now() - start}ms`);
        res.status(200).json({ message: 'Tüm bildirimler okundu.' });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

// DELETE /api/notifications/:id — Bildirim sil
router.delete('/:id', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const notifId = req.params.id;
    try {
        await db.query(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?',
            [notifId, userId]
        );
        res.status(200).json({ message: 'Bildirim silindi.' });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

module.exports = router;
