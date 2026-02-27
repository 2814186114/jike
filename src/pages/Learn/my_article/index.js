import React, { useEffect, useState } from 'react';
import { Card, Typography, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { req, request } from '@/utils';
import ReactMarkdown from 'react-markdown';

const MyArticles = () => {
    const { Title, Paragraph } = Typography;
    const navigate = useNavigate();
    const [myArticles, setMyArticles] = useState([]); // 改为小写命名
    const [loading, setLoading] = useState(false); // 加载状态
    const [error, setError] = useState(null); // 错误状态

    // 处理文章点击事件，跳转到详情页
    // 使用 React Router 的 navigate 函数通过 state 传递数据
    // 这种方式比 props 更适合跨路由组件间的数据传递
    const handleArticleClick = (article) => {
        navigate('/detail', { state: { article } });
    };

    const fetchMyArticles = async (retryCount = 0) => {
        setLoading(true);
        setError(null);

        try {
            // 发送请求 - 使用相对路径
            const result = await request.get('http://localhost:3001/api/my_articles', {
                headers: {
                    'Cache-Control': 'no-cache', // 确保触发协商缓存
                    'If-None-Match': localStorage.getItem('etag') || '', // 使用本地存储的 ETag
                    'If-Modified-Since': localStorage.getItem('lastModified') || '', // 使用本地存储的 Last-Modified
                },
                timeout: 10000, // 10秒超时
            });

            // 请求成功，更新数据
            if (result.status === 200) {
                console.log(result.data, '文章数据');
                setMyArticles(result.data);

                // 更新本地缓存
                const etag = result.headers['etag'];
                console.log(etag);

                const lastModified = result.headers['last-modified'];
                if (etag) localStorage.setItem('etag', etag);
                if (lastModified) localStorage.setItem('lastModified', lastModified);

                localStorage.setItem('myArticles', JSON.stringify(result.data));
            }
        } catch (error) {
            // 处理错误，304 情况无需更新数据
            if (error.response?.status === 304) {
                console.log('使用缓存，无需更新数据');
                const cachedData = localStorage.getItem('myArticles');
                if (cachedData) {
                    setMyArticles(JSON.parse(cachedData));
                }
            } else if (error.response?.status === 503) {
                // 服务器不可用错误
                console.error('服务器暂时不可用:', error);
                setError('服务器暂时不可用，正在尝试重新连接...');

                // 指数退避重试机制
                if (retryCount < 3) {
                    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                    console.log(`将在 ${delay}ms 后重试...`);
                    setTimeout(() => {
                        fetchMyArticles(retryCount + 1);
                    }, delay);
                } else {
                    setError('服务器暂时不可用，请稍后刷新页面重试');
                    message.error('服务器连接失败，请检查网络或稍后重试');
                }
            } else {
                console.error('请求失败:', error);
                setError('无法加载文章数据，请稍后重试');
                message.error('加载文章失败，请检查网络');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 初始化时，优先使用本地缓存
        const cachedData = localStorage.getItem('myArticles');
        if (cachedData) {
            setMyArticles(JSON.parse(cachedData));
        }
        fetchMyArticles(); // 再次请求服务器
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', marginTop: 50 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>;
    }

    return (
        myArticles.length > 0 ? (
            myArticles.map((article) => (
                <Card
                    key={article.id}
                    style={{
                        marginBottom: 20,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                    }}
                    hoverable
                    onClick={() => handleArticleClick(article)}
                >
                    <Title level={4}>{article.title}</Title>
                    <Paragraph>技术栈: {article.tech_stack}</Paragraph>
                    <ReactMarkdown
                        components={{
                            img: ({ node, ...props }) => {
                                // 检测是否为Base64图片
                                const isBase64 = props.src?.startsWith('data:image/');

                                return (
                                    <img
                                        {...props}
                                        style={{
                                            maxWidth: '100%',
                                            height: 'auto',
                                            borderRadius: 8,
                                            margin: '16px 0',
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                        }}
                                        onError={(e) => {
                                            // 图片加载失败处理
                                            if (!isBase64 && !props.src?.startsWith('http')) {
                                                // 如果不是Base64且不是完整URL，尝试添加服务器地址
                                                e.target.src = `http://localhost:3001${props.src}`;
                                            } else if (isBase64) {
                                                // Base64图片加载失败，可能是数据损坏
                                                console.warn('Base64图片加载失败:', props.src?.substring(0, 50) + '...');
                                            }
                                        }}
                                        src={isBase64 ? props.src :
                                            (props.src?.startsWith('http') ? props.src : `/api${props.src}`)}
                                        alt={props.alt || '文章图片'}
                                    />
                                );
                            },
                        }}
                    >
                        {article.content}
                    </ReactMarkdown>
                </Card>
            ))
        ) : (
            <p style={{ textAlign: 'center' }}>没有文章</p>
        )
    );
};

export default MyArticles;
