import { Card, Input } from "antd";
import { req } from "@/utils";
import { useEffect, useState, useRef, useCallback } from "react";

const LearnVirtual = () => {
    const [articles, setArticles] = useState([]); // 存储文章数据
    const containerRef = useRef(null);
    const loaderRef = useRef(null); // 加载器引用

    const itemHeight = 200; // 每个卡片的高度
    const containerHeight = window.innerHeight - 200; // 容器高度
    const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0 }); // 可见范围
    const [searchTerm, setSearchTerm] = useState(''); // 新增搜索状态

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // 获取文章数据
    const fetchArticles = async () => {
        try {
            const response = await req.get(`http://localhost:3001/api/other_articles`);
            setArticles(response); // 假设 response 是数组
            const initialEndIndex = Math.min(response.length - 1, Math.ceil(containerHeight / itemHeight) - 1);
            setVisibleRange({ startIndex: 0, endIndex: initialEndIndex });
        } catch (error) {
            console.error('Error fetching articles:', error);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, []);

    // 手动加载更多数据
    const loadMoreArticles = () => {
        setVisibleRange((prevRange) => {
            const newEndIndex = Math.min(articles.length - 1, prevRange.endIndex + Math.ceil(containerHeight / itemHeight));
            return { startIndex: prevRange.startIndex, endIndex: newEndIndex };
        });
        // 确保容器滚动到正确位置，防止空白区域

    };

    // 设置 IntersectionObserver
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreArticles(); // 当 loader 进入视口时加载更多
                }
            },
            {
                root: containerRef.current,
                rootMargin: '0px',
                threshold: 0.1,
            }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [articles.length, containerHeight]);

    // 渲染可见项
    const renderVisibleItems = () => {
        if (articles.length === 0) return null;
        const visibleItems = articles.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
        return visibleItems.map((article, index) => (
            <Card key={visibleRange.startIndex + index} title={article.title} style={{ margin: '10px', height: itemHeight + 'px' }
            }>
                <p>{article.content}</p>
                <p>作者：{article.author}</p>
                <p>发布时间：{new Date(article.publish_date).toLocaleString()}</p>
            </Card>
        ));
    };

    return (
        <div>
            <Input
                placeholder="搜索文章..."
                value={searchTerm}
                onChange={handleSearchChange} // 更新搜索状态
                style={{ marginBottom: '20px', width: '300px' }}
            />
            <div
                ref={containerRef}
                style={{ height: containerHeight + 'px', overflowY: 'auto', position: 'relative' }}
            >
                <div style={{ height: (articles.length * itemHeight) + 'px', position: 'relative' }}>
                    {renderVisibleItems()}
                    <div ref={loaderRef} style={{ height: '200px' }} /> {/* 观察器的元素 */}
                </div>
            </div>
        </div>
    );
};

export default LearnVirtual;
