
import { createBrowserRouter } from 'react-router-dom'
import Login from '@/pages/Login/index'
import Layout from '@/pages/Layout/index'
import AuthRoute from '@/components/AuthRoute/index'
import DataVue from "@/pages/Home/components/Detail/indexVue"
import DataReact from "@/pages/Home/components/Detail/indexReact"
import Publish from '@/pages/publish'
import SimplePublish from '@/pages/publish/simple-publish'
import Article from '@/pages/Article'
import Home from '@/pages/Home'
import Learn from '@/pages/Learn/index'
import MyArticle from '@/pages/Learn/my_article/index'
import LearnVirtual from '@/pages/Learn/other_article/index'
import ArticleDetail from '@/pages/Learn/Detail/index'
import Personal from '@/pages/Personal/index'
import SearchPage from '@/pages/Search/index'

const router = createBrowserRouter([
    {
        path: '/',
        element: <AuthRoute><Layout /></AuthRoute>,
        children: [
            {
                index: true,
                element: <Home />
            },
            {
                path: 'article',
                element: <Article />
            },
            {
                path: '/learn',
                element: <Learn />,
                children: [
                    {
                        path: 'detail',
                        element: <ArticleDetail />
                    }
                ]
            },
            // 个人中心相关路由
            {
                path: '/personal',
                element: <Personal />,
            },
            {
                path: '/publish',
                element: <SimplePublish />
            },
            {
                path: '/simple-publish',
                element: <SimplePublish />
            },
            {
                path: '/my_articles',
                element: <MyArticle />
            },
            {
                path: '/other_articles',
                element: <LearnVirtual />
            },
            {
                path: '/detail',
                element: <ArticleDetail />
            },
            {
                path: '/search',
                element: <SearchPage />
            }
        ]
    },
    {
        path: '/login',
        element: <Login />
    },
    {
        path: '/details',
        element: <DataReact />,
        children: [
            {
                path: 'vue',
                element: <DataVue />
            },
            {
                path: 'React',
                element: <DataReact />
            }
        ]
    }
])

export default router
