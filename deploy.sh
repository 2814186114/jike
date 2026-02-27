#!/bin/bash

# 极客园项目部署脚本
# 使用方法: bash deploy.sh

set -e

echo "=========================================="
echo "    极客园项目部署脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 打印函数
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }

# 检查环境变量文件
if [ ! -f ".env" ]; then
    print_error "未找到 .env 文件，请先创建环境变量配置"
    echo "示例配置:"
    cat << 'EOF'
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=jike
JWT_SECRET=your-random-secret-key
FRONTEND_URL=https://your-domain.com
EOF
    exit 1
fi

print_info "加载环境变量..."
source .env

# 1. 安装依赖
print_info "安装项目依赖..."
npm install --production

# 2. 初始化数据库表
print_info "初始化数据库表..."
cd server/useData
node init_social_tables.js
cd ../..

# 3. 构建前端
print_info "构建前端项目..."
npm run build

# 4. 创建日志目录
print_info "创建日志目录..."
mkdir -p logs

# 5. 使用 PM2 启动服务
print_info "启动后端服务..."
pm2 start ecosystem.config.js --env production

# 6. 保存 PM2 配置
pm2 save

# 7. 设置 PM2 开机自启
print_info "设置开机自启..."
pm2 startup

print_success "部署完成！"
echo ""
echo "=========================================="
echo "    部署信息"
echo "=========================================="
echo "前端文件位置: $(pwd)/build"
echo "后端服务端口: 3001"
echo "日志文件位置: $(pwd)/logs"
echo ""
echo "常用命令:"
echo "  查看服务状态: pm2 status"
echo "  查看日志:     pm2 logs jike-server"
echo "  重启服务:     pm2 restart jike-server"
echo "  停止服务:     pm2 stop jike-server"
echo ""
echo "Nginx 配置请参考: nginx.conf.example"
echo "=========================================="
