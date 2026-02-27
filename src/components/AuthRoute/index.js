import { getToken } from '@/utils/token'
import { Navigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'

const AuthRoute = ({ children }) => {
    const token = getToken('token_key')
    if (token) {
        try {
            //解码token
            const decodedToken = jwtDecode(token)
            const currentTime = Date.now() / 1000
            //检查token是否过期
            if (decodedToken.exp < currentTime) {
                // Token 过期，尝试刷新 Token
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    // 调用刷新 Token 的 API
                    axios.post('http://localhost:3001/api/refresh', { refreshToken })
                        .then(response => {
                            const { accessToken } = response;
                            // 存储新获取的 Access Token
                            localStorage.setItem('token_key', accessToken);
                            // 在这里更新应用的状态，允许访问子路由
                        })
                        .catch(err => {
                            console.error('刷新 Token 失败:', err);
                            // 如果刷新失败，重定向到登录页面
                            // return <Navigate to="/login" replace />;
                        });
                }
            }
            return <>{children}</>;
        } catch (error) {
            console.error('Token 解码失败:', error);
            // return <Navigate to="/login" replace />;

        }

    } else {
        return <Navigate to="/login" replace />
    }
}

export default AuthRoute