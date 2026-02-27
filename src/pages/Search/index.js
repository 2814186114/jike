import { useState, useEffect } from 'react'
import { Input, List, Card, Tag, Spin, Empty, Pagination } from 'antd'
import { SearchOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { req } from '@/utils'
import './index.scss'

const { Search } = Input

const SearchPage = () => {
    const [articles, setArticles] = useState([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    useEffect(() => {
        const kw = searchParams.get('keyword')
        if (kw) {
            handleSearch(kw, 1)
        }
    }, [searchParams])

    const handleSearch = async (value, pageNum = 1) => {
        if (!value.trim()) return

        setKeyword(value)
        setPage(pageNum)
        setLoading(true)

        try {
            const res = await req.get(`http://localhost:3001/api/search?keyword=${encodeURIComponent(value)}&page=${pageNum}&limit=10`)
            setArticles(res.articles || [])
            setTotal(res.total || 0)
        } catch (error) {
            console.error('搜索失败:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePageChange = (pageNum) => {
        handleSearch(keyword, pageNum)
    }

    const handleArticleClick = (articleId) => {
        navigate(`/detail?id=${articleId}`)
    }

    const stripHtml = (html) => {
        const tmp = document.createElement('div')
        tmp.innerHTML = html
        return tmp.textContent || tmp.innerText || ''
    }

    return (
        <div className="search-page">
            <div className="search-header">
                <h2>文章搜索</h2>
                <Search
                    placeholder="搜索文章标题或内容..."
                    enterButton={<><SearchOutlined /> 搜索</>}
                    size="large"
                    onSearch={handleSearch}
                    className="search-input"
                />
            </div>

            {loading ? (
                <div className="loading-container">
                    <Spin size="large" />
                </div>
            ) : articles.length > 0 ? (
                <>
                    <List
                        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2 }}
                        dataSource={articles}
                        renderItem={(item) => (
                            <List.Item>
                                <Card
                                    hoverable
                                    onClick={() => handleArticleClick(item.id)}
                                    className="article-card"
                                >
                                    <Card.Meta
                                        title={
                                            <div className="article-title">
                                                <FileTextOutlined />
                                                <span>{item.title}</span>
                                            </div>
                                        }
                                        description={
                                            <div className="article-content">
                                                <p>{stripHtml(item.content).slice(0, 150)}...</p>
                                                <div className="article-meta">
                                                    <Tag color="blue">{item.tech_stack}</Tag>
                                                    <span className="date">
                                                        <ClockCircleOutlined /> {new Date(item.updatedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        }
                                    />
                                </Card>
                            </List.Item>
                        )}
                    />
                    {total > 10 && (
                        <div className="pagination">
                            <Pagination
                                current={page}
                                total={total}
                                pageSize={10}
                                onChange={handlePageChange}
                                showTotal={(total) => `共 ${total} 条结果`}
                            />
                        </div>
                    )}
                </>
            ) : keyword ? (
                <Empty description="未找到相关文章" />
            ) : (
                <div className="search-tips">
                    <Empty description="请输入关键词搜索文章" />
                </div>
            )}
        </div>
    )
}

export default SearchPage
