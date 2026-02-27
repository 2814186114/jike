import { useState, useEffect } from 'react'
import { List, Input, Button, Avatar, Spin, message } from 'antd'
import { UserOutlined, SendOutlined, CommentOutlined } from '@ant-design/icons'
import { req } from '@/utils'
import './index.scss'

const { TextArea } = Input

const Comment = ({ articleId, userInfo }) => {
    const [comments, setComments] = useState([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [newComment, setNewComment] = useState('')

    useEffect(() => {
        if (articleId) {
            fetchComments()
        }
    }, [articleId])

    const fetchComments = async () => {
        setLoading(true)
        try {
            const res = await req.get(`http://localhost:3001/api/comments/${articleId}`)
            setComments(res || [])
        } catch (error) {
            console.error('获取评论失败:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!newComment.trim()) {
            message.warning('请输入评论内容')
            return
        }

        if (!userInfo || !userInfo.id) {
            message.warning('请先登录')
            return
        }

        setSubmitting(true)
        try {
            await req.post('http://localhost:3001/api/comments', {
                articleId,
                userId: userInfo.id,
                username: userInfo.username || userInfo.mobile || '匿名用户',
                content: newComment.trim()
            })
            message.success('评论成功')
            setNewComment('')
            fetchComments()
        } catch (error) {
            message.error('评论失败')
        } finally {
            setSubmitting(false)
        }
    }

    const formatTime = (time) => {
        const date = new Date(time)
        const now = new Date()
        const diff = now - date

        if (diff < 60000) return '刚刚'
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
        return date.toLocaleDateString()
    }

    return (
        <div className="comment-section">
            <div className="comment-header">
                <CommentOutlined />
                <span>评论 ({comments.length})</span>
            </div>

            <div className="comment-input">
                <Avatar icon={<UserOutlined />} src={userInfo?.avatar} />
                <div className="input-wrapper">
                    <TextArea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="发表你的看法..."
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        onPressEnter={(e) => {
                            if (!e.shiftKey) {
                                e.preventDefault()
                                handleSubmit()
                            }
                        }}
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSubmit}
                        loading={submitting}
                        disabled={!newComment.trim()}
                    >
                        发表评论
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <Spin />
                </div>
            ) : (
                <List
                    className="comment-list"
                    dataSource={comments}
                    locale={{ emptyText: '暂无评论，快来抢沙发~' }}
                    renderItem={(item) => (
                        <List.Item className="comment-item">
                            <List.Item.Meta
                                avatar={
                                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
                                        {item.username?.[0]}
                                    </Avatar>
                                }
                                title={
                                    <div className="comment-title">
                                        <span className="username">{item.username || '匿名用户'}</span>
                                        <span className="time">{formatTime(item.created_at)}</span>
                                    </div>
                                }
                                description={
                                    <div className="comment-content">
                                        {item.content}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            )}
        </div>
    )
}

export default Comment
