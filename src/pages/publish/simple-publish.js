import { Card, Button, Space, Select, message, Tooltip, Input } from 'antd'
import { req } from '@/utils'
import { useState, useRef, useEffect } from 'react'
import MDEditor from '@uiw/react-md-editor'
import SmartPasteHandler from '@/utils/smartPasteHandler'
import {
    RobotOutlined,
    TagOutlined,
    BarChartOutlined,
    ThunderboltOutlined,
    SendOutlined,
    PictureOutlined,
    UploadOutlined
} from '@ant-design/icons'
import './simple-publish.scss'

const { Option } = Select

const SimplePublish = () => {
    const [content, setContent] = useState('')
    const [techStack, setTechStack] = useState('react')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisResults, setAnalysisResults] = useState(null)
    const [isPublishing, setIsPublishing] = useState(false)
    const [uploadedImages, setUploadedImages] = useState([])
    const fileInputRef = useRef(null)
    const editorRef = useRef(null)
    const smartPasteHandlerRef = useRef(null)

    // 允许的图片类型
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

    // 初始化智能粘贴系统 - 改进版
    useEffect(() => {
        const initializeSmartPaste = () => {
            // 延迟初始化，确保编辑器已完全渲染
            setTimeout(() => {
                if (editorRef.current) {
                    console.log('编辑器引用:', editorRef.current)

                    // 获取MDEditor的文本区域 - 使用更可靠的选择器
                    const textarea = editorRef.current.querySelector('textarea.w-md-editor-text-input')
                    console.log('找到的文本区域:', textarea)

                    if (textarea) {
                        console.log('初始化智能粘贴系统...')
                        smartPasteHandlerRef.current = new SmartPasteHandler(
                            textarea,
                            async (content, type) => {
                                console.log(`智能粘贴处理完成，类型: ${type}`, content)

                                // 根据内容类型显示不同的成功消息
                                switch (type) {
                                    case 'image':
                                        message.success('图片已智能处理并插入')
                                        break
                                    case 'code':
                                        message.success('代码已自动格式化并插入')
                                        break
                                    case 'url':
                                        message.success('链接已智能处理')
                                        break
                                    case 'table':
                                        message.success('表格已转换为Markdown格式')
                                        break
                                    case 'rich-text':
                                        message.success('富文本内容已转换')
                                        break
                                    default:
                                        message.success('内容已智能处理')
                                }

                                // 插入到编辑器内容中
                                setContent(prevContent => prevContent + '\n' + content + '\n')
                            }
                        )
                        console.log('智能粘贴系统初始化成功')
                    } else {
                        console.warn('未找到编辑器文本区域，智能粘贴系统初始化失败')
                    }
                } else {
                    console.warn('编辑器引用为空，智能粘贴系统初始化失败')
                }
            }, 100)
        }

        initializeSmartPaste()

        return () => {
            // 清理智能粘贴处理器
            if (smartPasteHandlerRef.current) {
                console.log('清理智能粘贴系统')
                smartPasteHandlerRef.current.destroy()
            }
        }
    }, [])

    // 处理图片上传按钮点击
    const handleImageUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click()
        }
    }

    // 处理文件选择 - 改进版，支持光标位置插入
    const handleFileSelect = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        // 检查文件类型
        if (!allowedImageTypes.includes(file.type)) {
            message.error('只能上传图片文件 (JPEG, PNG, GIF, WebP)!')
            return
        }

        try {
            // 上传图片
            const imageData = await uploadImage(file)

            // 将图片信息添加到上传图片列表
            const imageInfo = {
                data: imageData,
                name: file.name,
                size: file.size,
                type: file.type,
                uploadTime: new Date().toISOString()
            }
            setUploadedImages(prev => [...prev, imageInfo])

            // 插入图片到内容中 - 简单追加到末尾
            const imageMarkdown = `\n![图片](${imageData})\n`
            setContent(prevContent => prevContent + imageMarkdown)

            message.success('图片上传成功')
        } catch (error) {
            console.error('图片上传失败:', error)
            message.error('图片上传失败')
        } finally {
            // 重置文件输入
            event.target.value = ''
        }
    }

    // 处理粘贴图片上传
    const handleImagePaste = async (file) => {
        if (!allowedImageTypes.includes(file.type)) {
            message.error('只能上传图片文件 (JPEG, PNG, GIF, WebP)!')
            return null
        }

        try {
            const imageData = await uploadImage(file)

            // 将图片信息添加到上传图片列表
            const imageInfo = {
                data: imageData,
                name: file.name,
                size: file.size,
                type: file.type,
                uploadTime: new Date().toISOString()
            }
            setUploadedImages(prev => [...prev, imageInfo])

            message.success('图片上传成功')
            return imageData
        } catch (error) {
            console.error('图片粘贴上传失败:', error)
            message.error('图片上传失败')
            return null
        }
    }

    // 处理拖拽上传
    const handleDrop = async (event) => {
        event.preventDefault()
        const files = event.dataTransfer.files
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const imageData = await handleImagePaste(files[0])
            if (imageData) {
                // 插入图片到拖拽位置（这里简化处理，实际需要更复杂的插入逻辑）
                const imageMarkdown = `\n![图片](${imageData})\n`
                setContent(prevContent => prevContent + imageMarkdown)
            }
        }
    }

    // 图片上传函数 - 修改为处理Base64数据
    const uploadImage = async (file) => {
        const formData = new FormData()
        formData.append('image', file)

        try {
            const response = await req.post('http://localhost:3001/api/upload-image', formData, {
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                    console.log(`图片上传进度: ${progress}%`)
                },
            })

            if (response.success && response.imageData) {
                return response.imageData // 返回Base64数据
            } else {
                throw new Error('图片上传接口返回数据格式错误')
            }
        } catch (error) {
            console.error('图片上传失败:', error)
            throw error
        }
    }

    // 智能分析文章
    const analyzeArticle = async () => {
        if (!content.trim()) {
            message.warning('请先输入文章内容')
            return
        }

        setIsAnalyzing(true)
        try {
            const response = await req.post('http://localhost:3001/api/analyze-article', {
                title: content.substring(0, 50) + '...',
                content,
                tech_stack: techStack
            })

            setAnalysisResults(response)
            message.success('文章分析完成')
        } catch (error) {
            console.error('文章分析失败:', error)
            message.error('文章分析失败，请稍后重试')
        } finally {
            setIsAnalyzing(false)
        }
    }

    // 发布文章
    const publishArticle = async () => {
        if (!content.trim()) {
            message.warning('请先输入文章内容')
            return
        }

        setIsPublishing(true)
        try {
            // 从内容自动生成标题
            const title = content.substring(0, 100).replace(/\n/g, ' ') + '...'

            const params = {
                title,
                tech_stack: techStack,
                content,
                images: uploadedImages // 将上传的图片数据存储到images字段
            }

            console.log('发布文章参数:', {
                title,
                tech_stack: techStack,
                content_length: content.length,
                images_count: uploadedImages.length,
                images: uploadedImages
            })

            await req.post('http://localhost:3001/submit-article', params)
            message.success('文章发布成功')

            // 清空编辑器和分析结果
            setContent('')
            setAnalysisResults(null)
            setUploadedImages([])

        } catch (error) {
            console.error('文章发布失败:', error)

            // 改进错误处理
            if (error.response) {
                // 服务器返回了错误状态码
                message.error(`文章发布失败: ${error.response.status} - ${error.response.data?.message || '服务器错误'}`)
            } else if (error.request) {
                // 请求已发送但没有收到响应
                message.error('文章发布失败: 网络连接错误，请检查服务器是否运行')
            } else {
                // 其他错误
                message.error(`文章发布失败: ${error.message}`)
            }
        } finally {
            setIsPublishing(false)
        }
    }

    return (
        <div className="simple-publish">
            <Card
                title={
                    <div className="publish-header">
                        <h2>发布文章</h2>
                        <span className="subtitle">简洁高效的写作体验</span>
                    </div>
                }
                extra={
                    <Space>
                        <Select
                            value={techStack}
                            onChange={setTechStack}
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

                        <Tooltip title="智能分析文章">
                            <Button
                                type="default"
                                icon={<RobotOutlined />}
                                onClick={analyzeArticle}
                                loading={isAnalyzing}
                                size="small"
                            >
                                智能分析
                            </Button>
                        </Tooltip>

                        <Tooltip title="发布文章">
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={publishArticle}
                                loading={isPublishing}
                                size="small"
                            >
                                发布
                            </Button>
                        </Tooltip>
                    </Space>
                }
            >
                {/* 隐藏的文件输入 */}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileSelect}
                />

                {/* 操作按钮组 */}
                <div className="action-buttons">
                    <Space>
                        <Tooltip title="插入图片">
                            <Button
                                type="default"
                                icon={<UploadOutlined />}
                                onClick={handleImageUploadClick}
                                size="small"
                            >
                                插入图片
                            </Button>
                        </Tooltip>
                    </Space>
                </div>

                {/* 编辑器区域 */}
                <div
                    className="editor-section"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    ref={editorRef}
                >
                    <MDEditor
                        value={content}
                        onChange={setContent}
                        height={400}
                        preview="edit"
                        placeholder="开始写作吧... 支持Markdown语法和智能粘贴"
                        className="markdown-editor"
                    />
                </div>

                {/* 智能分析结果 */}
                {analysisResults && (
                    <div className="analysis-section">
                        <Card
                            size="small"
                            title={
                                <span>
                                    <RobotOutlined /> AI分析结果
                                </span>
                            }
                            className="analysis-card"
                        >
                            <div className="analysis-results">
                                <div className="analysis-item">
                                    <h4><TagOutlined /> 自动标签</h4>
                                    <div className="tags">
                                        {analysisResults.tags?.map((tag, index) => (
                                            <span key={index} className="tag">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="analysis-item">
                                    <h4><BarChartOutlined /> 难度评估</h4>
                                    <div className="difficulty">
                                        <span>难度等级: </span>
                                        <span className={`level level-${analysisResults.difficulty}`}>
                                            {analysisResults.difficulty}/5
                                        </span>
                                        {analysisResults.estimatedTime && (
                                            <span className="reading-time">
                                                预计阅读: {analysisResults.estimatedTime}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {analysisResults.summary && (
                                    <div className="analysis-item">
                                        <h4>文章摘要</h4>
                                        <p className="summary">
                                            {analysisResults.summary}
                                        </p>
                                    </div>
                                )}

                                {analysisResults.keyPoints && analysisResults.keyPoints.length > 0 && (
                                    <div className="analysis-item">
                                        <h4>关键知识点</h4>
                                        <ul className="key-points">
                                            {analysisResults.keyPoints.map((point, index) => (
                                                <li key={index}>{point}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* 操作提示 */}
                <div className="tips-section">
                    <div className="tips">
                        <div className="tip">
                            <PictureOutlined />
                            <span>点击"插入图片"按钮上传图片</span>
                        </div>
                        <div className="tip">
                            <ThunderboltOutlined />
                            <span>使用"智能分析"优化内容</span>
                        </div>
                        <div className="tip">
                            <SendOutlined />
                            <span>完成后点击"发布"</span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default SimplePublish
