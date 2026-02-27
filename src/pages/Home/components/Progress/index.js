import React, { useState, useEffect, useRef } from 'react';
import { req } from '@/utils';
import { useNavigate } from 'react-router-dom';

const ReadingProgressChart = () => {
    const [progressData, setProgressData] = useState([]);  // 初始化为空数组
    const circleRef = useRef([]);  // 用来保存每个圆形的引用
    const containerRef = useRef(null);  // 用来保存容器的引用
    const navigate = useNavigate();

    // 假设从API获取的数据
    useEffect(() => {
        // 获取用户阅读进展数据
        req.get('http://localhost:3001/api/user-progress')
            .then(response => {
                setProgressData(response);  // 假设返回的数据是 [{ tech_stack: 'react', total_articles: 1000, read_articles: 5 }, ...]
            })
            .catch(error => {
                console.error('获取数据失败:', error);
            });
    }, []);

    // 动态绘制进度圆形的函数
    const drawDynamicProgressCircle = (ctx, centerX, centerY, radius, targetAngle) => {
        let currentAngle = 0;

        // 动态填充部分
        const drawCircle = () => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);  // 清除之前的绘制

            // 绘制背景圆
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#e6e6e6';
            ctx.fill();
            ctx.closePath();

            // 动态绘制进度圆
            ctx.beginPath();
            ctx.moveTo(centerX, centerY); // 从圆心开始
            ctx.arc(centerX, centerY, radius, -Math.PI / 2, currentAngle - Math.PI / 2); // 按动态角度绘制
            ctx.closePath();  // 闭合路径
            ctx.fillStyle = "#4caf50";  // 填充颜色
            ctx.globalAlpha = 0.8; // 设置透明度值
            ctx.fill();

            // 更新角度，递增
            if (currentAngle < targetAngle) {
                currentAngle += 0.02;  // 递增角度
                requestAnimationFrame(drawCircle);  // 循环动画
            }
        };

        drawCircle();  // 开始绘制动画
    };

    // 实现拖拽功能
    const handleMouseDown = (e, index) => {
        const circle = circleRef.current[index];
        const container = containerRef.current;

        const startX = e.clientX;
        const startY = e.clientY;
        const offsetX = circle.getBoundingClientRect().left;
        const offsetY = circle.getBoundingClientRect().top;

        const containerRect = container.getBoundingClientRect();
        const containerLeft = containerRect.left;
        const containerTop = containerRect.top;
        const containerRight = containerRect.right;
        const containerBottom = containerRect.bottom;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            // 计算新的位置
            let newLeft = offsetX + deltaX - containerLeft;
            let newTop = offsetY + deltaY - containerTop;

            // 限制拖动的范围
            const minLeft = 0;
            const minTop = 0;
            const maxLeft = containerRight - containerLeft - circle.offsetWidth;
            const maxTop = containerBottom - containerTop - circle.offsetHeight;

            // 限制圆形不会超出容器边界
            newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
            newTop = Math.max(minTop, Math.min(maxTop, newTop));

            // 更新圆形的位置
            circle.style.left = `${newLeft}px`;
            circle.style.top = `${newTop}px`;
        };

        const handleMouseUp = () => {
            // 清除拖拽时的事件监听
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        // 绑定鼠标移动和鼠标松开的事件
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    if (!progressData || progressData.length === 0) {
        return <div>正在加载数据...</div>;  // 数据加载之前显示加载提示
    }

    // 处理点击事件
    const handleClick = (techStack) => {
        // navigate(`/learn/${techStack}`);
    };

    return (
        <div>
            <h2>用户阅读进展</h2>
            {/* 容器，设置边框 */}
            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    width: '500px',
                    height: '300px',
                    border: '2px solid #000',
                    overflow: 'hidden',  // 防止超出边界的元素显示
                    marginTop: '50px',
                }}
            >
                {progressData.map((data, index) => {
                    const radius = 50 + (data.total_articles / 20);  // 根据总文章数动态调整半径
                    const fillRatio = data.read_articles / data.total_articles;  // 填充比例
                    const targetAngle = Math.PI * 2 * fillRatio;  // 目标角度

                    return (
                        <div
                            ref={(el) => (circleRef.current[index] = el)}  // 保存每个圆的引用
                            key={index}
                            style={{
                                position: 'absolute',  // 使得每个圆形可以自由移动
                                cursor: 'move',
                                left: `${index * 150 + 50}px`,  // 初始位置的偏移
                                top: '100px',  // 初始位置的偏移
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                            onMouseDown={(e) => handleMouseDown(e, index)}  // 触发拖拽事件
                            onClick={() => { handleClick(data.tech_stack); }}  // 点击事件
                        >
                            {/* Canvas 用于绘制圆形进度 */}
                            <canvas
                                width={radius * 2}
                                height={radius * 2}
                                style={{ borderRadius: '50%' }}
                                ref={(canvas) => {
                                    if (canvas) {
                                        const ctx = canvas.getContext('2d');
                                        drawDynamicProgressCircle(ctx, radius, radius, radius, targetAngle);
                                    }
                                }}
                            />
                            {/* 技术栈名称 */}
                            <p>{data.tech_stack}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReadingProgressChart;







