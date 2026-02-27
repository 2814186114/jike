const express = require('express');
const app = express(); // 创建express应用实例
const bodyParser = require('body-parser'); // 引入body-parser中间件
const { Readable } = require('stream');
const path = require('path'); // 引入path模块处理文件路径
const multer = require('multer'); // 引入multer模块处理文件上传
const fs = require('fs'); // 引入fs模块处理文件操作
const crypto = require('crypto'); // 引入crypto模块生成文件哈希
const jwt = require('jsonwebtoken'); // 引入JWT模块处理令牌
const axios = require('axios'); // 引入axios模块处理HTTP请求
const bcrypt = require('bcrypt'); // 引入bcrypt模块处理密码加密

// 推荐系统相关模块
const recommendationRoutes = require('./recommendationRoutes');

// 学习分析系统相关模块
const learningAnalyticsRoutes = require('./learningAnalyticsRoutes');

// 简历诊断相关模块
const mammoth = require('mammoth');
const ResumeDiagnosisService = require('./resumeDiagnosisService');
const resumeService = new ResumeDiagnosisService();

// 简历文件上传配置
const resumeUpload = multer({
    dest: 'server/useData/tmp_uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB限制
    }
});

// 定义JWT密钥和数据库连接
const secretKey = process.env.JWT_SECRET || 'your-strong-secret-key-123!@#';
const { connection } = require('./db');

// 在express初始化后添加CORS中间件
const cors = require('cors');
const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',') 
    : ['http://localhost:3000'];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 处理预检请求
app.options('*', cors());

// 使用body-parser中间件解析JSON请求体
app.use(bodyParser.json());

// 集成推荐系统路由
app.use('/api/recommendation', recommendationRoutes);

// 集成学习分析系统路由
app.use('/api/learning', learningAnalyticsRoutes);


// // 检查协商缓存
// const ifModifiedSince = req.headers['if-modified-since'];
// const ifNoneMatch = req.headers['if-none-match'];
// // 如果条件匹配，返回304
// if (ifModifiedSince === resource.lastModified || ifNoneMatch === resource.etag) {
//     return res.status(304).end(); // 返回304 Not Modified
// }



app.get('/api/framework-data', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300'); // 
    setTimeout(() => {

        res.json(frameworkData)
    }, 2000)
})
// SSR路由 - 处理Home页面
app.get('/', async (req, res) => {
    try {
        // 设置缓存头
        res.set('Cache-Control', 'public, max-age=60, s-maxage=300');

        // 获取组件
        const Home = require('../src/pages/Home').default;

        // 调用组件的getInitialProps方法获取数据
        const startTime = Date.now();
        const initialData = Home.getInitialProps
            ? await Home.getInitialProps()
            : {
                Vue: 800000,
                React: 1200000,
                Angular: 500000
            };

        // 渲染Home组件
        const html = ReactDOMServer.renderToString(
            React.createElement(Home, { initialData })
        );

        // 记录渲染时间
        console.log(`SSR渲染耗时: ${Date.now() - startTime}ms`);

        // 发送完整HTML
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>SSR Home</title>
                </head>
                <body>
                    <div id="root">${html}</div>
                    <script>
                        window.__SSR_ERROR__ = false;
                    </script>
                    <script>
                        window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};
                    </script>
                    <script src="/static/js/main.js"></script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('SSR渲染失败:', error);
        res.status(500).send('服务器渲染出错');
    }
});
const refreshTokens = []; // 存储刷新 token
//注册接口
app.post('/api/register', (req, res) => {
    const { mobile, code } = req.body

    //检查是否存在
    connection.query('SELECT * FROM vip WHERE username=?', [mobile], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // 用户不存在，继续执行注册
        bcrypt.hash(code, 10, (hashErr, hashedPassword) => {
            if (hashErr) {
                return res.status(500).json({ message: 'Password encryption failed' });
            }

            connection.query('INSERT INTO vip (username, password) VALUES (?, ?)',
                [mobile, hashedPassword],
                (insertErr, insertResults) => {
                    if (insertErr) {
                        return res.status(500).json({ message: 'Error saving user' });
                    }
                    res.status(201).json({ message: 'User registered successfully' });
                }
            );
        });
    });
})
//登入接口
app.post('/api/login', async (req, res) => {
    const { mobile, code } = req.body;
    console.log(mobile, code);

    // 验证手机号格式
    // const mobileRegex = /^1[3-9]\d{9}$/
    // if (!mobileRegex.text(mobile)) {
    //     return res.status(400).json({ message: '请输入正确的手机号' });
    // }
    // 检查用户是否存在
    const sql = 'SELECT * FROM vip WHERE username = ?'
    connection.query(sql, [mobile], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error checking user' });
        }

        if (results.length > 0) {
            // 验证密码
            const passwordMatch = await bcrypt.compare(code, results[0].password);
            if (!passwordMatch) {
                return res.status(401).json({ message: '用户名或密码错误' });
            }

            //生成token
            const token = jwt.sign({ mobile, userId: results[0].id }, secretKey, { expiresIn: '2h' })
            const refreshToken = jwt.sign({ mobile, userId: results[0].id }, secretKey, { expiresIn: '7d' });
            // console.log(refreshToken);
            // console.log(userInfo);



            // 返回完整的用户信息，包括用户ID
            const userInfo = {
                id: results[0].id,
                username: results[0].username,
                mobile: results[0].mobile
            };
            console.log(results[0], 'xxxx');
            // refreshTokens.push(refreshToken); // 每次登录或刷新时只保存当前生成的 Refresh Token
            return res.json({
                token,
                refreshToken,
                userInfo
            });
        } else {
            return res.status(404).json({ message: '你的用户名或密码错误' });
        }
    });

})

// 刷新 token 接口
app.post('/api/token', (req, res) => {
    const { token } = req.body;
    if (!token || !refreshTokens.includes(token)) {
        return res.sendStatus(403); // Forbidden
    }
    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403);
        const newAccessToken = jwt.sign({ mobile: user.mobile }, secretKey, { expiresIn: '15m' });
        res.json({ accessToken: newAccessToken });
    });
});

app.post('/api/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;
        console.log(refreshToken, '121');


        if (!refreshToken) {
            return res.status(403).json({ message: 'Missing refresh token' });
        }

        // 验证 refreshToken 是否有效
        jwt.verify(refreshToken, secretKey, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid or expired refresh token' });
            }

            // 使用 user 信息生成新的 Access Token 和新的 Refresh Token
            const newAccessToken = jwt.sign({ mobile: user.mobile }, secretKey, { expiresIn: '3m' });
            const newRefreshToken = jwt.sign({ mobile: user.mobile }, secretKey, { expiresIn: '7d' });

            res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
        });
    } catch (error) {
        console.error('Internal server error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//分片上传
// 设置Multer用于文件上传
// const upload = multer({ dest: 'uploads/' });
// 让 uploads 目录下的文件可被访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.post('/upload-chunk', upload1.single('file'), (req, res) => {
//     const { filename, chunkIndex, totalChunks } = req.body;
//     const tempPath = path.join(__dirname, 'uploads', filename + '_' + chunkIndex);

//     fs.renameSync(req.file.path, tempPath);

//     if (parseInt(chunkIndex) === parseInt(totalChunks) - 1) {
//         const filePath = path.join(__dirname, 'uploads', filename);
//         const writeStream = fs.createWriteStream(filePath);

//         for (let i = 0; i < totalChunks; i++) {
//             const chunkPath = path.join(__dirname, 'uploads', filename + '_' + i);
//             const chunk = fs.readFileSync(chunkPath);
//             writeStream.write(chunk);
//             fs.unlinkSync(chunkPath); // 删除分片
//         }

//         writeStream.end();
//         const imageUrl = `/uploads/${filename}`;
//         res.status(200).json({ message: '文件上传成功', imageUrl });

//     } else {
//         res.status(200).json({ message: '分片上传成功' });
//     }
// });

//视频断点续传
// 确保上传文件夹存在
// 创建上传文件夹，如果不存在的话
// 设置存储引擎
// 创建存储引擎

const upload = multer({ dest: 'tmp_uploads/' });  // 临时存放文件的目录

// 定义视频存放的目录
const VIDEO_STORAGE_DIR = path.join(__dirname, 'video_storage');

// 确保存储视频的目录存在
if (!fs.existsSync(VIDEO_STORAGE_DIR)) {
    fs.mkdirSync(VIDEO_STORAGE_DIR);
}
const UPLOAD_STATUS = {}; // 存储文件上传状态的内存对象
// 获取文件的哈希值（用于秒传）
const getFileHash = (filePath) => {
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
};
// 检查文件是否已经上传过
const checkFileExistence = (fileHash) => {
    const files = fs.readdirSync(VIDEO_STORAGE_DIR);
    return files.find(file => getFileHash(path.join(VIDEO_STORAGE_DIR, file)) === fileHash);
};


app.post('/check-file', (req, res) => {
    const { fileHash } = req.body;
    // const { fileHash } = req.body;

    // 检查文件是否已上传过
    const existingFile = checkFileExistence(fileHash);
    if (existingFile) {
        // 文件已上传，秒传成功
        const videoUrl = `/video-storage/${existingFile}`;
        return res.status(200).json({
            message: '文件已存在，秒传成功',
            videoUrl,
        });
    }

    // 文件未上传，返回上传状态
    if (UPLOAD_STATUS[fileHash]) {
        const uploadedChunks = UPLOAD_STATUS[fileHash];
        res.status(200).json({
            uploadedChunks, // 返回已上传分片的索引
        });
        // res.status(200).json(uploadedChunks);  // 返回已上传分片
    } else {
        res.status(200).json([]);  // 文件未上传过，返回空数组
    }
});
app.post('/upload-chunk-video', upload.single('file'), (req, res) => {
    const { filename, chunkIndex, totalChunks, fileHash } = req.body;
    console.log(fileHash);

    const chunkIndexInt = parseInt(chunkIndex, 10);
    // 检查文件是否已上传（秒传）
    const existingFile = checkFileExistence(fileHash);
    console.log(existingFile, 'ssadada');

    if (existingFile) {
        // 文件已存在，直接返回文件 URL
        // console.log('秒传成功');
        const videoUrl = `/video-storage/${existingFile}`;
        console.log(videoUrl);

        return res.status(200).json({
            message: '文件已存在，秒传成功',
            videoUrl,
        });
        // console.log('秒传成功');

    }

    const tempPath = path.join(__dirname, 'tmp_uploads', `${fileHash}_${chunkIndexInt}`);
    fs.renameSync(req.file.path, tempPath);

    // 更新文件上传状态
    if (!UPLOAD_STATUS[fileHash]) {
        UPLOAD_STATUS[fileHash] = [];
    }
    UPLOAD_STATUS[fileHash].push(chunkIndexInt);

    if (UPLOAD_STATUS[fileHash].length === parseInt(totalChunks, 10)) {
        const filePath = path.join(VIDEO_STORAGE_DIR, filename);
        //写入流,适合于需要分批次、大量数据的写入操作
        const writeStream = fs.createWriteStream(filePath);

        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(__dirname, 'tmp_uploads', `${fileHash}_${i}`);
            const chunk = fs.readFileSync(chunkPath);
            writeStream.write(chunk);
            fs.unlinkSync(chunkPath); // 删除已合并分片
        }
        writeStream.end();

        delete UPLOAD_STATUS[fileHash]; // 合并完成后清理状态

        res.status(200).json({
            message: '文件上传成功',
            videoUrl: `/video-storage/${filename}`,
        });
    } else {
        res.status(200).json({
            message: '分片上传成功',
        });
    }
});


// 上传切片的接口
// app.post('/upload-chunk-video', upload.single('file'), (req, res) => {
//     const { filename, chunkIndex, totalChunks } = req.body;

//     const tempPath = path.join(__dirname, 'tmp_uploads', `${filename}_${chunkIndex}`);

//     try {
//         // 重命名上传的文件为分片
//         fs.renameSync(req.file.path, tempPath);

//         // 判断是否是最后一个分片
//         if (parseInt(chunkIndex) === parseInt(totalChunks) - 1) {
//             const filePath = path.join(VIDEO_STORAGE_DIR, filename);
//             const writeStream = fs.createWriteStream(filePath);

//             // 合并所有的分片
//             for (let i = 0; i < totalChunks; i++) {
//                 const chunkPath = path.join(__dirname, 'tmp_uploads', `${filename}_${i}`);
//                 if (!fs.existsSync(chunkPath)) {
//                     return res.status(400).json({ message: `缺少分片 ${i}` });
//                 }
//                 const chunk = fs.readFileSync(chunkPath);
//                 writeStream.write(chunk);
//                 fs.unlinkSync(chunkPath); // 删除已经合并的分片
//             }

//             writeStream.end();

//             // 返回上传成功的响应
//             const videoUrl = `/video-storage/${filename}`;
//             return res.status(200).json({
//                 message: '文件上传成功',
//                 videoUrl, // 返回合并后的视频 URL
//             });
//         } else {
//             // 如果不是最后一个分片，则返回分片上传成功的响应
//             return res.status(200).json({
//                 message: '分片上传成功',
//                 videoUrl: null, // 未合并时返回占位符
//             });
//         }
//     } catch (error) {
//         console.error('分片处理失败:', error);
//         return res.status(500).json({ message: '分片处理失败', error: error.message });
//     }
// });


// 使视频文件夹中的文件可以通过 http 访问
app.use('/video-storage', express.static(VIDEO_STORAGE_DIR));

// 创建图片上传目录
const IMAGE_UPLOAD_DIR = path.join(__dirname, 'image-uploads');
if (!fs.existsSync(IMAGE_UPLOAD_DIR)) {
    fs.mkdirSync(IMAGE_UPLOAD_DIR);
}

// 图片上传配置 - 修改为内存存储，直接转换为Base64
const imageUpload = multer({
    storage: multer.memoryStorage(), // 使用内存存储，不保存到磁盘
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB限制，Base64会增加约33%大小
        files: 1 // 单文件上传
    },
    fileFilter: (req, file, cb) => {
        // 检查文件类型
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型，仅支持JPEG、PNG、GIF和WebP格式'));
        }
    }
});

// 图片上传接口 - 返回Base64数据
app.post('/api/upload-image', imageUpload.single('image'), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: '请选择要上传的图片' });
        }

        // 将图片Buffer转换为Base64字符串
        const base64String = file.buffer.toString('base64');

        // 构建Base64数据URL
        const dataUrl = `data:${file.mimetype};base64,${base64String}`;

        // 图片信息
        const imageInfo = {
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            uploadTime: new Date().toISOString(),
            base64Size: base64String.length // Base64字符串长度
        };

        console.log('图片上传成功 - Base64存储:', imageInfo);

        // 返回成功响应，包含Base64数据
        res.status(200).json({
            success: true,
            message: '图片上传成功',
            imageData: dataUrl, // 返回完整的Base64数据URL
            imageInfo: imageInfo
        });

    } catch (error) {
        console.error('图片上传失败:', error);
        res.status(500).json({
            success: false,
            error: '图片上传失败: ' + error.message
        });
    }
});

// 使图片上传目录可通过HTTP访问
app.use('/image-uploads', express.static(IMAGE_UPLOAD_DIR));

// 处理上传视频分片

// 创建视频上传进度接口
// app.post('/upload-viedo', upload1.single('file'), (req, res) => {
//     const { filename, totalChunks, chunkIndex } = req.body;
//     console.log(filename, totalChunks, chunkIndex);


//     // 更新上传进度
//     const query = 'SELECT * FROM upload_progress WHERE filename = ?';
//     connection.query(query, [filename], (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: 'Database error' });
//         }

//         let uploadedChunks = 0;
//         if (results.length > 0) {
//             // 获取已上传的分片数
//             uploadedChunks = results[0].uploadedChunks;
//         }

//         // 如果当前分片上传成功，更新进度
//         if (chunkIndex === uploadedChunks) {
//             const newUploadedChunks = uploadedChunks + 1;

//             // 如果所有分片都上传完，标记为上传完成
//             if (newUploadedChunks === parseInt(totalChunks)) {
//                 const updateQuery = 'UPDATE upload_progress SET uploadedChunks = ? WHERE filename = ?';
//                 db.query(updateQuery, [newUploadedChunks, filename], (err) => {
//                     if (err) {
//                         return res.status(500).json({ error: 'Failed to update progress' });
//                     }
//                     return res.json({ message: 'Upload complete' });
//                 });
//             } else {
//                 const updateQuery = 'UPDATE upload_progress SET uploadedChunks = ? WHERE filename = ?';
//                 db.query(updateQuery, [newUploadedChunks, filename], (err) => {
//                     if (err) {
//                         return res.status(500).json({ error: 'Failed to update progress' });
//                     }
//                     return res.json({ message: 'Chunk uploaded successfully' });
//                 });
//             }
//         } else {
//             return res.status(400).json({ error: 'Invalid chunk upload order' });
//         }
//     });
// });

// // 获取上传进度接口
// app.get('/progress/:filename', (req, res) => {
//     const { filename } = req.params;
//     console.log(filename, 'filename');


//     const query = 'SELECT * FROM upload_progress WHERE filename = ?';
//     connection.query(query, [filename], (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: 'Database error' });
//         }

//         if (results.length === 0) {
//             return res.status(404).json({ error: 'File not found' });
//         }

//         res.json(results[0]);
//     });
// });


//自己写文章存放数据库
app.post('/submit-article', (req, res) => {
    // 检查必填字段 - 只验证核心字段，图片可以为空
    const { title, tech_stack, content, images } = req.body;
    if (!title || !tech_stack || !content) {
        return res.status(400).json({ message: '标题、技术栈和内容是必填项' });
    }
    console.log('要插入的图片:', images); // 打印 images 确保它不是空数组

    // 插入数据到数据库
    const query = 'INSERT INTO my_articles (title, tech_stack, content, images) VALUES (?, ?, ?, ?)';
    connection.query(query, [title, tech_stack, content, JSON.stringify(images || [])], (err, result) => {
        if (err) {
            console.error('Failed to insert article: ' + err.message);
            return res.status(500).json({ message: '数据库插入失败' });
        }
        res.status(201).json({ message: '文章发布成功', articleId: result.insertId });
    });
})


//返回用户名的token
app.get('/api/username', (req, res) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]; // 格式为 "Bearer token"
    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }
    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.sendStatus(403)
        }
        res.json({ username: user.mobile })
    })
})


//获取文章的接口
// app.get('/api/articles', (req, res) => {
//     const page = parseInt(req.query.page, 10);
//     const limit = parseInt(req.query.limit, 10);
//     const searchTerm = req.query.search || ''; // 默认值为空字符串

//     // 参数校验
//     if (isNaN(page) || page < 1) {
//         return res.status(400).json({ error: 'Invalid page parameter' });
//     }

//     if (isNaN(limit) || limit < 1) {
//         return res.status(400).json({ error: 'Invalid limit parameter' });
//     }

//     if (!searchTerm.trim()) {
//         return res.status(400).json({ error: 'Search term is required' });
//     }

//     const offset = (page - 1) * limit;

//     const sql = `SELECT * FROM articles WHERE title LIKE ? OR content LIKE ? LIMIT ? OFFSET ?`;
//     const countSql = `SELECT COUNT(*) AS total FROM articles WHERE title LIKE ? OR content LIKE ?`;

//     const searchQuery = `%${searchTerm}%`;

//     connection.query(sql, [searchQuery, searchQuery, limit, offset], (error, results) => {
//         if (error) {
//             return res.status(500).json({ error: 'Error retrieving articles' });
//         }

//         connection.query(countSql, [searchQuery, searchQuery], (countError, countResults) => {
//             if (countError) {
//                 return res.status(500).json({ error: 'Error retrieving articles count' });
//             }

//             res.json({
//                 data: results,
//                 total: countResults[0].total,
//             });
//         });
//     });
// });

app.get('/api/articles', (req, res) => {
    const page = parseInt(req.query.page) || 1; // 默认页码为 1
    const limit = parseInt(req.query.limit) || 10; // 默认每页显示 10 条数据
    const offset = (page - 1) * limit;
    const searchTerm = req.query.search || ''; // 获取搜索关键字，默认为空

    // 基本查询语句，使用模糊搜索
    const sql = `SELECT * FROM articles WHERE title LIKE ? OR content LIKE ? LIMIT ? OFFSET ?`;
    // const sql = `SELECT * FROM articles WHERE title LIKE '%searchTerm%' OR content LIKE '%searchTerm%' LIMIT ? OFFSET ?`;


    const countSql = `SELECT COUNT(*) AS total FROM articles WHERE title LIKE ? OR content LIKE ?`;

    // 使用 % 包围搜索关键字实现模糊匹配
    const searchQuery = `%${searchTerm}%`;

    // 查询符合条件的文章
    connection.query(sql, [searchQuery, searchQuery, limit, offset], (error, results) => {
        if (error) {
            return res.status(500).send('Error retrieving articles');
        }

        // 获取符合条件的文章总数
        connection.query(countSql, [searchQuery, searchQuery], (countError, countResults) => {
            if (countError) {
                return res.status(500).send('Error retrieving articles count');
            }

            // 返回结果包含数据和总数
            res.json({
                data: results,
                total: countResults[0].total
            });
        });
    });
})

app.get('/api/other_articles', (req, res) => {
    const query = 'SELECT * FROM articles';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('查询文章失败: ' + err.message);
            return res.status(500).json({ message: '查询失败' });
        }
        res.status(200).json(results);
    });
})
app.get('/api/my_articles', (req, res) => {
    const query = 'SELECT * FROM my_articles';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('查询文章失败: ' + err.message);
            return res.status(500).json({ message: '查询失败' });
        }

        // 获取最近更新时间
        const lastModified = new Date(
            Math.max(
                ...results.map((article) => {
                    const updatedAt = new Date(article.updatedAt);
                    return isNaN(updatedAt.getTime()) ? Date.now() : updatedAt.getTime();
                })
            )
        ).toUTCString();

        // 生成 ETag
        const etag = crypto.createHash('md5').update(JSON.stringify(results)).digest('hex');
        const clientModifiedSince = new Date(req.headers['if-modified-since']).getTime();
        const serverLastModified = new Date(lastModified).getTime();
        console.log(clientModifiedSince, serverLastModified);


        // 检查 If-None-Match 和 If-Modified-Since 请求头
        if (
            req.headers['if-none-match'] === etag ||
            (clientModifiedSince && clientModifiedSince >= serverLastModified)
        ) {
            return res.status(304).end(); // 缓存有效，返回 304
        }

        // 设置 ETag 和 Last-Modified 响应头
        res.setHeader('ETag', etag);
        console.log('ETag', etag);

        res.setHeader('Last-Modified', lastModified);
        console.log('Last-Modified', lastModified);


        // 添加缓存控制策略
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存 1 小时

        // 返回文章数据
        res.status(200).json(results);
    });
});
// app.get('/api/my_articles', (req, res) => {
//     const query = 'SELECT * FROM my_articles';
//     connection.query(query, (err, results) => {
//         if (err) {
//             console.error('查询文章失败: ' + err.message);
//             return res.status(500).json({ message: '查询失败' });
//         }

//         // 获取最近更新时间，并设置为 Last-Modified
//         // const lastModified = new Date(Math.max(...results.map(article => new Date(article.updatedAt).getTime()))).toUTCString();
//         const lastModified = new Date(Math.max(...results.map(article => {
//             const updatedAt = new Date(article.updatedAt);
//             if (isNaN(updatedAt.getTime())) {
//                 // 如果 updatedAt 无效，使用当前时间作为默认值
//                 return Date.now();
//             }
//             return updatedAt.getTime();
//         }))).toUTCString();
//         console.log('Last-Modified:', lastModified);  // 打印最后生成的 Last-Modified
//         // 通过哈希计算生成 ETag
//         const etag = crypto.createHash('md5').update(JSON.stringify(results)).digest('hex');

//         // 检查 If-None-Match 和 If-Modified-Since 请求头
//         if (req.headers['if-none-match'] === etag || req.headers['if-modified-since'] === lastModified) {
//             return res.status(304).end(); // 缓存有效，返回 304
//         }

//         // 设置 ETag 和 Last-Modified 头
//         res.setHeader('ETag', etag);
//         console.log('ETag:', etag);  // 在服务器端确认是否正确设置了 ETag 头部

//         res.setHeader('Last-Modified', lastModified);
//         res.setHeader('ETag', etag);
//         // console.log('Last-Modified', lastModified);


//         // 添加缓存控制策略
//         res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时

//         // 返回数据
//         res.status(200).json(results);
//     });
// });

//用户阅读时更新views字段
app.post('/api/articles/:id/view', async (req, res) => {
    const { id } = req.params; // 获取文章的 id
    try {
        // 假设你使用的是 MySQL 数据库
        connection.query('UPDATE articles SET views = views + 1 WHERE id = ?', [id]);
        res.json({ success: true })

        // if (result.affectedRows > 0) {
        //     res.json({ success: true }); // 返回成功响应
        // } else {
        //     res.status(404).json({ success: false, message: '文章未找到' }); // 如果没有找到文章
        // }
    } catch (error) {
        console.error('数据库操作错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' }); // 返回500错误
    }
});

//热力图返回接口，假装操作数据库
const data = [
    { "tech_stack": "react-hooks", "week": 1, "total_views": 1200 },
    { "tech_stack": "vue-router", "week": 1, "total_views": 900 },
    { "tech_stack": "redux", "week": 2, "total_views": 1500 },
    { "tech_stack": "html", "week": 2, "total_views": 1500 },
    { "tech_stack": "javascript", "week": 2, "total_views": 1500 },
    { "tech_stack": "css", "week": 2, "total_views": 1500 },
]

app.get('/api/tech-stack-views', (req, res) => {
    res.status(200).json(data)
})

const progress = [

    { "tech_stack": "react", "total_articles": 1000, "read_articles": 500 },
    { "tech_stack": "vue", "total_articles": 500, "read_articles": 300 },
    { "tech_stack": "redux", "total_articles": 200, "read_articles": 40 },
    { "tech_stack": "pinia", "total_articles": 300, "read_articles": 40 }
]
app.get('/api/user-progress', (req, res) => {
    res.status(200).json(progress)
})
//用户进展图


// 智能文章分析功能
app.post('/api/analyze-article', async (req, res) => {
    const { title, content, tech_stack } = req.body;

    if (!title && !content) {
        return res.status(400).json({ error: '文章标题或内容不能为空' });
    }

    try {
        // 模拟智能分析结果
        const analysisResult = await analyzeArticleContent(title, content, tech_stack);
        res.json(analysisResult);
    } catch (error) {
        console.error('文章分析失败:', error);
        res.status(500).json({ error: '文章分析失败，请稍后重试' });
    }
});

// 智能文章分析核心函数
async function analyzeArticleContent(title, content, techStack) {
    // 这里可以接入真实的AI服务，目前先用模拟数据
    const techKeywords = {
        'react': ['React', '组件', 'Hook', 'JSX', '虚拟DOM', '状态管理', 'Props'],
        'vue': ['Vue', '组件', '响应式', 'Vuex', 'Vue Router', '指令', '生命周期'],
        'javascript': ['JavaScript', 'ES6', '异步', 'Promise', '闭包', '原型链', '事件循环'],
        'html': ['HTML', '标签', '语义化', 'SEO', 'DOM', 'Canvas', 'Web Components'],
        'node': ['Node.js', 'Express', '中间件', '事件驱动', '模块化', 'NPM', 'Buffer'],
        'python': ['Python', 'Django', 'Flask', '异步', '装饰器', '生成器', '爬虫']
    };

    // 自动标签化
    const tags = extractTags(title, content, techStack, techKeywords);

    // 难度评估
    const difficulty = assessDifficulty(content, techStack);

    // 文章摘要
    const summary = generateSummary(content);

    // 关键知识点
    const keyPoints = extractKeyPoints(content, techStack, techKeywords);

    // 预计阅读时间
    const estimatedTime = calculateReadingTime(content);

    return {
        tags,
        difficulty,
        summary,
        keyPoints,
        estimatedTime,
        analysisTime: new Date().toISOString()
    };
}

// 自动标签提取
function extractTags(title, content, techStack, techKeywords) {
    const tags = new Set();

    // 添加技术栈标签
    tags.add(techStack);

    // 基于技术关键词提取标签
    const keywords = techKeywords[techStack] || [];
    const contentText = (title + ' ' + content).toLowerCase();

    keywords.forEach(keyword => {
        if (contentText.includes(keyword.toLowerCase())) {
            tags.add(keyword);
        }
    });

    // 基于内容特征添加标签
    if (contentText.includes('教程') || contentText.includes('入门') || contentText.includes('基础')) {
        tags.add('入门教程');
    }

    if (contentText.includes('原理') || contentText.includes('源码') || contentText.includes('实现')) {
        tags.add('原理分析');
    }

    if (contentText.includes('实战') || contentText.includes('项目') || contentText.includes('案例')) {
        tags.add('实战案例');
    }

    if (contentText.includes('面试') || contentText.includes('面经') || contentText.includes('题目')) {
        tags.add('面试相关');
    }

    if (contentText.includes('性能') || contentText.includes('优化') || contentText.includes('提升')) {
        tags.add('性能优化');
    }

    // 根据内容长度添加难度标签
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 500) {
        tags.add('初级');
    } else if (wordCount < 2000) {
        tags.add('中级');
    } else {
        tags.add('高级');
    }

    return Array.from(tags).slice(0, 8); // 限制最多8个标签
}

// 难度评估
function assessDifficulty(content, techStack) {
    let difficulty = 1; // 默认难度1-5

    const contentText = content.toLowerCase();
    const wordCount = content.split(/\s+/).length;

    // 基于内容长度
    if (wordCount > 3000) difficulty += 1;
    if (wordCount > 5000) difficulty += 1;

    // 基于技术复杂度
    const complexityIndicators = [
        '源码', '原理', '底层', '架构', '设计模式', '算法',
        '性能优化', '内存管理', '并发', '异步'
    ];

    complexityIndicators.forEach(indicator => {
        if (contentText.includes(indicator)) {
            difficulty += 0.5;
        }
    });

    // 基于代码示例数量
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    if (codeBlocks > 3) difficulty += 0.5;
    if (codeBlocks > 6) difficulty += 0.5;

    // 限制在1-5之间
    return Math.min(Math.max(Math.round(difficulty), 1), 5);
}

// 生成文章摘要
function generateSummary(content) {
    // 简单的摘要生成逻辑
    const sentences = content.split(/[.!?。！？]/).filter(s => s.trim().length > 10);

    if (sentences.length === 0) {
        return '这篇文章主要介绍了相关技术知识。';
    }

    // 取前3句作为摘要
    const summarySentences = sentences.slice(0, 3);
    return summarySentences.map(s => s.trim()).join('。') + '。';
}

// 提取关键知识点
function extractKeyPoints(content, techStack, techKeywords) {
    const keyPoints = [];
    const contentText = content.toLowerCase();
    const keywords = techKeywords[techStack] || [];

    // 基于技术关键词提取关键点
    keywords.forEach(keyword => {
        if (contentText.includes(keyword.toLowerCase())) {
            keyPoints.push(`深入理解${keyword}的概念和应用`);
        }
    });

    // 基于内容特征添加关键点
    if (contentText.includes('hook') || contentText.includes('hooks')) {
        keyPoints.push('掌握React Hooks的使用方法和最佳实践');
    }

    if (contentText.includes('组件') && contentText.includes('通信')) {
        keyPoints.push('学习组件间通信的各种方式');
    }

    if (contentText.includes('状态管理')) {
        keyPoints.push('理解状态管理的原理和实现');
    }

    if (contentText.includes('路由')) {
        keyPoints.push('掌握路由配置和导航守卫');
    }

    if (contentText.includes('异步')) {
        keyPoints.push('理解异步编程和Promise的使用');
    }

    // 如果没有提取到关键点，添加默认值
    if (keyPoints.length === 0) {
        keyPoints.push('掌握基础语法和核心概念');
        keyPoints.push('了解实际应用场景');
        keyPoints.push('学习最佳实践和代码规范');
    }

    return keyPoints.slice(0, 5); // 限制最多5个关键点
}

// 计算预计阅读时间
function calculateReadingTime(content) {
    const wordCount = content.split(/\s+/).length;
    const readingSpeed = 200; // 平均阅读速度：200字/分钟
    const minutes = Math.ceil(wordCount / readingSpeed);

    return `${minutes}分钟`;
}

//ai接口
// 设置文心一言的 AK/SK
// 百度AI Access Key 和 Secret Key
const AK = 'pxvS33lH820KccfCti4Q1woW';
const SK = 'RTe60kesFEo883RLVfCNnfDpTEFEuaRz';
// 获取 Access Token
async function getAccessToken() {
    const options = {
        method: 'POST',
        url: `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${AK}&client_secret=${SK}`,

    };

    return new Promise((resolve, reject) => {
        axios(options)
            .then((res) => {
                resolve(res.data.access_token);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

// 初始化 ChatCompletion 客户端
// const client = new ChatCompletion();

app.get('/api/ask-sse', async (req, res) => {
    const { question, article_content } = req.query;
    console.log(question, article_content, '问题是这个');//内容拿到


    // 参数校验
    if (typeof question !== 'string' || question.trim() === '') {
        return res.status(400).json({ error: '问题不能为空且必须为字符串' });
    }
    if (typeof article_content !== 'string' || article_content.trim() === '') {
        return res.status(400).json({ error: '文章内容不能为空且必须为字符串' });
    }

    try {
        // 获取 Access Token
        const accessToken = await getAccessToken();
        console.log('Access Token:', accessToken);
        if (!accessToken) {
            return res.status(500).json({ error: '获取 Access Token 失败' });
        }

        // 构建 API 请求参数
        const options = {
            method: 'POST',
            url: `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro?access_token=${accessToken}`,
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                temperature: 0.95,
                top_p: 0.8,
                penalty_score: 1,
                enable_system_memory: false,
                disable_search: false,
                enable_citation: false,
                stream: true, // 启用流式输出
                messages: [
                    { role: 'user', content: question },
                    // { role: 'system', content: article_content }
                ],
            },
            responseType: 'stream', // 设置响应类型为流
        };
        // console.log('Request URL:', options.url);
        // console.log('Request Data:', options.data);

        // 调用文心一言 API
        const response = await axios(options);
        // console.log(response, '文心一言返回结果');
        // 设置响应头，保持连接状态
        // res.setHeader('Content-Type', 'text/plain');
        // res.setHeader('Transfer-Encoding', 'chunked');
        // 设置响应头，保持连接状态
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.flushHeaders();  // 确保响应头发送完毕

        // 监听流式数据
        response.data.on('data', (chunk) => {
            try {
                // 将流数据转换为字符串
                const chunkString = chunk.toString('utf8').trim();

                // 如果数据以 "data: " 开头，去掉这个前缀
                if (chunkString.startsWith('data: ')) {
                    const jsonString = chunkString.slice(6); // 去掉 "data: " 的部分

                    // 尝试解析 JSON 数据
                    const parsedData = JSON.parse(jsonString);

                    // 提取并处理 result 字段
                    if (parsedData && parsedData.result) {
                        console.log(parsedData.result);
                        // res.write(parsedData.result); // 只发送 result 字段给前端
                        res.write(`data: ${parsedData.result}\n\n`);
                    }
                }
            } catch (err) {
                // 捕获解析错误，打印日志
                console.error('解析流数据出错:', err.message, '原始数据:', chunk.toString());
            }
        });

        // 监听流结束事件
        response.data.on('end', () => {
            // console.log('流式数据接收完成');
            res.end(); // 结束响应
        });
        // 错误处理
        response.data.on('error', (err) => {
            console.error('流式数据错误:', err.message);
            res.status(500).end('流式输出失败');
        });
    } catch (error) {
        console.error('调用文心一言API失败:', error.response?.data || error.message);
        res.status(500).json({ error: '调用文心一言API失败' });
    }

    //     const { result, error_msg } = response.data;
    //     console.log(result);
    //     // console.log(error_msg, '错误信息');



    //     if (result) {
    //         res.json({ answer: result });
    //     } else {
    //         res.status(500).json({ error: error_msg || '无法获取AI的回答' });
    //     }
    // } catch (error) {
    //     console.error('调用文心一言API失败:', error.response?.data || error.message);
    //     res.status(500).json({ error: '调用文心一言API失败' });
    // 
});

//带心跳检测的SSE服务


// 带心跳检测的SSE服务
app.get('/sse/ai-stream', (req, res) => {
    // 1. 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 2. 心跳检测（25秒一次）
    const heartbeatInterval = setInterval(() => {
        res.write(`event: heartbeat\n`);
        res.write(`data: ${JSON.stringify({
            status: 'alive',
            timestamp: Date.now()
        })}\n\n`);
    }, 25000);

    // 3. 模拟AI流式响应
    const { question } = req.query;
    const mockResponse = `关于"${question}"的AI回答流: `;
    const words = mockResponse.split(' ');

    let index = 0;
    const sendChunk = () => {
        if (index < words.length) {
            res.write(`event: message\n`);
            res.write(`data: ${JSON.stringify({
                content: words[index] + ' ',
                progress: ((index + 1) / words.length * 100).toFixed(0)
            })}\n\n`);
            index++;
            setTimeout(sendChunk, 150);
        } else {
            res.write(`event: end\n`);
            res.write(`data: ${JSON.stringify({
                status: 'complete',
                timestamp: Date.now()
            })}\n\n`);
            clearInterval(heartbeatInterval);
        }
    };

    // 4. 连接关闭处理
    req.on('close', () => {
        clearInterval(heartbeatInterval);
        console.log('客户端断开连接');
    });

    // 5. 开始发送数据
    sendChunk();
});




// 简历诊断API路由
// 文件上传简历分析
app.post('/api/resume/analyze', resumeUpload.single('resume'), async (req, res) => {
    try {
        const { targetPosition, userId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: '请上传简历文件' });
        }

        // 读取文件内容
        const fileBuffer = fs.readFileSync(file.path);
        let resumeText = '';

        // 根据文件类型解析内容
        if (file.mimetype === 'application/pdf') {
            resumeText = await resumeService.parsePDF(fileBuffer);
        } else if (file.mimetype.includes('word') || file.originalname.includes('.doc')) {
            resumeText = await resumeService.parseWord(fileBuffer);
        } else {
            return res.status(400).json({ error: '不支持的文件格式' });
        }

        // 清理临时文件
        fs.unlinkSync(file.path);

        // 使用AI分析简历
        const analysis = await resumeService.analyzeWithDeepSeek(resumeText, targetPosition);

        // 计算最终评分
        const finalScore = resumeService.calculateResumeScore(analysis);
        analysis.overallScore = finalScore;

        // 生成改进计划
        const improvementPlan = resumeService.generateImprovementPlan(analysis);
        analysis.improvementPlan = improvementPlan;

        // 返回分析结果
        res.json({
            ...analysis,
            resumeText,
            fileInfo: {
                originalName: file.originalname,
                size: file.size,
                uploadTime: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('简历分析失败:', error);
        res.status(500).json({ error: '简历分析失败: ' + error.message });
    }
});

// 文本输入简历分析
app.post('/api/resume/analyze-text', async (req, res) => {
    try {
        const { resumeText, targetPosition, userId } = req.body;

        if (!resumeText || resumeText.trim().length < 50) {
            return res.status(400).json({ error: '简历内容过短，请至少输入50个字符' });
        }

        // 使用AI分析简历
        const analysis = await resumeService.analyzeWithDeepSeek(resumeText, targetPosition);

        // 计算最终评分
        const finalScore = resumeService.calculateResumeScore(analysis);
        analysis.overallScore = finalScore;

        // 生成改进计划
        const improvementPlan = resumeService.generateImprovementPlan(analysis);
        analysis.improvementPlan = improvementPlan;

        // 返回分析结果
        res.json({
            ...analysis,
            resumeText
        });

    } catch (error) {
        console.error('简历分析失败:', error);
        res.status(500).json({ error: '简历分析失败: ' + error.message });
    }
});

// 获取简历分析历史
app.get('/api/resume/history', (req, res) => {
    const { userId } = req.query;

    // 这里可以连接数据库获取用户的简历分析历史
    // 目前返回模拟数据
    res.json({
        data: [
            {
                id: 1,
                fileName: '前端开发简历.pdf',
                uploadTime: '2024-01-15 10:30:00',
                score: 85,
                targetPosition: '前端开发'
            },
            {
                id: 2,
                fileName: 'React开发简历.docx',
                uploadTime: '2024-01-10 14:20:00',
                score: 78,
                targetPosition: '前端开发'
            }
        ],
        total: 2
    });
});

// 删除简历分析记录
app.delete('/api/resume/history/:id', (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    // 这里可以连接数据库删除记录
    // 目前返回成功响应
    res.json({ success: true, message: '删除成功' });
});

const port = process.env.PORT || 3001;

// ============ 社交功能 API ============

// 搜索文章
app.get('/api/search', (req, res) => {
    const { keyword, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    if (!keyword) {
        return res.json({ articles: [], total: 0 });
    }

    const searchPattern = `%${keyword}%`;
    const countSql = `SELECT COUNT(*) as total FROM my_articles WHERE title LIKE ? OR content LIKE ?`;
    const sql = `SELECT id, title, tech_stack, content, updatedAt FROM my_articles WHERE title LIKE ? OR content LIKE ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?`;

    connection.query(countSql, [searchPattern, searchPattern], (err, countResult) => {
        if (err) {
            return res.status(500).json({ error: '搜索失败' });
        }

        connection.query(sql, [searchPattern, searchPattern, parseInt(limit), parseInt(offset)], (err2, articles) => {
            if (err2) {
                return res.status(500).json({ error: '搜索失败' });
            }
            res.json({
                articles: articles || [],
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit)
            });
        });
    });
});

// 获取文章评论
app.get('/api/comments/:articleId', (req, res) => {
    const { articleId } = req.params;
    const sql = `SELECT c.*, u.username FROM comments c LEFT JOIN vip u ON c.user_id = u.id WHERE c.article_id = ? ORDER BY c.created_at DESC`;

    connection.query(sql, [articleId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '获取评论失败' });
        }
        res.json(results);
    });
});

// 添加评论
app.post('/api/comments', (req, res) => {
    const { articleId, userId, username, content, parentId = 0 } = req.body;

    if (!articleId || !userId || !content) {
        return res.status(400).json({ error: '参数不完整' });
    }

    const sql = `INSERT INTO comments (article_id, user_id, username, content, parent_id) VALUES (?, ?, ?, ?, ?)`;
    connection.query(sql, [articleId, userId, username, content, parentId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: '评论失败' });
        }
        res.json({ success: true, commentId: result.insertId });
    });
});

// 点赞文章
app.post('/api/like', (req, res) => {
    const { articleId, userId } = req.body;

    if (!articleId || !userId) {
        return res.status(400).json({ error: '参数不完整' });
    }

    const checkSql = `SELECT id FROM likes WHERE article_id = ? AND user_id = ?`;
    connection.query(checkSql, [articleId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '操作失败' });
        }

        if (results.length > 0) {
            // 取消点赞
            const deleteSql = `DELETE FROM likes WHERE article_id = ? AND user_id = ?`;
            connection.query(deleteSql, [articleId, userId], (err2) => {
                if (err2) return res.status(500).json({ error: '操作失败' });
                res.json({ liked: false });
            });
        } else {
            // 添加点赞
            const insertSql = `INSERT INTO likes (article_id, user_id) VALUES (?, ?)`;
            connection.query(insertSql, [articleId, userId], (err2) => {
                if (err2) return res.status(500).json({ error: '操作失败' });
                res.json({ liked: true });
            });
        }
    });
});

// 获取点赞状态
app.get('/api/like/status/:articleId', (req, res) => {
    const { articleId } = req.params;
    const { userId } = req.query;

    const countSql = `SELECT COUNT(*) as likeCount FROM likes WHERE article_id = ?`;
    connection.query(countSql, [articleId], (err, countResult) => {
        if (err) return res.status(500).json({ error: '获取失败' });

        let isLiked = false;
        if (userId) {
            const statusSql = `SELECT id FROM likes WHERE article_id = ? AND user_id = ?`;
            connection.query(statusSql, [articleId, userId], (err2, statusResult) => {
                isLiked = statusResult.length > 0;
                res.json({ likeCount: countResult[0].likeCount, isLiked });
            });
        } else {
            res.json({ likeCount: countResult[0].likeCount, isLiked: false });
        }
    });
});

// 收藏文章
app.post('/api/favorite', (req, res) => {
    const { articleId, userId } = req.body;

    if (!articleId || !userId) {
        return res.status(400).json({ error: '参数不完整' });
    }

    const checkSql = `SELECT id FROM favorites WHERE article_id = ? AND user_id = ?`;
    connection.query(checkSql, [articleId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '操作失败' });
        }

        if (results.length > 0) {
            // 取消收藏
            const deleteSql = `DELETE FROM favorites WHERE article_id = ? AND user_id = ?`;
            connection.query(deleteSql, [articleId, userId], (err2) => {
                if (err2) return res.status(500).json({ error: '操作失败' });
                res.json({ favorited: false });
            });
        } else {
            // 添加收藏
            const insertSql = `INSERT INTO favorites (article_id, user_id) VALUES (?, ?)`;
            connection.query(insertSql, [articleId, userId], (err2) => {
                if (err2) return res.status(500).json({ error: '操作失败' });
                res.json({ favorited: true });
            });
        }
    });
});

// 获取收藏状态
app.get('/api/favorite/status/:articleId', (req, res) => {
    const { articleId } = req.params;
    const { userId } = req.query;

    const countSql = `SELECT COUNT(*) as favoriteCount FROM favorites WHERE article_id = ?`;
    connection.query(countSql, [articleId], (err, countResult) => {
        if (err) return res.status(500).json({ error: '获取失败' });

        let isFavorited = false;
        if (userId) {
            const statusSql = `SELECT id FROM favorites WHERE article_id = ? AND user_id = ?`;
            connection.query(statusSql, [articleId, userId], (err2, statusResult) => {
                isFavorited = statusResult.length > 0;
                res.json({ favoriteCount: countResult[0].favoriteCount, isFavorited });
            });
        } else {
            res.json({ favoriteCount: countResult[0].favoriteCount, isFavorited: false });
        }
    });
});

// 获取用户收藏列表
app.get('/api/favorites/:userId', (req, res) => {
    const { userId } = req.params;
    const sql = `SELECT m.*, f.created_at as favorite_time FROM favorites f
                 JOIN my_articles m ON f.article_id = m.id
                 WHERE f.user_id = ? ORDER BY f.created_at DESC`;

    connection.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: '获取失败' });
        res.json(results);
    });
});

// ============ 社交功能 API 结束 ============

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

