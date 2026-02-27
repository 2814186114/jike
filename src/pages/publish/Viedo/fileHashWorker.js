// Web Worker: 计算文件哈希
/* eslint-disable no-restricted-globals */
import CryptoJS from 'crypto-js';

// 你的代码...

self.onmessage = (event) => {
    const file = event.data.file; // 从主线程接收文件
    const chunkSize = 1024 * 1024 * 2; // 每个分片 2MB
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    const hash = CryptoJS.algo.SHA256.create();

    const reader = new FileReader();

    reader.onload = (e) => {
        if (e.target.result) {
            hash.update(CryptoJS.lib.WordArray.create(e.target.result));
            currentChunk++;
            if (currentChunk < chunks) {
                loadNext();
            } else {
                const finalHash = hash.finalize().toString(CryptoJS.enc.Hex);
                console.log(finalHash);

                self.postMessage({ hash: finalHash }); // 将哈希结果发送回主线程


            }
        }
    };

    reader.onerror = (error) => {
        self.postMessage({ error: 'Error reading file' });
    };

    const loadNext = () => {
        const start = currentChunk * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        reader.readAsArrayBuffer(file.slice(start, end));
    };

    loadNext();
};
/* eslint-disable no-restricted-globals */
