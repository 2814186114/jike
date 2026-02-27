import React, { useState } from 'react';
import { Card, Row, Col, Avatar, Tabs, Button, Statistic, Tag } from 'antd';
import {
    UserOutlined,
    SettingOutlined,
    TrophyOutlined,
    BookOutlined,
    ClockCircleOutlined,
    StarOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import LearningDashboard from '@/pages/Home/components/LearningDashboard';
import ResumeDiagnosis from './components/ResumeDiagnosis';
import './index.scss';
import { useSelector } from 'react-redux';

const { TabPane } = Tabs;

const Personal = () => {
    const [activeTab, setActiveTab] = useState('progress');
    const currentUser = useSelector(state => state.user.userInfo);
    const userId = currentUser?.id;
    // console.log(userId, 'assas')

    // 模拟用户数据
    const userInfo = {
        name: '前端开发者',
        avatar: null,
        level: '中级',
        joinDate: '2024-01-01',
        bio: '热爱前端技术，专注于React和Vue开发',
        tags: ['React', 'Vue', 'JavaScript', 'Node.js']
    };

    // 用户统计数据
    const userStats = {
        totalLearningHours: 156,
        completedCourses: 23,
        publishedArticles: 15,
        achievements: 8
    };

    return (
        <div className="personal-page">
            {/* 用户信息卡片 */}
            <Card className="user-profile-card">
                <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} sm={8} md={6}>
                        <div className="avatar-section">
                            <Avatar
                                size={100}
                                icon={<UserOutlined />}
                                src={userInfo.avatar}
                                className="user-avatar"
                            />
                            <div className="user-level">
                                <Tag color="blue">{userInfo.level}</Tag>
                            </div>
                        </div>
                    </Col>
                    <Col xs={24} sm={16} md={18}>
                        <div className="user-info">
                            <h2 className="user-name">{userInfo.name}</h2>
                            <p className="user-bio">{userInfo.bio}</p>
                            <div className="user-tags">
                                {userInfo.tags.map(tag => (
                                    <Tag key={tag} color="geekblue">{tag}</Tag>
                                ))}
                            </div>
                            <div className="user-meta">
                                <span>加入时间: {userInfo.joinDate}</span>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* 统计卡片 */}
            <Row gutter={[16, 16]} className="stats-row">
                <Col xs={12} sm={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="总学习时长"
                            value={userStats.totalLearningHours}
                            suffix="小时"
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="完成课程"
                            value={userStats.completedCourses}
                            suffix="门"
                            prefix={<BookOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="发布文章"
                            value={userStats.publishedArticles}
                            suffix="篇"
                            prefix={<StarOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="获得成就"
                            value={userStats.achievements}
                            suffix="个"
                            prefix={<TrophyOutlined />}
                            valueStyle={{ color: '#f5222d' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 标签页内容 */}
            <Card className="tabs-card">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'progress',
                            label: (
                                <span>
                                    <BookOutlined />
                                    学习进度
                                </span>
                            ),
                            children: <LearningDashboard userId={userId} />
                        },
                        {
                            key: 'achievements',
                            label: (
                                <span>
                                    <TrophyOutlined />
                                    我的成就
                                </span>
                            ),
                            children: (
                                <div className="achievements-content">
                                    <div className="empty-state">
                                        <TrophyOutlined className="empty-icon" />
                                        <h3>成就系统开发中</h3>
                                        <p>这里将展示您获得的所有成就和荣誉</p>
                                        <Button type="primary" icon={<TrophyOutlined />}>
                                            查看全部成就
                                        </Button>
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'resume',
                            label: (
                                <span>
                                    <FileTextOutlined />
                                    简历诊断
                                </span>
                            ),
                            children: <ResumeDiagnosis userId={userId} />
                        },
                        {
                            key: 'settings',
                            label: (
                                <span>
                                    <SettingOutlined />
                                    个人设置
                                </span>
                            ),
                            children: (
                                <div className="settings-content">
                                    <div className="empty-state">
                                        <SettingOutlined className="empty-icon" />
                                        <h3>设置功能开发中</h3>
                                        <p>这里将提供个人信息修改、隐私设置等功能</p>
                                        <Button type="primary" icon={<SettingOutlined />}>
                                            前往设置
                                        </Button>
                                    </div>
                                </div>
                            )
                        }
                    ]}
                />
            </Card>
        </div>
    );
};

export default Personal;
