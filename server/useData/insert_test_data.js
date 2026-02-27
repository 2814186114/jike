const mysql = require('mysql2/promise');
const faker = require('faker');

// 数据库配置
const dbConfig = {
    host: 'localhost',
    user: 'root', // 替换为你的数据库用户名
    password: '123456', // 替换为你的数据库密码
    database: 'jike'
};

// 生成随机文章数据
function generateArticle() {
    const techStacks = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'Go'];
    return {
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(3),
        author: faker.name.findName(),
        tech_stack: techStacks[Math.floor(Math.random() * techStacks.length)],
        views: Math.floor(Math.random() * 1000)
    };
}

async function insertTestData() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // 生成1000条测试数据
        const articles = Array.from({ length: 1000 }, generateArticle);

        // 批量插入
        const query = 'INSERT INTO articles (title, content, author, tech_stack, views) VALUES ?';
        const values = articles.map(article => [
            article.title,
            article.content,
            article.author,
            article.tech_stack,
            article.views
        ]);

        const [result] = connection.query(query, [values]);
        console.log(`成功插入${result.affectedRows}条数据`);

    } catch (error) {
        console.error('插入数据出错:', error);
    } finally {
        if (connection) connection.end();
    }
}

insertTestData();
