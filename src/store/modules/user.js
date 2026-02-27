import { createSlice } from "@reduxjs/toolkit";
import { request, req } from "@/utils";
import { clearToken, setNewToken, getToken, setUserInfo as setUserInfoStorage, getUserInfo, clearUserInfo as clearUserInfoStorage } from "@/utils/token";


const userStore = createSlice({
    name: 'user',
    // 数据初始状态
    initialState: {
        token: getToken() || '',
        userInfo: getUserInfo() || {}
    },
    // 同步修改方法
    reducers: {
        setToken(state, action) {
            state.token = action.payload
            //存到localStorage
            setNewToken(action.payload)
        },
        setUserInfo(state, action) {
            state.userInfo = action.payload
            // 同时保存到localStorage
            setUserInfoStorage(action.payload)
        },
        clearUserInfo(state) {
            state.token = ''
            state.userInfo = {}
            clearToken()
            clearUserInfoStorage()
        }
    }
})

// 解构出actionCreater
const { setToken, setUserInfo, clearUserInfo } = userStore.actions

// 获取reducer函数
const userReducer = userStore.reducer

// const checkTokenValidity = () => {
//     const token = localStorage.getItem('token_key');
//     if (token) {
//         const decoded = jwt.decode(token);
//         if (decoded && decoded.exp * 1000 > Date.now()) {
//             return true; // Token 仍然有效
//         } else {
//             localStorage.removeItem('token_key'); // 清除过期的 token
//         }
//     }
//     return false; // Token 过期或不存在
// };
//异步封装方法
const fetchLogin = (loginForm) => {
    return async (dispatch) => {
        try {
            console.log(loginForm, 'loginForm');

            const res = await req.post('http://localhost:3001/api/login', loginForm)
            console.log('登录响应:', res.userInfo);

            localStorage.setItem('refreshToken', res.refreshToken)
            // 提交同步action进行token存入
            dispatch(setToken(res.token))

            // 登录成功后立即获取用户信息
            if (res.token) {
                // 如果登录响应中包含用户信息，直接使用
                if (res.userInfo && res.userInfo.id) {
                    dispatch(setUserInfo(res.userInfo))
                    console.log('使用登录响应中的用户信息:', res.userInfo)
                } else {
                    // 否则调用获取用户信息的接口
                    // await dispatch(fetchUseInfo())
                }
            }
        } catch (error) {
            console.error('登录失败:', error)
            // 即使登录失败，也设置默认用户信息以确保推荐系统能工作
            const defaultUserInfo = {
                id: 1,
                username: 'user',
                email: 'user@example.com'
            }
            dispatch(setUserInfo(defaultUserInfo))
        }
    }
}

//异步封装获取个人信息的方法
// const fetchUseInfo = () => {
//     return async (dispatch) => {
//         try {
//             const res = await req.get('http://localhost:3001/api/user')
//             // 提交同步action进行用户信息存入
//             dispatch(setUserInfo(res.data))
//             console.log('用户信息获取成功:', res.data)
//         } catch (error) {
//             console.error('获取用户信息失败:', error)
//             // 如果获取用户信息失败，使用默认用户信息
//             const defaultUserInfo = {
//                 id: 1, // 默认用户ID
//                 username: 'user',
//                 email: 'user@example.com'
//             }
//             dispatch(setUserInfo(defaultUserInfo))
//         }
//     }
// }
export { fetchLogin, setToken, setUserInfo, clearUserInfo }
export default userReducer
