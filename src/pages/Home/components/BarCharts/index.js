import { useRef, useEffect } from 'react'
import * as echarts from 'echarts'
import { useNavigate } from 'react-router-dom'

const BarChart = ({ title, xData, sData, style = { width: '400px', height: '400px', margin: '20px,20px,20px,20px' } }) => {
    const chartRef = useRef(null)
    const history = useNavigate(); // 使用 useHistory 获取历史对象
    useEffect(() => {
        // 1. 生成实例
        const myChart = echarts.init(chartRef.current)

        // 2. 准备图表参数
        const option = {
            title: {
                text: title
            },
            xAxis: {
                type: 'category',
                data: xData
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    data: sData,
                    type: 'bar',
                    emphasis: {
                        focus: 'series',
                    },
                }
            ]
        }
        // 3. 渲染参数
        myChart.setOption(option)
        // 点击事件
        myChart.on('click', (params) => {
            if (params.componentType === 'series') {
                // 跳转到新的页面，传递选中的数据
                history(`/details/${params.name}`); // params.name 可能是 'Vue', 'React' 等
            }
        });
        return () => {
            myChart.dispose(); // 清理 ECharts 实例
        };
    }, [])
    return <div ref={chartRef} style={style}></div>
}

export { BarChart }