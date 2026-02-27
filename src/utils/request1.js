import axios from "axios";
import router from "@/router";

// 双Token认证请求封装
const api = axios.create({
    baseURL: 'http://geek.itheima.net/v1_0',
    timeout: 5000,
    withCredentials: true // 启用cookie传输
});

// Token刷新队列管理
let isRefreshing = false;
let refreshSubscribers = [];

// 添加请求到队列
function subscribeTokenRefresh(callback) {
    refreshSubscribers.push(callback);
}

// 执行队列中的请求
function onRefreshed(token) {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
}

// 请求拦截器 - 添加认证头
api.interceptors.request.use(config => {
    // 从cookie获取token，由后端设置httpOnly
    config.headers.Authorization = `Bearer ${document.cookie.split('; ')
        .find(row => row.startsWith('access_token='))?.split('=')[1]}`;
    return config;
});

// 响应拦截器 - 处理Token刷新
api.interceptors.response.use(
    response => response.data,
    async error => {
        const { config, response } = error;

        // 处理Token过期
        if (response?.status === 401 && !config._retry) {
            config._retry = true;

            // 如果正在刷新，加入队列等待
            if (isRefreshing) {
                return new Promise(resolve => {
                    subscribeTokenRefresh(token => {
                        config.headers.Authorization = `Bearer ${token}`;
                        resolve(api(config));
                    });
                });
            }

            isRefreshing = true;

            try {
                // 使用httpOnly的refresh_token cookie自动发送
                const res = await axios.post('http://localhost:3001/api/refresh', {}, {
                    withCredentials: true
                });

                // 新token会由后端设置到httpOnly cookie中
                isRefreshing = false;
                onRefreshed(res.data.accessToken);
                return api(config);
            } catch (err) {
                // 刷新失败跳转登录
                console.error('Token刷新失败', err);
                router.navigate('/login');
                return Promise.reject(err);
            }
        }

        // 其他错误处理
        if (response) {
            switch (response.status) {
                case 403:
                    console.error('无权限访问');
                    break;
                case 404:
                    console.error('资源不存在');
                    break;
                case 500:
                    console.error('服务器错误');
                    break;
                default:
                    console.error(`请求错误: ${response.status}`);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
