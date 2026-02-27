-- 学习分析系统表扩展 - 方案一：扩展现有表

-- 1. 扩展 user_behavior 表添加学习相关字段
ALTER TABLE user_behavior 
ADD COLUMN learning_session_id VARCHAR(100),
ADD COLUMN learning_type ENUM('read', 'practice', 'project', 'test', 'video') DEFAULT 'read',
ADD COLUMN proficiency_level INT DEFAULT 1 COMMENT '掌握程度 1-5',
ADD COLUMN learning_duration INT DEFAULT 0 COMMENT '学习时长(分钟)',
ADD COLUMN completion_status ENUM('started', 'completed', 'abandoned') DEFAULT 'started';

-- 2. 扩展 user_profile 表添加学习进度字段
ALTER TABLE user_profile 
ADD COLUMN learning_progress JSON COMMENT '学习进度数据',
ADD COLUMN total_learning_hours INT DEFAULT 0 COMMENT '总学习时长(小时)',
ADD COLUMN last_learning_date DATE COMMENT '最后学习日期',
ADD COLUMN learning_goals JSON COMMENT '学习目标',
ADD COLUMN achievements JSON COMMENT '成就系统数据',
ADD COLUMN learning_reminders JSON COMMENT '学习提醒设置';

-- 3. 创建学习进度快照表（可选，用于历史数据分析）
CREATE TABLE IF NOT EXISTS learning_progress_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  snapshot_data JSON NOT NULL COMMENT '进度快照数据',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES vip(id) ON DELETE CASCADE
);

-- 4. 创建社区学习统计表
CREATE TABLE IF NOT EXISTS community_learning_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stat_date DATE NOT NULL,
  total_users INT DEFAULT 0,
  average_learning_hours FLOAT DEFAULT 0,
  top_skills JSON COMMENT '热门技能分布',
  active_users_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_date (stat_date)
);

-- 5. 创建索引以提高查询性能
CREATE INDEX idx_user_behavior_learning ON user_behavior(learning_type, learning_session_id);
CREATE INDEX idx_user_behavior_completion ON user_behavior(completion_status, created_at);
CREATE INDEX idx_learning_snapshots_user ON learning_progress_snapshots(user_id, created_at);
CREATE INDEX idx_community_stats_date ON community_learning_stats(stat_date);

-- 6. 初始化默认的学习进度数据结构
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
WHERE learning_progress IS NULL;

-- 7. 示例数据插入（用于测试）
INSERT INTO community_learning_stats (stat_date, total_users, average_learning_hours, top_skills, active_users_count) 
VALUES 
(CURDATE(), 100, 12.5, '{"react": 45, "vue": 30, "javascript": 60, "nodejs": 25}', 75);
