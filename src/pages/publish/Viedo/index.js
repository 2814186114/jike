import { Upload, message, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { req } from '@/utils';
import { useRef, useState } from 'react';
import CryptoJS from 'crypto-js';

const VideoUploader = ({ onUploadSuccess, onUploadError }) => {
    const CHUNK_SIZE = 1024 * 1024 * 2; // 每个分片大小为 2MB
    const [videoList, setVideoList] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [paused, setPaused] = useState(false);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const videoFile = useRef(null);
    const uploadedChunks = useRef([]);
    const workerRef = useRef(null);
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

    const calculateFileHash = (file) => {
        return new Promise((resolve, reject) => {
            // const worker = new Worker('./fileHashWorker.js'); // 创建新的 Web Worker
            const worker = new Worker(new URL('./fileHashWorker.js', import.meta.url));
            worker.onmessage = (event) => {
                const { hash, error } = event.data;
                if (error) {
                    reject(error);
                } else {
                    resolve(hash); // 返回最终的文件哈希
                }
            };

            worker.onerror = (error) => {
                reject('Worker error: ' + error.message);
            };

            worker.postMessage({ file }); // 将文件传递给 Worker
        });

        // return new Promise((resolve, reject) => {
        //     console.time("fileHashCalculation"); // 开始计时
        //     const reader = new FileReader();
        //     const chunkSize = 1024 * 1024 * 2;
        //     const chunks = Math.ceil(file.size / chunkSize);
        //     let currentChunk = 0;
        //     const hash = CryptoJS.algo.SHA256.create();

        //     reader.onload = (event) => {
        //         if (event.target.result) {
        //             hash.update(CryptoJS.lib.WordArray.create(event.target.result));
        //             currentChunk++;
        //             if (currentChunk < chunks) {
        //                 loadNext();
        //             } else {
        //                 const finalHash = hash.finalize().toString(CryptoJS.enc.Hex);
        //                 console.timeEnd("fileHashCalculation"); // 结束计时
        //                 resolve(finalHash);
        //             }
        //         }
        //     };

        //     reader.onerror = (error) => reject(error);

        //     const loadNext = () => {
        //         const start = currentChunk * chunkSize;
        //         const end = Math.min(file.size, start + chunkSize);
        //         reader.readAsArrayBuffer(file.slice(start, end));
        //     };

        //     loadNext();
        // });
    };

    const handleWorkerMessage = (e) => {
        const results = e.data;
        console.log(results, 'worker传的数据');

        let success = true;
        results.forEach(({ success: chunkSuccess, index, error }) => {
            if (chunkSuccess) {
                uploadedChunks.current.push(index);
            } else {
                success = false;
                console.error(`分片 ${index} 上传失败:`, error);
            }
        });

        if (success) {
            message.success('文件上传成功');
            onUploadSuccess();
        } else {
            message.error('文件上传失败');
            onUploadError();
        }

        setUploading(false);
    };

    const uploadChunks = async (file) => {
        const fileHash = await calculateFileHash(file);
        console.log(fileHash, '哈希值');

        const result = await req.post('http://localhost:3001/check-file', { fileHash });

        if (result.videoUrl) {
            message.success('文件已上传，秒传成功');
            return;
        }

        const uploadedChunks = result.uploadedChunks || [];
        // const worker = new Worker('./worker.js'); // 创建 Worker 实例
        const worker = new Worker(new URL('./worker.js', import.meta.url));

        workerRef.current = worker;
        worker.onmessage = handleWorkerMessage;
        // 设置并发上传的限制
        const MAX_CONCURRENCY = 4;

        worker.postMessage({
            file,
            chunkSize: CHUNK_SIZE,
            uploadedChunks,
            fileHash,
            currentIndex: currentChunkIndex,
            maxConcurrency: MAX_CONCURRENCY, // 最大并发数
        });
        console.log(uploadedChunks, '已上传分片');


        setUploading(true);
    };

    const beforeUpload = async (file) => {
        videoFile.current = file;
        try {
            const isAllowedType = allowedVideoTypes.includes(file.type);
            if (!isAllowedType) {
                message.error('只能上传视频文件!');
                return false;
            }
            await uploadChunks(file);
        } catch (error) {
            console.error('上传失败:', error);
        }
        return false;
    };

    const handlePause = () => {
        setPaused(true);
        setUploading(false);
        if (workerRef.current) {
            // workerRef.current.terminate(); // 暂停 Worker
        }
    };

    const handleResume = () => {
        setPaused(false);
        setUploading(true);
        uploadChunks(videoFile.current); // 从暂停位置继续上传
    };

    return (
        <div>
            <Upload
                name="video"
                beforeUpload={beforeUpload}
                showUploadList={false}
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






