-- 推荐系统相关表扩展

-- 用户行为表（记录用户的浏览、点赞、收藏等行为）
CREATE TABLE IF NOT EXISTS user_behavior (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  item_id INT NOT NULL,
  item_type ENUM('article', 'my_article') NOT NULL DEFAULT 'article',
  action_type ENUM('view', 'like', 'collect', 'comment', 'share') NOT NULL,
  duration INT DEFAULT 0, -- 停留时间(秒)
  metadata JSON, -- 额外元数据，如评分、标签等
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES vip(id) ON DELETE CASCADE
);

-- 用户兴趣画像表
CREATE TABLE IF NOT EXISTS user_profile (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  interest_tags JSON, -- 兴趣标签及权重，如 {"react": 0.8, "vue": 0.6, "nodejs": 0.7}
  behavior_pattern JSON, -- 行为模式，如活跃时间段、偏好类型等
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES vip(id) ON DELETE CASCADE
);

-- 内容特征表
CREATE TABLE IF NOT EXISTS content_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  item_type ENUM('article', 'my_article') NOT NULL DEFAULT 'article',
  tags JSON, -- 内容标签
  tech_stack VARCHAR(100), -- 技术栈
  category VARCHAR(50), -- 分类
  complexity INT DEFAULT 1, -- 复杂度 1-5
  popularity_score FLOAT DEFAULT 0, -- 热度分数
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_user_behavior_user_id ON user_behavior(user_id);
CREATE INDEX idx_user_behavior_item_id ON user_behavior(item_id);
CREATE INDEX idx_user_behavior_action ON user_behavior(action_type);
CREATE INDEX idx_user_behavior_created ON user_behavior(created_at);
CREATE INDEX idx_content_features_item ON content_features(item_id, item_type);
CREATE INDEX idx_content_features_tags ON content_features((CAST(tags AS CHAR(255))));
