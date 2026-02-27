const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path')
// const PreloadWebpackPlugin = require('preload-webpack-plugin');

// const HtmlWebpackPlugin = require('html-webpack-plugin');
const { whenProd, getPlugin, pluginByName } = require('@craco/craco')
const TerserPlugin = require('terser-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer');
const { Plugin } = require('@baiducloud/qianfan');
const { InjectManifest } = require('workbox-webpack-plugin');



module.exports = {
    // webpack 配置
    webpack: {
        // 配置别名
        alias: {
            // 约定：使用 @ 表示 src 文件所在路径
            '@': path.resolve(__dirname, 'src')
        },
        // 开发服务器配置
        devServer: {
            proxy: {
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                    secure: false,
                    logLevel: 'debug'
                },
                '/image-uploads': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                    secure: false
                },
                '/video-storage': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                    secure: false
                }
            }
        },
        //配置预加载功能
        //帮助你自动生成 HTML 文件，并且自动将构建后的 JavaScript 和 CSS 文件（包括哈希值）注入到该 HTML 文件中，简化了手动引入静态资源的过程
        // plugins: [
        //     new HtmlWebpackPlugin({
        //         template: './public/index.html',
        //         scriptLoading: 'defer', // 这会使所有脚本异步加载
        //         preload: true, // 使用 preload 功能
        //         prefetch: true, // 使用 prefetch 功能
        //     }),
        // ],
        //完全禁用代码分割，解决ChunkLoadError问题
        optimization: {
            splitChunks: false, // 完全禁用代码分割
            runtimeChunk: false, // 禁用运行时chunk
            minimize: true,
            minimizer: [new TerserPlugin()]
        },
        plugins: [
            // 暂时禁用BundleAnalyzerPlugin和Service Worker插件
            // new BundleAnalyzerPlugin.BundleAnalyzerPlugin(),
            // 暂时禁用Workbox插件，使用版本控制方案
            // new InjectManifest({
            //     swSrc: './public/sw.js',
            //     swDest: 'sw.js',
            //     exclude: [/\.map$/, /asset-manifest\.json$/],
            // })
        ],
        // 配置CDN
        configure: (webpackConfig) => {
            // 添加图片压缩规则
            // webpackConfig.module.rules.push({
            //     test: /\.(png|jpe?g|gif|svg)$/i,
            //     use: [
            //         {
            //             loader: 'file-loader',
            //             options: {
            //                 name: '[name].[hash].[ext]',
            //                 // publicPath: '/assets/',
            //                 outputPath: "img"
            //             },
            //         },
            //         {
            //             loader: 'image-webpack-loader',
            //             options: {
            //                 mozjpeg: {
            //                     progressive: true,
            //                     quality: 70,
            //                 },
            //                 pngquant: {
            //                     quality: [0.7, 0.8],
            //                     speed: 4,
            //                 },
            //                 gifsicle: {
            //                     interlaced: false,
            //                 },
            //                 webp: {
            //                     quality: 70,
            //                 },
            //             },
            //         },

            //     ],
            // });


            let cdn = {
                js: []
            }
            // 注释掉CDN配置，避免React未定义错误
            // whenProd(() => {
            //     // key: 不参与打包的包(由dependencies依赖项中的key决定)
            //     // value: cdn文件中 挂载于全局的变量名称 为了替换之前在开发环境下
            //     webpackConfig.externals = {
            //         react: 'React',
            //         'react-dom': 'ReactDOM'
            //     }
            //     // 配置现成的cdn资源地址
            //     // 实际开发的时候 用公司自己花钱买的cdn服务器
            //     cdn = {
            //         js: [
            //             'https://cdnjs.cloudflare.com/ajax/libs/react/18.1.0/umd/react.production.min.js',
            //             'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.1.0/umd/react-dom.production.min.js',
            //         ]
            //     }
            // })

            // 通过 htmlWebpackPlugin插件 在public/index.html注入cdn资源url
            const { isFound, match } = getPlugin(
                webpackConfig,
                pluginByName('HtmlWebpackPlugin')
            )

            if (isFound) {
                // 找到了HtmlWebpackPlugin的插件
                // match.userOptions.files = cdn
                match.userOptions.files = match.userOptions.files || {}; // 确保 files 存在
                match.userOptions.files.js = cdn.js || []; // 确保 js 是一个数组
            }

            return webpackConfig
        }
    }
}


// module.exports = {
//     webpack: {
//         plugins: [
//             new HtmlWebpackPlugin({
//                 template: './public/index.html',
//                 scriptLoading: 'defer', // 这会使所有脚本异步加载
//                 preload: true, // 使用 preload 功能
//                 prefetch: true, // 使用 prefetch 功能
//             }),
//         ],
//         optimization: {
//             splitChunks: {
//                 chunks: 'all', // 分割代码
//             },
//         },
//     },
// };
