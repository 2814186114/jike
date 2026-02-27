const mysql = require('mysql2')

//数据库学习
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // 替换为你的数据库用户名
    password: '123456', // 替换为你的数据库密码
    database: 'jike', // 替换为你的数据库名
})

connection.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

// 插入1000条数据的函数

// 批量插入1000条数据的函数
const insertArticles = () => {
    let sql = 'INSERT INTO articles (title, content, author, publish_date, tech_stack) VALUES ?';
    let values = [];

    for (let i = 1; i <= 1000; i++) {
        values.push([
            `Article Title ${i}`,
            `This is the content of article ${i}`,
            `Author ${i}`,
            new Date(),
            ['router', 'hooks', 'EventLoop', 'useState', 'ref'][i % 5]
        ]);
    }

    connection.query(sql, [values], (error, results) => {
        if (error) {
            console.error('Error inserting data:', error);
            return;
        }
        console.log('Inserted rows:', results.affectedRows);
    });
};
module.exports = { connection, insertArticles };