const express = require('express');
const router = express.Router();
const learningAnalyticsService = require('./learningAnalyticsService');
const { checkAchievements } = require('./learningAlgorithms');

// 获取用户学习进度
router.get('/progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const progress = await learningAnalyticsService.getUserLearningProgress(userId);
        res.json({ success: true, data: progress });
    } catch (error) {
        console.error('获取学习进度失败:', error);
        res.status(500).json({ success: false, message: '获取学习进度失败' });
    }
});

// 记录学习行为
router.post('/activity', async (req, res) => {
    try {
        const { userId, activityData } = req.body;

        if (!userId || !activityData) {
            return res.status(400).json({ success: false, message: '缺少必要参数' });
        }

        const activityId = await learningAnalyticsService.recordLearningActivity(userId, activityData);

        // 检测成就解锁
        const progress = await learningAnalyticsService.getUserLearningProgress(userId);
        const achievements = checkAchievements(progress, activityData);

        // 解锁检测到的成就
        for (const achievement of achievements) {
            await learningAnalyticsService.unlockAchievement(userId, achievement.id, achievement);
        }

        res.json({
            success: true,
            data: { activityId },
            achievements: achievements.length > 0 ? achievements : null
        });
    } catch (error) {
        console.error('记录学习行为失败:', error);
        res.status(500).json({ success: false, message: '记录学习行为失败' });
    }
});

// 获取社区学习统计
router.get('/community/stats', async (req, res) => {
    try {
        const stats = await learningAnalyticsService.getCommunityLearningStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('获取社区统计失败:', error);
        res.status(500).json({ success: false, message: '获取社区统计失败' });
    }
});

// 设置学习目标
router.post('/goals', async (req, res) => {
    try {
        const { userId, goalData } = req.body;

        if (!userId || !goalData) {
            return res.status(400).json({ success: false, message: '缺少必要参数' });
        }

        const goal = await learningAnalyticsService.setLearningGoal(userId, goalData);
        res.json({ success: true, data: goal });
    } catch (error) {
        console.error('设置学习目标失败:', error);
        res.status(500).json({ success: false, message: '设置学习目标失败' });
    }
});

// 更新学习目标进度
router.put('/goals/:goalId', async (req, res) => {
    try {
        const { userId, progress } = req.body;
        const { goalId } = req.params;

        if (!userId || progress === undefined) {
            return res.status(400).json({ success: false, message: '缺少必要参数' });
        }

        // 获取当前用户的学习目标
        const userProgress = await learningAnalyticsService.getUserLearningProgress(userId);
        const goals = userProgress.goals || [];

        // 更新目标进度
        const updatedGoals = goals.map(goal => {
            if (goal.id === goalId) {
                return { ...goal, progress: Math.min(100, Math.max(0, progress)) };
            }
            return goal;
        });

        // 更新数据库
        const db = require('./db');
        await db.execute(
            'UPDATE user_profile SET learning_goals = ? WHERE user_id = ?',
            [JSON.stringify(updatedGoals), userId]
        );

        // 清除缓存
        learningAnalyticsService.cache.delete(`progress_${userId}`);

        res.json({ success: true, data: { goalId, progress } });
    } catch (error) {
        console.error('更新学习目标失败:', error);
        res.status(500).json({ success: false, message: '更新学习目标失败' });
    }
});

// 获取学习推荐
router.get('/recommendations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const progress = await learningAnalyticsService.getUserLearningProgress(userId);
        const recommendations = progress.recommendations || [];

        res.json({ success: true, data: recommendations });
    } catch (error) {
        console.error('获取学习推荐失败:', error);
        res.status(500).json({ success: false, message: '获取学习推荐失败' });
    }
});

// 获取用户成就
router.get('/achievements/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const progress = await learningAnalyticsService.getUserLearningProgress(userId);
        const achievements = progress.achievements || [];

        res.json({ success: true, data: achievements });
    } catch (error) {
        console.error('获取用户成就失败:', error);
        res.status(500).json({ success: false, message: '获取用户成就失败' });
    }
});

// 获取学习效率分析
router.get('/efficiency/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const progress = await learningAnalyticsService.getUserLearningProgress(userId);

        const efficiencyData = {
            weekly_efficiency: calculateLearningEfficiency(progress),
            skill_distribution: progress.skills || {},
            weekly_stats: progress.weekly_stats || {},
            total_hours: progress.total_learning_hours || 0
        };

        res.json({ success: true, data: efficiencyData });
    } catch (error) {
        console.error('获取学习效率失败:', error);
        res.status(500).json({ success: false, message: '获取学习效率失败' });
    }
});

// 计算学习效率（从learningAlgorithms导入）
function calculateLearningEfficiency(progress) {
    const weeklyStats = progress.weekly_stats || {};
    const totalHours = weeklyStats.total_hours || 0;
    const completedItems = weeklyStats.completed_items || 0;

    if (totalHours === 0) return 0;

    const efficiency = completedItems / totalHours;
    return Math.min(efficiency / 2, 1);
}

module.exports = router;
