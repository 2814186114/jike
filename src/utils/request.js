import axios from "axios";
import { getToken } from "./token";
import { clearToken } from "./token";
import router from "@/router";
// import { setupCache } from "axios-cache-adapter";


// // 创建缓存实例，设置缓存时间为 15 分钟
// const cache = setupCache({
//     maxAge: 15 * 60 * 1000, // 缓存 15 分钟
//     exclude: { query: false }  // 允许缓存带查询参数的请求
// });

//二次封装
const request = axios.create({
    baseURL: 'http://geek.itheima.net/v1_0',
    timeout: 5000,
    // adapter: cache.adapter // 使用缓存适配器
})

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const req = axios.create({
    timeout: 500000,
    baseURL: API_BASE_URL
})

const localRequest = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
})

function isTokenExpired(token) {
    if (!token) return true; // 如果 token 不存在，则视为过期

    const payload = JSON.parse(atob(token.split('.')[1])); // 解码 JWT
    const currentTime = Math.floor(Date.now() / 1000); // 获取当前时间（秒）

    return payload.exp < currentTime; // 判断是否过期
}

//添加请求拦截器
request.interceptors.request.use((config) => {
    const token = getToken()
    // console.log(token);

    if (!isTokenExpired(token)) {
        config.headers.Authorization = `Bearer ${token}`
        // console.log(config.headers, '请求头'); // 打印请求头
    } else {
        console.error('Token not found!');
    }
    return config
}, (error) => {
    return Promise.reject(error)
})

req.interceptors.request.use(async (config) => {
    const token = getToken()
    // console.log(token);

    if (!isTokenExpired(token) && token) {
        config.headers.Authorization = `Bearer ${token}`
        // console.log(config.headers, '请求头'); // 打印请求头
    } else {
        console.error('Token not found!')
    }
    return config
}, (error) => {
    return Promise.reject(error)
})

//响应拦截器
request.interceptors.response.use((response) => {
    // 2xx 范围内的状态码都会触发该函数。
    // 对响应数据做点什么
    return response
}, (error) => {
    // 超出 2xx 范围的状态码都会触发该函数。
    // 对响应错误做点什么
    console.dir(error)
    if (error.response) {
        const { status } = error.response
        switch (status) {
            case 400:
                console.error('请求错误：参数不正确');
                break;
            case 401:
                console.error('未授权：请登录');
                // 可以重定向到登录页面
                // window.location.href = '/login';
                break;
            case 403:
                console.error('禁止访问：权限不足');
                break;
            case 404:
                console.error('资源未找到');
                break;
            case 500:
                console.error('服务器内部错误');
                break;
            default:
                console.error(`未知错误：${status}`);

        }
    }
    if (error.response.status === 401) {
        // clearToken()
        router.navigate('/login')
        window.location.reload()
    }
    return Promise.reject(error)
})

//响应拦截器
req.interceptors.response.use((response) => {
    // 2xx 范围内的状态码都会触发该函数。
    // 对响应数据做点什么
    return response.data
},
    async (error) => {
        const originalRequest = error.config;

        // 如果服务器返回 401 Unauthorized，说明 Access Token 过期了
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            console.log("进入刷新token中");


            const storedRefreshToken = localStorage.getItem('refreshToken');
            if (storedRefreshToken) {
                try {
                    console.log(storedRefreshToken, '刷新token值');
                    const response = await axios.post('http://localhost:3001/api/refresh', { refreshToken: storedRefreshToken });
                    console.log(response);

                    // console.log(storedRefreshToken);

                    const { accessToken, refreshToken } = response.data;
                    console.log(accessToken, 'xxxxs');


                    localStorage.setItem('token_key', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);

                    originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
                    return axios(originalRequest);
                } catch (err) {
                    console.error('Token refresh failed', err);
                    // window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error); // 其他错误直接返回
    }
)

// req.interceptors.response.use(
//     (response) => response.data,
//     async (error) => {
//       const originalRequest = error.config;

//       // 处理 401 错误且未重试过的请求
//       if (error.response?.status === 401 && !originalRequest._retry) {
//         originalRequest._retry = true; // 标记该请求已重试

//         try {
//           // 如果正在刷新 Token，将当前请求加入队列等待
//           if (tokenRefresh.isRefreshing) {
//             return new Promise((resolve) => {
//               tokenRefresh.subscribe((newToken) => {
//                 originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
//                 resolve(req(originalRequest)); // 用新 Token 重试请求
//               });
//             });
//           }

//           // 触发 Token 刷新，并等待结果
//           const newToken = await tokenRefresh.refreshToken();
//           originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
//           return req(originalRequest); // 重试原始请求
//         } catch (refreshError) {
//           // Token 刷新失败，跳转登录页或清理数据
//           console.error('Refresh token failed:', refreshError);
//           localStorage.removeItem('token_key');
//           localStorage.removeItem('refreshToken');
//           window.location.href = '/login';
//           return Promise.reject(refreshError);
//         }
//       }

//       // 其他错误直接抛出
//       return Promise.reject(error);
//     }
//   );

// 分片上传功能
async function uploadFile(file) {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 每个片段大小为5MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadPromises = [];

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('chunkIndex', i);
        formData.append('totalChunks', totalChunks);

        // 上传每个分片
        uploadPromises.push(uploadChunk(formData, i));
    }

    await Promise.all(uploadPromises);
    console.log('Upload complete');
}

// 上传每个分片
async function uploadChunk(formData, index) {
    try {
        const response = await request.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                console.log(`Chunk ${index + 1} upload progress: ${percentCompleted}%`);
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error uploading chunk ${index + 1}:`, error);
        throw error; // 可以在这里添加重试逻辑
    }
}
export { request, req, localRequest }
