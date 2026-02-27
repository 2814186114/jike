const { connection } = require('./db');
const { calculateSkillProficiency, generateLearningRecommendations } = require('./learningAlgorithms');

class LearningAnalyticsService {
    constructor() {
        this.cache = new Map();
    }

    /**
     * 记录学习行为
     */
    async recordLearningActivity(userId, activityData) {
        const {
            itemId,
            itemType = 'article',
            actionType = 'view',
            learningType = 'read',
            duration = 0,
            completionStatus = 'started',
            proficiencyLevel = 1,
            metadata = {}
        } = activityData;

        try {
            // 记录到 user_behavior 表
            const result = await new Promise((resolve, reject) => {
                connection.query(
                    `INSERT INTO user_behavior 
         (user_id, item_id, item_type, action_type, learning_type, duration, 
          completion_status, proficiency_level, learning_duration, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userId, itemId, itemType, actionType, learningType, duration,
                        completionStatus, proficiencyLevel, Math.round(duration / 60), JSON.stringify(metadata)],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            // 更新用户学习进度
            await this.updateUserLearningProgress(userId, activityData);

            return result.insertId;
        } catch (error) {
            console.error('记录学习行为失败:', error);
            throw error;
        }
    }

    /**
     * 更新用户学习进度
     */
    async updateUserLearningProgress(userId, activityData) {
        try {
            // 获取当前用户的学习进度
            const userProfiles = await new Promise((resolve, reject) => {
                connection.query(
                    'SELECT learning_progress, total_learning_hours FROM user_profile WHERE user_id = ?',
                    [userId],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            let learningProgress = {
                skills: {},
                learning_paths: {},
                recent_activities: [],
                weekly_stats: {
                    total_hours: 0,
                    days_active: 0,
                    completed_items: 0
                }
            };

            if (userProfiles.length > 0 && userProfiles[0].learning_progress) {
                learningProgress = typeof userProfiles[0].learning_progress === 'string'
                    ? JSON.parse(userProfiles[0].learning_progress)
                    : userProfiles[0].learning_progress;
            }

            // 更新技能掌握度 - 累积更新而不是覆盖
            const skillProficiency = await calculateSkillProficiency(userId, activityData);
            Object.keys(skillProficiency).forEach(skill => {
                const currentProficiency = learningProgress.skills[skill] || 0;
                learningProgress.skills[skill] = Math.min(1, currentProficiency + skillProficiency[skill]);
            });

            // 添加最近活动
            learningProgress.recent_activities.unshift({
                type: activityData.learningType,
                itemId: activityData.itemId,
                duration: activityData.duration,
                timestamp: new Date().toISOString()
            });

            // 限制最近活动数量
            if (learningProgress.recent_activities.length > 10) {
                learningProgress.recent_activities = learningProgress.recent_activities.slice(0, 10);
            }

            // 更新每周统计
            const currentWeek = this.getCurrentWeek();
            if (!learningProgress.weekly_stats.week) {
                learningProgress.weekly_stats.week = currentWeek;
            }

            if (learningProgress.weekly_stats.week === currentWeek) {
                learningProgress.weekly_stats.total_hours += activityData.duration / 3600;
                learningProgress.weekly_stats.completed_items +=
                    activityData.completionStatus === 'completed' ? 1 : 0;
            } else {
                // 新的一周，重置统计
                learningProgress.weekly_stats = {
                    week: currentWeek,
                    total_hours: activityData.duration / 3600,
                    days_active: 1,
                    completed_items: activityData.completionStatus === 'completed' ? 1 : 0
                };
            }

            // 计算总学习时长
            const totalLearningHours = userProfiles.length > 0 ?
                userProfiles[0].total_learning_hours + (activityData.duration / 3600) :
                activityData.duration / 3600;

            // 更新数据库
            await new Promise((resolve, reject) => {
                connection.query(
                    `UPDATE user_profile 
         SET learning_progress = ?, total_learning_hours = ?, last_learning_date = CURDATE() 
         WHERE user_id = ?`,
                    [JSON.stringify(learningProgress), totalLearningHours, userId],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            // 清除缓存
            this.cache.delete(`progress_${userId}`);

            return learningProgress;
        } catch (error) {
            console.error('更新学习进度失败:', error);
            throw error;
        }
    }

    /**
     * 获取用户学习进度
     */
    async getUserLearningProgress(userId) {
        const cacheKey = `progress_${userId}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const userProfiles = await new Promise((resolve, reject) => {
                connection.query(
                    'SELECT learning_progress, total_learning_hours, learning_goals, achievements FROM user_profile WHERE user_id = ?',
                    [userId],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            if (userProfiles.length === 0) {
                return this.getDefaultProgress();
            }

            const progress = {
                ...(typeof userProfiles[0].learning_progress === 'string'
                    ? JSON.parse(userProfiles[0].learning_progress)
                    : userProfiles[0].learning_progress || {}),
                total_learning_hours: userProfiles[0].total_learning_hours,
                goals: typeof userProfiles[0].learning_goals === 'string'
                    ? JSON.parse(userProfiles[0].learning_goals || '[]')
                    : userProfiles[0].learning_goals || [],
                achievements: typeof userProfiles[0].achievements === 'string'
                    ? JSON.parse(userProfiles[0].achievements || '[]')
                    : userProfiles[0].achievements || []
            };

            // 生成学习建议（暂时禁用）
            progress.recommendations = [];

            // 缓存结果（5分钟）
            this.cache.set(cacheKey, progress);
            setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

            return progress;
        } catch (error) {
            console.error('获取学习进度失败:', error);
            return this.getDefaultProgress();
        }
    }

    /**
     * 获取社区学习统计
     */
    async getCommunityLearningStats() {
        const cacheKey = 'community_stats';

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // 获取今日统计
            const todayStats = await new Promise((resolve, reject) => {
                connection.query(
                    'SELECT * FROM community_learning_stats WHERE stat_date = CURDATE()',
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            if (todayStats.length > 0) {
                const stats = {
                    ...todayStats[0],
                    top_skills: typeof todayStats[0].top_skills === 'string'
                        ? JSON.parse(todayStats[0].top_skills)
                        : todayStats[0].top_skills
                };

                // 缓存结果（10分钟）
                this.cache.set(cacheKey, stats);
                setTimeout(() => this.cache.delete(cacheKey), 10 * 60 * 1000);

                return stats;
            }

            // 如果没有今日统计，计算实时数据
            const realTimeStats = await this.calculateRealTimeCommunityStats();

            // 保存到数据库
            await new Promise((resolve, reject) => {
                connection.query(
                    `INSERT INTO community_learning_stats 
         (stat_date, total_users, average_learning_hours, top_skills, active_users_count) 
         VALUES (CURDATE(), ?, ?, ?, ?)`,
                    [realTimeStats.total_users, realTimeStats.average_learning_hours,
                    JSON.stringify(realTimeStats.top_skills), realTimeStats.active_users_count],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            this.cache.set(cacheKey, realTimeStats);
            setTimeout(() => this.cache.delete(cacheKey), 10 * 60 * 1000);

            return realTimeStats;
        } catch (error) {
            console.error('获取社区统计失败:', error);
            return this.getDefaultCommunityStats();
        }
    }

    /**
     * 计算实时社区统计
     */
    async calculateRealTimeCommunityStats() {
        try {
            // 获取总用户数
            const userCount = await new Promise((resolve, reject) => {
                connection.query('SELECT COUNT(*) as count FROM vip', (error, results) => {
                    if (error) reject(error);
                    else resolve(results);
                });
            });

            // 获取活跃用户数（今天有学习记录的用户）
            const activeUsers = await new Promise((resolve, reject) => {
                connection.query(
                    'SELECT COUNT(DISTINCT user_id) as count FROM user_behavior WHERE DATE(created_at) = CURDATE()',
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            // 获取平均学习时长
            const avgHours = await new Promise((resolve, reject) => {
                connection.query(
                    'SELECT AVG(total_learning_hours) as avg_hours FROM user_profile WHERE total_learning_hours > 0',
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            // 获取热门技能分布
            const topSkills = await new Promise((resolve, reject) => {
                connection.query(`
                    SELECT cf.tech_stack, COUNT(*) as count 
                    FROM content_features cf
                    JOIN user_behavior ub ON cf.item_id = ub.item_id AND cf.item_type = ub.item_type
                    WHERE cf.tech_stack IS NOT NULL AND DATE(ub.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                    GROUP BY cf.tech_stack
                    ORDER BY count DESC
                    LIMIT 10
                `, (error, results) => {
                    if (error) reject(error);
                    else resolve(results);
                });
            });

            const topSkillsObj = {};
            topSkills.forEach(skill => {
                topSkillsObj[skill.tech_stack] = skill.count;
            });

            return {
                total_users: userCount[0].count,
                average_learning_hours: parseFloat(avgHours[0].avg_hours || 0),
                top_skills: topSkillsObj,
                active_users_count: activeUsers[0].count
            };
        } catch (error) {
            console.error('计算实时统计失败:', error);
            return this.getDefaultCommunityStats();
        }
    }

    /**
     * 设置学习目标
     */
    async setLearningGoal(userId, goalData) {
        try {
            const userProfiles = await new Promise((resolve, reject) => {
                connection.query(
                    'SELECT learning_goals FROM user_profile WHERE user_id = ?',
                    [userId],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            let goals = [];
            if (userProfiles.length > 0 && userProfiles[0].learning_goals) {
                goals = typeof userProfiles[0].learning_goals === 'string'
                    ? JSON.parse(userProfiles[0].learning_goals)
                    : userProfiles[0].learning_goals;
            }

            const newGoal = {
                id: `goal_${Date.now()}`,
                ...goalData,
                created_at: new Date().toISOString(),
                progress: 0,
                status: 'active'
            };

            goals.push(newGoal);

            await new Promise((resolve, reject) => {
                connection.query(
                    'UPDATE user_profile SET learning_goals = ? WHERE user_id = ?',
                    [JSON.stringify(goals), userId],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            // 清除缓存
            this.cache.delete(`progress_${userId}`);

            return newGoal;
        } catch (error) {
            console.error('设置学习目标失败:', error);
            throw error;
        }
    }

    /**
     * 解锁成就
     */
    async unlockAchievement(userId, achievementId, achievementData) {
        try {
            const userProfiles = await new Promise((resolve, reject) => {
                connection.query(
                    'SELECT achievements FROM user_profile WHERE user_id = ?',
                    [userId],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            let achievements = [];
            if (userProfiles.length > 0 && userProfiles[0].achievements) {
                achievements = typeof userProfiles[0].achievements === 'string'
                    ? JSON.parse(userProfiles[0].achievements)
                    : userProfiles[0].achievements;
            }

            // 检查是否已经解锁
            if (achievements.find(a => a.id === achievementId)) {
                return null;
            }

            const newAchievement = {
                id: achievementId,
                ...achievementData,
                unlocked_at: new Date().toISOString()
            };

            achievements.push(newAchievement);

            await new Promise((resolve, reject) => {
                connection.query(
                    'UPDATE user_profile SET achievements = ? WHERE user_id = ?',
                    [JSON.stringify(achievements), userId],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });

            // 清除缓存
            this.cache.delete(`progress_${userId}`);

            return newAchievement;
        } catch (error) {
            console.error('解锁成就失败:', error);
            throw error;
        }
    }

    /**
     * 获取当前周数
     */
    getCurrentWeek() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const pastDaysOfYear = (now - startOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    }

    /**
     * 默认学习进度
     */
    getDefaultProgress() {
        return {
            skills: {},
            learning_paths: {},
            recent_activities: [],
            weekly_stats: {
                total_hours: 0,
                days_active: 0,
                completed_items: 0
            },
            total_learning_hours: 0,
            goals: [],
            achievements: [],
            recommendations: []
        };
    }

    /**
     * 默认社区统计
     */
    getDefaultCommunityStats() {
        return {
            total_users: 0,
            average_learning_hours: 0,
            top_skills: {},
            active_users_count: 0
        };
    }
}

module.exports = new LearningAnalyticsService();
