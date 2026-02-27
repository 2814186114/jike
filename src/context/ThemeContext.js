import { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // 使用函数初始化state，确保服务器端和客户端一致
    const [theme, setTheme] = useState(() => {
        // 在服务器端渲染时使用默认light主题
        if (typeof window === 'undefined') return 'light';
        // 在客户端从localStorage获取或使用默认light
        return localStorage.getItem('theme') || 'light';
    });

    // 保存主题偏好到本地存储
    useEffect(() => {
        localStorage.setItem('theme', theme);
    }, [theme]);

    // 切换主题并保存到本地存储
    const toggleTheme = () => {
        console.log('Toggle theme called. Current theme:', theme);
        const newTheme = theme === 'light' ? 'dark' : 'light';
        console.log('Setting new theme:', newTheme);
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        console.log('Theme saved to localStorage');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
