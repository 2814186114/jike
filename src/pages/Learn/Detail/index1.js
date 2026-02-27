import { useState, useEffect, useRef } from 'react';
import { Input, Button, message, Spin } from 'antd';
import { useLocation } from 'react-router-dom';
import { EventSourcePolyfill } from 'eventsource-polyfill';
import { OpenAIOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const SSEArticleDetail = () => {
    const location = useLocation();
    const { article } = location.state || {};
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInputVisible, setIsInputVisible] = useState(false);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [retryCount, setRetryCount] = useState(0);

    const eventSourceRef = useRef(null);
    const textAreaRef = useRef(null);

    // SSE连接管理
    const connectSSE = () => {
        const params = new URLSearchParams({
            question,
            article_content: article?.content || ''
        });

        eventSourceRef.current = new EventSourcePolyfill(`http://localhost:3001/api/ask-sse?${params}`, {
            heartbeatTimeout: 30000,
            withCredentials: true
        });

        eventSourceRef.current.onopen = () => {
            setConnectionState('connected');
            setRetryCount(0);
        };

        eventSourceRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case 'content':
                        setAnswer(prev => {
                            const newAnswer = prev + data.content;
                            // 自动滚动到底部
                            requestAnimationFrame(() => {
                                textAreaRef.current?.scrollTo({
                                    top: textAreaRef.current.scrollHeight,
                                    behavior: 'smooth'
                                });
                            });
                            return newAnswer;
                        });
                        break;
                    case 'heartbeat':
                        break;
                    case 'end':
                        eventSourceRef.current?.close();
                        setConnectionState('completed');
                        break;
                }
            } catch (e) {
                console.error('数据解析错误:', e);
            }
        };

        eventSourceRef.current.onerror = (error) => {
            console.error('SSE连接错误:', error);
            if (eventSourceRef.current?.readyState === 2) { // CLOSED
                handleReconnect();
            }
            setConnectionState('error');
        };
    };

    // 自动重连逻辑
    const handleReconnect = () => {
        if (retryCount >= 3) {
            message.error('连接失败，请稍后重试');
            setLoading(false);
            return;
        }

        setRetryCount(prev => prev + 1);
        setTimeout(() => {
            connectSSE();
        }, Math.min(1000 * retryCount, 5000));
    };

    // 处理提问
    const handleAskQuestion = () => {
        if (!question) {
            message.warning('请输入您的问题');
            return;
        }

        setLoading(true);
        setAnswer('');
        setConnectionState('connecting');
        connectSSE();
    };

    // 清理效果
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []);

    // 状态提示文本
    const connectionStatusText = {
        connecting: '连接中...',
        connected: '实时推送中 ✓',
        error: '连接断开，尝试重连...',
        completed: '回答完成',
        disconnected: '未连接'
    }[connectionState];

    return (
        <div>
            <h2>{article?.title}</h2>
            <p>作者：{article?.author}</p>
            <p>发布时间：{new Date(article?.publish_date).toLocaleString()}</p>
            <p>{article?.content}</p>

            <OpenAIOutlined
                onClick={() => setIsInputVisible(!isInputVisible)}
                style={{
                    position: 'fixed',
                    right: '20px',
                    bottom: '50px',
                    cursor: 'pointer',
                    fontSize: '30px',
                    color: connectionState === 'error' ? '#ff4d4f' : '#1890ff'
                }}
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
                    width: '350px'
                }}>
                    <h3>AI 智能问答</h3>
                    <Spin spinning={loading}>
                        <TextArea
                            rows={2}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="请输入您的问题"
                            disabled={loading}
                        />
                        <div style={{ margin: '10px 0', color: '#666' }}>
                            {connectionStatusText}
                        </div>
                        <TextArea
                            rows={5}
                            value={answer}
                            ref={textAreaRef}
                            readOnly
                            style={{
                                whiteSpace: 'pre-wrap',
                                marginBottom: '10px'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Button
                                type="primary"
                                onClick={handleAskQuestion}
                                loading={loading}
                                disabled={connectionState === 'connected'}
                            >
                                {retryCount > 0 ? `重试 (${retryCount}/3)` : '提问'}
                            </Button>
                            <Button
                                danger
                                onClick={() => {
                                    eventSourceRef.current?.close();
                                    setLoading(false);
                                    setConnectionState('disconnected');
                                }}
                            >
                                停止
                            </Button>
                        </div>
                    </Spin>
                </div>
            )}
        </div>
    );
};

export default SSEArticleDetail;
