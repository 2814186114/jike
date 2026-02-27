import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { BarChart } from './components/BarCharts'
import HeatmapChart from './components/Heatmapt'
import ReadingProgressChart from './components/Progress'
import { useRecommendation1 } from '../../hooks/useRecommendation1'
import RecommendationCard from '../../components/RecommendationCard'

const Home = () => {
    const [data, setData] = useState({
        Vue: 0,
        React: 0,
        Angular: 0
    });
    const [activeType, setActiveType] = useState('hybrid'); // 当前选中的推荐类型

    const location = useLocation();

    // 使用推荐系统Hook
    const {
        recommendations,
        loading,
        error,
        refreshRecommendations,
        hasRecommendations
    } = useRecommendation1({ limit: 10 });

    // 处理推荐类型切换
    const handleTypeClick = (type) => {
        setActiveType(type);
        refreshRecommendations(type);
    };

    // 当用户返回首页时自动刷新推荐内容
    useEffect(() => {
        console.log('返回首页，刷新推荐内容...');
        refreshRecommendations();
    }, [location.key, refreshRecommendations]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/framework-usage');
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (error) {
                console.error('获取数据失败:', error);
            }
        };
        fetchData();
    }, []);

    const barData = [
        {
            title: "表1",
            xData: ['Vue', 'React', 'Angular'],
            sData: [data.Vue, data.React, data.Angular]
        },
        {
            title: "表2",
            xData: ['Vue', 'React', 'Angular'],
            sData: [200, 500, 100]
        }
    ];

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            {/* 推荐系统区域 */}
            <div style={{ marginBottom: '40px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: '600',
                        color: '#14171a'
                    }}>
                        为你推荐
                    </h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => handleTypeClick('hybrid')}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid #e1e8ed',
                                backgroundColor: activeType === 'hybrid' ? '#1da1f2' : '#fff',
                                color: activeType === 'hybrid' ? '#fff' : '#657786',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            智能推荐
                        </button>
                        <button
                            onClick={() => handleTypeClick('content_based')}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid #e1e8ed',
                                backgroundColor: activeType === 'content_based' ? '#1da1f2' : '#fff',
                                color: activeType === 'content_based' ? '#fff' : '#657786',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            基于内容
                        </button>
                        <button
                            onClick={() => handleTypeClick('popular')}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid #e1e8ed',
                                backgroundColor: activeType === 'popular' ? '#1da1f2' : '#fff',
                                color: activeType === 'popular' ? '#fff' : '#657786',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            热门内容
                        </button>
                    </div>
                </div>

                {loading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#657786'
                    }}>
                        正在为你推荐个性化内容...
                    </div>
                )}

                {error && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#e0245e'
                    }}>
                        推荐加载失败: {error}
                    </div>
                )}

                {!loading && !error && hasRecommendations && (
                    <div>
                        {recommendations.map((item, index) => (
                            <RecommendationCard
                                key={`${item.source_table}_${item.id}`}
                                item={item}
                                index={index}
                            />
                        ))}
                    </div>
                )}

                {!loading && !error && !hasRecommendations && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#657786'
                    }}>
                        暂无推荐内容，请先浏览一些文章来帮助我们了解你的兴趣
                    </div>
                )}
            </div>

            {/* 图表区域 - 保留代码但不显示 */}
            {/* {barData.map((chartData, index) => {
                return (
                    <BarChart
                        key={index}
                        title={chartData.title}
                        xData={chartData.xData}
                        sData={chartData.sData} />
                );
            })}
            <HeatmapChart></HeatmapChart>
            <ReadingProgressChart></ReadingProgressChart> */}

        </div>
    )


}




export default Home
