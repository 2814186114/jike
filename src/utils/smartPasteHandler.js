/**
 * 智能粘贴优化系统
 * 支持图片、代码、链接、表格等内容的智能识别和处理
 */

class SmartPasteHandler {
    constructor(editor, onInsertContent) {
        this.editor = editor;
        this.onInsertContent = onInsertContent;
        this.init();
    }

    init() {
        // 监听编辑器粘贴事件
        this.editor.addEventListener('paste', this.handlePaste.bind(this));
        console.log('智能粘贴系统已初始化');
    }

    /**
     * 处理粘贴事件 - 调试版本
     */
    async handlePaste(event) {
        event.preventDefault();
        const clipboardData = event.clipboardData;

        try {
            // 显示处理状态
            this.showProcessingState();

            // 多维度数据提取
            const data = await this.extractClipboardData(clipboardData);
            console.log('📋 粘贴板数据:', {
                text: data.text ? data.text.substring(0, 100) + '...' : '空',
                html: data.html ? '有HTML内容' : '无HTML内容',
                files: data.files.length > 0 ? `${data.files.length}个文件` : '无文件',
                fileTypes: data.files.map(f => f.type)
            });

            // 智能类型识别
            const contentType = await this.identifyContentType(data);
            console.log('🔍 检测到粘贴内容类型:', contentType);

            // 调试类型识别过程
            await this.debugIdentifyContentType(data);

            // 内容优化处理
            const optimizedContent = await this.optimizeContent(data, contentType);
            console.log('✨ 优化后内容:', optimizedContent);

            // 智能插入
            await this.insertContent(optimizedContent, contentType);

            // 隐藏处理状态
            this.hideProcessingState();

        } catch (error) {
            console.error('❌ 智能粘贴处理失败:', error);
            this.hideProcessingState();
            // 降级处理：使用原始文本
            const text = clipboardData.getData('text/plain');
            console.log('🔄 降级处理，使用原始文本:', text.substring(0, 100) + '...');
            this.insertPlainText(text);
        }
    }

    /**
     * 调试类型识别过程
     */
    async debugIdentifyContentType(data) {
        console.group('🔎 类型识别调试信息');

        // 检查文件类型
        if (data.files.length > 0) {
            console.log('📁 文件检测:');
            data.files.forEach((file, index) => {
                console.log(`  文件${index + 1}:`, {
                    name: file.name,
                    type: file.type,
                    size: file.size
                });
            });
            const fileType = await this.identifyFiles(data.files);
            console.log('📁 文件类型识别结果:', fileType);
        }

        // 检查HTML内容
        if (data.html) {
            console.log('🌐 HTML内容检测:');
            console.log('  HTML长度:', data.html.length);
            console.log('  HTML预览:', data.html.substring(0, 200) + '...');
            const htmlType = await this.identifyHTML(data);
            console.log('🌐 HTML类型识别结果:', htmlType);
        }

        // 检查纯文本
        if (data.text) {
            console.log('📝 纯文本检测:');
            console.log('  文本长度:', data.text.length);
            console.log('  文本预览:', data.text.substring(0, 200) + '...');

            // 测试各种识别方法
            console.log('  URL检测:', this.isValidURL(data.text));
            console.log('  代码特征检测:', this.containsCode(data.text));
            console.log('  代码结构检测:', this.looksLikeCode(data.text));
            console.log('  Markdown检测:', this.containsMarkdown(data.text));

            const textType = await this.identifyText(data.text);
            console.log('📝 文本类型识别结果:', textType);
        }

        console.groupEnd();
    }

    /**
     * 从剪贴板提取数据
     */
    async extractClipboardData(clipboardData) {
        const data = {
            text: clipboardData.getData('text/plain'),
            html: clipboardData.getData('text/html'),
            files: Array.from(clipboardData.files || [])
        };

        // 如果有HTML内容，解析DOM结构
        if (data.html) {
            data.dom = this.parseHTML(data.html);
        }

        return data;
    }

    /**
     * 智能识别内容类型
     */
    async identifyContentType(data) {
        // 优先级：文件 > HTML > 纯文本
        if (data.files.length > 0) {
            return await this.identifyFiles(data.files);
        }

        if (data.html) {
            return await this.identifyHTML(data);
        }

        return await this.identifyText(data.text);
    }

    /**
     * 识别文件类型
     */
    async identifyFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length > 0) return 'image';

        // 可以扩展支持其他文件类型
        return 'file';
    }

    /**
     * 识别HTML内容类型
     */
    async identifyHTML(data) {
        const doc = data.dom;

        // 检测表格
        if (doc.querySelector('table')) return 'table';

        // 检测代码
        if (this.containsCode(data.text)) return 'code';

        // 检测链接
        const links = doc.querySelectorAll('a[href]');
        if (links.length === 1 && links[0].textContent === links[0].href) {
            return 'single-link';
        }

        // 检测富文本
        const hasRichContent = doc.querySelector('div, p, span, strong, em, ul, ol, li');
        if (hasRichContent) return 'rich-text';

        return 'plain-text';
    }

    /**
     * 识别纯文本类型
     */
    async identifyText(text) {
        // URL检测
        if (this.isValidURL(text)) return 'url';

        // 代码检测
        if (this.looksLikeCode(text)) return 'code';

        // Markdown检测
        if (this.containsMarkdown(text)) return 'markdown';

        return 'plain-text';
    }

    /**
     * 内容优化处理
     */
    async optimizeContent(data, type) {
        switch (type) {
            case 'image':
                return await this.optimizeImage(data.files[0]);

            case 'code':
                return await this.optimizeCode(data.text);

            case 'url':
                return await this.optimizeURL(data.text);

            case 'table':
                return await this.optimizeTable(data.html);

            case 'rich-text':
                return await this.optimizeRichText(data.html);

            case 'single-link':
                return await this.optimizeSingleLink(data.dom);

            default:
                return data.text;
        }
    }

    /**
     * 图片优化处理
     */
    async optimizeImage(file) {
        try {
            // 客户端图片压缩
            const compressedFile = await this.compressImage(file);

            // 上传到服务器
            const imageData = await this.uploadImage(compressedFile);

            return `![${file.name}](${imageData})`;
        } catch (error) {
            console.error('图片处理失败:', error);
            throw new Error('图片上传失败');
        }
    }

    /**
     * 代码优化处理
     */
    async optimizeCode(text) {
        // 自动检测编程语言
        const language = await this.detectProgrammingLanguage(text);

        // 清理和格式化代码
        const formattedCode = this.formatCode(text);

        return `\`\`\`${language}\n${formattedCode}\n\`\`\``;
    }

    /**
     * URL优化处理
     */
    async optimizeURL(url) {
        try {
            // 获取链接预览信息
            const preview = await this.fetchURLPreview(url);

            if (preview) {
                return this.generateLinkCard(preview);
            }
        } catch (error) {
            console.warn('无法获取链接预览:', error);
        }

        // 降级处理：普通链接
        return `[${url}](${url})`;
    }

    /**
     * 表格优化处理
     */
    async optimizeTable(html) {
        // HTML表格转Markdown表格
        return await this.htmlTableToMarkdown(html);
    }

    /**
     * 富文本优化处理
     */
    async optimizeRichText(html) {
        // HTML转Markdown，保留重要格式
        return await this.htmlToMarkdown(html);
    }

    /**
     * 单链接优化处理
     */
    async optimizeSingleLink(doc) {
        const link = doc.querySelector('a[href]');
        const url = link.href;
        const text = link.textContent || url;

        return `[${text}](${url})`;
    }

    /**
     * 智能插入内容 - 修复光标位置版本
     */
    async insertContent(content, type) {
        console.log('📝 插入内容，类型:', type, '内容长度:', content.length);

        if (this.onInsertContent) {
            // 使用回调方式插入，让React组件处理状态更新
            await this.onInsertContent(content, type);
        } else {
            // 直接插入到编辑器
            this.insertAtCursorPosition(content);
        }
    }

    /**
     * 在光标位置插入文本
     */
    insertAtCursorPosition(text) {
        if (!this.editor) {
            console.error('编辑器引用为空，无法插入内容');
            return;
        }

        try {
            // 获取当前光标位置
            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const currentValue = this.editor.value || '';

            console.log('📍 当前光标位置:', { start, end, valueLength: currentValue.length });

            // 在光标位置插入内容
            const newValue =
                currentValue.substring(0, start) +
                text +
                currentValue.substring(end);

            // 更新编辑器值
            this.editor.value = newValue;

            // 设置新的光标位置（在插入的内容之后）
            const newCursorPos = start + text.length;
            this.editor.setSelectionRange(newCursorPos, newCursorPos);

            // 触发输入事件，确保React状态同步
            this.triggerInputEvent();

            console.log('✅ 内容插入成功，新光标位置:', newCursorPos);

        } catch (error) {
            console.error('❌ 插入内容失败:', error);
            // 降级处理：简单追加
            this.insertPlainText(text);
        }
    }

    /**
     * 触发输入事件
     */
    triggerInputEvent() {
        const event = new Event('input', { bubbles: true });
        this.editor.dispatchEvent(event);

        // 同时触发change事件，确保所有监听器都能收到
        const changeEvent = new Event('change', { bubbles: true });
        this.editor.dispatchEvent(changeEvent);
    }

    /**
     * 插入纯文本 - 降级处理
     */
    insertPlainText(text) {
        console.log('🔄 使用降级插入方式');
        if (this.editor && this.editor.value !== undefined) {
            const currentValue = this.editor.value || '';
            const newValue = currentValue + '\n' + text + '\n';
            this.editor.value = newValue;

            // 设置光标到末尾
            const newCursorPos = newValue.length;
            this.editor.setSelectionRange(newCursorPos, newCursorPos);

            this.triggerInputEvent();
        }
    }

    /**
     * 显示处理状态
     */
    showProcessingState() {
        // 可以在这里显示加载状态
        console.log('正在处理粘贴内容...');
    }

    /**
     * 隐藏处理状态
     */
    hideProcessingState() {
        // 隐藏加载状态
        console.log('粘贴内容处理完成');
    }

    // ===== 工具方法 =====

    /**
     * 解析HTML字符串为DOM
     */
    parseHTML(html) {
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }

    /**
     * 检测是否为有效URL
     */
    isValidURL(text) {
        try {
            const url = new URL(text);
            return ['http:', 'https:'].includes(url.protocol);
        } catch {
            return false;
        }
    }

    /**
     * 检测是否包含代码特征 - 简化版
     */
    containsCode(text) {
        const codeIndicators = [
            'function', 'const ', 'let ', 'var ', 'if (', 'for (', 'while (',
            'class ', 'import ', 'export ', 'return ', 'console.log',
            'def ', 'print(', '<?php', '<script', 'public ', 'void ',
            'document.', 'window.', 'require(', '=>', 'async ', 'await ',
            'React.', 'Vue.', 'this.', 'new ', 'try {', 'catch ('
        ];

        // 计算代码指示器的出现次数
        const matches = codeIndicators.filter(indicator =>
            text.toLowerCase().includes(indicator.toLowerCase())
        );

        // 如果匹配到多个代码特征，则认为是代码
        return matches.length >= 2;
    }

    /**
     * 检测文本是否像代码 - 简化版
     */
    looksLikeCode(text) {
        // 检查代码特征：缩进、分号、花括号等
        const codePatterns = [
            /^\s*(function|class|def|var|let|const)\s+/m,
            /;\s*$/m,
            /{\s*$/m,
            /}\s*$/m,
            /^\s*(if|for|while|switch)\s*\(/m,
            /^\s*import\s+/m,
            /^\s*export\s+/m,
            /^\s*\/\/\s+/m,      // 注释
            /^\s*#\s+/m,         // Python/Ruby注释
            /=>\s*{/m,           // 箭头函数
            /\.then\(/m,         // Promise then
            /\.catch\(/m,        // Promise catch
            /\.map\(/m,          // 数组map
            /this\./m,           // this引用
            /new\s+[A-Z]/m       // 实例化类
        ];

        // 计算代码模式匹配次数
        const patternMatches = codePatterns.filter(pattern => pattern.test(text)).length;

        // 检查代码特有的结构特征
        const hasCodeStructure = (
            (text.match(/[{}]/g) || []).length >= 2 ||  // 至少有2个花括号
            (text.match(/[()]/g) || []).length >= 4 ||  // 至少有4个括号
            (text.match(/;/g) || []).length >= 2        // 至少有2个分号
        );

        // 检查缩进模式（代码通常有规律的缩进）
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const indentedLines = lines.filter(line => line.startsWith('    ') || line.startsWith('\t'));
        const hasConsistentIndentation = indentedLines.length >= Math.max(2, lines.length * 0.3); // 至少2行或30%的行有缩进

        return patternMatches >= 2 || hasCodeStructure || hasConsistentIndentation;
    }

    /**
     * 检测是否包含Markdown语法
     */
    containsMarkdown(text) {
        const markdownPatterns = [
            /^#+\s+/m,        // 标题
            /\*\*.+?\*\*/g,   // 粗体
            /\*.+?\*/g,       // 斜体
            /!\[.*?\]\(.*?\)/g, // 图片
            /\[.*?\]\(.*?\)/g,  // 链接
            /^\s*[-*+]\s+/m,  // 列表
            /^\s*\d+\.\s+/m,  // 有序列表
            /^```/m,          // 代码块
            /^>\s+/m          // 引用
        ];

        return markdownPatterns.some(pattern => pattern.test(text));
    }

    /**
     * 检测编程语言
     */
    async detectProgrammingLanguage(code) {
        const languagePatterns = {
            javascript: /(function|const|let|var|=>|console\.log)/,
            python: /(def |import |from |print\(|# )/,
            java: /(public |private |class |void |System\.out\.println)/,
            php: /(<\?php|\$[a-zA-Z_]|echo |function )/,
            html: /(<html|<head|<body|<div|class=)/,
            css: /(\.|#|[a-zA-Z-]+:\s*[^;]+;)/,
            sql: /(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/,
            bash: /(#!\/bin\/bash|echo |cd |ls |mkdir )/
        };

        for (const [lang, pattern] of Object.entries(languagePatterns)) {
            if (pattern.test(code)) {
                return lang;
            }
        }

        return 'text'; // 默认文本
    }

    /**
     * 格式化代码
     */
    formatCode(code) {
        // 简单的代码清理
        return code
            .replace(/\r\n/g, '\n')  // 统一换行符
            .replace(/\t/g, '  ')    // 制表符转空格
            .trim();                 // 去除首尾空白
    }

    /**
     * 图片压缩
     */
    async compressImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // 计算压缩尺寸
                    let { width, height } = img;
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // 绘制压缩图片
                    ctx.drawImage(img, 0, 0, width, height);

                    // 转换为Blob
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                }));
                            } else {
                                reject(new Error('图片压缩失败'));
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * 上传图片
     */
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`上传失败: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.imageData) {
                return result.imageData; // 返回Base64数据
            } else {
                throw new Error('图片上传接口返回数据格式错误');
            }
        } catch (error) {
            console.error('图片上传失败:', error);
            throw error;
        }
    }

    /**
     * 获取URL预览信息
     */
    async fetchURLPreview(url) {
        // 这里可以调用后端服务获取链接预览
        // 目前返回模拟数据
        return {
            title: '链接预览',
            description: '这是一个链接预览',
            image: null,
            url: url
        };
    }

    /**
     * 生成链接卡片
     */
    generateLinkCard(preview) {
        return `
[${preview.title}](${preview.url})

${preview.description || ''}
    `.trim();
    }

    /**
     * HTML表格转Markdown
     */
    async htmlTableToMarkdown(html) {
        const doc = this.parseHTML(html);
        const table = doc.querySelector('table');
        if (!table) return html;

        let markdown = '';
        const rows = table.querySelectorAll('tr');

        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td, th');
            let rowText = '|';

            cells.forEach(cell => {
                const text = cell.textContent.trim();
                rowText += ` ${text} |`;
            });

            markdown += rowText + '\n';

            // 添加表头分隔线
            if (rowIndex === 0) {
                markdown += '|' + cells.map(() => ' --- |').join('') + '\n';
            }
        });

        return markdown.trim();
    }

    /**
     * HTML转Markdown
     */
    async htmlToMarkdown(html) {
        const doc = this.parseHTML(html);

        // 简单的HTML转Markdown
        let markdown = doc.body.textContent || '';

        // 保留段落和换行
        markdown = markdown.replace(/\n\s*\n/g, '\n\n');

        return markdown.trim();
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.editor.removeEventListener('paste', this.handlePaste);
    }
}

export default SmartPasteHandler;
