import { Upload, message, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { req } from '@/utils'; // 假设 req 是一个封装的请求方法
import { useRef, useState } from 'react';
import CryptoJS from 'crypto-js';
const VideoUploader = ({ onUploadSuccess, onUploadError }) => {
    const CHUNK_SIZE = 1024 * 1024 * 2; // 每个分片大小为 1MB
    const [videoList, setVideoList] = useState([]);
    const [uploading, setUploading] = useState(false); // 是否正在上传
    const [paused, setPaused] = useState(false); // 是否暂停
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0); // 当前上传分片索引
    const videoFile = useRef(null); // 保存正在上传的视频文件
    const uploadedChunks = useRef([]); // 保存已经上传的分片索引
    // const [uploadedChunks, setUploadedChunks] = useState([]);  // 初始化为空数组
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];// 限制上传的文件类型
    // 计算文件哈希值
    const calculateFileHash = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const chunkSize = 1024 * 1024 * 2; // 5MB
            const chunks = Math.ceil(file.size / chunkSize);
            let currentChunk = 0;
            const hash = CryptoJS.algo.SHA256.create();


            reader.onload = (event) => {
                if (event.target.result) {
                    hash.update(CryptoJS.lib.WordArray.create(event.target.result));
                    currentChunk++;
                    if (currentChunk < chunks) {
                        loadNext();
                    } else {
                        const finalHash = hash.finalize().toString(CryptoJS.enc.Hex);
                        resolve(finalHash);
                    }
                }
            };

            reader.onerror = (error) => reject(error);

            const loadNext = () => {
                const start = currentChunk * chunkSize;
                const end = Math.min(file.size, start + chunkSize);
                reader.readAsArrayBuffer(file.slice(start, end));
            };

            loadNext();
        });
    };

    // 切片上传逻辑
    const uploadChunks = async (file) => {
        const fileHash = await calculateFileHash(file); // 计算文件哈希值
        // 向后端查询已上传分片
        const result = await req.post('http://localhost:3001/check-file', { fileHash });
        console.log(result, '有什么');

        if (result.videoUrl) {
            console.log(result.videoUrl);

            console.log('文件已上传，秒传成功');
            // 返回文件 URL
            return;
        }
        // const uploadedChunks = result
        // 获取上传的分片，确保是一个数组
        const uploadedChunks = result.uploadedChunks || [];
        console.log(uploadedChunks, '害人的东西是什么');

        let currentIndex = currentChunkIndex; // 从上次暂停的地方开始
        console.log('已上传分片:', uploadedChunks);
        const chunks = [];
        let currentChunk = 0;

        // 创建分片
        while (currentChunk < file.size) {
            const chunk = file.slice(currentChunk, currentChunk + CHUNK_SIZE);
            chunks.push(chunk);
            currentChunk += CHUNK_SIZE;
        }
        // 过滤掉已上传的分片
        // const chunksToUpload = chunks.filter(chunk => !uploadedChunks.includes(chunk.index));
        const chunksToUpload = chunks.map((chunk, index) => ({ chunk, index }))
            .filter(({ index }) => !uploadedChunks.includes(index));  // 只上传未上传的分片
        // const chunksToUpload = chunks.map((chunk, index) => ({ chunk, index }));
        // 使用 currentIndex 作为上传起始位置
        const chunksToStartFrom = chunksToUpload.filter(({ index }) => index >= currentIndex);
        // 检查 uploadedChunks.current 是否已初始化
        // if (!uploadedChunks.current) {
        //     uploadedChunks.current = [];  // 确保它是一个空数组
        // }
        for (const { index, chunk } of chunksToStartFrom) {
            if (paused) {
                break; // 如果暂停，停止上传
            }
            const formData = new FormData();
            formData.append('file', chunk);
            formData.append('filename', file.name);
            formData.append('chunkIndex', index);
            formData.append('totalChunks', chunks.length);
            formData.append('fileHash', fileHash);
            // for (let [key, value] of formData.entries()) {
            //     console.log(key, value);
            // }

            try {
                await req.post('http://localhost:3001/upload-chunk-video', formData);
                console.log(formData);
                console.log(index, 'index是什么东西');

                // uploadedChunks.current.push(index); // 更新已上传分片索引
                uploadedChunks.push(index)
                setCurrentChunkIndex(index + 1); // 更新当前上传分片索引
                if (index === chunksToUpload.length - 1) {
                    message.success(${file.name} ,上传成功);
                    onUploadSuccess();
                }

                console.log(分片 ${index + 1} 上传成功);
            } catch (error) {
                console.error(分片 ${index + 1} 上传失败, error);
                onUploadError(error);
                throw error; // 停止后续分片上传
            }
        }
        console.log('所有分片上传完成');
        setUploading(false); // 上传结束

        const uploadedChunkUrls = []; // 用于存储合并后的视频 URL

        // for (let i = 0; i < chunks.length; i++) {
        //     const formData = new FormData();
        //     formData.append('file', chunks[i]);
        //     formData.append('filename', file.name);
        //     formData.append('chunkIndex', i);
        //     formData.append('totalChunks', chunks.length);

        //     try {
        //         // 上传分片
        //         const response = await req.post('http://localhost:3001/upload-chunk-video', formData, {
        //             onUploadProgress: (progressEvent) => {
        //                 const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        //                 console.log(视频分片 ${i + 1} 上传进度: ${progress}%);
        //             },
        //         });

        //         console.log(分片 ${i + 1} 响应:, response);

        //         if (response.videoUrl) {
        //             // 如果后端返回 videoUrl，说明合并已完成
        //             uploadedChunkUrls.push(response.videoUrl);
        //             console.log('合并后的视频 URL:', response.videoUrl);

        //             // 最后一个分片上传完成时触发回调
        //             if (i === chunks.length - 1) {
        //                 onUploadSuccess(response.videoUrl);
        //             }
        //         } else {
        //             console.log(分片 ${i + 1} 上传成功，但未合并);
        //         }
        //     } catch (error) {
        //         console.error(分片 ${i + 1} 上传失败, error);
        //         message.error(分片 ${i + 1} 上传失败);
        //         onUploadError(error);
        //         throw error; // 停止后续分片上传
        //     }
        // }

        // if (uploadedChunkUrls.length > 0) {
        //     message.success(${file.name} 视频上传成功！);
        //     setVideoList(uploadedChunkUrls);
        // } else {
        //     message.error('所有分片上传成功，但视频合并失败');
        // }
    };

    // 处理文件上传前逻辑
    const beforeUpload = async (file) => {
        videoFile.current = file;
        try {
            const isAllowedType = allowedVideoTypes.includes(file.type);  // 校验是否是允许的视频类型
            if (!isAllowedType) {
                message.error('只能上传视频文件!');
                return false;  // 阻止上传
            }
            setUploading(true);
            await uploadChunks(file);
        } catch (error) {
            console.error('上传失败:', error);
        }
        return false; // 阻止默认上传
    };
    // 暂停上传
    const handlePause = () => {
        setPaused(true);
        setUploading(false);
    };
    // 继续上传
    const handleResume = () => {
        setPaused(false);
        setUploading(true);
        uploadChunks(videoFile.current); // 从暂停位置继续上传
    };

    // 文件上传状态变化处理
    const onUploadChange = (info) => {
        // 更新上传列表
        setVideoList(info.fileList);

        // 处理状态
        if (info.file.status === 'done') {
            message.success(${info.file.name} 上传成功);
        } else if (info.file.status === 'error') {
            message.error(${info.file.name} 上传失败);
        }
    };

    return (
        <div>
            <Upload
                name="video"
                beforeUpload={beforeUpload}
                onChange={onUploadChange}
                showUploadList={true}
                listType="picture-card"
                action={null}
            >
                <div style={{ marginTop: 8 }}>
                    <UploadOutlined />
                    <div>上传视频</div>
                </div>
            </Upload>

            {uploading && (
                <Button onClick={handlePause} disabled={paused}>
                    暂停上传
                </Button>
            )}
            {paused && (
                <Button onClick={handleResume} disabled={!paused}>
                    继续上传
                </Button>
            )}
        </div>

    );
};

export default VideoUploader;