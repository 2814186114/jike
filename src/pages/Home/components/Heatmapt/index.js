import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as echarts from 'echarts';
import { req } from '@/utils';

const HeatmapChart = () => {
    const [data, setData] = useState([]);  // 确保初始化为空数组

    // 技术栈列表
    const techStackList = ['react-hooks', 'vue-router', 'redux', 'pinia', 'Echarts', 'html', 'css', 'javascript'];

    // 请求后端获取每个技术栈的阅读量
    useEffect(() => {
        req.get('http://localhost:3001/api/tech-stack-views')  // 后端接口
            .then(response => {
                setData(response);
            })
            .catch(error => {
                console.error('获取数据失败:', error);
            });
    }, []);

    // 生成热力图数据格式
    const generateHeatmapData = () => {
        const heatmapData = [];

        techStackList.forEach((tech, index) => {
            data.forEach(item => {
                if (item.tech_stack === tech) {
                    const weekIndex = item.week - 1;  // 假设周从1开始
                    heatmapData.push([weekIndex, index, item.total_views]); // [周, 技术栈, 阅读量]
                }
            });
        });

        return heatmapData;
    };

    // 渲染ECharts热力图
    useEffect(() => {
        if (data.length > 0) {  // 确保 data 不是空数组
            const chart = echarts.init(document.getElementById('heatmap'));

            const option = {
                tooltip: {
                    position: 'top',
                    formatter: function (params) {
                        return `技术栈: ${techStackList[params.data[1]]} <br /> 周: ${params.data[0] + 1} <br /> 阅读量: ${params.data[2]}`;
                    }
                },
                grid: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50
                },
                xAxis: {
                    type: 'category',
                    name: '周',
                    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                    splitArea: {
                        show: true
                    }
                },
                yAxis: {
                    type: 'category',
                    name: '技术栈',
                    data: techStackList,
                    splitArea: {
                        show: true
                    }
                },
                visualMap: {
                    min: 0,
                    max: 2000,
                    calculable: true,
                    orient: 'horizontal',
                    left: 'center',
                    top: 'top',
                    text: ['高', '低'],
                    inRange: {
                        color: ['#d94e5d', '#eac736', '#50a3ba']
                    }
                },
                series: [{
                    name: '阅读量',
                    type: 'heatmap',
                    data: generateHeatmapData(),
                    label: {
                        show: true,
                        formatter: function (params) {
                            return params.value[2]; // 显示阅读量
                        }
                    },
                    itemStyle: {
                        emphasis: {
                            borderColor: '#fff',
                            borderWidth: 1
                        }
                    }
                }]
            };

            chart.setOption(option);
        }
    }, [data]);  // 依赖于 data，确保数据加载后更新图表

    if (!data || data.length === 0) {
        return <div>加载中...</div>;  // 或者显示loading提示
    }

    return <div id="heatmap" style={{ width: '100%', height: '400px' }}></div>;
};

export default HeatmapChart;


