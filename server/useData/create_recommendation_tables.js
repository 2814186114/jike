const { connection } = require('./db');

// 创建推荐系统所需的表
const createTables = () => {
    console.log('开始创建推荐系统表...');

    // 1. 创建内容特征表
    const createContentFeaturesTable = `
        CREATE TABLE IF NOT EXISTS content_features (
            id INT AUTO_INCREMENT PRIMARY KEY,
            item_id INT NOT NULL,
            item_type ENUM('article', 'my_article') NOT NULL,
            tags JSON,
            tech_stack VARCHAR(500),
            popularity_score DECIMAL(10,4) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_item (item_id, item_type)
        )
    `;

    // 2. 创建用户行为表
    const createUserBehaviorTable = `
        CREATE TABLE IF NOT EXISTS user_behavior (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            item_id INT NOT NULL,
            item_type ENUM('article', 'my_article') NOT NULL,
            action_type ENUM('view', 'like', 'collect', 'comment', 'share') NOT NULL,
            duration INT DEFAULT 0,
            metadata JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_item (item_id, item_type),
            INDEX idx_action_type (action_type),
            INDEX idx_created_at (created_at)
        )
    `;

    // 3. 创建用户画像表
    const createUserProfileTable = `
        CREATE TABLE IF NOT EXISTS user_profile (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL UNIQUE,
            interest_tags JSON,
            behavior_pattern JSON,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id)
        )
    `;

    // 执行创建表的SQL
    connection.query(createContentFeaturesTable, (error, results) => {
        if (error) {
            console.error('创建 content_features 表失败:', error);
            return;
        }
        console.log('✓ content_features 表创建成功');

        connection.query(createUserBehaviorTable, (error, results) => {
            if (error) {
                console.error('创建 user_behavior 表失败:', error);
                return;
            }
            console.log('✓ user_behavior 表创建成功');

            connection.query(createUserProfileTable, (error, results) => {
                if (error) {
                    console.error('创建 user_profile 表失败:', error);
                    return;
                }
                console.log('✓ user_profile 表创建成功');

                console.log('\n🎉 所有推荐系统表创建完成！');
                console.log('接下来请运行: node server/useData/initialize_features.js');

                process.exit();
            });
        });
    });
};

createTables();
