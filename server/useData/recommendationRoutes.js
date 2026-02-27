const express = require('express');
const router = express.Router();
const recommendationService = require('./recommendationService');

// 获取推荐内容
router.get('/recommendations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { type = 'hybrid', limit = 10 } = req.query;

        if (!userId || isNaN(parseInt(userId))) {
            return res.status(400).json({
                success: false,
                message: '用户ID无效'
            });
        }
        // 多算法权重分配
        const recommendations = await recommendationService.getRecommendations(
            parseInt(userId),
            type,// 支持混合推荐、基于内容、协同过滤、热门内容
            parseInt(limit)
        );

        res.json({
            success: true,
            data: recommendations,
            count: recommendations.length,
            type
        });
    } catch (error) {
        console.error('获取推荐失败:', error);
        res.status(500).json({
            success: false,
            message: '获取推荐失败',
            error: error.message
        });
    }
});

// 记录用户行为，记录用户交互行为数据
router.post('/behavior', async (req, res) => {
    try {
        const {
            userId,
            itemId,
            itemType = 'article',
            actionType,
            duration = 0,
            metadata = {}
        } = req.body;

        // 验证必需字段
        if (!userId || !itemId || !actionType) {
            return res.status(400).json({
                success: false,
                message: '缺少必需字段: userId, itemId, actionType'
            });
        }

        // 验证 actionType
        const validActions = ['view', 'like', 'collect', 'comment', 'share'];
        if (!validActions.includes(actionType)) {
            return res.status(400).json({
                success: false,
                message: `actionType 必须是以下之一: ${validActions.join(', ')}`
            });
        }

        // 验证 itemType
        const validItemTypes = ['article', 'my_article'];
        if (!validItemTypes.includes(itemType)) {
            return res.status(400).json({
                success: false,
                message: `itemType 必须是以下之一: ${validItemTypes.join(', ')}`
            });
        }

        await recommendationService.recordUserBehavior(
            parseInt(userId),
            parseInt(itemId),
            itemType,
            actionType,
            { duration, ...metadata }
        );

        res.json({
            success: true,
            message: '行为记录成功'
        });
    } catch (error) {
        console.error('记录用户行为失败:', error);
        res.status(500).json({
            success: false,
            message: '记录用户行为失败',
            error: error.message
        });
    }
});

// 获取用户兴趣画像：
router.get('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || isNaN(parseInt(userId))) {
            return res.status(400).json({
                success: false,
                message: '用户ID无效'
            });
        }

        // 这里可以添加获取用户画像的逻辑
        // 目前由 recommendationService 自动管理

        res.json({
            success: true,
            message: '用户画像获取成功（由系统自动管理）'
        });
    } catch (error) {
        console.error('获取用户画像失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户画像失败',
            error: error.message
        });
    }
});

// 初始化内容特征（管理接口）
router.post('/initialize-features', async (req, res) => {
    try {
        await recommendationService.initializeContentFeatures();

        res.json({
            success: true,
            message: '内容特征初始化完成'
        });
    } catch (error) {
        console.error('初始化内容特征失败:', error);
        res.status(500).json({
            success: false,
            message: '初始化内容特征失败',
            error: error.message
        });
    }
});

// 获取推荐统计信息
router.get('/stats', async (req, res) => {
    try {
        const db = require('./db');

        // 获取用户行为统计
        const behaviorStatsSql = `
            SELECT 
                action_type,
                COUNT(*) as count,
                AVG(duration) as avg_duration
            FROM user_behavior 
            GROUP BY action_type
        `;

        // 获取用户画像统计
        const profileStatsSql = `
            SELECT COUNT(*) as total_profiles
            FROM user_profile
        `;

        // 获取内容特征统计
        const contentStatsSql = `
            SELECT 
                item_type,
                COUNT(*) as count
            FROM content_features 
            GROUP BY item_type
        `;

        const [behaviorStats] = connection.query(behaviorStatsSql);
        const [profileStats] = connection.query(profileStatsSql);
        const [contentStats] = connection.query(contentStatsSql);

        res.json({
            success: true,
            data: {
                behaviorStats,
                profileStats: profileStats[0],
                contentStats,
                cacheInfo: {
                    userSimilarityCache: recommendationService.userSimilarityCache.size,
                    contentSimilarityCache: recommendationService.contentSimilarityCache.size
                }
            }
        });
    } catch (error) {
        console.error('获取推荐统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取推荐统计失败',
            error: error.message
        });
    }
});

module.exports = router;
