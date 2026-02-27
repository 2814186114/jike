import { Card, Form, Input, Button, message, Row, Col } from 'antd'
import './index.scss'
import logo from '../../assets/login.png'
import plant from '../../assets/new.jpg'
import { useDispatch, useSelector } from 'react-redux'
import { fetchLogin, setToken } from '@/store/modules/user'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useState } from 'react'
import { req } from '@/utils'
import {
    ReadOutlined,
    EditOutlined,
    FileTextOutlined,
    BarChartOutlined,
    RocketOutlined
} from '@ant-design/icons'

const Login = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [form] = Form.useForm();
    const token = useSelector(state => state.user.token);
    const [isRegister, setIsRegister] = useState(false)
    const [selectedFeature, setSelectedFeature] = useState(null)
    const [showLoginForm, setShowLoginForm] = useState(false)

    // 功能定义
    const features = [
        {
            id: 'read',
            title: '阅读文章',
            description: '浏览技术文章，学习前沿知识',
            icon: <ReadOutlined />,
            color: '#1890ff',
            route: '/'
        },
        {
            id: 'write',
            title: '写文章',
            description: '分享你的技术见解和经验',
            icon: <EditOutlined />,
            color: '#52c41a',
            route: '/publish'
        },
        {
            id: 'resume',
            title: '简历修改',
            description: 'AI辅助优化你的求职简历',
            icon: <FileTextOutlined />,
            color: '#faad14',
            route: '/'
        },
        {
            id: 'progress',
            title: '学习进度',
            description: '跟踪你的学习轨迹和成就',
            icon: <BarChartOutlined />,
            color: '#722ed1',
            route: '/'
        }
    ]

    // 处理功能选择
    const handleFeatureSelect = (feature) => {
        setSelectedFeature(feature)
        setShowLoginForm(true)
    }

    // 返回功能选择
    const handleBackToFeatures = () => {
        setSelectedFeature(null)
        setShowLoginForm(false)
    }

    //注册
    const backLoginClick = () => {
        setIsRegister(false)
    }
    const handleRegisterClick = async (value) => {
        setIsRegister(true)
        // console.log(value);

        // try {
        //     // 发送 POST 请求
        //     const response = await axios.post('http://localhost:3001/api/register', value);

        //     // 处理成功响应
        //     console.log('注册成功:', response.data);
        //     // 可以在这里做进一步操作，比如跳转到登录页或显示成功提示
        //     alert('注册成功！');

        // } catch (error) {
        //     // 错误处理
        //     console.error('注册失败:', error.response ? error.response.data : error.message);

        //     // 显示具体的错误消息
        //     if (error.response && error.response.data) {
        //         // 如果服务器返回了错误信息
        //         alert(`注册失败: ${error.response.data.message || error.response.data}`);
        //     } else {
        //         // 如果没有响应数据，显示网络错误等
        //         alert('注册失败，请检查网络或稍后重试！');
        //     }
        // }
    }
    //收集表单数据
    const onFinish = async (value) => {
        console.log(value);
        //触发异步,使异步代码看起来像同步代码使用await
        // dispatch(checkTokenValidity())
        if (isRegister === false) {
            await dispatch(fetchLogin(value))
            // 访问 token
            // if (!token) {
            //     return <p>请先登录。</p>;
            // } else {
            //     //登入成功路由跳转
            //     navigate('/')
            //     message.success('登入成功')
            // }
            //登入成功路由跳转
            navigate('/')
            message.success('登入成功')
        } else {
            try {
                // 发送 POST 请求
                console.log(value, '注册');

                const response = await req.post('http://localhost:3001/api/register', value);

                // 处理成功响应
                console.log('注册成功:', response.data);
                // 可以在这里做进一步操作，比如跳转到登录页或显示成功提示
                alert('注册成功！');
                form.resetFields()

            } catch (error) {
                // 错误处理
                console.error('注册失败:', error.response ? error.response.data : error.message);

                // 显示具体的错误消息
                if (error.response && error.response.data) {
                    // 如果服务器返回了错误信息
                    alert(`注册失败: ${error.response.data.message || error.response.data}`);
                } else {
                    // 如果没有响应数据，显示网络错误等
                    alert('注册失败，请检查网络或稍后重试！');
                }
            }
        }

    }

    // 渲染功能选择界面
    const renderFeatureSelection = () => (
        <div className="feature-selection">
            <div className="welcome-section">
                <h1 className="welcome-title">欢迎来到技术学习平台</h1>
                <p className="welcome-subtitle">选择您想要开始的功能</p>
            </div>

            <Row gutter={[24, 24]} className="features-grid">
                {features.map((feature) => (
                    <Col xs={24} sm={12} lg={6} key={feature.id}>
                        <Card
                            className="feature-card"
                            style={{
                                borderColor: feature.color,
                                background: `linear-gradient(135deg, ${feature.color}15, ${feature.color}08)`
                            }}
                            hoverable
                            onClick={() => handleFeatureSelect(feature)}
                        >
                            <div className="feature-icon" style={{ color: feature.color }}>
                                {feature.icon}
                            </div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                            <div className="feature-arrow">→</div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    )

    // 渲染登录表单
    const renderLoginForm = () => (
        <div className="login-form-section">
            <div className="login-header">
                <Button
                    type="text"
                    icon={<RocketOutlined />}
                    onClick={handleBackToFeatures}
                    className="back-button"
                >
                    返回选择
                </Button>
                <h2 className="selected-feature-title">
                    开始{selectedFeature?.title}
                </h2>
                <p className="selected-feature-description">
                    {selectedFeature?.description}
                </p>
            </div>

            <Card className="login-card">
                {isRegister === false ? (
                    <Form validateTrigger={['onBlur']} onFinish={onFinish}>
                        <Form.Item
                            name="mobile"
                            rules={[
                                { required: true, message: '请输入手机号' },
                                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
                            ]}
                        >
                            <Input size="large" placeholder="请输入手机号" />
                        </Form.Item>
                        <Form.Item
                            name="code"
                            rules={[
                                { required: true, message: '请输入验证码' },
                                { pattern: /^\d{6}$/, message: '请输入正确的验证码' }
                            ]}
                        >
                            <Input size="large" placeholder="请输入验证码" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" size="large" block>
                                登录并开始{selectedFeature?.title}
                            </Button>
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="link"
                                size="small"
                                block
                                onClick={handleRegisterClick}
                                className="register-link"
                            >
                                还没有账号？立即注册
                            </Button>
                        </Form.Item>
                    </Form>
                ) : (
                    <Form validateTrigger={['onBlur']} onFinish={onFinish}>
                        <Form.Item
                            name="mobile"
                            rules={[
                                { required: true, message: '请输入手机号' },
                                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
                            ]}
                        >
                            <Input size="large" placeholder="请输入手机号" />
                        </Form.Item>
                        <Form.Item
                            name="code"
                            rules={[
                                { required: true, message: '请输入验证码' },
                                { pattern: /^\d{6}$/, message: '请输入正确的验证码' }
                            ]}
                        >
                            <Input size="large" placeholder="请输入验证码" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" size="large" block>
                                注册
                            </Button>
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="link"
                                size="small"
                                block
                                onClick={backLoginClick}
                                className="back-login-link"
                            >
                                已有账号？返回登录
                            </Button>
                        </Form.Item>
                    </Form>
                )}
            </Card>
        </div>
    )

    return (
        <div className="login-page">
            <div className="background-animation"></div>
            <div className="login-container">
                {!showLoginForm ? renderFeatureSelection() : renderLoginForm()}
            </div>
        </div>
    )
}
export default Login
