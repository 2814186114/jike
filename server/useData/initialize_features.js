const { connection } = require('./db');

// 初始化内容特征数据
const initializeFeatures = () => {
    console.log('开始初始化内容特征数据...');

    // 从现有文章中提取特征并插入到 content_features 表
    const initializeArticlesFeatures = `
        INSERT INTO content_features (item_id, item_type, tags, tech_stack, popularity_score)
        SELECT 
            a.id as item_id,
            'article' as item_type,
            JSON_ARRAY(
                CASE 
                    WHEN a.tech_stack LIKE '%react%' THEN 'react'
                    WHEN a.tech_stack LIKE '%vue%' THEN 'vue'
                    WHEN a.tech_stack LIKE '%angular%' THEN 'angular'
                    WHEN a.tech_stack LIKE '%javascript%' THEN 'javascript'
                    WHEN a.tech_stack LIKE '%typescript%' THEN 'typescript'
                    WHEN a.tech_stack LIKE '%nodejs%' THEN 'nodejs'
                    WHEN a.tech_stack LIKE '%express%' THEN 'express'
                    WHEN a.tech_stack LIKE '%mongodb%' THEN 'mongodb'
                    WHEN a.tech_stack LIKE '%mysql%' THEN 'mysql'
                    WHEN a.tech_stack LIKE '%docker%' THEN 'docker'
                    WHEN a.tech_stack LIKE '%kubernetes%' THEN 'kubernetes'
                    WHEN a.tech_stack LIKE '%aws%' THEN 'aws'
                    WHEN a.tech_stack LIKE '%html%' THEN 'html'
                    WHEN a.tech_stack LIKE '%css%' THEN 'css'
                    WHEN a.tech_stack LIKE '%sass%' THEN 'sass'
                    WHEN a.tech_stack LIKE '%webpack%' THEN 'webpack'
                    WHEN a.tech_stack LIKE '%vite%' THEN 'vite'
                    WHEN a.tech_stack LIKE '%git%' THEN 'git'
                    WHEN a.tech_stack LIKE '%ci/cd%' THEN 'ci/cd'
                    WHEN a.tech_stack LIKE '%rest%' THEN 'rest'
                    WHEN a.tech_stack LIKE '%graphql%' THEN 'graphql'
                    ELSE 'web'
                END,
                CASE 
                    WHEN a.title LIKE '%前端%' OR a.content LIKE '%前端%' THEN '前端'
                    WHEN a.title LIKE '%后端%' OR a.content LIKE '%后端%' THEN '后端'
                    WHEN a.title LIKE '%全栈%' OR a.content LIKE '%全栈%' THEN '全栈'
                    WHEN a.title LIKE '%移动端%' OR a.content LIKE '%移动端%' THEN '移动端'
                    WHEN a.title LIKE '%数据库%' OR a.content LIKE '%数据库%' THEN '数据库'
                    WHEN a.title LIKE '%算法%' OR a.content LIKE '%算法%' THEN '算法'
                    WHEN a.title LIKE '%架构%' OR a.content LIKE '%架构%' THEN '架构'
                    WHEN a.title LIKE '%部署%' OR a.content LIKE '%部署%' THEN '部署'
                    WHEN a.title LIKE '%测试%' OR a.content LIKE '%测试%' THEN '测试'
                    ELSE '编程'
                END
            ) as tags,
            a.tech_stack,
            (a.views * 0.1 + 
             CASE 
                 WHEN DATEDIFF(NOW(), a.publish_date) <= 7 THEN 50
                 WHEN DATEDIFF(NOW(), a.publish_date) <= 30 THEN 30
                 ELSE 10
             END) as popularity_score
        FROM articles a
        WHERE NOT EXISTS (
            SELECT 1 FROM content_features cf 
            WHERE cf.item_id = a.id AND cf.item_type = 'article'
        )
    `;

    // 初始化用户文章的特征数据
    const initializeMyArticlesFeatures = `
        INSERT INTO content_features (item_id, item_type, tags, tech_stack, popularity_score)
        SELECT 
            ma.id as item_id,
            'my_article' as item_type,
            JSON_ARRAY(
                CASE 
                    WHEN ma.tech_stack LIKE '%react%' THEN 'react'
                    WHEN ma.tech_stack LIKE '%vue%' THEN 'vue'
                    WHEN ma.tech_stack LIKE '%angular%' THEN 'angular'
                    WHEN ma.tech_stack LIKE '%javascript%' THEN 'javascript'
                    WHEN ma.tech_stack LIKE '%typescript%' THEN 'typescript'
                    WHEN ma.tech_stack LIKE '%nodejs%' THEN 'nodejs'
                    WHEN ma.tech_stack LIKE '%express%' THEN 'express'
                    WHEN ma.tech_stack LIKE '%mongodb%' THEN 'mongodb'
                    WHEN ma.tech_stack LIKE '%mysql%' THEN 'mysql'
                    WHEN ma.tech_stack LIKE '%docker%' THEN 'docker'
                    WHEN ma.tech_stack LIKE '%kubernetes%' THEN 'kubernetes'
                    WHEN ma.tech_stack LIKE '%aws%' THEN 'aws'
                    WHEN ma.tech_stack LIKE '%html%' THEN 'html'
                    WHEN ma.tech_stack LIKE '%css%' THEN 'css'
                    WHEN ma.tech_stack LIKE '%sass%' THEN 'sass'
                    WHEN ma.tech_stack LIKE '%webpack%' THEN 'webpack'
                    WHEN ma.tech_stack LIKE '%vite%' THEN 'vite'
                    WHEN ma.tech_stack LIKE '%git%' THEN 'git'
                    WHEN ma.tech_stack LIKE '%ci/cd%' THEN 'ci/cd'
                    WHEN ma.tech_stack LIKE '%rest%' THEN 'rest'
                    WHEN ma.tech_stack LIKE '%graphql%' THEN 'graphql'
                    ELSE 'web'
                END,
                CASE 
                    WHEN ma.title LIKE '%前端%' OR ma.content LIKE '%前端%' THEN '前端'
                    WHEN ma.title LIKE '%后端%' OR ma.content LIKE '%后端%' THEN '后端'
                    WHEN ma.title LIKE '%全栈%' OR ma.content LIKE '%全栈%' THEN '全栈'
                    WHEN ma.title LIKE '%移动端%' OR ma.content LIKE '%移动端%' THEN '移动端'
                    WHEN ma.title LIKE '%数据库%' OR ma.content LIKE '%数据库%' THEN '数据库'
                    WHEN ma.title LIKE '%算法%' OR ma.content LIKE '%算法%' THEN '算法'
                    WHEN ma.title LIKE '%架构%' OR ma.content LIKE '%架构%' THEN '架构'
                    WHEN ma.title LIKE '%部署%' OR ma.content LIKE '%部署%' THEN '部署'
                    WHEN ma.title LIKE '%测试%' OR ma.content LIKE '%测试%' THEN '测试'
                    ELSE '编程'
                END
            ) as tags,
            ma.tech_stack,
            (CASE 
                 WHEN DATEDIFF(NOW(), ma.updatedAt) <= 7 THEN 50
                 WHEN DATEDIFF(NOW(), ma.updatedAt) <= 30 THEN 30
                 ELSE 10
             END) as popularity_score
        FROM my_articles ma
        WHERE NOT EXISTS (
            SELECT 1 FROM content_features cf 
            WHERE cf.item_id = ma.id AND cf.item_type = 'my_article'
        )
    `;

    // 执行初始化
    connection.query(initializeArticlesFeatures, (error, results) => {
        if (error) {
            console.error('初始化文章特征失败:', error);
            return;
        }
        console.log(`✓ 文章特征初始化完成，处理了 ${results.affectedRows} 篇文章`);

        connection.query(initializeMyArticlesFeatures, (error, results) => {
            if (error) {
                console.error('初始化用户文章特征失败:', error);
                return;
            }
            console.log(`✓ 用户文章特征初始化完成，处理了 ${results.affectedRows} 篇用户文章`);

            console.log('\n🎉 内容特征数据初始化完成！');
            console.log('推荐系统现在可以正常工作了！');
            console.log('可以启动应用测试推荐功能了。');

            process.exit();
        });
    });
};

initializeFeatures();
