import { useState, useEffect, useRef } from 'react';
import { Input, Button, message, Card, Collapse, Tag, Row, Col, Progress, Tooltip } from 'antd'; // 引入Ant Design的Input和Button组件
import { useLocation } from 'react-router-dom';
import { req } from '@/utils'; // 引入封装的req
import { useBehaviorTracking1 } from '../../../hooks/useRecommendation1';
import {
    OpenAIOutlined,
    BarChartOutlined,
    ClockCircleOutlined,
    BookOutlined,
    ThunderboltOutlined,
    TagOutlined
} from '@ant-design/icons'
import { useSelector } from 'react-redux';
import offlineLearningManager from '../../../utils/offlineLearning';
import ReactMarkdown from 'react-markdown';
import Comment from '@/components/Comment';
import LikeFavoriteButtons from '@/components/LikeFavoriteButtons';
const { TextArea } = Input;
const { Panel } = Collapse;

const ArticleDetail = () => {
    const location = useLocation();
    const { article } = location.state || {}; // 获取传递的文章数据
    const { trackView, trackLike } = useBehaviorTracking1();
    const currentUser = useSelector(state => state.user.userInfo);
    const userId = currentUser?.id;

    // React Hooks 必须在所有条件返回之前调用
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInputVisible, setIsInputVisible] = useState(false)
    const [isCardVisible, setIsCardVisible] = useState(false); // 控制卡片显示
    const [startTime, setStartTime] = useState(null);
    const [liked, setLiked] = useState(false);
    const [hasRecordedLearning, setHasRecordedLearning] = useState(false);
    const scrollProgressRef = useRef(0);

    // 智能文章分析状态
    const [analysisResults, setAnalysisResults] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // 记录学习行为 - 同时支持在线和离线
    const recordLearningActivity = async (completionStatus = 'started') => {
        if (!article || hasRecordedLearning) return;

        console.log('开始记录学习行为:', {
            articleId: article.id,
            completionStatus,
            online: navigator.onLine,
            userId,
            hasRecordedLearning
        });

        try {
            const duration = startTime ? Date.now() - startTime : 0;
            const progress = completionStatus === 'completed' ? 1 : (scrollProgressRef.current / 100);

            // 1. 始终记录到离线存储（作为备份）
            console.log('开始离线记录学习行为...');
            const durationInSeconds = duration / 1000;
            const offlineSuccess = await offlineLearningManager.recordArticleProgress(
                article.id,
                progress,
                durationInSeconds
            );

            console.log('离线记录结果:', offlineSuccess);

            // 2. 如果在线且有用户ID，同时尝试在线记录
            if (navigator.onLine && userId) {
                try {
                    console.log('尝试在线记录学习行为...');
                    await req.post('http://localhost:3001/api/learning/activity', {
                        userId: userId,
                        activityData: {
                            itemId: article.id,
                            itemType: 'article',
                            learningType: 'read',
                            duration: duration,
                            completionStatus: completionStatus,
                            proficiencyLevel: 3,
                            metadata: {
                                tech_stack: article.tech_stack,
                                title: article.title,
                                scroll_progress: scrollProgressRef.current
                            }
                        }
                    });
                    console.log('在线记录成功');
                } catch (onlineError) {
                    console.warn('在线记录失败:', onlineError);
                }
            }

            if (offlineSuccess) {
                // 额外记录文章浏览行为
                if (completionStatus === 'started') {
                    console.log('记录文章浏览行为...');
                    await offlineLearningManager.recordArticleView(article.id, 0, 0);
                }

                if (completionStatus === 'completed') {
                    setHasRecordedLearning(true);
                    // 只在在线状态下显示成功消息
                    if (navigator.onLine) {
                        message.success('学习记录已保存！');
                    }
                }

                // 打印IndexedDB中的所有记录
                console.log('=== IndexedDB 学习行为记录 ===');
                const allRecords = await offlineLearningManager.getAllBehaviors();
                console.log('总记录数:', allRecords.length);
                console.table(allRecords);
                console.log('=============================');
            } else {
                console.error('离线记录失败');
            }

        } catch (error) {
            console.error('记录学习行为失败:', error);
            // 离线状态下静默失败，不显示错误
            if (navigator.onLine) {
                message.error('学习记录保存失败');
            }
        }
    };

    // 监听滚动，检测是否阅读完成
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;

            const progress = (scrollTop + clientHeight) / scrollHeight;
            scrollProgressRef.current = Math.round(progress * 100);

            // 当滚动到底部时（进度超过90%），记录为完成
            if (progress > 0.5 && !hasRecordedLearning) {
                recordLearningActivity('completed');
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [article, hasRecordedLearning, userId]);

    // 页面加载时自动分析文章和记录浏览行为
    useEffect(() => {
        if (article) {
            analyzeArticle();
            // 记录文章浏览开始时间
            setStartTime(Date.now());
            // 记录浏览行为
            trackView(article.id, 'article');
            // 记录学习开始
            recordLearningActivity('started');
        }
    }, [article]);

    // 页面离开时记录停留时间
    useEffect(() => {
        return () => {
            if (article && startTime) {
                const duration = Date.now() - startTime;
                // 再次记录浏览行为，包含停留时间
                trackView(article.id, 'article', duration);

                // 如果页面离开时还没有记录完成，记录为放弃
                if (!hasRecordedLearning) {
                    recordLearningActivity('abandoned');
                }
            }
        };
    }, [article, startTime, hasRecordedLearning, userId]);

    // 智能分析文章
    const analyzeArticle = async () => {
        if (!article) return;

        setIsAnalyzing(true);
        try {
            const response = await req.post('http://localhost:3001/api/analyze-article', {
                title: article.title,
                content: article.content,
                tech_stack: article.tech_stack || 'react'
            });

            setAnalysisResults(response);
        } catch (error) {
            console.error('文章分析失败:', error);
            message.error('文章分析失败，请稍后重试');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 如果没有传递文章数据，显示错误信息
    if (!article) {
        return (
            <div style={{ textAlign: 'center', marginTop: 50 }}>
                <h2>文章未找到</h2>
                <p>请从文章列表中选择一篇文章查看详情</p>
            </div>
        );
    }

    const handleAskQuestion = async () => {
        if (!question) {
            message.warning('请输入您的问题');
            return;
        }

        setLoading(true);
        setAnswer(''); // 清空之前的答案
        // setTimeout(() => {
        //     // 在这里可以处理完问题后，将 loading 状态设置为 false
        //     setLoading(false);

        //     // 清空输入框中的问题
        //     setQuestion('');
        // }, 2000); // 模拟请求时间
        try {
            // 创建 EventSource 实例连接后端的 SSE 接口
            const eventSource = new EventSource(`http://localhost:3001/api/ask-sse?question=${encodeURIComponent(question)}&article_content=${encodeURIComponent(article.content)}`);
            // 定义接收流式数据的处理逻辑
            eventSource.onmessage = (event) => {
                const { data } = event; // 获取服务端推送的单块数据
                console.log('接收到流式数据:', data);
                setIsCardVisible(true); // 提问成功后显示答案卡片

                // 动态更新答案内容
                setAnswer((prevAnswer) => prevAnswer + data); // 累加流式内容到答案中
            };
            // 定义错误处理逻辑
            eventSource.onerror = (error) => {
                console.error('SSE连接出错:', error);
                message.error('流式数据接收失败，请稍后再试');
                eventSource.close(); // 关闭连接
            };
            // 流式数据完成时关闭连接
            eventSource.addEventListener('end', () => {
                console.log('流式数据接收完成');
                // setIsCardVisible(true); // 提问成功后显示答案卡片
                eventSource.close(); // 主动关闭 SSE 连接
            });
        } catch (error) {
            console.error('AI接口调用失败:', error);
            message.error('获取答案失败，请稍后再试');

        } finally {
            // setLoading(false)
            setTimeout(() => {
                // 在这里可以处理完问题后，将 loading 状态设置为 false
                setLoading(false);

                // 清空输入框中的问题
                setQuestion('');
            }, 2000); // 模拟请求时间
        }

        // try {
        //     // 使用封装的 req 来发送 POST 请求
        //     const response = await req.post('http://localhost:3001/api/ask', {
        //         question: question,
        //         article_content: article.content, // 传递文章内容，帮助AI理解上下文
        //     });
        //     console.log(response, '前端拿到的数据');


        //     const data = response; // 假设返回的数据包含answer字段
        //     setAnswer(data.answer); // 将AI的回答显示在页面上
        //     setIsCardVisible(true); // 提问成功后显示答案卡片

        // } catch (error) {
        //     console.error('AI接口调用失败:', error);
        //     message.error('获取答案失败，请稍后再试');
        // } finally {
        //     setLoading(false);
        // }
    };
    function handVsible() {
        if (isInputVisible === true) {
            // setQuestion('')
            setIsInputVisible(false)
            setIsCardVisible(false)
        } else {
            setIsInputVisible(true)
            setIsCardVisible(false)

        }


    }

    return (
        <div>
            <h2>{article.title}</h2>
            {article.author && <p>作者：{article.author}</p>}
            {article.tech_stack && <p>技术栈：{article.tech_stack}</p>}
            {article.publish_date && (
                <p>发布时间：{new Date(article.publish_date).toLocaleString()}</p>
            )}
            {article.updatedAt && (
                <p>更新时间：{new Date(article.updatedAt).toLocaleString()}</p>
            )}

            {/* 智能文章分析面板 */}
            <Card
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                            <ThunderboltOutlined /> AI智能分析
                            {isAnalyzing && <span style={{ marginLeft: 8, fontSize: '12px', color: '#1890ff' }}>分析中...</span>}
                        </span>
                        <Button
                            type={liked ? "primary" : "default"}
                            size="small"
                            onClick={() => {
                                if (article?.id) {
                                    trackLike(article.id, 'article');
                                    setLiked(!liked);
                                    message.success(liked ? '取消点赞' : '点赞成功');
                                }
                            }}
                        >
                            {liked ? '❤️ 已点赞' : '🤍 点赞'}
                        </Button>
                    </div>
                }
                style={{ marginBottom: 24 }}
                size="small"
            >
                {analysisResults ? (
                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <div style={{ marginBottom: 16 }}>
                                <h4><TagOutlined /> 文章标签</h4>
                                <div>
                                    {analysisResults.tags?.map((tag, index) => (
                                        <Tag
                                            key={index}
                                            color="blue"
                                            style={{ marginBottom: 4 }}
                                        >
                                            {tag}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        </Col>

                        <Col xs={24} sm={12}>
                            <div style={{ marginBottom: 16 }}>
                                <h4><BarChartOutlined /> 学习难度</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Progress
                                        type="circle"
                                        percent={analysisResults.difficulty * 20}
                                        width={60}
                                        format={percent => `${analysisResults.difficulty}/5`}
                                        strokeColor={
                                            analysisResults.difficulty >= 4 ? '#ff4d4f' :
                                                analysisResults.difficulty >= 3 ? '#faad14' : '#52c41a'
                                        }
                                    />
                                    <div>
                                        <div style={{
                                            color: analysisResults.difficulty >= 4 ? '#ff4d4f' :
                                                analysisResults.difficulty >= 3 ? '#faad14' : '#52c41a',
                                            fontWeight: 'bold',
                                            fontSize: '16px'
                                        }}>
                                            {analysisResults.difficulty === 1 ? '入门级' :
                                                analysisResults.difficulty === 2 ? '初级' :
                                                    analysisResults.difficulty === 3 ? '中级' :
                                                        analysisResults.difficulty === 4 ? '高级' : '专家级'}
                                        </div>
                                        {analysisResults.estimatedTime && (
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                <ClockCircleOutlined /> {analysisResults.estimatedTime}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Col>

                        <Col xs={24} sm={12}>
                            <div style={{ marginBottom: 16 }}>
                                <h4><BookOutlined /> 学习指导</h4>
                                {analysisResults.keyPoints && analysisResults.keyPoints.length > 0 && (
                                    <ul style={{ fontSize: '14px', paddingLeft: 20, margin: 0 }}>
                                        {analysisResults.keyPoints.map((point, index) => (
                                            <li key={index}>{point}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </Col>

                        {analysisResults.summary && (
                            <Col span={24}>
                                <div style={{ marginBottom: 16 }}>
                                    <h4>文章摘要</h4>
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#666',
                                        lineHeight: '1.6',
                                        background: '#f9f9f9',
                                        padding: '12px',
                                        borderRadius: '4px'
                                    }}>
                                        {analysisResults.summary}
                                    </p>
                                </div>
                            </Col>
                        )}

                        <Col span={24}>
                            <div style={{
                                background: '#f0f7ff',
                                padding: '12px',
                                borderRadius: '4px',
                                border: '1px solid #d6e4ff'
                            }}>
                                <strong>💡 学习建议：</strong>
                                <div style={{ fontSize: '14px', marginTop: 4 }}>
                                    {analysisResults.difficulty <= 2 ?
                                        '这篇文章适合初学者，建议先掌握基础概念后再进行实践。' :
                                        analysisResults.difficulty === 3 ?
                                            '这篇文章包含一些进阶概念，建议边学习边实践。' :
                                            '这篇文章涉及较深的技术原理，建议先具备相关基础知识。'
                                    }
                                </div>
                            </div>
                        </Col>
                    </Row>
                ) : isAnalyzing ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div>正在分析文章内容...</div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
                            为您提供最佳的学习指导
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
                        <ThunderboltOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                        <div>正在加载智能分析...</div>
                    </div>
                )}
            </Card>

            <ReactMarkdown
                components={{
                    img: ({ node, ...props }) => (
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
                                // 图片加载失败时，尝试使用完整URL
                                if (!props.src?.startsWith('http')) {
                                    e.target.src = `http://localhost:3001${props.src}`;
                                }
                            }}
                            src={props.src?.startsWith('http') ? props.src : `http://localhost:3001${props.src}`}
                        />
                    ),
                }}
            >
                {article.content}
            </ReactMarkdown>
            {/* 点赞和收藏按钮 */}
            <div style={{ marginTop: 20, padding: '16px 0', borderTop: '1px solid #f0f0f0' }}>
                <LikeFavoriteButtons articleId={article?.id} userInfo={currentUser} />
            </div>

            {/* 评论区域 */}
            <Comment articleId={article?.id} userInfo={currentUser} />

            {/* AI 图标按钮 */}
            <OpenAIOutlined
                size={40}
                onClick={handVsible} // 点击图标显示/隐藏输入框
                style={{
                    position: 'fixed',
                    right: '20px',
                    bottom: '50px',
                    cursor: 'pointer',
                    color: '#1890ff',
                    fontSize: '30px'
                }}
                spin={true}
            />


            {isInputVisible && (
                <div style={{
                    position: 'fixed',
                    right: '80px',
                    bottom: '20px',
                    background: '#fff',
                    padding: '20px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    width: '300px',
                }}>
                    <h3>有不懂的地方？询问AI</h3>
                    <Input.TextArea
                        rows={2}
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="请输入您的问题"
                    />

                    {/* <TextArea
                        rows={4}
                        value={answer || ''}
                    ></TextArea> */}
                    <Button
                        type="primary"
                        onClick={handleAskQuestion}
                        loading={loading}
                        style={{ marginTop: '10px' }}
                    >
                        提问
                    </Button>
                </div>
            )}
            {isCardVisible && (
                <div style={{
                    position: 'fixed',
                    right: '80px',
                    bottom: '20px',
                    background: '#fff',
                    padding: '20px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    width: '300px',
                }}>
                    <h3>有不懂的地方？询问AI</h3>
                    {/* <Input.TextArea
                        rows={2}
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="请输入您的问题"
                    /> */}

                    <TextArea
                        rows={5}
                        value={answer || ''}
                    ></TextArea>
                    {/* <Button
                        type="primary"
                        onClick={handleAskQuestion}
                        loading={loading}
                        style={{ marginTop: '10px' }}
                    >
                        提问
                    </Button> */}
                </div>
            )}


            {/* {answer && (
                <div style={{ marginTop: '20px' }}>
                    <h4>AI的回答：</h4>
                    <p>{answer}</p>
                </div>
            )} */}
        </div>

    );
};

export default ArticleDetail;
