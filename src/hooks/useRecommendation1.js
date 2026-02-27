import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import offlineLearningManager from '../utils/offlineLearning';

// 推荐系统Hook - 重命名版本解决ChunkLoadError问题
export const useRecommendation1 = (options = {}) => {
    const { type = 'hybrid', limit = 10, autoFetch = true } = options;
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const currentUser = useSelector(state => state.user.userInfo);

    // 获取推荐内容
    const fetchRecommendations = useCallback(async (recommendationType = type) => {
        if (!currentUser?.id) {
            console.warn('用户未登录，无法获取个性化推荐');
            return;
        }

        console.log(`开始获取推荐数据，用户ID: ${currentUser.id}, 类型: ${recommendationType}`);
        setLoading(true);
        setError(null);

        try {
            const url = `http://localhost:3001/api/recommendation/recommendations/${currentUser.id}?type=${recommendationType}&limit=${limit}`;
            console.log('请求URL:', url);

            const response = await fetch(url);

            console.log('响应状态:', response.status);
            if (!response.ok) {
                throw new Error(`获取推荐失败: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('推荐数据获取成功:', result);

            if (result.success) {
                setRecommendations(result.data || []);
            } else {
                throw new Error(result.message || '获取推荐失败');
            }
        } catch (err) {
            console.error('获取推荐内容失败:', err);
            setError(err.message);
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, type, limit]);

    // 记录用户行为
    const recordBehavior = useCallback(async (behaviorData) => {
        if (!currentUser?.id) {
            console.warn('用户未登录，无法记录行为');
            return;
        }

        const { itemId, itemType = 'article', actionType, duration = 0, metadata = {} } = behaviorData;

        if (!itemId || !actionType) {
            console.error('缺少必需的行为数据: itemId, actionType');
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/recommendation/behavior', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    itemId,
                    itemType,
                    actionType,
                    duration,
                    metadata
                }),
            });

            if (!response.ok) {
                throw new Error(`记录行为失败: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                console.warn('行为记录可能未成功:', result.message);
            }

            // 行为记录后，异步更新推荐（如果行为可能影响推荐）
            if (['like', 'collect', 'comment'].includes(actionType)) {
                setTimeout(() => {
                    fetchRecommendations();
                }, 1000);
            }
        } catch (err) {
            console.error('记录用户行为失败:', err);
        }
    }, [currentUser?.id, fetchRecommendations]);

    // 自动获取推荐
    useEffect(() => {
        if (autoFetch && currentUser?.id) {
            fetchRecommendations();
        }
    }, [autoFetch, currentUser?.id, fetchRecommendations]);

    // 刷新推荐
    const refreshRecommendations = useCallback((newType) => {
        fetchRecommendations(newType || type);
    }, [fetchRecommendations, type]);

    return {
        recommendations,
        loading,
        error,
        refreshRecommendations,
        recordBehavior,
        hasRecommendations: recommendations.length > 0
    };
};

// 用户行为追踪Hook - 重命名版本
export const useBehaviorTracking1 = () => {
    const currentUser = useSelector(state => state.user.userInfo);

    const trackView = useCallback(async (itemId, itemType = 'article', duration = 0) => {
        if (!currentUser?.id) return;

        const behaviorData = {
            userId: currentUser.id,
            itemId,
            itemType,
            actionType: 'view',
            duration,
            metadata: {
                timestamp: Date.now(),
                userAgent: navigator.userAgent
            }
        };

        let onlineSuccess = false;

        if (navigator.onLine) {
            try {
                await fetch('http://localhost:3001/api/recommendation/behavior', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(behaviorData),
                });
                onlineSuccess = true;
                console.log('✅ 在线记录浏览行为成功');

                // 浏览行为后，异步更新推荐
                setTimeout(() => {
                    // 这里我们无法直接调用fetchRecommendations，因为不在同一个hook中
                    // 我们将在useRecommendationItem1中处理这个逻辑
                }, 1000);
            } catch (error) {
                console.warn('❌ 在线记录浏览行为失败:', error);
            }
        }

        if (!onlineSuccess) {
            // 如果离线或在线失败，保存到离线存储
            try {
                await offlineLearningManager.recordLearningBehavior({
                    type: 'recommendation_view',
                    itemId,
                    itemType,
                    duration,
                    metadata: behaviorData.metadata
                });
                console.log('💾 浏览行为已保存到离线数据库');
            } catch (offlineError) {
                console.error('❌ 保存到离线数据库失败:', offlineError);
            }
        }
    }, [currentUser?.id]);

    const trackLike = useCallback(async (itemId, itemType = 'article') => {
        if (!currentUser?.id) return;

        try {
            await fetch('http://localhost:3001/api/recommendation/behavior', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    itemId,
                    itemType,
                    actionType: 'like',
                    metadata: {
                        timestamp: Date.now()
                    }
                }),
            });
        } catch (error) {
            console.error('记录点赞行为失败:', error);
        }
    }, [currentUser?.id]);

    const trackCollect = useCallback(async (itemId, itemType = 'article') => {
        if (!currentUser?.id) return;

        try {
            await fetch('http://localhost:3001/api/recommendation/behavior', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    itemId,
                    itemType,
                    actionType: 'collect',
                    metadata: {
                        timestamp: Date.now()
                    }
                }),
            });
        } catch (error) {
            console.error('记录收藏行为失败:', error);
        }
    }, [currentUser?.id]);

    const trackComment = useCallback(async (itemId, itemType = 'article', commentLength = 0) => {
        if (!currentUser?.id) return;

        try {
            await fetch('http://localhost:3001/api/recommendation/behavior', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    itemId,
                    itemType,
                    actionType: 'comment',
                    metadata: {
                        timestamp: Date.now(),
                        commentLength
                    }
                }),
            });
        } catch (error) {
            console.error('记录评论行为失败:', error);
        }
    }, [currentUser?.id]);

    return {
        trackView,
        trackLike,
        trackCollect,
        trackComment
    };
};

// 推荐内容组件Hook - 重命名版本
export const useRecommendationItem1 = (item) => {
    const { trackView, trackLike, trackCollect } = useBehaviorTracking1();
    const navigate = useNavigate();

    const handleItemClick = useCallback(() => {
        if (item?.id) {
            // 记录浏览行为
            trackView(item.id, item.source_table || 'article');
            // 导航到详情页，传递文章数据
            navigate('/detail', { state: { article: item } });
        }
    }, [item, trackView, navigate]);

    const handleLike = useCallback(() => {
        if (item?.id) {
            trackLike(item.id, item.source_table || 'article');
        }
    }, [item, trackLike]);

    const handleCollect = useCallback(() => {
        if (item?.id) {
            trackCollect(item.id, item.source_table || 'article');
        }
    }, [item, trackCollect]);

    return {
        handleItemClick,
        handleLike,
        handleCollect
    };
};
