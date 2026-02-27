import React, { useState, useEffect } from 'react';
import offlineLearningManager from '../utils/offlineLearning';

// 离线调试面板组件
const OfflineDebugPanel = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [cacheStatus, setCacheStatus] = useState({});
    const [debugLogs, setDebugLogs] = useState([]);
    const [isVisible, setIsVisible] = useState(true);

    // 添加日志
    const addDebugLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const log = { timestamp, message, type };
        setDebugLogs(prev => [log, ...prev.slice(0, 19)]); // 保持最近20条日志
        console.log(`[离线调试] ${message}`);
    };

    // 检查缓存状态
    const checkCache = async () => {
        try {
            addDebugLog('开始检查缓存状态...', 'info');

            const caches = await window.caches?.keys();
            if (!caches) {
                addDebugLog('浏览器不支持Cache API', 'error');
                return;
            }

            const cacheData = {};

            for (const cacheName of caches) {
                const cache = await window.caches.open(cacheName);
                const requests = await cache.keys();
                cacheData[cacheName] = {
                    count: requests.length,
                    urls: requests.slice(0, 5).map(req => req.url) // 只显示前5个URL
                };
            }

            setCacheStatus(cacheData);
            addDebugLog(`缓存检查完成，发现 ${caches.length} 个缓存`, 'success');
        } catch (error) {
            addDebugLog(`缓存检查失败: ${error.message}`, 'error');
        }
    };

    // 模拟离线学习行为
    const simulateOfflineLearning = async () => {
        addDebugLog('开始模拟离线学习...', 'info');

        try {
            // 模拟记录学习行为
            const behaviors = [
                { type: 'article_view', articleId: 'article-001', duration: 120, progress: 0.8 },
                { type: 'article_progress', articleId: 'article-002', progress: 0.5, duration: 180 },
                { type: 'article_view', articleId: 'article-003', duration: 60, progress: 0.3 }
            ];

            for (const behavior of behaviors) {
                addDebugLog(`记录行为: ${behavior.type} (${behavior.articleId})`, 'info');
                const success = await offlineLearningManager.recordLearningBehavior(behavior);
                if (success) {
                    addDebugLog(`✅ 学习行为记录成功: ${behavior.type}`, 'success');
                } else {
                    addDebugLog(`❌ 学习行为记录失败: ${behavior.type}`, 'error');
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // 获取离线统计
            const stats = await offlineLearningManager.getOfflineStats();
            if (stats) {
                addDebugLog(`📊 离线统计: 总计 ${stats.total} 条, 已同步 ${stats.synced} 条, 未同步 ${stats.unsynced} 条`, 'info');
            }

            addDebugLog('离线学习模拟完成', 'success');
        } catch (error) {
            addDebugLog(`❌ 离线学习模拟失败: ${error.message}`, 'error');
        }
    };

    // 查看离线统计
    const checkOfflineStats = async () => {
        try {
            addDebugLog('获取离线学习统计...', 'info');
            const stats = await offlineLearningManager.getOfflineStats();
            if (stats) {
                addDebugLog(`📊 离线学习统计:`, 'info');
                addDebugLog(`  总计: ${stats.total} 条行为`, 'info');
                addDebugLog(`  已同步: ${stats.synced} 条`, 'success');
                addDebugLog(`  未同步: ${stats.unsynced} 条`, 'warning');

                Object.entries(stats.byType).forEach(([type, count]) => {
                    addDebugLog(`  ${type}: ${count} 条`, 'info');
                });
            } else {
                addDebugLog('❌ 无法获取离线统计', 'error');
            }
        } catch (error) {
            addDebugLog(`❌ 获取离线统计失败: ${error.message}`, 'error');
        }
    };

    // 清空离线数据
    const clearOfflineData = async () => {
        try {
            addDebugLog('清空离线学习数据...', 'warning');
            const success = await offlineLearningManager.clearOfflineData();
            if (success) {
                addDebugLog('🗑️ 离线数据已清空', 'success');
            } else {
                addDebugLog('❌ 清空离线数据失败', 'error');
            }
        } catch (error) {
            addDebugLog(`❌ 清空离线数据失败: ${error.message}`, 'error');
        }
    };

    // 检查数据库状态
    const checkDBStatus = async () => {
        try {
            addDebugLog('检查IndexedDB状态...', 'info');

            // 检查所有数据库
            const dbs = await indexedDB.databases();
            const ourDB = dbs.find(db => db.name === 'LearningOfflineDB');

            if (ourDB) {
                addDebugLog(`✅ IndexedDB存在: ${ourDB.name} (版本: ${ourDB.version})`, 'success');
            } else {
                addDebugLog('❌ IndexedDB不存在', 'error');
            }

            // 检查离线学习管理器状态
            if (offlineLearningManager) {
                addDebugLog(`📊 离线学习管理器: ${offlineLearningManager.db ? '已连接' : '未连接'}`,
                    offlineLearningManager.db ? 'success' : 'warning');
            } else {
                addDebugLog('❌ 离线学习管理器未初始化', 'error');
            }

        } catch (error) {
            addDebugLog(`❌ 检查数据库状态失败: ${error.message}`, 'error');
        }
    };

    // 真实的手动同步
    const realTriggerSync = async () => {
        addDebugLog('手动触发真实同步...', 'info');

        try {
            addDebugLog('1. 检查网络状态...', 'info');
            if (!navigator.onLine) {
                addDebugLog('网络不可用，无法同步', 'warning');
                return;
            }

            addDebugLog('2. 检查离线学习管理器...', 'info');
            if (!offlineLearningManager || !offlineLearningManager.db) {
                addDebugLog('❌ 离线学习管理器未就绪', 'error');
                return;
            }

            addDebugLog('3. 开始同步离线行为...', 'info');
            const success = await offlineLearningManager.syncOfflineData();

            if (success) {
                addDebugLog('✅ 离线数据同步成功', 'success');
            } else {
                addDebugLog('❌ 离线数据同步失败', 'error');
            }

        } catch (error) {
            addDebugLog(`❌ 同步失败: ${error.message}`, 'error');
        }
    };

    // 检查Service Worker状态
    const checkServiceWorker = async () => {
        addDebugLog('检查Service Worker状态...', 'info');

        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                addDebugLog('✅ Service Worker已注册并激活', 'success');

                // 检查缓存
                await checkCache();
            } catch (error) {
                addDebugLog('❌ Service Worker未就绪', 'error');
            }
        } else {
            addDebugLog('❌ 浏览器不支持Service Worker', 'error');
        }
    };

    // 监听网络状态变化
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            addDebugLog('🟢 网络已恢复，开始同步离线数据...', 'success');

            // 检查离线学习管理器是否就绪
            if (offlineLearningManager && offlineLearningManager.db) {
                offlineLearningManager.syncOfflineData().then(success => {
                    if (success) {
                        addDebugLog('✅ 离线数据同步成功', 'success');
                    } else {
                        addDebugLog('❌ 离线数据同步失败', 'error');
                    }
                });
            } else {
                addDebugLog('⚠️ 离线学习管理器未就绪，无法同步', 'warning');
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            addDebugLog('🔴 网络已断开，启用离线模式', 'warning');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // 初始检查
        checkServiceWorker();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 日志类型对应的颜色
    const getLogColor = (type) => {
        switch (type) {
            case 'error': return '#ff4d4f';
            case 'warning': return '#faad14';
            case 'success': return '#52c41a';
            default: return '#1890ff';
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 10,
            right: 10,
            background: '#f5f5f5',
            padding: '15px',
            border: '2px solid #1890ff',
            borderRadius: '8px',
            zIndex: 9999,
            maxWidth: '400px',
            maxHeight: '500px',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: isVisible ? 'block' : 'none'
        }}>
            {/* 标题栏 */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                borderBottom: '1px solid #d9d9d9',
                paddingBottom: '8px'
            }}>
                <h4 style={{ margin: 0, color: '#1890ff' }}>🔧 离线调试面板</h4>
                <button
                    onClick={() => setIsVisible(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    ✕
                </button>
            </div>

            {/* 状态信息 */}
            <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: '5px 0' }}>
                    <strong>🌐 网络状态:</strong>
                    <span style={{
                        color: isOnline ? '#52c41a' : '#ff4d4f',
                        fontWeight: 'bold'
                    }}>
                        {isOnline ? ' 在线' : ' 离线'}
                    </span>
                </p>

                {/* 缓存状态 */}
                <div style={{ marginTop: '10px' }}>
                    <strong>📦 缓存状态:</strong>
                    {Object.keys(cacheStatus).length === 0 ? (
                        <span style={{ color: '#faad14' }}> 未检查</span>
                    ) : (
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                            {Object.entries(cacheStatus).map(([name, info]) => (
                                <li key={name} style={{ fontSize: '12px' }}>
                                    {name}: {info.count} 个资源
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* 操作按钮 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '15px'
            }}>
                <button
                    onClick={checkCache}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    检查缓存
                </button>
                <button
                    onClick={realTriggerSync}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #52c41a',
                        borderRadius: '4px',
                        background: '#f6ffed',
                        color: '#52c41a',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    手动同步
                </button>
                <button
                    onClick={checkDBStatus}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #1890ff',
                        borderRadius: '4px',
                        background: '#f0f8ff',
                        color: '#1890ff',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    检查数据库
                </button>
                <button
                    onClick={simulateOfflineLearning}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #faad14',
                        borderRadius: '4px',
                        background: '#fffbe6',
                        color: '#faad14',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    模拟学习
                </button>
                <button
                    onClick={checkOfflineStats}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #722ed1',
                        borderRadius: '4px',
                        background: '#f9f0ff',
                        color: '#722ed1',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    查看统计
                </button>
                <button
                    onClick={clearOfflineData}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #ff4d4f',
                        borderRadius: '4px',
                        background: '#fff2f0',
                        color: '#ff4d4f',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    清空数据
                </button>
            </div>

            {/* 调试日志 */}
            <div>
                <strong>📝 调试日志:</strong>
                <div style={{
                    marginTop: '8px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    background: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    padding: '8px',
                    fontSize: '12px'
                }}>
                    {debugLogs.length === 0 ? (
                        <div style={{ color: '#bfbfbf', textAlign: 'center' }}>
                            暂无日志
                        </div>
                    ) : (
                        debugLogs.map((log, index) => (
                            <div
                                key={index}
                                style={{
                                    marginBottom: '4px',
                                    padding: '2px 4px',
                                    borderLeft: `3px solid ${getLogColor(log.type)}`,
                                    background: '#fafafa'
                                }}
                            >
                                <span style={{ color: '#666', fontSize: '10px' }}>
                                    [{log.timestamp}]
                                </span>
                                <span style={{
                                    color: getLogColor(log.type),
                                    marginLeft: '4px'
                                }}>
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default OfflineDebugPanel;
