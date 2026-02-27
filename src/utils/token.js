const TOKENKEY = 'token_key'
const USERINFO_KEY = 'user_info'

function setNewToken(token) {
    return localStorage.setItem(TOKENKEY, token)
}

function getToken() {
    return localStorage.getItem(TOKENKEY)
}

function clearToken() {
    return localStorage.removeItem(TOKENKEY)
}

// 用户信息持久化函数
function setUserInfo(userInfo) {
    return localStorage.setItem(USERINFO_KEY, JSON.stringify(userInfo))
}

function getUserInfo() {
    const userInfo = localStorage.getItem(USERINFO_KEY)
    return userInfo ? JSON.parse(userInfo) : null
}

function clearUserInfo() {
    return localStorage.removeItem(USERINFO_KEY)
}

export {
    setNewToken,
    getToken,
    clearToken,
    setUserInfo,
    getUserInfo,
    clearUserInfo
}
