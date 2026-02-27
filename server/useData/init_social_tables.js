const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'jike',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const tables = [
    `CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        article_id INT NOT NULL COMMENT '文章ID',
        user_id INT NOT NULL COMMENT '用户ID',
        username VARCHAR(255) COMMENT '用户名',
        content TEXT NOT NULL COMMENT '评论内容',
        parent_id INT DEFAULT 0 COMMENT '父评论ID，用于回复',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_article_id (article_id),
        INDEX idx_user_id (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        article_id INT NOT NULL COMMENT '文章ID',
        user_id INT NOT NULL COMMENT '用户ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (article_id, user_id),
        INDEX idx_article_id (article_id),
        INDEX idx_user_id (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        article_id INT NOT NULL COMMENT '文章ID',
        user_id INT NOT NULL COMMENT '用户ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_favorite (article_id, user_id),
        INDEX idx_article_id (article_id),
        INDEX idx_user_id (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS follows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_id INT NOT NULL COMMENT '粉丝ID',
        following_id INT NOT NULL COMMENT '关注用户ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_follow (follower_id, following_id),
        INDEX idx_follower_id (follower_id),
        INDEX idx_following_id (following_id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
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
    )`
];

async function initDatabase() {
    let connection;
    try {
        console.log('正在连接数据库...');
        connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！\n');

        for (let i = 0; i < tables.length; i++) {
            const tableName = tables[i].match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
            try {
                await connection.query(tables[i]);
                console.log(`✅ ${tableName} 表创建成功`);
            } catch (err) {
                if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`ℹ️  ${tableName} 表已存在`);
                } else {
                    console.error(`❌ ${tableName} 表创建失败:`, err.message);
                }
            }
        }

        console.log('\n所有社交功能表已创建完成！');
        console.log('现在可以正常使用评论、点赞、收藏等功能了。');

    } catch (error) {
        console.error('❌ 数据库初始化失败:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n数据库连接已关闭');
        }
    }
}

initDatabase();
