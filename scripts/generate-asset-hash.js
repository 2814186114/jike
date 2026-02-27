const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 需要计算哈希的静态资源（public目录下的文件）
const PUBLIC_ASSETS = [
    'public/index.html',
    'public/manifest.json',
    'public/favicon.ico',
    'public/logo192.png',
    'public/logo512.png',
    'public/logo.webp',
    'public/robots.txt'
];

// 计算单个文件的MD5哈希（取前8位）
function calculateFileHash(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ 文件不存在: ${filePath}`);
            return 'missing';
        }
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    } catch (error) {
        console.warn(`⚠️ 无法读取文件 ${filePath}:`, error.message);
        return 'error';
    }
}

// 提取Webpack构建哈希（从asset-manifest.json）
function extractWebpackHash() {
    try {
        const manifestPath = path.join(__dirname, '../build/asset-manifest.json');
        if (!fs.existsSync(manifestPath)) {
            console.warn('⚠️ asset-manifest.json 不存在，可能尚未构建');
            return null;
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const hashValues = [];

        // 从所有入口文件路径中提取哈希
        if (manifest.files) {
            Object.values(manifest.files).forEach(filePath => {
                // 匹配模式: .哈希值.js 或 .哈希值.css
                const hashMatch = filePath.match(/\.([a-f0-9]{8,})\.(js|css|js\.map|css\.map)$/);
                if (hashMatch) {
                    hashValues.push(hashMatch[1]);
                }
            });
        }

        // 如果有入口点数组，也处理
        if (manifest.entrypoints && Array.isArray(manifest.entrypoints)) {
            manifest.entrypoints.forEach(filePath => {
                const hashMatch = filePath.match(/\.([a-f0-9]{8,})\.(js|css)$/);
                if (hashMatch) {
                    hashValues.push(hashMatch[1]);
                }
            });
        }

        if (hashValues.length === 0) {
            console.warn('⚠️ 未从asset-manifest.json中提取到哈希值');
            return null;
        }

        // 对哈希值排序以确保一致性，然后生成组合哈希
        const combinedHash = crypto.createHash('md5')
            .update(hashValues.sort().join(''))
            .digest('hex')
            .substring(0, 12);

        console.log(`📦 提取到Webpack构建哈希: ${combinedHash} (来自 ${hashValues.length} 个文件)`);
        return combinedHash;
    } catch (error) {
        console.warn('⚠️ 提取Webpack哈希失败:', error.message);
        return null;
    }
}

// 计算public目录下静态资源的哈希
function calculatePublicAssetsHash() {
    const hashes = PUBLIC_ASSETS.map(filePath => {
        if (fs.existsSync(filePath)) {
            return calculateFileHash(filePath);
        }
        return 'missing';
    });

    // 将所有哈希连接起来，生成一个总哈希
    const combinedHash = crypto.createHash('md5')
        .update(hashes.join(''))
        .digest('hex')
        .substring(0, 12);

    console.log(`📁 计算public资源哈希: ${combinedHash} (来自 ${PUBLIC_ASSETS.length} 个文件)`);
    return combinedHash;
}

// 生成最终资源哈希
function generateAssetHash() {
    const webpackHash = extractWebpackHash();
    const publicHash = calculatePublicAssetsHash();

    // 如果webpack哈希不存在，只使用public哈希
    if (!webpackHash) {
        console.log('ℹ️ 未找到Webpack哈希，仅使用public资源哈希');
        return publicHash;
    }

    // 合并两个哈希，生成最终哈希
    const finalHash = crypto.createHash('md5')
        .update(webpackHash + publicHash)
        .digest('hex')
        .substring(0, 16);

    console.log(`🎯 生成最终资源哈希: ${finalHash} (Webpack: ${webpackHash}, Public: ${publicHash})`);
    return finalHash;
}

// 更新Service Worker文件，注入哈希值
function updateServiceWorker(hash) {
    const swPath = path.join(__dirname, '../public/sw.js');

    if (!fs.existsSync(swPath)) {
        console.error('❌ Service Worker文件不存在:', swPath);
        return false;
    }

    let swContent = fs.readFileSync(swPath, 'utf8');

    // 替换占位符或现有的哈希定义
    // 先尝试替换占位符格式
    if (swContent.includes('{{ASSET_HASH}}')) {
        swContent = swContent.replace(/{{ASSET_HASH}}/g, hash);
    }
    // 否则替换现有的 BUILD_TIMESTAMP 或 WEBPACK_HASH
    else if (swContent.includes('const BUILD_TIMESTAMP')) {
        swContent = swContent.replace(
            /const BUILD_TIMESTAMP = '[^']*'/,
            `const ASSET_HASH = '${hash}'`
        );
        // 同时更新缓存名称引用
        swContent = swContent.replace(/BUILD_TIMESTAMP/g, 'ASSET_HASH');
    }
    else if (swContent.includes('const WEBPACK_HASH')) {
        swContent = swContent.replace(
            /const WEBPACK_HASH = '[^']*'/,
            `const ASSET_HASH = '${hash}'`
        );
        // 同时更新缓存名称引用
        swContent = swContent.replace(/WEBPACK_HASH/g, 'ASSET_HASH');
    }
    else if (swContent.includes('const ASSET_HASH')) {
        swContent = swContent.replace(
            /const ASSET_HASH = '[^']*'/,
            `const ASSET_HASH = '${hash}'`
        );
    }
    else {
        // 如果没有找到任何哈希定义，在文件开头添加
        swContent = `// Service Worker for 极客园学习平台 - 资源哈希版本控制
// 基于静态资源内容生成的哈希值，只有内容变化时才会更新缓存
const ASSET_HASH = '${hash}';\n\n` +
            swContent.replace('// Service Worker for 极客园学习平台', '');
    }

    fs.writeFileSync(swPath, swContent, 'utf8');
    console.log(`✅ Service Worker已更新，注入资源哈希: ${hash}`);
    return true;
}

// 主函数
function main() {
    console.log('🚀 开始生成资源哈希...');

    // 检查build目录是否存在，如果不存在，可能是首次构建
    const buildDir = path.join(__dirname, '../build');
    if (!fs.existsSync(buildDir)) {
        console.log('ℹ️ build目录不存在，可能是首次构建或尚未构建');
        console.log('ℹ️ 将仅使用public目录下的静态资源计算哈希');
    }

    const assetHash = generateAssetHash();

    if (!assetHash) {
        console.error('❌ 生成资源哈希失败');
        process.exit(1);
    }

    const success = updateServiceWorker(assetHash);

    if (success) {
        console.log('🎉 资源哈希生成并注入完成！');

        // 将哈希写入环境文件，供其他脚本使用
        const envContent = `REACT_APP_ASSET_HASH=${assetHash}`;
        fs.writeFileSync('.env.asset-hash', envContent);
        console.log(`📝 哈希已保存到 .env.asset-hash: ${assetHash}`);
    } else {
        console.error('❌ 更新Service Worker失败');
        process.exit(1);
    }

    return assetHash;
}

// 执行
if (require.main === module) {
    main();
}

module.exports = { generateAssetHash, updateServiceWorker };
