import React from 'react';
import { useRecommendationItem1 } from '../hooks/useRecommendation1';

const RecommendationCard = ({ item, index }) => {
    const { handleItemClick, handleLike, handleCollect } = useRecommendationItem1(item);

    // 格式化日期
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // 获取推荐类型标签
    const getRecommendationTypeLabel = (type) => {
        const typeMap = {
            'content_based': '基于内容',
            'collaborative': '协同过滤',
            'popular': '热门推荐',
            'hybrid': '智能推荐'
        };
        return typeMap[type] || '推荐';
    };

    // 截断文本
    const truncateText = (text, maxLength = 100) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <div
            className="recommendation-card"
            onClick={handleItemClick}
            style={{
                border: '1px solid #e1e8ed',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span
                    style={{
                        fontSize: '12px',
                        color: '#667580',
                        backgroundColor: '#f5f8fa',
                        padding: '2px 8px',
                        borderRadius: '12px'
                    }}
                >
                    {getRecommendationTypeLabel(item.recommendation_type)}
                </span>
                <span style={{ fontSize: '12px', color: '#667580' }}>
                    {formatDate(item.publish_date || item.updatedAt)}
                </span>
            </div>

            <h3 style={{
                margin: '8px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#14171a',
                lineHeight: '1.4'
            }}>
                {item.title}
            </h3>

            {item.author && (
                <p style={{
                    fontSize: '14px',
                    color: '#657786',
                    margin: '4px 0'
                }}>
                    作者: {item.author}
                </p>
            )}

            <p style={{
                fontSize: '14px',
                color: '#657786',
                lineHeight: '1.5',
                margin: '8px 0'
            }}>
                {truncateText(item.content)}
            </p>

            {item.tech_stack && (
                <div style={{ margin: '8px 0' }}>
                    <span style={{
                        fontSize: '12px',
                        color: '#1da1f2',
                        backgroundColor: '#e8f5fd',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        marginRight: '4px'
                    }}>
                        {item.tech_stack}
                    </span>
                </div>
            )}

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                paddingTop: '8px',
                borderTop: '1px solid #e1e8ed'
            }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleLike();
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#657786',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        ❤️ 点赞
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCollect();
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#657786',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        ⭐ 收藏
                    </button>
                </div>

                <div style={{ fontSize: '12px', color: '#657786' }}>
                    {item.views && `浏览: ${item.views}`}
                </div>
            </div>
        </div>
    );
};

export default RecommendationCard;
