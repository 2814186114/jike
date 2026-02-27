const mammoth = require('mammoth');
const axios = require('axios');

// 简历诊断服务类
class ResumeDiagnosisService {
    constructor() {
        this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || 'your_deepseek_api_key_here';
        this.baseURL = 'https://api.deepseek.com/v1';
        this.pdfjsLib = null;
    }

    // 动态导入PDF.js
    async getPDFJS() {
        if (!this.pdfjsLib) {
            // 使用动态导入来处理ESM模块
            const pdfjsModule = await import('pdfjs-dist/build/pdf.mjs');
            this.pdfjsLib = pdfjsModule.default;

            // 设置worker
            const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
            this.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
        }
        return this.pdfjsLib;
    }

    // 解析PDF文件
    async parsePDF(fileBuffer) {
        try {
            const pdfjsLib = await this.getPDFJS();
            const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + '\n';
            }

            return fullText.trim();
        } catch (error) {
            throw new Error(`PDF解析失败: ${error.message}`);
        }
    }

    // 解析Word文件
    async parseWord(fileBuffer) {
        try {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            return result.value.trim();
        } catch (error) {
            throw new Error(`Word文档解析失败: ${error.message}`);
        }
    }

    // 调用DeepSeek AI分析简历
    async analyzeWithDeepSeek(resumeText, targetPosition = '前端开发') {
        try {
            const prompt = this.buildAnalysisPrompt(resumeText, targetPosition);

            const response = await axios.post(`${this.baseURL}/chat/completions`, {
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的简历优化专家，擅长分析技术岗位简历并提供建设性建议。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            }, {
                headers: {
                    Authorization: `Bearer ${this.deepseekApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return this.parseAIResponse(response.data.choices[0].message.content);
        } catch (error) {
            console.error('DeepSeek API调用失败:', error.response?.data || error.message);
            // 如果AI服务失败，返回模拟数据
            return this.generateMockAnalysis(resumeText, targetPosition);
        }
    }

    // 构建分析提示词
    buildAnalysisPrompt(resumeText, targetPosition) {
        return `请分析以下简历内容，针对"${targetPosition}"岗位进行专业评估：

简历内容：
${resumeText}

请按以下JSON格式返回分析结果：
{
  "overallScore": 85,
  "categoryScores": {
    "contentCompleteness": 80,
    "formatStandard": 90,
    "keywordMatch": 85,
    "experienceRelevance": 75
  },
  "strengths": ["技术栈匹配度高", "项目经验丰富"],
  "weaknesses": ["缺乏量化成果", "技能描述不够具体"],
  "specificSuggestions": [
    {
      "type": "add",
      "position": "工作经验",
      "suggestion": "添加项目成果数据，如'提升了30%的性能'",
      "example": "原：负责性能优化。建议：通过代码重构和缓存策略，将页面加载时间从3秒降低到2秒，提升33%性能"
    },
    {
      "type": "modify", 
      "position": "技能描述",
      "suggestion": "使用更具体的技能关键词",
      "example": "原：熟悉React。建议：精通React Hooks、状态管理、组件化开发，熟悉React性能优化"
    }
  ],
  "keywordAnalysis": {
    "matched": ["React", "JavaScript", "Vue"],
    "missing": ["TypeScript", "Webpack", "单元测试"]
  }
}

请确保返回纯JSON格式，不要包含其他文本。`;
    }

    // 解析AI响应
    parseAIResponse(aiResponse) {
        try {
            // 尝试从响应中提取JSON
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('无法解析AI响应中的JSON');
        } catch (error) {
            console.error('AI响应解析失败:', error);
            return this.generateMockAnalysis();
        }
    }

    // 生成模拟分析结果（备用）
    generateMockAnalysis(resumeText = '', targetPosition = '前端开发') {
        const wordCount = resumeText.split(/\s+/).length;
        const baseScore = Math.min(60 + Math.floor(wordCount / 100), 85);

        return {
            overallScore: baseScore,
            categoryScores: {
                contentCompleteness: baseScore - 5,
                formatStandard: baseScore + 5,
                keywordMatch: baseScore,
                experienceRelevance: baseScore - 10
            },
            strengths: [
                "技术基础扎实",
                "有实际项目经验",
                "学习能力强"
            ],
            weaknesses: [
                "缺乏具体数据支撑",
                "技能描述不够详细",
                "项目成果量化不足"
            ],
            specificSuggestions: [
                {
                    type: "add",
                    position: "项目经验",
                    suggestion: "添加具体的项目成果和数据",
                    example: "例如：通过优化减少了30%的加载时间"
                },
                {
                    type: "modify",
                    position: "技能描述",
                    suggestion: "使用更专业的技术术语",
                    example: "将'会使用'改为'熟练掌握'"
                },
                {
                    type: "add",
                    position: "个人总结",
                    suggestion: "添加职业目标和个人优势",
                    example: "寻求前端开发岗位，专注于React技术栈和性能优化"
                }
            ],
            keywordAnalysis: {
                matched: ["JavaScript", "HTML", "CSS"],
                missing: ["TypeScript", "Webpack", "Jest", "Docker"]
            }
        };
    }

    // 计算简历评分
    calculateResumeScore(analysis) {
        const weights = {
            contentCompleteness: 0.25,
            formatStandard: 0.20,
            keywordMatch: 0.30,
            experienceRelevance: 0.25
        };

        let weightedScore = 0;
        for (const [category, weight] of Object.entries(weights)) {
            weightedScore += analysis.categoryScores[category] * weight;
        }

        return Math.round(weightedScore);
    }

    // 生成改进建议
    generateImprovementPlan(analysis) {
        const plan = {
            immediateActions: [],
            midTermGoals: [],
            longTermDevelopment: []
        };

        // 根据弱点生成改进计划
        analysis.weaknesses.forEach(weakness => {
            if (weakness.includes('数据')) {
                plan.immediateActions.push('在项目经验中添加量化成果和数据支撑');
            }
            if (weakness.includes('技能')) {
                plan.immediateActions.push('细化技能描述，使用更专业的技术术语');
            }
            if (weakness.includes('关键词')) {
                plan.midTermGoals.push('学习并掌握缺失的关键技术：' + analysis.keywordAnalysis.missing.join(', '));
            }
        });

        // 根据评分给出长期发展建议
        if (analysis.overallScore < 70) {
            plan.longTermDevelopment.push('系统学习前端工程化知识和最佳实践');
            plan.longTermDevelopment.push('参与开源项目或个人项目积累经验');
        } else if (analysis.overallScore < 85) {
            plan.longTermDevelopment.push('深入掌握1-2个前端框架的原理和高级特性');
            plan.longTermDevelopment.push('学习系统设计和架构知识');
        } else {
            plan.longTermDevelopment.push('关注行业前沿技术和发展趋势');
            plan.longTermDevelopment.push('培养团队领导和项目管理能力');
        }

        return plan;
    }
}

module.exports = ResumeDiagnosisService;
