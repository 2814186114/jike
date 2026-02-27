import { Link, useNavigate } from 'react-router-dom'
import { Card, Breadcrumb, Form, Button, Radio, DatePicker, Select, Popconfirm } from 'antd'
import locale from 'antd/es/date-picker/locale/zh_CN'
import { Table, Tag, Space } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import img404 from '@/assets/error.png'
import { useEffect, useState } from 'react'
import { request } from '@/utils'

const { Option } = Select
const { RangePicker } = DatePicker

const Article = () => {
    const navagite = useNavigate()
    //枚举渲染
    const status = {
        1: <Tag color="warning">待审核</Tag>,
        2: <Tag color="success">审核通过</Tag>
    }
    const delArticle = (data) => {
        request.delete(`/mp/articles/${data.id}`)
        // 更新列表
        setParams({
            page: 1,
            per_page: 10
        })
    }
    // 准备列数据
    const columns = [
        {
            title: '封面',
            dataIndex: 'cover',
            width: 120,
            render: cover => {
                return <img src={cover.images[0] || img404} width={80} height={60} alt="" />
            }
        },
        {
            title: '标题',
            dataIndex: 'title',
            width: 220
        },
        {
            title: '状态',
            dataIndex: 'status',
            render: data => status[data]
        },
        {
            title: '发布时间',
            dataIndex: 'pubdate'
        },
        {
            title: '阅读数',
            dataIndex: 'read_count'
        },
        {
            title: '评论数',
            dataIndex: 'comment_count'
        },
        {
            title: '点赞数',
            dataIndex: 'like_count'
        },
        {
            title: '操作',
            render: data => {
                return (
                    <Space size="middle">
                        <Button type="primary" shape="circle" icon={<EditOutlined />}
                            onClick={() => navagite(`/publish?id=${data.id}`)} />
                        <Popconfirm
                            title="确认删除该条文章吗?"
                            onConfirm={() => delArticle(data)}
                            okText="确认"
                            cancelText="取消"
                        >
                            <Button
                                type="primary"
                                danger
                                shape="circle"
                                icon={<DeleteOutlined />}
                            />
                        </Popconfirm>
                    </Space>
                )
            }
        }
    ]
    // 准备表格body数据
    const data = [
        {
            id: '8218',
            comment_count: 0,
            cover: {
                images: [],
            },
            like_count: 0,
            pubdate: '2019-03-11 09:00:00',
            read_count: 2,
            status: 2,
            title: 'wkwebview离线化加载h5资源解决方案'
        }
    ]
    //获取频道
    const [channels, setChannels] = useState([])
    useEffect(() => {
        const fetchChannels = async () => {
            const res = await request.get('/channels')
            setChannels(res.data.channels)
            console.log(res.data.channels, '频道数据');
            console.log(channels, '频道数据');


        }
        fetchChannels()
    }, [])

    //渲染表格
    const [article, setArticleList] = useState({
        list: [],
        count: 0
    })
    const [params, setParams] = useState({
        status: '',
        channel_id: '',
        begin_pubdate: '',
        end_pubdate: '',
        page: 1,
        per_page: 4
    })
    // 获取文章列表

    const [reqData, setReqData] = useState({
        status: '',
        channel_id: '',
        begin_pubdate: '',
        end_pubdate: '',
        page: 1,
        per_page: 4
    })

    useEffect(() => {
        async function fetchArticleList() {
            const res = await request.get('/mp/articles', { params })
            const { results, total_count } = res.data
            setArticleList({
                list: results,
                count: total_count
            })
        }
        fetchArticleList()

    }, [params])

    async function getList(params) {
        const res = await request.get('/mp/articles', { params })
        const { results, total_count } = res.data
        setArticleList({
            list: results,
            count: total_count
        })
        // setList(res.data.results)
        // setCount(res.data.total_count)
    }

    useEffect(() => {
        getList()
    }, [params])
    ////筛选文章列表
    const onFinish = (formValue) => {
        console.log(formValue, '筛选数据');
        // 1. 准备参数
        // const { channel_id, date, status } = formValue
        setReqData({
            ...reqData,
            status: formValue.status,
            channel_id: formValue.channel_id,
            begin_pubdate: formValue.date[0].format('YYYY-MM-DD'),
            end_pubdate: formValue.date[1].format('YYYY-MM-DD'),
        })
        // 2. 使用参数获取新的列表
        getList(reqData)


    }

    const pageChange = (page) => {
        // 拿到当前页参数 修改params 引起接口更新
        setParams({
            ...params,
            page
        })
    }

    return (
        <div>
            <Card
                title={
                    <Breadcrumb items={[
                        { title: <Link to={'/'}>首页</Link> },
                        { title: '文章列表' },
                    ]} />
                }
                style={{ marginBottom: 20 }}
            >
                <Form initialValues={{ status: '' }} onFinish={onFinish}>
                    <Form.Item label="状态" name="status">
                        <Radio.Group>
                            <Radio value={''}>全部</Radio>
                            <Radio value={0}>草稿</Radio>
                            <Radio value={2}>审核通过</Radio>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item label="频道" name="channel_id">
                        <Select
                            placeholder="请选择文章频道"
                            defaultValue="lucy"
                            style={{ width: 120 }}
                        >
                            {/* {channels.map((item) => {
                                <Option value={item.id} key={item.id}>{item.name}</Option>
                            })} */}
                            {channels.map((item) => {
                                return (
                                    <Option value={item.id} key={item.id}>
                                        {item.name}
                                    </Option>
                                );
                            })}

                            {/* <Option value="jack">Jack</Option>
                            <Option value="lucy">Lucy</Option> */}
                        </Select>
                    </Form.Item>

                    <Form.Item label="日期" name="date">
                        {/* 传入locale属性 控制中文显示*/}
                        <RangePicker locale={locale}></RangePicker>
                    </Form.Item>

                    <Form.Item onFinish={onFinish}>
                        <Button type="primary" htmlType="submit" style={{ marginLeft: 40 }}>
                            筛选
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {/*        */}
            <Card title={`根据筛选条件共查询到 ${article.count} 条结果：`}>
                <Table rowKey="id" columns={columns} dataSource={article.list}
                    pagination={{
                        current: params.page,
                        pageSize: params.per_page,
                        onChange: pageChange,
                        total: article.count
                    }} />
            </Card>

        </div>

    )
}

export default Article