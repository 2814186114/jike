import React from 'react';
import { createRoot } from 'react-dom/client';
import router from './router';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from './context/ThemeContext';
import store from './store';
import 'normalize.css'
import '@/index.scss'

// 全局错误边界组件
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 你同样可以将错误日志上报给服务器
    console.error('Global Error Boundary Caught an Error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 你可以自定义降级后的 UI 并渲染
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          color: '#333'
        }}>
          <h1>😵 页面遇到了一些问题</h1>
          <p>我们正在努力修复中...</p>
          <div style={{
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '5px',
            margin: '20px 0',
            textAlign: 'left',
            fontSize: '14px'
          }}>
            <details>
              <summary>错误详情 (点击展开)</summary>
              <p><strong>错误信息:</strong> {this.state.error && this.state.error.toString()}</p>
              <p><strong>组件堆栈:</strong></p>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            重新加载页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 暂时禁用Service Worker注册，避免缓存问题
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const root = createRoot(document.getElementById('root'));
root.render(
  <GlobalErrorBoundary>
    <ThemeProvider>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </ThemeProvider>
  </GlobalErrorBoundary>
);
