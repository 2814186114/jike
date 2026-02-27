const { connection } = require('./db');

async function insertLearningTestData() {
    try {
        console.log('开始插入学习分析测试数据...');

        // 确保用户存在
        connection.query('SELECT id FROM vip WHERE id = 1', async (error, users) => {
            if (error) {
                console.error('查询用户失败:', error);
                return;
            }

            if (users.length === 0) {
                console.log('没有找到用户ID=1，请先创建用户');
                return;
            }

            const userId = 1;
            console.log(`为用户 ${userId} 插入测试数据...`);

            try {
                // 1. 插入用户行为数据（学习记录）
                const learningActivities = [
                    {
                        itemId: 1,
                        itemType: 'article',
                        learningType: 'read',
                        duration: 3600, // 1小时
                        completionStatus: 'completed',
                        proficiencyLevel: 3
                    },
                    {
                        itemId: 2,
                        itemType: 'article',
                        learningType: 'read',
                        duration: 2700, // 45分钟
                        completionStatus: 'completed',
                        proficiencyLevel: 4
                    },
                    {
                        itemId: 3,
                        itemType: 'article',
                        learningType: 'read',
                        duration: 1800, // 30分钟
                        completionStatus: 'completed',
                        proficiencyLevel: 2
                    },
                    {
                        itemId: 4,
                        itemType: 'article',
                        learningType: 'read',
                        duration: 2400, // 40分钟
                        completionStatus: 'completed',
                        proficiencyLevel: 3
                    }
                ];

                // 使用 Promise 包装回调函数
                const insertActivity = (activity) => {
                    return new Promise((resolve, reject) => {
                        connection.query(
                            `INSERT INTO user_behavior 
                             (user_id, item_id, item_type, action_type, learning_type, duration, 
                              completion_status, proficiency_level, learning_duration, metadata) 
                             VALUES (?, ?, ?, 'view', ?, ?, ?, ?, ?, ?)`,
                            [userId, activity.itemId, activity.itemType, activity.learningType,
                                activity.duration, activity.completionStatus, activity.proficiencyLevel,
                                Math.round(activity.duration / 60), JSON.stringify({ test_data: true })],
                            (error, results) => {
                                if (error) reject(error);
                                else resolve(results);
                            }
                        );
                    });
                };

                for (const activity of learningActivities) {
                    await insertActivity(activity);
                }

                // 2. 更新用户学习进度
                const learningProgress = {
                    skills: {
                        'react': 0.75,
                        'vue': 0.60,
                        'javascript': 0.85,
                        'nodejs': 0.50,
                        'html': 0.90,
                        'css': 0.80
                    },
                    learning_paths: {
                        'frontend': 0.70,
                        'backend': 0.45
                    },
                    recent_activities: [
                        {
                            type: 'read',
                            itemId: 4,
                            duration: 2400,
                            timestamp: new Date().toISOString()
                        },
                        {
                            type: 'read',
                            itemId: 3,
                            duration: 1800,
                            timestamp: new Date(Date.now() - 86400000).toISOString()
                        }
                    ],
                    weekly_stats: {
                        week: 42,
                        total_hours: 8.5,
                        days_active: 4,
                        completed_items: 12
                    }
                };

                const totalLearningHours = 156; // 总学习时长

                // 更新用户学习进度
                await new Promise((resolve, reject) => {
                    connection.query(
                        `UPDATE user_profile 
                         SET learning_progress = ?, total_learning_hours = ?, last_learning_date = CURDATE(),
                             learning_goals = ?, achievements = ?
                         WHERE user_id = ?`,
                        [
                            JSON.stringify(learningProgress),
                            totalLearningHours,
                            JSON.stringify([
                                {
                                    id: 'goal_1',
                                    title: '掌握React Hooks',
                                    description: '深入学习React Hooks的使用',
                                    target: 'complete',
                                    progress: 75,
                                    deadline: '2024-12-31',
                                    status: 'active'
                                },
                                {
                                    id: 'goal_2',
                                    title: '学习Node.js后端开发',
                                    description: '掌握Express框架和数据库操作',
                                    target: 'complete',
                                    progress: 40,
                                    deadline: '2024-11-30',
                                    status: 'active'
                                }
                            ]),
                            JSON.stringify([
                                {
                                    id: 'achievement_1',
                                    name: '学习先锋',
                                    description: '连续学习7天',
                                    icon: '🏆',
                                    unlocked_at: new Date().toISOString()
                                },
                                {
                                    id: 'achievement_2',
                                    name: '技能大师',
                                    description: '掌握5项以上技能',
                                    icon: '⭐',
                                    unlocked_at: new Date().toISOString()
                                }
                            ]),
                            userId
                        ],
                        (error, results) => {
                            if (error) reject(error);
                            else resolve(results);
                        }
                    );
                });

                // 3. 更新社区统计
                await new Promise((resolve, reject) => {
                    connection.query(
                        `INSERT INTO community_learning_stats 
                         (stat_date, total_users, average_learning_hours, top_skills, active_users_count) 
                         VALUES (CURDATE(), ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE 
                             total_users = VALUES(total_users),
                             average_learning_hours = VALUES(average_learning_hours),
                             top_skills = VALUES(top_skills),
                             active_users_count = VALUES(active_users_count)`,
                        [
                            150,
                            12.8,
                            JSON.stringify({
                                'react': 65,
                                'vue': 45,
                                'javascript': 85,
                                'nodejs': 35,
                                'html': 70,
                                'css': 60
                            }),
                            120
                        ],
                        (error, results) => {
                            if (error) reject(error);
                            else resolve(results);
                        }
                    );
                });

                console.log('✅ 学习分析测试数据插入完成！');
                console.log('📊 测试数据包括:');
                console.log('   - 4条学习行为记录');
                console.log('   - 用户学习进度数据');
                console.log('   - 学习目标和成就');
                console.log('   - 社区统计信息');
                console.log('\n🚀 现在可以启动应用测试学习进度功能了！');

            } catch (error) {
                console.error('❌ 插入测试数据失败:', error);
            } finally {
                process.exit();
            }
        });

    } catch (error) {
        console.error('❌ 插入测试数据失败:', error);
        process.exit();
    }
}

// 运行脚本
insertLearningTestData();
