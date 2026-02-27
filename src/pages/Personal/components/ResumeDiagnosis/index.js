import React, { useState } from 'react';
import {
    Card,
    Row,
    Col,
    Upload,
    Button,
    message,
    Select,
    Progress,
    Tag,
    List,
    Divider,
    Statistic,
    Alert,
    Space,
    Spin
} from 'antd';
import {
    UploadOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    EditOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import './index.scss';

const { Option } = Select;
const { Dragger } = Upload;

const ResumeDiagnosis = ({ userId }) => {
    const [uploading, setUploading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [resumeText, setResumeText] = useState('');
    const [targetPosition, setTargetPosition] = useState('前端开发');

    // 上传配置
    const uploadProps = {
        name: 'resume',
        multiple: false,
        accept: '.pdf,.doc,.docx',
        showUploadList: false,
        beforeUpload: (file) => {
            const isPDF = file.type === 'application/pdf';
            const isWord = file.type === 'application/msword' ||
                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            if (!isPDF && !isWord) {
                message.error('只能上传 PDF 或 Word 文档!');
                return false;
            }

            if (file.size > 10 * 1024 * 1024) {
                message.error('文件大小不能超过 10MB!');
                return false;
            }

            handleFileUpload(file);
            return false;
        },
    };

    // 处理文件上传
    const handleFileUpload = async (file) => {
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('resume', file);
            formData.append('targetPosition', targetPosition);
            formData.append('userId', userId);

            const response = await fetch('/api/resume/analyze', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('上传失败');
            }

            const result = await response.json();
            setAnalysisResult(result);
            setResumeText(result.resumeText || '');
            message.success('简历分析完成!');
        } catch (error) {
            console.error('上传失败:', error);
            message.error('简历分析失败，请重试');
        } finally {
            setUploading(false);
        }
    };

    // 手动输入简历文本
    const handleTextAnalysis = async () => {
        if (!resumeText.trim()) {
            message.error('请输入简历内容');
            return;
        }

        setUploading(true);
        try {
            const response = await fetch('/api/resume/analyze-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resumeText,
                    targetPosition,
                    userId
                }),
            });

            if (!response.ok) {
                throw new Error('分析失败');
            }

            const result = await response.json();
            setAnalysisResult(result);
            message.success('简历分析完成!');
        } catch (error) {
            console.error('分析失败:', error);
            message.error('简历分析失败，请重试');
        } finally {
            setUploading(false);
        }
    };

    // 生成雷达图配置
    const getRadarOption = () => {
        if (!analysisResult?.categoryScores) return {};

        const categories = Object.keys(analysisResult.categoryScores);
        const scores = Object.values(analysisResult.categoryScores);

        return {
            radar: {
                indicator: categories.map((category, index) => ({
                    name: getCategoryName(category),
                    max: 100
                }))
            },
            series: [{
                type: 'radar',
                data: [{
                    value: scores,
                    name: '简历评分',
                    areaStyle: {
                        color: 'rgba(24, 144, 255, 0.3)'
                    },
                    lineStyle: {
                        color: '#1890ff'
                    }
                }]
            }]
        };
    };

    // 获取分类名称
    const getCategoryName = (category) => {
        const names = {
            contentCompleteness: '内容完整性',
            formatStandard: '格式规范',
            keywordMatch: '关键词匹配',
            experienceRelevance: '经历相关'
        };
        return names[category] || category;
    };

    // 导出优化建议
    const exportSuggestions = () => {
        if (!analysisResult) return;

        const content = `
简历诊断报告
====================

总体评分: ${analysisResult.overallScore}/100

优势:
${analysisResult.strengths.map(strength => `• ${strength}`).join('\n')}

待改进:
${analysisResult.weaknesses.map(weakness => `• ${weakness}`).join('\n')}

具体建议:
${analysisResult.specificSuggestions.map(suggestion => `
${suggestion.position} - ${suggestion.suggestion}
示例: ${suggestion.example}
`).join('\n')}

关键词分析:
匹配关键词: ${analysisResult.keywordAnalysis.matched.join(', ')}
缺失关键词: ${analysisResult.keywordAnalysis.missing.join(', ')}
    `.trim();

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '简历诊断报告.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="resume-diagnosis">
            <Row gutter={[24, 24]}>
                {/* 上传和分析区域 */}
                <Col xs={24} lg={12}>
                    <Card
                        title="简历上传与分析"
                        className="upload-card"
                        extra={
                            <Select
                                value={targetPosition}
                                onChange={setTargetPosition}
                                style={{ width: 150 }}
                            >
                                <Option value="前端开发">前端开发</Option>
                                <Option value="后端开发">后端开发</Option>
                                <Option value="全栈开发">全栈开发</Option>
                                <Option value="移动开发">移动开发</Option>
                                <Option value="测试工程师">测试工程师</Option>
                                <Option value="产品经理">产品经理</Option>
                            </Select>
                        }
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            {/* 文件上传 */}
                            <Dragger {...uploadProps}>
                                <p className="ant-upload-drag-icon">
                                    <FileTextOutlined />
                                </p>
                                <p className="ant-upload-text">点击或拖拽简历文件到此区域</p>
                                <p className="ant-upload-hint">
                                    支持 PDF、Word 格式，文件大小不超过 10MB
                                </p>
                            </Dragger>

                            <Divider>或</Divider>

                            {/* 文本输入 */}
                            <div className="text-input-section">
                                <h4>手动输入简历内容</h4>
                                <textarea
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                    placeholder="请粘贴或输入您的简历内容..."
                                    rows={8}
                                    className="resume-textarea"
                                />
                                <Button
                                    type="primary"
                                    onClick={handleTextAnalysis}
                                    loading={uploading}
                                    icon={<EditOutlined />}
                                    style={{ marginTop: 16 }}
                                >
                                    分析简历内容
                                </Button>
                            </div>

                            {uploading && (
                                <div className="uploading-indicator">
                                    <Spin size="large" />
                                    <p>正在分析简历，请稍候...</p>
                                </div>
                            )}
                        </Space>
                    </Card>
                </Col>

                {/* 分析结果展示 */}
                <Col xs={24} lg={12}>
                    {analysisResult ? (
                        <div className="analysis-results">
                            {/* 总体评分 */}
                            <Card title="诊断结果" className="score-card">
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Statistic
                                            title="总体评分"
                                            value={analysisResult.overallScore}
                                            suffix="/100"
                                            valueStyle={{
                                                color: analysisResult.overallScore >= 80 ? '#52c41a' :
                                                    analysisResult.overallScore >= 60 ? '#faad14' : '#f5222d'
                                            }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Progress
                                            type="circle"
                                            percent={analysisResult.overallScore}
                                            format={percent => `${percent}分`}
                                            strokeColor={{
                                                '0%': '#108ee9',
                                                '100%': '#87d068',
                                            }}
                                        />
                                    </Col>
                                </Row>
                            </Card>

                            {/* 雷达图 */}
                            <Card title="能力维度分析" className="radar-card">
                                <ReactECharts
                                    option={getRadarOption()}
                                    style={{ height: 300 }}
                                    opts={{ renderer: 'svg' }}
                                />
                            </Card>

                            {/* 优势与劣势 */}
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12}>
                                    <Card title="优势" className="strengths-card">
                                        <List
                                            dataSource={analysisResult.strengths}
                                            renderItem={item => (
                                                <List.Item>
                                                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                                                    {item}
                                                </List.Item>
                                            )}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Card title="待改进" className="weaknesses-card">
                                        <List
                                            dataSource={analysisResult.weaknesses}
                                            renderItem={item => (
                                                <List.Item>
                                                    <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                                                    {item}
                                                </List.Item>
                                            )}
                                        />
                                    </Card>
                                </Col>
                            </Row>

                            {/* 具体建议 */}
                            <Card
                                title="优化建议"
                                className="suggestions-card"
                                extra={
                                    <Button
                                        type="link"
                                        icon={<DownloadOutlined />}
                                        onClick={exportSuggestions}
                                    >
                                        导出报告
                                    </Button>
                                }
                            >
                                <List
                                    dataSource={analysisResult.specificSuggestions}
                                    renderItem={(suggestion, index) => (
                                        <List.Item>
                                            <List.Item.Meta
                                                avatar={
                                                    <Tag color={suggestion.type === 'add' ? 'blue' : 'orange'}>
                                                        {suggestion.type === 'add' ? '添加' : '修改'}
                                                    </Tag>
                                                }
                                                title={`${suggestion.position} - ${suggestion.suggestion}`}
                                                description={
                                                    <div>
                                                        <div style={{ color: '#666', fontSize: '12px' }}>
                                                            示例: {suggestion.example}
                                                        </div>
                                                    </div>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            </Card>

                            {/* 关键词分析 */}
                            <Card title="关键词分析" className="keywords-card">
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <h4>匹配关键词</h4>
                                        <div>
                                            {analysisResult.keywordAnalysis.matched.map(keyword => (
                                                <Tag key={keyword} color="green" style={{ marginBottom: 8 }}>
                                                    {keyword}
                                                </Tag>
                                            ))}
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <h4>建议补充</h4>
                                        <div>
                                            {analysisResult.keywordAnalysis.missing.map(keyword => (
                                                <Tag key={keyword} color="red" style={{ marginBottom: 8 }}>
                                                    {keyword}
                                                </Tag>
                                            ))}
                                        </div>
                                    </Col>
                                </Row>
                            </Card>
                        </div>
                    ) : (
                        <Card title="分析结果" className="empty-results">
                            <div className="empty-state">
                                <FileTextOutlined className="empty-icon" />
                                <h3>等待简历分析</h3>
                                <p>上传您的简历或输入简历内容开始分析</p>
                                <Alert
                                    message="小提示"
                                    description="系统将根据您选择的目标岗位，从内容完整性、格式规范、关键词匹配度、经历相关性等维度进行综合评估。"
                                    type="info"
                                    showIcon
                                />
                            </div>
                        </Card>
                    )}
                </Col>
            </Row>
        </div>
    );
};

export default ResumeDiagnosis;
