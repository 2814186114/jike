const { connection } = require('./db');

function checkTables() {
    // 检查 content_features 表
    connection.query('SHOW TABLES LIKE "content_features"', (error, results) => {
        if (error) {
            console.error('检查表失败:', error);
            return;
        }
        console.log('Content features table exists:', results.length > 0);

        // 检查 user_behavior 表
        connection.query('SHOW TABLES LIKE "user_behavior"', (error, results) => {
            if (error) {
                console.error('检查表失败:', error);
                return;
            }
            console.log('User behavior table exists:', results.length > 0);

            // 检查 user_profile 表
            connection.query('SHOW TABLES LIKE "user_profile"', (error, results) => {
                if (error) {
                    console.error('检查表失败:', error);
                    return;
                }
                console.log('User profile table exists:', results.length > 0);

                if (results.length === 0) {
                    console.log('\n需要创建缺失的推荐系统表...');
                    console.log('请运行: node server/useData/create_recommendation_tables.js');
                } else {
                    console.log('\n所有推荐系统表已存在，可以初始化内容特征数据');
                    console.log('请运行: node server/useData/initialize_features.js');
                }

                process.exit();
            });
        });
    });
}

checkTables();
