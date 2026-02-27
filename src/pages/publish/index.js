import {
    Card,
    Breadcrumb,
    Form,
    Button,
    Radio,
    Input,
    Upload,
    Space,
    Select,
    message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Link, useSearchParams } from 'react-router-dom'
import './index.scss'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { req, request } from '@/utils'
import { useEffect, useState, useRef } from 'react'
import { genInputGroupStyle } from 'antd/es/input/style'
import { UploadOutlined } from '@ant-design/icons';
import VideoUploader from './Viedo'
import {
    RobotOutlined,
    TagOutlined,
    BarChartOutlined,
    ThunderboltOutlined
} from '@ant-design/icons'


const { Option } = Select

const Publish = () => {
    // 频道列表
    const [channels, setChannels] = useState([])
    // 限制上传的文件类型
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    //调用接口
    useEffect(() => {
        // const fetchChannels = async () => {
        //     const request = await request.get('/channels')
        //     setChannels(request.data.channels)
        //     console.log(request.data.channels, 'xxxx');

        // }
        // fetchChannels()
    }, [])

    // 重新定义缺失的状态变量
    const [imageType, setImageType] = useState(0);
    const [imageList, setImageList] = useState([]);

    // ReactQuill 编辑器引用
    const quillRef = useRef(null);

    // 自定义图片上传处理
    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            // 检查文件类型
            if (!allowedImageTypes.includes(file.type)) {
                message.error('只能上传图片文件!');
                return;
            }

            try {
                // 上传图片
                const imageUrl = await uploadImage(file);

                // 获取编辑器实例
                const editor = quillRef.current.getEditor();
                const range = editor.getSelection();

                // 插入图片到编辑器
                editor.insertEmbed(range.index, 'image', imageUrl);

                message.success('图片上传成功');
            } catch (error) {
                console.error('图片上传失败:', error);
                message.error('图片上传失败');
            }
        };
    };

    // ReactQuill 模块配置
    const modules = {
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'font': [] }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'script': 'sub' }, { 'script': 'super' }],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'align': [] }],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                'image': imageHandler
            }
        }
    };

    // 简化的图片上传函数 - 使用新的图片上传接口
    const uploadImage = async (file) => {
        const formData = new FormData();
        formData.append('image', file); // 注意字段名改为 'image'

        try {
            // 使用新的图片上传接口
            const response = await req.post('http://localhost:3001/api/upload-image', formData, {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                    console.log(`图片上传进度: ${progress}%`);
                },
            });

            // 从新的图片上传接口返回的数据中提取图片URL
            if (response.success && response.imageUrl) {
                return response.imageUrl;
            } else {
                throw new Error('图片上传接口返回数据格式错误');
            }
        } catch (error) {
            console.error('图片上传失败:', error);
            throw error;
        }
    };

    // 封面图片上传处理
    const cacheImageList = useRef([]);
    const onUploadChange = (info) => {
        console.log(info);
        setImageList(info.fileList);
        cacheImageList.current = info.fileList;

        // 处理上传状态
        if (info.file.status === 'done') {
            message.success(`${info.file.name} 文件上传成功`);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} 文件上传失败`);
        }
    };

    const beforeUpload = (file) => {
        const isAllowedType = allowedImageTypes.includes(file.type);
        if (!isAllowedType) {
            message.error('只能上传图片文件!');
            return false; // 阻止上传
        }
        return true; // 允许上传
    };

    //切换type
    // 控制图片Type
    // const [imageType, setImageType] = useState(0)

    const onTypeChange = (e) => {
        console.log(e, '点击事件');
        const type = e.target.value

        setImageType(type)
        if (type === 1) {
            // 单图，截取第一张展示
            const imgList = cacheImageList.current[0] ? [cacheImageList.current[0]] : []
            setImageList(imgList)


        } else if (type === 3) {
            // 三图，取所有图片展示
            setImageList(cacheImageList.current)
        }

    }
    const onFinish = async (formValue) => {
        const tech_stack = 'react'
        //判断图片类型和数量是否一致
        if (imageType !== imageList.length) {
            message.warning('图片类型和数量不一致')
        }
        console.log(imageList, '图片');
        const { channel_id, content, title } = formValue
        console.log(title, '文章标题');

        const formatUrl = (list) => {
            return list.map(item => {
                if (item.response) {
                    return item.response.data.url
                } else {
                    return item.url
                }
            })
        }

        // 简化的提交参数，保持与后端接口兼容
        const params = {
            tech_stack,
            content, // 内容中已经包含内嵌图片
            title,
            // 封面图片信息 - 使用后端期望的images字段
            images: imageType > 0 ? formatUrl(imageList) : []
        }

        if (articleId) {
            // 编辑
            await request.put(`/mp/articles/${articleId}?draft=false`, params)
        } else {
            await request.post('http://localhost:3001/submit-article', params)
        }

        message.success('发布文章成功')
    }

    //编辑跳转回填数据
    const [searchParams] = useSearchParams()
    const articleId = searchParams.get('id')
    const [form] = Form.useForm()

    useEffect(() => {
        const getArticle = async () => {
            const res = await request.get(`/mp/articles/${articleId}`)
            // console.log(res);
            //1.回填表单数据
            const { cover, ...formValue } = res.data
            // 设置表单数据
            form.setFieldsValue({ ...formValue, type: cover.type })
            //2.回填封面图片
            setImageType(cover.type) // 封面类型
            setImageList(cover.images.map(url => ({ url }))) // 封面list
        }

        if (articleId) {
            // 调用异步函数
            getArticle()  // <-- 需要调用 getArticle()
        }
    }, [articleId, form])  // <-- 结束 useEffect 代码块

    // 上传成功的回调函数
    const handleUploadSuccess = (filename) => {
        message.success(`视频 ${filename} 上传成功！`);
        // 在这里可以处理更多的逻辑，如保存文件路径到数据库等
    };

    // 上传失败的回调函数
    const handleUploadError = (error) => {
        message.error('视频上传失败，请重试！');
        // 在这里可以处理更多的错误逻辑
    };

    // 智能文章分析状态
    const [analysisResults, setAnalysisResults] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [techStack, setTechStack] = useState('react'); // 默认技术栈

    // 智能分析文章
    const analyzeArticle = async () => {
        const title = form.getFieldValue('title');
        const content = form.getFieldValue('content');

        if (!title && !content) {
            message.warning('请先输入文章标题或内容');
            return;
        }

        setIsAnalyzing(true);
        try {
            const response = await req.post('http://localhost:3001/api/analyze-article', {
                title,
                content,
                tech_stack: techStack
            });

            setAnalysisResults(response);
            message.success('文章分析完成');
        } catch (error) {
            console.error('文章分析失败:', error);
            message.error('文章分析失败，请稍后重试');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 自动标签化
    const handleAutoTagging = () => {
        if (analysisResults?.tags) {
            // 这里可以将标签应用到表单中
            message.info(`已识别标签: ${analysisResults.tags.join(', ')}`);
        } else {
            message.warning('请先进行文章分析');
        }
    };

    // 更新技术栈
    const handleTechStackChange = (value) => {
        setTechStack(value);
    };


    return (
        <div className="publish">
            <Card
                title={
                    <Breadcrumb items={[
                        { title: <Link to={'/'}>首页</Link> },
                        { title: `${articleId ? '更新编辑文章' : '发布文章'}` },
                    ]}
                    />
                }
            >
                <Form
                    labelCol={{ span: 4 }}
                    wrapperCol={{ span: 16 }}
                    initialValues={{ type: 1 }}
                    form={form}

                    onFinish={onFinish}
                >
                    <Form.Item
                        label="标题"
                        name="title"
                        rules={[{ required: true, message: '请输入文章标题' }]}
                    >
                        <Input placeholder="请输入文章标题" style={{ width: 400 }} />
                    </Form.Item>
                    <Form.Item
                        label="频道"
                        name="channel_id"
                        rules={[{ required: true, message: '请选择文章频道' }]}
                    >
                        <Select placeholder="请选择文章频道" style={{ width: 400 }}>
                            {channels.map(item => (
                                <Option value={item.id} key={item.id}>{item.name}</Option>
                            ))}
                            <Option value={0} >{'html'}</Option>

                        </Select>
                    </Form.Item>
                    <Form.Item label="封面">
                        <Form.Item name="type">
                            <Radio.Group onChange={onTypeChange}>
                                <Radio value={1}>单图</Radio>
                                <Radio value={3}>三图</Radio>
                                <Radio value={0}>无图</Radio>
                            </Radio.Group>
                        </Form.Item>
                        {imageType > 0 &&
                            <Upload
                                listType="picture-card"
                                showUploadList
                                name='image'

                                onChange={onUploadChange}
                                beforeUpload={beforeUpload}
                                maxCount={imageType}
                                multiple={imageType > 1}
                                fileList={imageList}
                            >
                                <div style={{ marginTop: 8 }}>
                                    <PlusOutlined />
                                </div>
                            </Upload>}
                        <VideoUploader
                            onUploadSuccess={handleUploadSuccess}
                            onUploadError={handleUploadError}
                        ></VideoUploader>


                    </Form.Item>
                    <Form.Item
                        label="内容"
                        name="content"
                        rules={[{ required: true, message: '请输入文章内容' }]}
                    >
                        <ReactQuill
                            ref={quillRef}
                            className='publish-quill'
                            theme="snow"
                            placeholder="请输入文章内容"
                            modules={modules}
                        />
                    </Form.Item>

                    {/* 智能文章分析功能 */}
                    <Form.Item label="智能分析">
                        <Card
                            size="small"
                            title={
                                <span>
                                    <RobotOutlined /> AI智能分析
                                </span>
                            }
                            extra={
                                <Space>
                                    <Select
                                        value={techStack}
                                        onChange={handleTechStackChange}
                                        style={{ width: 120 }}
                                        size="small"
                                    >
                                        <Option value="react">React</Option>
                                        <Option value="vue">Vue</Option>
                                        <Option value="javascript">JavaScript</Option>
                                        <Option value="html">HTML/CSS</Option>
                                        <Option value="node">Node.js</Option>
                                        <Option value="python">Python</Option>
                                    </Select>
                                    <Button
                                        type="primary"
                                        icon={<ThunderboltOutlined />}
                                        onClick={analyzeArticle}
                                        loading={isAnalyzing}
                                        size="small"
                                    >
                                        智能分析
                                    </Button>
                                </Space>
                            }
                        >
                            {analysisResults ? (
                                <div className="analysis-results">
                                    <div style={{ marginBottom: 16 }}>
                                        <h4><TagOutlined /> 自动标签</h4>
                                        <div>
                                            {analysisResults.tags?.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    style={{
                                                        display: 'inline-block',
                                                        background: '#1890ff',
                                                        color: 'white',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        margin: '2px 4px',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: 16 }}>
                                        <h4><BarChartOutlined /> 难度评估</h4>
                                        <div>
                                            <span>难度等级: </span>
                                            <span style={{
                                                color: analysisResults.difficulty >= 4 ? '#ff4d4f' :
                                                    analysisResults.difficulty >= 3 ? '#faad14' : '#52c41a',
                                                fontWeight: 'bold'
                                            }}>
                                                {analysisResults.difficulty}/5
                                            </span>
                                        </div>
                                        {analysisResults.estimatedTime && (
                                            <div>预计阅读时间: {analysisResults.estimatedTime}</div>
                                        )}
                                    </div>

                                    {analysisResults.summary && (
                                        <div style={{ marginBottom: 16 }}>
                                            <h4>文章摘要</h4>
                                            <p style={{ fontSize: '14px', color: '#666' }}>
                                                {analysisResults.summary}
                                            </p>
                                        </div>
                                    )}

                                    {analysisResults.keyPoints && analysisResults.keyPoints.length > 0 && (
                                        <div>
                                            <h4>关键知识点</h4>
                                            <ul style={{ fontSize: '14px', paddingLeft: 20 }}>
                                                {analysisResults.keyPoints.map((point, index) => (
                                                    <li key={index}>{point}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
                                    <RobotOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                                    <div>点击"智能分析"获取文章深度分析</div>
                                </div>
                            )}
                        </Card>
                    </Form.Item>

                    <Form.Item wrapperCol={{ offset: 4 }}>
                        <Space>
                            <Button size="large" type="primary" htmlType="submit">
                                {articleId ? '更新文章' : '发布文章'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div >
    )
}

export default Publish
