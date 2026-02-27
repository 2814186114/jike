/* eslint-disable no-restricted-globals */
// self.onmessage = async function (e) {
//     // console.log(e);
//     // if (!e.data || !e.data.file) {
//     //     console.error('数据格式有误或未接收到文件');
//     //     return;
//     // }

//     const { file, chunkSize, uploadedChunks, fileHash, currentIndex } = e.data;
//     console.log(uploadedChunks);

//     const chunks = [];
//     let currentChunk = 0;

//     while (currentChunk < file.size) {
//         const chunk = file.slice(currentChunk, currentChunk + chunkSize);
//         chunks.push(chunk);
//         currentChunk += chunkSize;
//     }

//     const chunksToUpload = chunks.map((chunk, index) => ({ chunk, index }))
//         .filter(({ index }) => !uploadedChunks.includes(index));

//     const chunksToStartFrom = chunksToUpload.filter(({ index }) => index >= currentIndex);

//     const results = [];

//     for (const { index, chunk } of chunksToStartFrom) {
//         const formData = new FormData();
//         formData.append('file', chunk);
//         formData.append('filename', file.name);
//         formData.append('chunkIndex', index);
//         formData.append('totalChunks', chunks.length);
//         formData.append('fileHash', fileHash);
//         console.log('Sending request to backend...');
//         console.log('FormData content:', formData);
//         // results = [1, 2, 3, 4, 5]


//         try {
//             const response = await fetch('http://localhost:3001/upload-chunk-video', {
//                 method: 'POST',
//                 body: formData,
//             });

//             if (!response.ok) throw new Error('上传失败');
//             // return { success: true, index };
//             results.push({ success: true, index });
//         } catch (error) {
//             // return { success: false, index, error: error.message };
//             results.push({ success: false, index, error });
//         }
//     }
//     //并发控制函数：
//     const parallelUpload = async (tasks, maxConcurrency) => {
//         const results = []


//     }


//     self.postMessage(results); // 返回上传结果
// };

self.onmessage = async function (e) {
    const { file, chunkSize, uploadedChunks, fileHash, maxConcurrency = 5 } = e.data;

    // 切分文件成分片
    const chunks = [];
    let currentChunk = 0;
    while (currentChunk < file.size) {
        const chunk = file.slice(currentChunk, currentChunk + chunkSize);
        chunks.push(chunk);
        currentChunk += chunkSize;
    }

    const chunksToUpload = chunks
        .map((chunk, index) => ({ chunk, index }))
        .filter(({ index }) => !uploadedChunks.includes(index));

    // 上传单个分片的函数
    const uploadChunk = async ({ chunk, index }) => {
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('filename', file.name);
        formData.append('chunkIndex', index);
        formData.append('totalChunks', chunks.length);
        formData.append('fileHash', fileHash);

        try {
            const response = await fetch('http://localhost:3001/upload-chunk-video', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error(`Chunk ${index} upload failed`);
            return { success: true, index };
        } catch (error) {
            return { success: false, index, error: error.message };
        }
    };

    // 并发控制函数
    const parallelUpload = async (tasks, maxConcurrency) => {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task().then((result) => {
                results.push(result);
                executing.splice(executing.indexOf(promise), 1); // 移除已完成任务
            });
            executing.push(promise);

            // 如果当前执行中的任务达到并发限制，等待其中一个完成
            if (executing.length >= maxConcurrency) {
                await Promise.race(executing);
            }
            console.log(executing);

        }

        // 等待所有任务完成
        await Promise.all(executing);
        return results;
    };

    // 创建所有任务
    const tasks = chunksToUpload.map(({ chunk, index }) => () => uploadChunk({ chunk, index }));
    console.log(tasks, 'tasks是什么');

    // 控制并发上传分片
    const results = await parallelUpload(tasks, maxConcurrency);

    // 向主线程返回上传结果
    self.postMessage(results);
};

/* eslint-enable no-restricted-globals */