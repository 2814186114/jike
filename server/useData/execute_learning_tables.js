const { connection } = require('./db');

async function executeLearningTables() {
    try {
        console.log('开始执行学习分析表结构扩展...');

        // 1. 扩展 user_behavior 表添加学习相关字段
        console.log('扩展 user_behavior 表...');
        await new Promise((resolve, reject) => {
            connection.query(`
                ALTER TABLE user_behavior 
                ADD COLUMN learning_session_id VARCHAR(100),
                ADD COLUMN learning_type ENUM('read', 'practice', 'project', 'test', 'video') DEFAULT 'read',
                ADD COLUMN proficiency_level INT DEFAULT 1 COMMENT '掌握程度 1-5',
                ADD COLUMN learning_duration INT DEFAULT 0 COMMENT '学习时长(分钟)',
                ADD COLUMN completion_status ENUM('started', 'completed', 'abandoned') DEFAULT 'started'
            `, (error, results) => {
                if (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log('user_behavior 表字段已存在，跳过添加');
                        resolve();
                    } else {
                        reject(error);
                    }
                } else {
                    console.log('✓ user_behavior 表扩展成功');
                    resolve();
                }
            });
        });

        // 2. 扩展 user_profile 表添加学习进度字段
        console.log('扩展 user_profile 表...');
        await new Promise((resolve, reject) => {
            connection.query(`
                ALTER TABLE user_profile 
                ADD COLUMN learning_progress JSON COMMENT '学习进度数据',
                ADD COLUMN total_learning_hours INT DEFAULT 0 COMMENT '总学习时长(小时)',
                ADD COLUMN last_learning_date DATE COMMENT '最后学习日期',
                ADD COLUMN learning_goals JSON COMMENT '学习目标',
                ADD COLUMN achievements JSON COMMENT '成就系统数据',
                ADD COLUMN learning_reminders JSON COMMENT '学习提醒设置'
            `, (error, results) => {
                if (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log('user_profile 表字段已存在，跳过添加');
                        resolve();
                    } else {
                        reject(error);
                    }
                } else {
                    console.log('✓ user_profile 表扩展成功');
                    resolve();
                }
            });
        });

        // 3. 创建学习进度快照表
        console.log('创建 learning_progress_snapshots 表...');
        await new Promise((resolve, reject) => {
            connection.query(`
                CREATE TABLE IF NOT EXISTS learning_progress_snapshots (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  user_id INT NOT NULL,
                  snapshot_data JSON NOT NULL COMMENT '进度快照数据',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES vip(id) ON DELETE CASCADE
                )
            `, (error, results) => {
                if (error) {
                    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                        console.log('learning_progress_snapshots 表已存在，跳过创建');
                        resolve();
                    } else {
                        reject(error);
                    }
                } else {
                    console.log('✓ learning_progress_snapshots 表创建成功');
                    resolve();
                }
            });
        });

        // 4. 创建社区学习统计表
        console.log('创建 community_learning_stats 表...');
        await new Promise((resolve, reject) => {
            connection.query(`
                CREATE TABLE IF NOT EXISTS community_learning_stats (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  stat_date DATE NOT NULL,
                  total_users INT DEFAULT 0,
                  average_learning_hours FLOAT DEFAULT 0,
                  top_skills JSON COMMENT '热门技能分布',
                  active_users_count INT DEFAULT 0,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE KEY unique_date (stat_date)
                )
            `, (error, results) => {
                if (error) {
                    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                        console.log('community_learning_stats 表已存在，跳过创建');
                        resolve();
                    } else {
                        reject(error);
                    }
                } else {
                    console.log('✓ community_learning_stats 表创建成功');
                    resolve();
                }
            });
        });

        // 5. 创建索引以提高查询性能
        console.log('创建索引...');
        await new Promise((resolve, reject) => {
            connection.query(`
                CREATE INDEX IF NOT EXISTS idx_user_behavior_learning ON user_behavior(learning_type, learning_session_id);
                CREATE INDEX IF NOT EXISTS idx_user_behavior_completion ON user_behavior(completion_status, created_at);
                CREATE INDEX IF NOT EXISTS idx_learning_snapshots_user ON learning_progress_snapshots(user_id, created_at);
                CREATE INDEX IF NOT EXISTS idx_community_stats_date ON community_learning_stats(stat_date);
            `, (error, results) => {
                if (error) {
                    console.log('索引创建警告:', error.message);
                    resolve(); // 索引创建失败不影响整体流程
                } else {
                    console.log('✓ 索引创建成功');
                    resolve();
                }
            });
        });

        // 6. 初始化默认的学习进度数据结构
        console.log('初始化默认学习进度数据...');
        await new Promise((resolve, reject) => {
            connection.query(`
                UPDATE user_profile SET 
                  learning_progress = '{
                    "skills": {},
                    "learning_paths": {},
                    "recent_activities": [],
                    "weekly_stats": {
                      "total_hours": 0,
                      "days_active": 0,
                      "completed_items": 0
                    }
                  }',
                  learning_goals = '[]',
                  achievements = '[]',
                  learning_reminders = '{
                    "enabled": true,
                    "preferred_time": "19:00",
                    "reminder_types": ["daily", "weekly_review"]
                  }'
                WHERE learning_progress IS NULL
            `, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    console.log('✓ 默认学习进度数据初始化完成');
                    resolve();
                }
            });
        });

        // 7. 插入示例社区统计数据
        console.log('插入示例社区统计数据...');
        await new Promise((resolve, reject) => {
            connection.query(`
                INSERT INTO community_learning_stats (stat_date, total_users, average_learning_hours, top_skills, active_users_count) 
                VALUES 
                (CURDATE(), 100, 12.5, '{"react": 45, "vue": 30, "javascript": 60, "nodejs": 25}', 75)
                ON DUPLICATE KEY UPDATE 
                    total_users = VALUES(total_users),
                    average_learning_hours = VALUES(average_learning_hours),
                    top_skills = VALUES(top_skills),
                    active_users_count = VALUES(active_users_count)
            `, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    console.log('✓ 示例社区统计数据插入完成');
                    resolve();
                }
            });
        });

        console.log('\n🎉 学习分析表结构扩展完成！');
        console.log('📊 已创建/扩展的表和字段:');
        console.log('   - user_behavior 表：添加学习相关字段');
        console.log('   - user_profile 表：添加学习进度相关字段');
        console.log('   - learning_progress_snapshots 表：学习进度快照');
        console.log('   - community_learning_stats 表：社区学习统计');
        console.log('\n🚀 现在可以重新插入测试数据并测试学习分析功能了！');

    } catch (error) {
        console.error('❌ 表结构扩展失败:', error);
    } finally {
        process.exit();
    }
}

// 运行脚本
executeLearningTables();
