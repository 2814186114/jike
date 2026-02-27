const { connection } = require('./db');

// 辅助函数：将connection.query转换为Promise
const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
};

class RecommendationService {
    constructor() {
        this.userSimilarityCache = new Map();
        this.contentSimilarityCache = new Map();
    }

    // 记录用户行为
    async recordUserBehavior(userId, itemId, itemType, actionType, metadata = {}) {
        const sql = `
      INSERT INTO user_behavior (user_id, item_id, item_type, action_type, duration, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

        try {
            const result = await queryAsync(sql, [
                userId,
                itemId,
                itemType,
                actionType,
                metadata.duration || 0,
                JSON.stringify(metadata)
            ]);

            // 异步更新用户画像
            this.updateUserProfile(userId);

            return result;
        } catch (error) {
            console.error('记录用户行为失败:', error);
            throw error;
        }
    }

    // 更新用户兴趣画像
    async updateUserProfile(userId) {
        try {
            // 获取用户最近的行为数据
            const behaviorSql = `
        SELECT item_id, item_type, action_type, duration, created_at
        FROM user_behavior 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 100
      `;
            const behaviors = await queryAsync(behaviorSql, [userId]);

            // 分析用户兴趣标签
            const interestTags = await this.analyzeUserInterests(userId, behaviors);

            // 分析行为模式
            const behaviorPattern = this.analyzeBehaviorPattern(behaviors);

            // 更新用户画像
            const upsertSql = `
        INSERT INTO user_profile (user_id, interest_tags, behavior_pattern)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          interest_tags = VALUES(interest_tags),
          behavior_pattern = VALUES(behavior_pattern),
          last_updated = CURRENT_TIMESTAMP
      `;

            await queryAsync(upsertSql, [
                userId,
                JSON.stringify(interestTags),
                JSON.stringify(behaviorPattern)
            ]);

        } catch (error) {
            console.error('更新用户画像失败:', error);
        }
    }

    // 分析用户兴趣标签
    async analyzeUserInterests(userId, behaviors) {
        const interestWeights = {};

        for (const behavior of behaviors) {
            // 获取内容特征
            const featureSql = `
        SELECT tags, tech_stack
        FROM content_features 
        WHERE item_id = ? AND item_type = ?
      `;
            const features = await queryAsync(featureSql, [behavior.item_id, behavior.item_type]);

            if (features.length > 0) {
                const feature = features[0];

                // 根据行为类型计算权重
                let weight = 0;
                switch (behavior.action_type) {
                    case 'view':
                        weight = 0.1 + (Math.min(behavior.duration, 300) / 300) * 0.4; // 基于停留时间
                        break;
                    case 'like':
                        weight = 0.8;
                        break;
                    case 'collect':
                        weight = 1.0;
                        break;
                    case 'comment':
                        weight = 0.9;
                        break;
                    default:
                        weight = 0.2;
                }

                // 时间衰减因子 (最近的行为权重更高)
                const timeDiff = Date.now() - new Date(behavior.created_at).getTime();
                const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
                const timeDecay = Math.exp(-daysDiff / 30); // 30天衰减周期

                weight *= timeDecay;

                // 处理技术栈标签
                if (feature.tech_stack) {
                    const techTags = feature.tech_stack.split(',').map(tag => tag.trim());
                    techTags.forEach(tag => {
                        interestWeights[tag] = (interestWeights[tag] || 0) + weight;
                    });
                }

                // 处理标签
                if (feature.tags) {
                    let tags = [];

                    // 检查tags的类型
                    if (typeof feature.tags === 'string') {
                        try {
                            // 先尝试解析为JSON
                            const parsedTags = JSON.parse(feature.tags);
                            if (Array.isArray(parsedTags)) {
                                tags = parsedTags;
                            } else {
                                // 如果不是数组，按逗号分割
                                tags = feature.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
                            }
                        } catch (e) {
                            // 如果不是JSON，按逗号分割
                            tags = feature.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
                        }
                    } else if (Array.isArray(feature.tags)) {
                        // 如果已经是数组，直接使用
                        tags = feature.tags;
                    } else if (typeof feature.tags === 'object') {
                        // 如果是对象，提取键
                        tags = Object.keys(feature.tags);
                    }

                    // 处理标签
                    tags.forEach(tag => {
                        interestWeights[tag] = (interestWeights[tag] || 0) + weight;
                    });
                }
            }
        }

        // 归一化权重到0-1范围
        const maxWeight = Math.max(...Object.values(interestWeights), 1);
        Object.keys(interestWeights).forEach(tag => {
            interestWeights[tag] = interestWeights[tag] / maxWeight;
        });

        return interestWeights;
    }

    // 分析行为模式
    analyzeBehaviorPattern(behaviors) {
        const pattern = {
            activeHours: {},
            preferredCategories: {},
            avgSessionDuration: 0
        };

        let totalDuration = 0;
        behaviors.forEach(behavior => {
            // 分析活跃时间段
            const hour = new Date(behavior.created_at).getHours();
            pattern.activeHours[hour] = (pattern.activeHours[hour] || 0) + 1;

            // 累加停留时间
            totalDuration += behavior.duration || 0;
        });

        pattern.avgSessionDuration = behaviors.length > 0 ? totalDuration / behaviors.length : 0;

        return pattern;
    }

    // 获取推荐内容
    async getRecommendations(userId, type = 'hybrid', limit = 10) {
        try {
            let recommendations = [];

            switch (type) {
                case 'content_based':
                    recommendations = await this.getContentBasedRecommendations(userId, limit);
                    break;
                case 'collaborative':
                    recommendations = await this.getCollaborativeRecommendations(userId, limit);
                    break;
                case 'popular':
                    recommendations = await this.getPopularRecommendations(limit);
                    break;
                default: // hybrid
                    const [contentRecs, collaborativeRecs, popularRecs] = await Promise.all([
                        this.getContentBasedRecommendations(userId, Math.ceil(limit * 0.4)),
                        this.getCollaborativeRecommendations(userId, Math.ceil(limit * 0.4)),
                        this.getPopularRecommendations(Math.ceil(limit * 0.2))
                    ]);
                    recommendations = [...contentRecs, ...collaborativeRecs, ...popularRecs];
            }

            // 去重和排序
            const uniqueRecs = this.deduplicateAndSort(recommendations, limit);

            return uniqueRecs;
        } catch (error) {
            console.error('获取推荐失败:', error);
            // 返回热门内容作为备选
            return this.getPopularRecommendations(limit);
        }
    }

    // 基于内容的推荐
    async getContentBasedRecommendations(userId, limit) {
        // 获取用户兴趣画像
        const profileSql = `SELECT interest_tags FROM user_profile WHERE user_id = ?`;
        const profiles = await queryAsync(profileSql, [userId]);

        if (profiles.length === 0) {
            return this.getPopularRecommendations(limit);
        }

        let interestTags = {};
        try {
            // 安全解析兴趣标签
            const interestTagsStr = profiles[0].interest_tags;
            if (typeof interestTagsStr === 'string') {
                interestTags = JSON.parse(interestTagsStr);
            } else if (typeof interestTagsStr === 'object') {
                interestTags = interestTagsStr;
            }
        } catch (error) {
            console.error('解析用户兴趣标签失败:', error);
            return this.getPopularRecommendations(limit);
        }

        const userTags = Object.keys(interestTags);

        if (userTags.length === 0) {
            return this.getPopularRecommendations(limit);
        }

        // 计算内容相似度
        const contentSql = `
      SELECT cf.*, 
             a.title, a.content, a.author, a.publish_date, a.views,
             'article' as source_table
      FROM content_features cf
      JOIN articles a ON cf.item_id = a.id AND cf.item_type = 'article'
      WHERE cf.tags IS NOT NULL
      UNION
      SELECT cf.*,
             ma.title, ma.content, NULL as author, ma.updatedAt as publish_date, 0 as views,
             'my_article' as source_table
      FROM content_features cf
      JOIN my_articles ma ON cf.item_id = ma.id AND cf.item_type = 'my_article'
      WHERE cf.tags IS NOT NULL
    `;

        const contents = await queryAsync(contentSql);

        const scoredContents = contents.map(content => {
            let score = 0;

            // 计算标签相似度
            let contentTags = [];

            // 检查tags的类型
            if (typeof content.tags === 'string') {
                try {
                    // 先尝试解析为JSON
                    const parsedTags = JSON.parse(content.tags);
                    if (Array.isArray(parsedTags)) {
                        contentTags = parsedTags;
                    } else {
                        // 如果不是数组，按逗号分割
                        contentTags = content.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
                    }
                } catch (e) {
                    // 如果不是JSON，按逗号分割
                    contentTags = content.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
                }
            } else if (Array.isArray(content.tags)) {
                // 如果已经是数组，直接使用
                contentTags = content.tags;
            } else if (typeof content.tags === 'object') {
                // 如果是对象，提取键
                contentTags = Object.keys(content.tags);
            }

            const commonTags = contentTags.filter(tag => userTags.includes(tag));
            commonTags.forEach(tag => {
                score += interestTags[tag] || 0;
            });

            // 技术栈匹配
            if (content.tech_stack && userTags.some(tag => content.tech_stack.includes(tag))) {
                score += 0.5;
            }

            // 热度加成
            score += Math.log(content.views + 1) * 0.1;

            return {
                ...content,
                score,
                recommendation_type: 'content_based'
            };
        });

        return scoredContents
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    // 协同过滤推荐
    async getCollaborativeRecommendations(userId, limit) {
        // 简化版协同过滤 - 基于用户相似度
        const similarUsers = await this.findSimilarUsers(userId, 5);

        if (similarUsers.length === 0) {
            return [];
        }

        // 获取相似用户喜欢的内容
        const similarUserIds = similarUsers.map(user => user.user_id);
        const placeholders = similarUserIds.map(() => '?').join(',');

        const behaviorSql = `
      SELECT DISTINCT ub.item_id, ub.item_type, COUNT(*) as interaction_count
      FROM user_behavior ub
      WHERE ub.user_id IN (${placeholders}) 
        AND ub.action_type IN ('like', 'collect', 'comment')
        AND ub.item_id NOT IN (
          SELECT item_id FROM user_behavior 
          WHERE user_id = ? AND action_type IN ('view', 'like', 'collect', 'comment')
        )
      GROUP BY ub.item_id, ub.item_type
      ORDER BY interaction_count DESC
      LIMIT ?
    `;

        const behaviors = await queryAsync(behaviorSql, [...similarUserIds, userId, limit * 2]);

        // 获取内容详情
        const recommendations = [];
        for (const behavior of behaviors) {
            const content = await this.getContentDetails(behavior.item_id, behavior.item_type);
            if (content) {
                recommendations.push({
                    ...content,
                    score: behavior.interaction_count / similarUsers.length,
                    recommendation_type: 'collaborative'
                });
            }
        }

        return recommendations.slice(0, limit);
    }

    // 查找相似用户
    async findSimilarUsers(userId, limit) {
        const cacheKey = `similar_users_${userId}`;
        if (this.userSimilarityCache.has(cacheKey)) {
            return this.userSimilarityCache.get(cacheKey);
        }

        // 获取目标用户的兴趣标签
        const targetProfileSql = `SELECT interest_tags FROM user_profile WHERE user_id = ?`;
        const targetProfiles = await queryAsync(targetProfileSql, [userId]);

        if (targetProfiles.length === 0) {
            return [];
        }

        let targetTags = {};
        try {
            // 安全解析目标用户兴趣标签
            const targetTagsStr = targetProfiles[0].interest_tags;
            if (typeof targetTagsStr === 'string') {
                targetTags = JSON.parse(targetTagsStr);
            } else if (typeof targetTagsStr === 'object') {
                targetTags = targetTagsStr;
            }
        } catch (error) {
            console.error('解析目标用户兴趣标签失败:', error);
            return [];
        }

        // 获取其他用户的兴趣标签
        const otherProfilesSql = `
      SELECT user_id, interest_tags 
      FROM user_profile 
      WHERE user_id != ? AND interest_tags IS NOT NULL
    `;
        const otherProfiles = await queryAsync(otherProfilesSql, [userId]);

        // 计算相似度
        const similarities = otherProfiles.map(profile => {
            let otherTags = {};
            try {
                // 安全解析其他用户兴趣标签
                const otherTagsStr = profile.interest_tags;
                if (typeof otherTagsStr === 'string') {
                    otherTags = JSON.parse(otherTagsStr);
                } else if (typeof otherTagsStr === 'object') {
                    otherTags = otherTagsStr;
                }
            } catch (error) {
                console.error('解析其他用户兴趣标签失败:', error);
                return null;
            }

            const similarity = this.calculateCosineSimilarity(targetTags, otherTags);
            return {
                user_id: profile.user_id,
                similarity
            };
        }).filter(item => item !== null); // 过滤掉解析失败的用户

        const similarUsers = similarities
            .filter(user => user.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        // 缓存结果
        this.userSimilarityCache.set(cacheKey, similarUsers);
        setTimeout(() => this.userSimilarityCache.delete(cacheKey), 5 * 60 * 1000); // 5分钟缓存

        return similarUsers;
    }

    // 计算余弦相似度
    calculateCosineSimilarity(tags1, tags2) {
        const allTags = new Set([...Object.keys(tags1), ...Object.keys(tags2)]);

        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;

        for (const tag of allTags) {
            const weight1 = tags1[tag] || 0;
            const weight2 = tags2[tag] || 0;

            dotProduct += weight1 * weight2;
            magnitude1 += weight1 * weight1;
            magnitude2 += weight2 * weight2;
        }

        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);

        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }

        return dotProduct / (magnitude1 * magnitude2);
    }

    // 获取热门推荐
    async getPopularRecommendations(limit) {
        const sql = `
      (SELECT a.id, a.title, a.content, a.author, a.publish_date, a.views, a.tech_stack,
              'article' as source_table, cf.tags, cf.popularity_score
       FROM articles a
       LEFT JOIN content_features cf ON cf.item_id = a.id AND cf.item_type = 'article'
       ORDER BY a.views DESC, cf.popularity_score DESC
       LIMIT ?)
      UNION
      (SELECT ma.id, ma.title, ma.content, NULL as author, ma.updatedAt as publish_date, 0 as views, ma.tech_stack,
              'my_article' as source_table, cf.tags, cf.popularity_score
       FROM my_articles ma
       LEFT JOIN content_features cf ON cf.item_id = ma.id AND cf.item_type = 'my_article'
       ORDER BY cf.popularity_score DESC, ma.updatedAt DESC
       LIMIT ?)
    `;

        const contents = await queryAsync(sql, [limit, limit]);

        return contents.map(content => ({
            ...content,
            score: (content.views || 0) + (content.popularity_score || 0),
            recommendation_type: 'popular'
        })).slice(0, limit);
    }

    // 获取内容详情
    async getContentDetails(itemId, itemType) {
        let sql, params;

        if (itemType === 'article') {
            sql = `
        SELECT a.*, cf.tags, cf.tech_stack, cf.popularity_score, 'article' as source_table
        FROM articles a
        LEFT JOIN content_features cf ON cf.item_id = a.id AND cf.item_type = 'article'
        WHERE a.id = ?
      `;
            params = [itemId];
        } else {
            sql = `
        SELECT ma.*, cf.tags, cf.tech_stack, cf.popularity_score, 'my_article' as source_table
        FROM my_articles ma
        LEFT JOIN content_features cf ON cf.item_id = ma.id AND cf.item_type = 'my_article'
        WHERE ma.id = ?
      `;
            params = [itemId];
        }

        const contents = await queryAsync(sql, params);
        return contents.length > 0 ? contents[0] : null;
    }

    // 去重和排序
    deduplicateAndSort(recommendations, limit) {
        const seen = new Set();
        const uniqueRecs = [];

        for (const rec of recommendations) {
            const key = `${rec.source_table}_${rec.id}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueRecs.push(rec);
            }
        }

        return uniqueRecs
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    // 初始化内容特征（为现有内容生成特征）
    async initializeContentFeatures() {
        console.log('开始初始化内容特征...');

        // 处理文章
        const articlesSql = `SELECT id, title, content, tech_stack FROM articles`;
        const articles = await queryAsync(articlesSql);

        for (const article of articles) {
            await this.updateContentFeatures(article.id, 'article', {
                title: article.title,
                content: article.content,
                tech_stack: article.tech_stack
            });
        }

        // 处理用户文章
        const myArticlesSql = `SELECT id, title, content, tech_stack FROM my_articles`;
        const myArticles = await queryAsync(myArticlesSql);

        for (const article of myArticles) {
            await this.updateContentFeatures(article.id, 'my_article', {
                title: article.title,
                content: article.content,
                tech_stack: article.tech_stack
            });
        }

        console.log('内容特征初始化完成');
    }

    // 更新内容特征
    async updateContentFeatures(itemId, itemType, content) {
        // 提取关键词和标签
        const tags = this.extractTags(content);
        const techStack = content.tech_stack || '';

        // 计算热度分数（基于浏览量、发布时间等）
        const popularityScore = await this.calculatePopularityScore(itemId, itemType);

        const sql = `
      INSERT INTO content_features (item_id, item_type, tags, tech_stack, popularity_score)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        tags = VALUES(tags),
        tech_stack = VALUES(tech_stack),
        popularity_score = VALUES(popularity_score),
        updated_at = CURRENT_TIMESTAMP
    `;

        await queryAsync(sql, [
            itemId,
            itemType,
            JSON.stringify(tags),
            techStack,
            popularityScore
        ]);
    }

    // 提取标签
    extractTags(content) {
        const tags = new Set();

        // 从标题和内容中提取关键词
        const text = `${content.title} ${content.content}`.toLowerCase();

        // 常见技术关键词
        const techKeywords = [
            'react', 'vue', 'angular', 'javascript', 'typescript', 'nodejs', 'express',
            'mongodb', 'mysql', 'postgresql', 'redis', 'docker', 'kubernetes',
            'aws', 'azure', 'gcp', 'html', 'css', 'sass', 'less', 'webpack',
            'vite', 'babel', 'jest', 'cypress', 'git', 'ci/cd', 'rest', 'graphql'
        ];

        techKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                tags.add(keyword);
            }
        });

        // 从技术栈字段提取
        if (content.tech_stack) {
            content.tech_stack.split(',').forEach(tech => {
                const trimmed = tech.trim().toLowerCase();
                if (trimmed) tags.add(trimmed);
            });
        }

        return Array.from(tags);
    }

    // 计算热度分数
    async calculatePopularityScore(itemId, itemType) {
        let score = 0;

        if (itemType === 'article') {
            const sql = `SELECT views, publish_date FROM articles WHERE id = ?`;
            const articles = await queryAsync(sql, [itemId]);

            if (articles.length > 0) {
                const article = articles[0];

                // 浏览量贡献
                score += Math.log(article.views + 1) * 10;

                // 时间衰减（新内容有加成）
                const daysOld = (Date.now() - new Date(article.publish_date).getTime()) / (1000 * 60 * 60 * 24);
                const timeBonus = Math.max(0, 30 - daysOld) / 30; // 30天内的新内容有加成
                score += timeBonus * 20;
            }
        }

        // 用户互动加分
        const interactionSql = `
      SELECT COUNT(*) as interaction_count 
      FROM user_behavior 
      WHERE item_id = ? AND item_type = ? 
        AND action_type IN ('like', 'collect', 'comment')
    `;
        const interactions = await queryAsync(interactionSql, [itemId, itemType]);

        score += interactions[0].interaction_count * 5;

        return score;
    }
}

module.exports = new RecommendationService();
