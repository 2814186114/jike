import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setToken, setUserInfo } from './store/modules/user';
import { getToken, getUserInfo } from './utils/token';
import Router from './router';
import OfflineDebugPanel from './components/OfflineDebugPanel';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // 从本地存储恢复用户状态
    const token = getToken();
    const userInfo = getUserInfo();
    if (token) {
      dispatch(setToken(token));
    }
    if (userInfo) {
      dispatch(setUserInfo(userInfo));
    }
  }, [dispatch]);

  return (
    <div className="App">
      <Router />
      {/* 只在开发环境显示离线调试面板 */}
      {process.env.NODE_ENV === 'development' && <OfflineDebugPanel />}
    </div>
  );
}

export default App;
