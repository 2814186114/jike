import * as echarts from 'echarts';
import { useEffect, useRef, useState } from 'react';
import { request } from '@/utils'; // 确保你有这个请求工具

const PieChart = () => {
    const chartRef = useRef(null);
    const [chartData, setChartData] = useState({ Vue: {}, React: {} });

    // 获取数据的函数
    const fetchData = async () => {
        try {
            const response = await request.get('http://localhost:3001/api/framework-data');
            setChartData(response);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const myChart = echarts.init(chartRef.current);

        const data = [
            { name: 'Vue - Hooks', value: chartData.Vue.hooks || 0 },
            { name: 'Vue - Router', value: chartData.Vue.router || 0 },
            { name: 'Vue - Other', value: chartData.Vue.other || 0 },
            { name: 'React - Hooks', value: chartData.React.hooks || 0 },
            { name: 'React - Router', value: chartData.React.router || 0 },
            { name: 'React - Other', value: chartData.React.other || 0 },
        ];

        const option = {
            title: {
                text: 'Vue 和 React 相关技术发文统计',
                left: 'center',
            },
            tooltip: {
                trigger: 'item',
            },
            series: [
                {
                    name: '发文数量',
                    type: 'pie',
                    radius: '50%',
                    data: data,
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)',
                        },
                    },
                },
            ],
        };

        myChart.setOption(option);
        const handleResize = () => {
            if (chartRef.current) {
                chartRef.current.resize();
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            myChart.dispose(); // 清理图表实例

        };
    }, [chartData]);

    return <div ref={chartRef} style={{ width: '100%', height: '40vh' }}></div>;
};

export default PieChart;
