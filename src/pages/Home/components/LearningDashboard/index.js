import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, List, Tag, Button, Empty } from 'antd';
import {
    ClockCircleOutlined,
    TrophyOutlined,
    BarChartOutlined,
    TeamOutlined,
    FireOutlined,
    StarOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import { localRequest, req } from '@/utils';
import './index.scss';

const LearningDashboard = ({ userId }) => {
    const [loading, setLoading] = useState(true);
    const [progressData, setProgressData] = useState(null);
    const [communityStats, setCommunityStats] = useState(null);

    // 图表引用
    const skillsChartRef = useRef(null);
    const progressChartRef = useRef(null);
    const efficiencyChartRef = useRef(null);

    useEffect(() => {
        fetchLearningData();
    }, [userId]);

    useLayoutEffect(() => {
        if (progressData) {
            console.log('开始渲染图表，数据:', progressData);
            // 延迟渲染确保DOM已完全挂载
            setTimeout(() => {
                renderCharts();
            }, 100);
        }
    }, [progressData]);

    const fetchLearningData = async () => {
        try {
            setLoading(true);

            // 获取用户学习进度
            const progressResponse = await req.get(`http://localhost:3001/api/learning/progress/${userId}`);
            if (progressResponse.success) {
                setProgressData(progressResponse.data);
            }
            console.log(userId, 'linxiao')

            // 获取社区统计
            const statsResponse = await req.get('http://localhost:3001/api/learning/community/stats');
            if (statsResponse.success) {
                setCommunityStats(statsResponse.data);
            }
        } catch (error) {
            console.error('获取学习数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderCharts = () => {
        if (!progressData) return;

        // 技能掌握度雷达图
        renderSkillsChart();

        // 学习进度环形图
        renderProgressChart();

        // 学习效率折线图
        renderEfficiencyChart();
    };

    const renderSkillsChart = () => {
        if (!skillsChartRef.current) {
            console.log('技能图表容器未找到');
            return;
        }

        try {
            const chart = echarts.init(skillsChartRef.current);
            const skills = progressData.skills || {};
            console.log('技能数据:', skills);

            const skillNames = Object.keys(skills);
            const skillValues = Object.values(skills).map(value => Math.round(value * 100));

            console.log('技能名称:', skillNames);
            console.log('技能值:', skillValues);

            const option = {
                title: {
                    text: '技能掌握度',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item'
                },
                radar: {
                    indicator: skillNames.map(name => ({
                        name: name,
                        max: 100
                    }))
                },
                series: [{
                    type: 'radar',
                    data: [{
                        value: skillValues,
                        name: '技能掌握度',
                        areaStyle: {
                            color: 'rgba(64, 158, 255, 0.3)'
                        },
                        lineStyle: {
                            color: '#409EFF'
                        }
                    }]
                }]
            };

            chart.setOption(option);
            console.log('技能图表设置完成');

            // 响应式调整
            const handleResize = () => chart.resize();
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                chart.dispose();
            };
        } catch (error) {
            console.error('渲染技能图表失败:', error);
        }
    };

    const renderProgressChart = () => {
        if (!progressChartRef.current) return;

        const chart = echarts.init(progressChartRef.current);
        const weeklyStats = progressData.weekly_stats || {};

        const option = {
            title: {
                text: '本周学习进度',
                left: 'center'
            },
            tooltip: {
                trigger: 'item'
            },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 20,
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: [
                    { value: weeklyStats.completed_items || 0, name: '已完成' },
                    { value: Math.max(10 - (weeklyStats.completed_items || 0), 0), name: '待完成' }
                ]
            }]
        };

        chart.setOption(option);

        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.dispose();
        };
    };

    const renderEfficiencyChart = () => {
        if (!efficiencyChartRef.current) return;

        const chart = echarts.init(efficiencyChartRef.current);
        const weeklyStats = progressData.weekly_stats || {};

        // 模拟一周的学习效率数据
        const efficiencyData = [0.6, 0.8, 0.7, 0.9, 0.5, 0.8, 0.7];

        const option = {
            title: {
                text: '学习效率趋势',
                left: 'center'
            },
            xAxis: {
                type: 'category',
                data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            },
            yAxis: {
                type: 'value',
                max: 1,
                axisLabel: {
                    formatter: '{value}'
                }
            },
            series: [{
                data: efficiencyData,
                type: 'line',
                smooth: true,
                lineStyle: {
                    color: '#52c41a'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0, color: 'rgba(82, 196, 26, 0.3)'
                        }, {
                            offset: 1, color: 'rgba(82, 196, 26, 0.1)'
                        }]
                    }
                }
            }]
        };

        chart.setOption(option);

        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.dispose();
        };
    };

    const recordLearningActivity = async (activityData) => {
        try {
            await req.post('http://localhost:3001/api/learning/activity', {
                userId,
                activityData
            });
            // 刷新数据
            fetchLearningData();
        } catch (error) {
            console.error('记录学习行为失败:', error);
        }
    };

    if (loading) {
        return (
            <div className="learning-dashboard">
                <Card loading={true} />
            </div>
        );
    }

    if (!progressData) {
        return (
            <div className="learning-dashboard">
                <Empty description="暂无学习数据" />
            </div>
        );
    }

    const { skills = {}, weekly_stats = {}, total_learning_hours = 0, goals = [], achievements = [], recommendations = [] } = progressData;

    return (
        <div className="learning-dashboard">
            <Row gutter={[16, 16]}>
                {/* 统计卡片 */}
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="总学习时长"
                            value={total_learning_hours}
                            precision={1}
                            suffix="小时"
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="本周学习"
                            value={weekly_stats.total_hours || 0}
                            precision={1}
                            suffix="小时"
                            prefix={<FireOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="完成项目"
                            value={weekly_stats.completed_items || 0}
                            suffix="个"
                            prefix={<BarChartOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="获得成就"
                            value={achievements.length}
                            suffix="个"
                            prefix={<TrophyOutlined />}
                        />
                    </Card>
                </Col>

                {/* 技能掌握度图表 */}
                <Col xs={24} lg={12}>
                    <Card title="技能掌握度" className="chart-card">
                        <div ref={skillsChartRef} style={{ height: '300px' }} />
                    </Card>
                </Col>

                {/* 学习进度图表 */}
                <Col xs={24} lg={12}>
                    <Card title="学习进度" className="chart-card">
                        <div ref={progressChartRef} style={{ height: '300px' }} />
                    </Card>
                </Col>

                {/* 学习效率图表 */}
                <Col xs={24}>
                    <Card title="学习效率趋势" className="chart-card">
                        <div ref={efficiencyChartRef} style={{ height: '300px' }} />
                    </Card>
                </Col>

                {/* 技能详情 */}
                <Col xs={24} lg={12}>
                    <Card title="技能详情" className="skills-card">
                        {Object.entries(skills).length > 0 ? (
                            <div className="skills-list">
                                {Object.entries(skills).map(([skill, proficiency]) => (
                                    <div key={skill} className="skill-item">
                                        <div className="skill-info">
                                            <span className="skill-name">{skill}</span>
                                            <span className="skill-proficiency">{Math.round(proficiency * 100)}%</span>
                                        </div>
                                        <Progress
                                            percent={Math.round(proficiency * 100)}
                                            size="small"
                                            strokeColor={{
                                                '0%': '#108ee9',
                                                '100%': '#87d068',
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Empty description="暂无技能数据" />
                        )}
                    </Card>
                </Col>

                {/* 学习推荐 */}
                <Col xs={24} lg={12}>
                    <Card
                        title="学习推荐"
                        extra={<Button type="link" onClick={fetchLearningData}>刷新</Button>}
                        className="recommendations-card"
                    >
                        {recommendations.length > 0 ? (
                            <List
                                dataSource={recommendations}
                                renderItem={item => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<StarOutlined style={{ color: '#faad14' }} />}
                                            title={
                                                <div>
                                                    <span>{item.reason}</span>
                                                    <Tag color="blue" style={{ marginLeft: 8 }}>{item.type}</Tag>
                                                </div>
                                            }
                                            description={`置信度: ${Math.round(item.confidence * 100)}%`}
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Empty description="暂无推荐内容" />
                        )}
                    </Card>
                </Col>

                {/* 社区统计 */}
                {communityStats && (
                    <Col xs={24}>
                        <Card title="社区统计" className="community-card">
                            <Row gutter={16}>
                                <Col xs={12} sm={6}>
                                    <Statistic
                                        title="总用户数"
                                        value={communityStats.total_users}
                                        prefix={<TeamOutlined />}
                                    />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic
                                        title="平均学习时长"
                                        value={communityStats.average_learning_hours}
                                        precision={1}
                                        suffix="小时"
                                        prefix={<ClockCircleOutlined />}
                                    />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic
                                        title="活跃用户"
                                        value={communityStats.active_users_count}
                                        prefix={<FireOutlined />}
                                    />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic
                                        title="热门技能"
                                        value={Object.keys(communityStats.top_skills || {})[0] || '无'}
                                        prefix={<BarChartOutlined />}
                                    />
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                )}

                {/* 成就展示 */}
                {achievements.length > 0 && (
                    <Col xs={24}>
                        <Card title="已获成就" className="achievements-card">
                            <div className="achievements-grid">
                                {achievements.map(achievement => (
                                    <div key={achievement.id} className="achievement-item">
                                        <TrophyOutlined className="achievement-icon" />
                                        <div className="achievement-info">
                                            <div className="achievement-name">{achievement.name}</div>
                                            <div className="achievement-description">{achievement.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                )}
            </Row>

            {/* 快速记录按钮 */}
            <div className="quick-actions">
                <Button
                    type="primary"
                    onClick={() => recordLearningActivity({
                        itemId: 1,
                        itemType: 'article',
                        learningType: 'read',
                        duration: 1800, // 30分钟
                        completionStatus: 'completed'
                    })}
                >
                    记录学习
                </Button>
            </div>
        </div>
    );
};

export default LearningDashboard;
