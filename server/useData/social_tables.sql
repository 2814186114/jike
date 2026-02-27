-- 社交功能数据库表

USE jike;

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL COMMENT '文章ID',
  user_id INT NOT NULL COMMENT '用户ID',
  username VARCHAR(255) COMMENT '用户名',
  content TEXT NOT NULL COMMENT '评论内容',
  parent_id INT DEFAULT 0 COMMENT '父评论ID，用于回复',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_article_id (article_id),
  INDEX idx_user_id (user_id)
);

-- 点赞表
CREATE TABLE IF NOT EXISTS likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL COMMENT '文章ID',
  user_id INT NOT NULL COMMENT '用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (article_id, user_id),
  INDEX idx_article_id (article_id),
  INDEX idx_user_id (user_id)
);

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL COMMENT '文章ID',
  user_id INT NOT NULL COMMENT '用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_favorite (article_id, user_id),
  INDEX idx_article_id (article_id),
  INDEX idx_user_id (user_id)
);

-- 关注表（粉丝）
CREATE TABLE IF NOT EXISTS follows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  follower_id INT NOT NULL COMMENT '粉丝ID',
  following_id INT NOT NULL COMMENT '关注用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_follow (follower_id, following_id),
  INDEX idx_follower_id (follower_id),
  INDEX idx_following_id (following_id)
);

-- 消息通知表
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '接收通知的用户ID',
  type VARCHAR(50) NOT NULL COMMENT '通知类型: comment/like/follow',
  content TEXT COMMENT '通知内容',
  from_user_id INT COMMENT '触发通知的用户ID',
  article_id INT COMMENT '相关文章ID',
  is_read TINYINT DEFAULT 0 COMMENT '是否已读',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
);
