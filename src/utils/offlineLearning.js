// 离线学习状态管理工具
class OfflineLearningManager {
    constructor() {
        this.dbName = 'LearningOfflineDB';
        this.dbVersion = 1;
        this.storeName = 'offlineBehaviors';
        this.isOnline = navigator.onLine;
        this.init();
    }

    // 初始化数据库
    async init() {
        try {
            this.db = await this.openDB();
            console.log('✅ 离线学习数据库初始化成功');

            // 验证数据库是否真正创建
            const dbs = await indexedDB.databases();
            const ourDB = dbs.find(db => db.name === this.dbName);
            if (!ourDB) {
                throw new Error('数据库创建失败');
            }
            console.log('✅ IndexedDB验证成功:', ourDB);

            // 监听网络状态变化
            window.addEventListener('online', () => {
                this.isOnline = true;
                console.log('🟢 网络恢复，开始同步离线数据');
                this.syncOfflineData();
            });

            window.addEventListener('offline', () => {
                this.isOnline = false;
                console.log('🔴 网络断开，启用离线模式');
            });

        } catch (error) {
            console.error('❌ 离线学习数据库初始化失败:', error);

            // 3秒后重试
            console.log('🔄 3秒后重试初始化...');
            setTimeout(() => {
                console.log('🔄 重新初始化离线学习数据库...');
                this.init();
            }, 3000);
        }
    }

    // 打开IndexedDB
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('synced', 'synced', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    // 记录学习行为
    async recordLearningBehavior(behaviorData) {
        const behavior = {
            ...behaviorData,
            timestamp: Date.now(),
            synced: false
        };

        try {
            if (this.isOnline) {
                // 在线：直接发送到服务器
                const success = await this.sendBehaviorToServer(behavior);
                if (success) {
                    console.log('✅ 学习行为已实时同步到服务器');
                    return true;
                }
            }

            // 离线或发送失败：存储到本地
            const store = this.db.transaction([this.storeName], 'readwrite')
                .objectStore(this.storeName);
            await store.add(behavior);
            console.log('💾 学习行为已保存到离线数据库');
            return true;

        } catch (error) {
            console.error('❌ 记录学习行为失败:', error);
            return false;
        }
    }

    // 记录文章阅读行为
    async recordArticleView(articleId, duration = 0, progress = 0) {
        return this.recordLearningBehavior({
            type: 'article_view',
            articleId,
            duration,
            progress,
            metadata: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        });
    }

    // 记录文章阅读进度
    async recordArticleProgress(articleId, progress, duration) {
        return this.recordLearningBehavior({
            type: 'article_progress',
            articleId,
            progress,
            duration,
            metadata: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        });
    }

    // 发送行为到服务器
    async sendBehaviorToServer(behavior, retryCount = 0) {
        // 严格检查：必须有有效的用户ID
        if (!behavior.userId) {
            console.log('🟡 用户未登录，跳过学习行为记录:', behavior.type);
            return true; // 返回true避免重试
        }

        try {
            // 使用现有的学习活动API
            const response = await fetch('http://localhost:3001/api/learning/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: behavior.userId, // 直接使用用户ID
                    activityData: {
                        itemId: behavior.articleId,
                        itemType: 'article',
                        learningType: behavior.type,
                        duration: behavior.duration,
                        completionStatus: behavior.progress > 0.5 ? 'completed' : 'started',
                        proficiencyLevel: 3,
                        metadata: {
                            ...behavior.metadata,
                            progress: behavior.progress,
                            offline_synced: true
                        }
                    }
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            console.log('🔄 学习行为同步成功:', behavior.type);
            return true;

        } catch (error) {
            console.warn(`❌ 学习行为同步失败 (重试 ${retryCount}/3):`, error);

            if (retryCount < 3) {
                // 指数退避重试
                const delay = Math.pow(2, retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.sendBehaviorToServer(behavior, retryCount + 1);
            }

            return false;
        }
    }

    // 同步离线数据
    async syncOfflineData() {
        if (!this.isOnline) {
            console.log('❌ 网络不可用，无法同步');
            return false;
        }

        try {
            console.log('🔄 开始同步离线学习数据...');
            console.log('数据库状态:', this.db ? '就绪' : '未就绪');

            if (!this.db) {
                console.warn('数据库未初始化，无法同步');
                return false;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            // 使用正确的 IndexedDB API
            const behaviors = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const result = request.result;
                    console.log('获取行为记录结果:', result);
                    resolve(Array.isArray(result) ? result : []);
                };
                request.onerror = () => {
                    console.error('获取行为记录失败:', request.error);
                    reject(request.error);
                };
            });

            console.log(`📊 获取到 ${behaviors.length} 条行为记录`);
            const unsyncedBehaviors = behaviors.filter(behavior => !behavior.synced);
            console.log(`📊 发现 ${unsyncedBehaviors.length} 条未同步行为`);

            let successCount = 0;
            for (const behavior of unsyncedBehaviors) {
                const success = await this.sendBehaviorToServer(behavior);
                if (success) {
                    behavior.synced = true;
                    await store.put(behavior);
                    successCount++;
                }
            }

            console.log(`🎉 同步完成: ${successCount}/${unsyncedBehaviors.length} 条行为同步成功`);
            return successCount === unsyncedBehaviors.length;

        } catch (error) {
            console.error('❌ 离线数据同步失败:', error);
            return false;
        }
    }

    // 获取离线行为统计
    async getOfflineStats() {
        try {
            if (!this.db) {
                console.warn('数据库未初始化');
                return {
                    total: 0,
                    synced: 0,
                    unsynced: 0,
                    byType: {}
                };
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            // 使用正确的 IndexedDB API
            const behaviors = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(Array.isArray(result) ? result : []);
                };
                request.onerror = () => {
                    console.error('获取统计记录失败:', request.error);
                    reject(request.error);
                };
            });

            return {
                total: behaviors.length,
                synced: behaviors.filter(b => b.synced).length,
                unsynced: behaviors.filter(b => !b.synced).length,
                byType: behaviors.reduce((acc, behavior) => {
                    acc[behavior.type] = (acc[behavior.type] || 0) + 1;
                    return acc;
                }, {})
            };
        } catch (error) {
            console.error('❌ 获取离线统计失败:', error);
            return null;
        }
    }

    // 获取所有行为记录
    async getAllBehaviors() {
        console.log('🔍 开始获取所有行为记录...');
        console.log('数据库状态:', this.db ? '就绪' : '未就绪');

        try {
            if (!this.db) {
                console.warn('数据库未初始化');
                return [];
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            console.log('事务状态:', transaction);
            console.log('存储状态:', store);

            // 使用正确的 IndexedDB API
            const behaviors = await new Promise((resolve, reject) => {
                const request = store.getAll();

                request.onsuccess = () => {
                    const result = request.result;
                    console.log('获取结果:', result);

                    if (Array.isArray(result)) {
                        console.log(`📊 找到 ${result.length} 条记录`);
                        resolve(result);
                    } else {
                        console.warn('获取结果不是数组:', result);
                        resolve([]);
                    }
                };

                request.onerror = () => {
                    console.error('获取记录失败:', request.error);
                    reject(request.error);
                };
            });

            console.log('📊 IndexedDB 所有记录:');
            behaviors.forEach((behavior, index) => {
                console.log(`记录 ${index + 1}:`, {
                    id: behavior.id,
                    type: behavior.type,
                    articleId: behavior.articleId,
                    progress: behavior.progress,
                    duration: behavior.duration,
                    synced: behavior.synced,
                    timestamp: new Date(behavior.timestamp).toLocaleString(),
                    metadata: behavior.metadata
                });
            });

            return behaviors;
        } catch (error) {
            console.error('❌ 获取所有行为记录失败:', error);
            return [];
        }
    }

    // 清空离线数据（仅用于测试）
    async clearOfflineData() {
        try {
            const store = this.db.transaction([this.storeName], 'readwrite')
                .objectStore(this.storeName);
            await store.clear();
            console.log('🗑️ 离线数据已清空');
            return true;
        } catch (error) {
            console.error('❌ 清空离线数据失败:', error);
            return false;
        }
    }
}

// 创建单例实例
const offlineLearningManager = new OfflineLearningManager();

export default offlineLearningManager;
