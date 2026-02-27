import { useState, useEffect } from 'react'
import { Button, message, Tooltip } from 'antd'
import { LikeOutlined, LikeFilled, StarOutlined, StarFilled } from '@ant-design/icons'
import { req } from '@/utils'

const LikeFavoriteButtons = ({ articleId, userInfo }) => {
    const [likeCount, setLikeCount] = useState(0)
    const [isLiked, setIsLiked] = useState(false)
    const [favoriteCount, setFavoriteCount] = useState(0)
    const [isFavorited, setIsFavorited] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (articleId) {
            fetchStatus()
        }
    }, [articleId])

    const fetchStatus = async () => {
        try {
            const userId = userInfo?.id
            const [likeRes, favoriteRes] = await Promise.all([
                req.get(`http://localhost:3001/api/like/status/${articleId}${userId ? `?userId=${userId}` : ''}`),
                req.get(`http://localhost:3001/api/favorite/status/${articleId}${userId ? `?userId=${userId}` : ''}`)
            ])
            setLikeCount(likeRes.likeCount || 0)
            setIsLiked(likeRes.isLiked || false)
            setFavoriteCount(favoriteRes.favoriteCount || 0)
            setIsFavorited(favoriteRes.isFavorited || false)
        } catch (error) {
            console.error('获取状态失败:', error)
        }
    }

    const handleLike = async () => {
        if (!userInfo || !userInfo.id) {
            message.warning('请先登录')
            return
        }

        setLoading(true)
        try {
            const res = await req.post('http://localhost:3001/api/like', {
                articleId,
                userId: userInfo.id
            })
            setIsLiked(res.liked)
            setLikeCount(prev => res.liked ? prev + 1 : prev - 1)
            message.success(res.liked ? '点赞成功' : '取消点赞')
        } catch (error) {
            message.error('操作失败')
        } finally {
            setLoading(false)
        }
    }

    const handleFavorite = async () => {
        if (!userInfo || !userInfo.id) {
            message.warning('请先登录')
            return
        }

        setLoading(true)
        try {
            const res = await req.post('http://localhost:3001/api/favorite', {
                articleId,
                userId: userInfo.id
            })
            setIsFavorited(res.favorited)
            setFavoriteCount(prev => res.favorited ? prev + 1 : prev - 1)
            message.success(res.favorited ? '收藏成功' : '取消收藏')
        } catch (error) {
            message.error('操作失败')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="like-favorite-buttons">
            <Tooltip title={isLiked ? '取消点赞' : '点赞'}>
                <Button
                    type={isLiked ? 'primary' : 'default'}
                    icon={isLiked ? <LikeFilled /> : <LikeOutlined />}
                    onClick={handleLike}
                    loading={loading}
                >
                    {likeCount} 赞
                </Button>
            </Tooltip>
            <Tooltip title={isFavorited ? '取消收藏' : '收藏'}>
                <Button
                    type={isFavorited ? 'primary' : 'default'}
                    icon={isFavorited ? <StarFilled /> : <StarOutlined />}
                    onClick={handleFavorite}
                    loading={loading}
                    style={{ marginLeft: 12 }}
                >
                    {favoriteCount} 收藏
                </Button>
            </Tooltip>
        </div>
    )
}

export default LikeFavoriteButtons
