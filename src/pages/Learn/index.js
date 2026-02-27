import { Card, Input, Pagination } from "antd"
import { req } from "@/utils"
import { useEffect, useState } from "react"
import { useNavigate, Outlet } from "react-router-dom"
const Learn = () => {
    const [articles, setArticles] = useState([])
    const [searchTerm, setSearchTerm] = useState(''); // 新增搜索状态
    const [currentPage, setCurrentPage] = useState(1);
    const [totalArticles, setTotalArticles] = useState(0);
    const navigate = useNavigate()
    //debouncedSearchTerm: 用于存储经过去抖动处理后的搜索关键字。
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const fetchArticles = async (page) => {
        try {
            const response = await req.get(`http://localhost:3001/api/articles`, {
                params: { page, limit: 10, search: searchTerm }  // 添加 search 参数
            });
            console.log(response);
            setArticles(response.data)
            setTotalArticles(response.total);

        } catch (error) {
            console.error('Error fetching articles:', error);

        }
    }
    // 去抖动函数
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300); // 300毫秒去抖动

        return () => {
            clearTimeout(handler); // 清除定时器
        };
    }, [searchTerm]);
    useEffect(() => {
        fetchArticles(currentPage)

    }, [currentPage, debouncedSearchTerm])
    // 根据搜索关键字过滤文章
    // 监听搜索框的变化
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);  // 当搜索内容改变时，重置到第一页
    };

    //处理点击阅读文章的函数
    const handleCardClick = async (article) => {
        try {
            // 发送请求，更新阅读量
            const response = await req.post(`http://localhost:3001/api/articles/${article.id}/view`);

            // 检查响应
            if (response && response.status === 200) {
                console.log('阅读量更新成功');
            } else {
                console.error('更新失败', response);
            }

            // 路由跳转
            navigate(`/detail`, { state: { article } });
        } catch (error) {
            console.error('请求失败:', error);
            // 可以在这里显示一个友好的错误提示
        }
    };





    return (
        <div>
            <Input
                placeholder="搜索文章..."
                value={searchTerm}
                onChange={handleSearchChange} // 更新搜索状态
                style={{ marginBottom: '20px', width: '300px' }}
            />
            {articles.length > 0 ? (
                articles.map((article) => (
                    <Card key={article.id} title={article.title} style={{ margin: '10px' }}
                        onClick={() => {
                            handleCardClick(article);
                        }}//传递文章
                    >
                        <p>{article.content}</p>
                        <p>作者：{article.author}</p>
                        <p>发布时间：{new Date(article.publish_date).toLocaleString()}</p>

                    </Card>
                ))
            ) : (
                <p>没有找到文章。</p>
            )}
            <Pagination
                current={currentPage}
                pageSize={10}
                total={totalArticles}
                onChange={(page) => setCurrentPage(page)}
            />

            {/* {articles.length > 0 ? ( // 判断是否有文章数据
                articles.map((article) => (
                    <Card key={article.id} title={article.title} style={{ margin: '10px' }}>
                        <p>{article.content}</p>
                        <p>作者：{article.author}</p>
                        <p>发布时间：{new Date(article.publish_date).toLocaleString()}</p>
                    </Card>
                ))
            ) : (
                <p>没有找到文章。</p> // 如果没有文章数据，则显示提示信息
            )} */}
            <Outlet />
        </div>

    )
}
export default Learn