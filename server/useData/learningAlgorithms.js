/**
 * 学习分析算法模块
 * 包含技能掌握度计算、学习推荐、成就检测等算法
 */

const { connection } = require('./db');

/**
 * 计算技能掌握度 - 改进版
 * 基于学习质量、完成度、时长等多维度计算
 */
async function calculateSkillProficiency(userId, activityData) {
    try {
        const { itemId, itemType, learningType, duration, completionStatus, proficiencyLevel } = activityData;

        // 获取内容特征
        const contentFeatures = await new Promise((resolve, reject) => {
            connection.query(
                'SELECT tech_stack, tags FROM content_features WHERE item_id = ? AND item_type = ?',
                [itemId, itemType],
                (error, results) => {
                    if (error) reject(error);
                    else resolve(results);
                }
            );
        });

        if (contentFeatures.length === 0) {
            // 返回默认技能基于学习类型
            const defaultSkills = {
                'read': ['javascript', 'react'],
                'practice': ['javascript', 'nodejs'],
                'project': ['react', 'vue', 'nodejs'],
                'test': ['javascript', 'html', 'css']
            };

            const skills = defaultSkills[learningType] || ['general'];
            const result = {};

            skills.forEach(skill => {
                // 基础增量基于学习类型
                let baseIncrease = 0.05;
                switch (learningType) {
                    case 'practice': baseIncrease = 0.08; break;
                    case 'project': baseIncrease = 0.12; break;
                    case 'test': baseIncrease = completionStatus === 'completed' ? 0.15 : 0.05; break;
                    default: baseIncrease = 0.05;
                }

                // 根据完成度调整
                let completionMultiplier = 1.0;
                switch (completionStatus) {
                    case 'completed': completionMultiplier = 1.2; break;
                    case 'abandoned': completionMultiplier = 0.3; break;
                    case 'started': completionMultiplier = 0.1; break;
                }

                // 根据时长调整 (30-60分钟为最佳区间)
                let durationMultiplier = 1.0;
                if (duration > 0) {
                    const optimalMinutes = Math.min(Math.max(duration / 60, 10), 120); // 10分钟到2小时
                    durationMultiplier = Math.min(optimalMinutes / 30, 1.5); // 最多1.5倍
                }

                result[skill] = Math.min(1, baseIncrease * completionMultiplier * durationMultiplier);
            });

            return result;
        }

        const feature = contentFeatures[0];
        const skillProficiency = {};

        // 从技术栈中提取技能
        if (feature.tech_stack) {
            const skills = feature.tech_stack.split(',').map(s => s.trim());

            skills.forEach(skill => {
                // 基础增量基于学习类型
                let baseIncrease = 0.05;
                switch (learningType) {
                    case 'practice': baseIncrease = 0.08; break;
                    case 'project': baseIncrease = 0.12; break;
                    case 'test': baseIncrease = completionStatus === 'completed' ? 0.15 : 0.05; break;
                    default: baseIncrease = 0.05;
                }

                // 根据完成度调整
                let completionMultiplier = 1.0;
                switch (completionStatus) {
                    case 'completed': completionMultiplier = 1.2; break;
                    case 'abandoned': completionMultiplier = 0.3; break;
                    case 'started': completionMultiplier = 0.1; break;
                }

                // 根据时长调整 (30-60分钟为最佳区间)
                let durationMultiplier = 1.0;
                if (duration > 0) {
                    const optimalMinutes = Math.min(Math.max(duration / 60, 10), 120); // 10分钟到2小时
                    durationMultiplier = Math.min(optimalMinutes / 30, 1.5); // 最多1.5倍
                }

                skillProficiency[skill] = Math.min(1, baseIncrease * completionMultiplier * durationMultiplier);
            });
        }

        return skillProficiency;
    } catch (error) {
        console.error('计算技能掌握度失败:', error);
        return {};
    }
}

/**
 * 生成学习推荐
 */
async function generateLearningRecommendations(userId, progress) {
    try {
        const recommendations = [];
        const userSkills = progress.skills || {};

        // 获取用户最近的学习行为
        const [recentActivities] = await require('./db').execute(
            `SELECT ub.item_id, ub.item_type, cf.tech_stack, cf.tags 
       FROM user_behavior ub
       JOIN content_features cf ON ub.item_id = cf.item_id AND ub.item_type = cf.item_type
       WHERE ub.user_id = ? AND ub.learning_type IS NOT NULL
       ORDER BY ub.created_at DESC LIMIT 20`,
            [userId]
        );

        // 推荐1: 基于技能提升的推荐
        const skillBasedRecs = await generateSkillBasedRecommendations(userSkills, recentActivities);
        recommendations.push(...skillBasedRecs);

        // 推荐2: 基于学习路径的推荐
        const pathBasedRecs = await generatePathBasedRecommendations(userSkills, recentActivities);
        recommendations.push(...pathBasedRecs);

        // 推荐3: 基于社区热门的推荐
        const popularRecs = await generatePopularRecommendations();
        recommendations.push(...popularRecs);

        // 去重并限制数量
        const uniqueRecs = recommendations.filter((rec, index, self) =>
            index === self.findIndex(r => r.itemId === rec.itemId && r.itemType === rec.itemType)
        ).slice(0, 5);

        return uniqueRecs;
    } catch (error) {
        console.error('生成学习推荐失败:', error);
        return [];
    }
}

/**
 * 基于技能提升的推荐
 */
async function generateSkillBasedRecommendations(userSkills, recentActivities) {
    const recommendations = [];

    try {
        // 找出用户掌握度较低的技能
        const weakSkills = Object.entries(userSkills)
            .filter(([skill, proficiency]) => proficiency < 0.6)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 3)
            .map(([skill]) => skill);

        for (const skill of weakSkills) {
            const [relatedContent] = await require('./db').execute(
                `SELECT item_id, item_type, tech_stack, tags, popularity_score 
         FROM content_features 
         WHERE tech_stack LIKE ?
         ORDER BY popularity_score DESC 
         LIMIT 3`,
                [`%${skill}%`]
            );

            relatedContent.forEach(content => {
                recommendations.push({
                    type: 'skill_improvement',
                    skill: skill,
                    reason: `提升${skill}技能掌握度`,
                    itemId: content.item_id,
                    itemType: content.item_type,
                    confidence: 0.8 - (userSkills[skill] || 0)
                });
            });
        }
    } catch (error) {
        console.error('生成技能推荐失败:', error);
    }

    return recommendations;
}

/**
 * 基于学习路径的推荐 - 改进版
 * 考虑学习进度、技能掌握度、学习历史等多维度
 */
async function generatePathBasedRecommendations(userSkills, recentActivities) {
    const recommendations = [];

    try {
        // 分析最近学习的技术栈和学习进度
        const recentTechStacks = recentActivities
            .map(activity => activity.tech_stack)
            .filter(Boolean)
            .join(',')
            .split(',')
            .map(s => s.trim());

        // 统计技术栈出现频率和最近学习时间
        const techStackStats = {};
        recentTechStacks.forEach((stack, index) => {
            if (!techStackStats[stack]) {
                techStackStats[stack] = {
                    count: 0,
                    recentIndex: index, // 越小的index表示越近
                    skillLevel: userSkills[stack] || 0
                };
            }
            techStackStats[stack].count++;
        });

        // 计算技术栈推荐权重
        const techStackWeights = Object.entries(techStackStats).map(([stack, stats]) => {
            // 权重 = 频率权重 + 最近权重 + 技能水平权重
            const frequencyWeight = Math.min(stats.count / 5, 1); // 频率权重
            const recencyWeight = 1 - (stats.recentIndex / recentTechStacks.length); // 最近权重
            const skillWeight = 1 - stats.skillLevel; // 技能水平越低，权重越高

            const totalWeight = frequencyWeight * 0.4 + recencyWeight * 0.3 + skillWeight * 0.3;

            return {
                stack,
                weight: totalWeight,
                skillLevel: stats.skillLevel
            };
        });

        // 按权重排序，取前3个
        const topTechStacks = techStackWeights
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 3);

        for (const { stack: techStack, skillLevel } of topTechStacks) {
            // 根据技能水平推荐不同难度的内容
            let difficultyFilter = '';
            let limit = 2;

            if (skillLevel < 0.3) {
                // 新手：推荐基础内容
                difficultyFilter = 'AND popularity_score > 50';
                limit = 3;
            } else if (skillLevel < 0.7) {
                // 中级：推荐进阶内容
                difficultyFilter = 'AND popularity_score > 30';
                limit = 2;
            } else {
                // 高级：推荐深度内容
                difficultyFilter = '';
                limit = 1;
            }

            const [advancedContent] = await require('./db').execute(
                `SELECT item_id, item_type, tech_stack, tags 
         FROM content_features 
         WHERE tech_stack LIKE ? ${difficultyFilter}
         ORDER BY popularity_score DESC 
         LIMIT ?`,
                [`%${techStack}%`, limit]
            );

            advancedContent.forEach(content => {
                recommendations.push({
                    type: 'path_advancement',
                    skill: techStack,
                    reason: skillLevel < 0.3 ? `${techStack}基础学习` :
                        skillLevel < 0.7 ? `${techStack}进阶学习` : `${techStack}深度掌握`,
                    itemId: content.item_id,
                    itemType: content.item_type,
                    confidence: 0.8 - skillLevel // 技能水平越低，推荐置信度越高
                });
            });

            // 推荐相关技术栈，考虑技能关联性
            const relatedStacks = getRelatedTechStacks(techStack);
            for (const relatedStack of relatedStacks) {
                const relatedSkillLevel = userSkills[relatedStack] || 0;

                // 只推荐技能水平较低的相关技术
                if (relatedSkillLevel < 0.6) {
                    const [relatedContent] = await require('./db').execute(
                        `SELECT item_id, item_type, tech_stack, tags 
             FROM content_features 
             WHERE tech_stack LIKE ?
             ORDER BY popularity_score DESC 
             LIMIT 1`,
                        [`%${relatedStack}%`]
                    );

                    if (relatedContent.length > 0) {
                        recommendations.push({
                            type: 'related_skill',
                            skill: relatedStack,
                            reason: `拓展${techStack}相关技能：${relatedStack}`,
                            itemId: relatedContent[0].item_id,
                            itemType: relatedContent[0].item_type,
                            confidence: 0.7 - relatedSkillLevel
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('生成路径推荐失败:', error);
    }

    return recommendations;
}

/**
 * 基于社区热门的推荐
 */
async function generatePopularRecommendations() {
    const recommendations = [];

    try {
        const [popularContent] = await require('./db').execute(
            `SELECT cf.item_id, cf.item_type, cf.tech_stack, cf.tags, cf.popularity_score
       FROM content_features cf
       WHERE cf.popularity_score > 0
       ORDER BY cf.popularity_score DESC 
       LIMIT 3`
        );

        popularContent.forEach(content => {
            recommendations.push({
                type: 'community_popular',
                reason: '社区热门内容',
                itemId: content.item_id,
                itemType: content.item_type,
                confidence: 0.5
            });
        });
    } catch (error) {
        console.error('生成热门推荐失败:', error);
    }

    return recommendations;
}

/**
 * 检测成就解锁
 */
function checkAchievements(progress, activityData) {
    const achievements = [];

    // 成就1: 首次学习
    if (progress.total_learning_hours > 0 && progress.total_learning_hours - activityData.duration / 3600 <= 0) {
        achievements.push({
            id: 'first_learning',
            name: '首次学习',
            description: '完成了第一次学习',
            badge_url: '/badges/first_learning.png'
        });
    }

    // 成就2: 连续学习7天
    const weeklyStats = progress.weekly_stats || {};
    if (weeklyStats.days_active >= 7) {
        achievements.push({
            id: 'weekly_streak',
            name: '学习达人',
            description: '连续学习7天',
            badge_url: '/badges/weekly_streak.png'
        });
    }

    // 成就3: 技能掌握
    const userSkills = progress.skills || {};
    Object.entries(userSkills).forEach(([skill, proficiency]) => {
        if (proficiency >= 0.8) {
            achievements.push({
                id: `skill_master_${skill}`,
                name: `${skill}专家`,
                description: `掌握了${skill}技能`,
                badge_url: `/badges/skill_${skill}.png`
            });
        }
    });

    // 成就4: 学习时长里程碑
    const totalHours = progress.total_learning_hours || 0;
    if (totalHours >= 10 && totalHours - activityData.duration / 3600 < 10) {
        achievements.push({
            id: '10_hours',
            name: '学习爱好者',
            description: '累计学习10小时',
            badge_url: '/badges/10_hours.png'
        });
    }

    if (totalHours >= 50 && totalHours - activityData.duration / 3600 < 50) {
        achievements.push({
            id: '50_hours',
            name: '学习达人',
            description: '累计学习50小时',
            badge_url: '/badges/50_hours.png'
        });
    }

    return achievements;
}

/**
 * 获取相关技术栈
 */
function getRelatedTechStacks(techStack) {
    const relatedMap = {
        'react': ['javascript', 'typescript', 'redux', 'react-router'],
        'vue': ['javascript', 'typescript', 'vuex', 'vue-router'],
        'javascript': ['typescript', 'nodejs', 'es6'],
        'typescript': ['javascript', 'nodejs', 'angular'],
        'nodejs': ['javascript', 'express', 'mongodb'],
        'python': ['django', 'flask', 'machine-learning'],
        'java': ['spring', 'hibernate', 'android']
    };

    return relatedMap[techStack.toLowerCase()] || [];
}

/**
 * 计算学习效率
 */
function calculateLearningEfficiency(progress) {
    const weeklyStats = progress.weekly_stats || {};
    const totalHours = weeklyStats.total_hours || 0;
    const completedItems = weeklyStats.completed_items || 0;

    if (totalHours === 0) return 0;

    // 学习效率 = 完成项目数 / 学习时长
    const efficiency = completedItems / totalHours;

    // 标准化到0-1范围
    return Math.min(efficiency / 2, 1);
}

module.exports = {
    calculateSkillProficiency,
    generateLearningRecommendations,
    checkAchievements,
    calculateLearningEfficiency
};
