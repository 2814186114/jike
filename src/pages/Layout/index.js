import { Layout, Menu, Popconfirm, Input } from 'antd'
import {
    HomeOutlined,
    DiffOutlined,
    EditOutlined,
    LogoutOutlined,
    EyeOutlined,
    UserOutlined,
    FileTextOutlined,
    BookOutlined,
    SearchOutlined
} from '@ant-design/icons'
import './index.scss'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { clearUserInfo, fetchUseInfo } from '@/store/modules/user'
import { req } from '@/utils'
import { useTheme } from '@/context/ThemeContext' // 导入主题钩子

const { Header, Sider } = Layout

const items = [
    {
        label: '首页',
        key: '/',
        path: '/',
        icon: <HomeOutlined />,
    },
    {
        label: '搜索',
        key: '/search',
        path: 'search',
        icon: <SearchOutlined />,
    },
    {
        label: '学习中心',
        key: '/learn',
        path: 'learn',
        icon: <BookOutlined />,
    },
    {
        label: '个人中心',
        key: '/personal',
        path: 'personal',
        icon: <UserOutlined />,
        children: [
            {
                label: '学习进度',
                key: '/personal',
                path: 'personal',
                icon: <BookOutlined />,
            },
            {
                label: '发布文章',
                key: '/publish',
                path: 'publish',
                icon: <EditOutlined />,
            },
            {
                label: '我的文章',
                key: '/my_articles',
                path: 'my_articles',
                icon: <FileTextOutlined />,
            }
        ]
    },
    // {
    //     label: '文章浏览',
    //     key: '/other_articles',
    //     path: 'other_articles',
    //     icon: <EyeOutlined />,
    // },
]

const GeekLayout = () => {
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme() // 获取主题状态和切换函数
    // useEffect(() => {
    //     console.log('Theme changed to:', theme);
    //     console.log('Current data-theme:', document.querySelector('section').getAttribute('data-theme'));
    // }, [theme]);
    const menuClick = (route) => {
        console.log(route.key); // 打印 key 以确保它包含有效路径
        if (route.key) {
            navigate(route.key);
        } else {
            console.error('Invalid route key:', route.key);
        }
    }

    const location = useLocation()
    const selectedKey = location.pathname

    //调用异步请求方法,目前接口有问题
    const dispatch = useDispatch()
    const [useName, setUseName] = useState('')

    useEffect(() => {
        // dispatch(fetchUseInfo())
        const fetchUser = async () => {
            const res = await req.get('http://localhost:3001/api/username')

            setUseName(res.username)
            console.log(res);

        }
        fetchUser()

    }, [])
    // 在另一个 useEffect 中监听 useName 的变化
    // useEffect(() => {
    //     console.log('用户名更新为:', useName);
    // }, [useName]); // 当 useName 更新时触发
    // const useName = useSelector(state => state.user.userInfo.name)
    // console.log(useName);


    //退出登入
    const loginOut = () => {
        dispatch(clearUserInfo())
        navigate('/login')
    }

    const handleSearch = (value) => {
        if (value.trim()) {
            navigate(`/search?keyword=${encodeURIComponent(value)}`)
        }
    }
    return (
        <Layout data-theme={theme}>
            <Header className="header">
                <div className="logo" />
                <div className="header-search">
                    <Input.Search
                        placeholder="搜索文章..."
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                    />
                </div>
                <div className="user-info">
                    <span className="user-name">{useName}</span>
                    <button
                        onClick={toggleTheme}
                        style={{
                            margin: '0 10px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '18px'
                        }}
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    <span className="user-logout">
                        <Popconfirm title="是否确认退出？" okText="退出" cancelText="取消"
                            onConfirm={loginOut}>
                            <LogoutOutlined /> 退出
                        </Popconfirm>
                    </span>
                </div>
            </Header>
            <Layout>
                <Sider width={200} className="site-layout-background">
                    <Menu
                        mode="inline"
                        theme="dark"
                        defaultSelectedKeys={['1']}
                        selectedKeys={selectedKey}
                        items={items}
                        style={{ height: '100%', borderRight: 10 }}
                        onClick={menuClick}
                    >
                    </Menu>
                </Sider>
                <Layout className="layout-content" style={{ padding: 20 }}>
                    {/* 配置二级路由出口 */}
                    <Outlet />
                </Layout>
            </Layout>
        </Layout>
    )
}
export default GeekLayout
