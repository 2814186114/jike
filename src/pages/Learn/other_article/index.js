import { Card, Input } from "antd";
import { req } from "@/utils";
import { useEffect, useState, useRef } from "react";

const LearnVirtual = () => {
    const [articles, setArticles] = useState([]); // 存储文章数据
    const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0 }); // 可见范围
    const [searchTerm, setSearchTerm] = useState(''); // 新增搜索状态
    const [itemHeights, setItemHeights] = useState([]); // 存储每项的高度
    const containerRef = useRef(null);
    const loaderRef = useRef(null); // 加载器引用

    const containerHeight = window.innerHeight - 200; // 容器高度

    // 随机生成高度在 100px 到 200px 之间
    const generateRandomHeight = () => {
        return Math.floor(Math.random() * (300 - 100 + 1)) + 100; // 100px 到 200px 之间的随机值
    };

    // 获取文章数据
    const fetchArticles = async () => {
        try {
            const response = await req.get(`http://localhost:3001/api/other_articles`);
            setArticles(response); // 假设 `response` 是数组
            const heights = response.map(generateRandomHeight); // 为每个文章项生成随机高度
            setItemHeights(heights); // 存储生成的高度
            const initialEndIndex = Math.min(response.length - 1, Math.ceil(containerHeight / 200) - 1);
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
            const newEndIndex = Math.min(
                articles.length - 1,
                prevRange.endIndex + Math.ceil(containerHeight / 200)
            );
            return { startIndex: prevRange.startIndex, endIndex: newEndIndex };
        });
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
            <Card
                key={visibleRange.startIndex + index}
                title={article.title}
                style={{
                    margin: '10px',
                    height: itemHeights[visibleRange.startIndex + index] || 200, // 使用随机高度

                    cursor: 'pointer',
                    transition: 'all 0.3s ease',

                }}
            >
                <p>{article.content}</p>
                <p>作者：{article.author}</p>
                <p>发布时间：{new Date(article.publish_date).toLocaleString()}</p>
            </Card>
        ));
    };

    // 搜索输入处理
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    return (
        <div>
            <Input
                placeholder="搜索文章..."
                value={searchTerm}
                onChange={handleSearchChange} // 更新搜索状态
                style={{ marginBottom: '20px', width: '3500px' }}
            />
            <div
                ref={containerRef}
                style={{ height: `${containerHeight}px`, overflowY: 'auto', position: 'relative' }}
            >
                <div style={{ height: `${articles.length * 200}px`, position: 'relative' }}>
                    {renderVisibleItems()}
                    <div ref={loaderRef} style={{ height: '200px' }} /> {/* 观察器的元素 */}
                </div>
            </div>
        </div>
    );
};

export default LearnVirtual;








