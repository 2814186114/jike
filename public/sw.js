// Service Worker for 极客园学习平台 - 资源哈希版本控制
// 基于静态资源内容生成的哈希值，只有内容变化时才会更新缓存
const ASSET_HASH = '{{ASSET_HASH}}'; // 构建脚本将替换此占位符

const STATIC_CACHE = `static-${ASSET_HASH}`;
const DYNAMIC_CACHE = `dynamic-${ASSET_HASH}`;

// 需要缓存的静态资源
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
    '/logo192.png',
    '/logo512.png',
    '/logo.webp'
];

// 学习内容缓存
const LEARNING_CACHE = `learning-content-${ASSET_HASH}`;
const LEARNING_ASSETS = [
    '/api/articles', // 文章列表
    '/api/recommendation/recommendations/1?type=popular&limit=10', // 默认推荐内容
    '/api/learning/progress' // 学习进度接口
];

// 安装事件 - 缓存静态资源和学习内容
self.addEventListener('install', (event) => {
    console.log('🎯 Service Worker 安装中...');
    console.log('📦 预缓存静态资源:', STATIC_ASSETS);
    console.log('📚 预缓存学习内容:', LEARNING_ASSETS);

    event.waitUntil(
        Promise.all([
            // 缓存静态资源
            caches.open(STATIC_CACHE)
                .then((cache) => {
                    console.log('✅ 开始缓存静态资源');
                    return cache.addAll(STATIC_ASSETS).then(() => {
                        console.log('✅ 静态资源缓存完成');
                    });
                }),
            // 缓存学习内容
            caches.open(LEARNING_CACHE)
                .then((cache) => {
                    console.log('✅ 开始缓存学习内容');
                    return cache.addAll(LEARNING_ASSETS).then(() => {
                        console.log('✅ 学习内容缓存完成');
                    });
                })
        ]).then(() => {
            console.log('🎉 Service Worker 安装完成，所有资源已预缓存');
            return self.skipWaiting();
        }).catch((error) => {
            console.error('❌ Service Worker 安装失败:', error);
        })
    );
});

// 激活事件 - 清理旧版本缓存
self.addEventListener('activate', (event) => {
    console.log('Service Worker 激活中...');
    console.log(`当前资源哈希: ${ASSET_HASH}`);

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // 删除所有不包含当前资源哈希的旧缓存
                    // 新缓存名称格式: static-abc123, dynamic-abc123, learning-content-abc123
                    if (!cacheName.includes(ASSET_HASH)) {
                        console.log('删除旧版本缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log(`✅ Service Worker 激活完成，当前哈希 ${ASSET_HASH}`);
            return self.clients.claim();
        })
    );
});

// 获取事件 - 缓存策略
self.addEventListener('fetch', (event) => {
    // 跳过非GET请求和chrome扩展
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    const url = event.request.url;

    // 学习内容特殊处理 - 缓存优先，网络更新策略
    if (url.includes('/api/articles/') || url.includes('/api/recommendation/')) {
        console.log(`📚 学习内容请求: ${url}`);

        event.respondWith(
            caches.open(LEARNING_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) {
                        console.log('✅ 缓存命中，返回缓存的学习内容');
                    } else {
                        console.log('❌ 缓存未命中，从网络获取学习内容');
                    }

                    // 缓存优先，同时从网络更新
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        // 如果网络请求成功，更新缓存
                        if (networkResponse.status === 200) {
                            console.log('🔄 网络请求成功，更新学习内容缓存');
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch((error) => {
                        console.log('🔴 网络请求失败:', error.message);

                        // 网络失败时，如果有缓存返回缓存，否则返回离线推荐
                        if (response) {
                            console.log('💾 使用缓存的学习内容作为降级方案');
                            return response;
                        }
                        console.log('📖 返回默认离线学习内容');
                        return getOfflineRecommendations(event.request);
                    });

                    return response || fetchPromise;
                });
            })
        );
        return;
    }

    console.log(`🌐 普通请求: ${url}`);

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 如果缓存中有，直接返回
                if (response) {
                    console.log('✅ 缓存命中，返回缓存内容');
                    return response;
                }

                console.log('❌ 缓存未命中，从网络获取');

                // 否则从网络获取
                return fetch(event.request)
                    .then((fetchResponse) => {
                        // 检查是否获取成功
                        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                            console.log('⚠️ 网络响应不满足缓存条件');
                            return fetchResponse;
                        }

                        console.log('🔄 网络请求成功，缓存到动态缓存');

                        // 克隆响应，因为响应只能使用一次
                        const responseToCache = fetchResponse.clone();

                        // 将新资源添加到动态缓存
                        caches.open(DYNAMIC_CACHE)
                            .then((cache) => {
                                // 只缓存同源请求
                                if (event.request.url.startsWith(self.location.origin)) {
                                    cache.put(event.request, responseToCache);
                                }
                            });

                        return fetchResponse;
                    })
                    .catch((error) => {
                        console.log(`� 网络请求失败: ${error.message}`);

                        // 网络请求失败时，返回离线页面或默认响应
                        if (event.request.destination === 'document') {
                            console.log('📄 返回缓存的首页作为离线页面');
                            return caches.match('/');
                        }

                        // 对于API请求，返回一个默认的离线响应
                        if (event.request.url.includes('/api/')) {
                            console.log('📡 返回离线API响应');
                            return new Response(
                                JSON.stringify({
                                    message: '网络连接不可用，请检查网络设置',
                                    offline: true
                                }),
                                {
                                    status: 503,
                                    headers: { 'Content-Type': 'application/json' }
                                }
                            );
                        }
                    });
            })
    );
});

// 获取离线推荐内容
const getOfflineRecommendations = async (request) => {
    // 尝试从学习缓存中获取预缓存的推荐
    const cache = await caches.open(LEARNING_CACHE);

    if (request.url.includes('/api/recommendation/')) {
        const cachedResponse = await cache.match('/api/recommendation/recommendations/1?type=popular&limit=10');
        if (cachedResponse) {
            return cachedResponse;
        }
    }

    if (request.url.includes('/api/articles/')) {
        const cachedResponse = await cache.match('/api/articles/popular');
        if (cachedResponse) {
            return cachedResponse;
        }
    }

    // 返回默认的离线内容
    return new Response(
        JSON.stringify({
            success: true,
            offline: true,
            message: '您当前处于离线状态，以下是缓存的学习内容',
            data: [
                {
                    id: 'offline-1',
                    title: 'React核心概念与最佳实践',
                    content: 'React是一个用于构建用户界面的JavaScript库...',
                    author: '极客园团队',
                    publish_date: new Date().toISOString(),
                    recommendation_type: 'popular'
                },
                {
                    id: 'offline-2',
                    title: 'JavaScript异步编程详解',
                    content: '异步编程是JavaScript的核心特性之一...',
                    author: '极客园团队',
                    publish_date: new Date().toISOString(),
                    recommendation_type: 'popular'
                }
            ]
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }
    );
};

// 监听推送事件
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || '您有新的学习通知',
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: '查看'
            },
            {
                action: 'close',
                title: '关闭'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || '极客园', options)
    );
});

// 监听通知点击事件
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
