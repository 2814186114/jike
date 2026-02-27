const mysql = require('mysql2')

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'jike',
    port: process.env.DB_PORT || 3306,
}

if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL)
    dbConfig.host = url.hostname
    dbConfig.user = url.username
    dbConfig.password = url.password
    dbConfig.database = url.pathname.slice(1)
    dbConfig.port = url.port || 3306
    dbConfig.ssl = { rejectUnauthorized: true }
}

const connection = mysql.createConnection(dbConfig)

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