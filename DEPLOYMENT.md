# 极客园项目部署指南

## 📋 部署前准备

### 1. 服务器要求
- **配置**: 2核4G 以上
- **系统**: Ubuntu 20.04+ / CentOS 7+
- **带宽**: 3Mbps 以上

### 2. 需要购买的服务
- [ ] 云服务器（阿里云/腾讯云/华为云）
- [ ] 域名（国内服务器需备案）
- [ ] SSL 证书（Let's Encrypt 免费）

---

## 🚀 快速部署

### 方式一：一键部署脚本

```bash
# 1. 克隆代码
git clone https://github.com/2814186114/jike.git
cd jike

# 2. 创建环境变量文件
cat > .env << 'EOF'
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=jike
JWT_SECRET=随机生成的密钥
FRONTEND_URL=https://你的域名.com
EOF

# 3. 执行部署脚本
chmod +x deploy.sh
bash deploy.sh
```

### 方式二：手动部署

#### 步骤 1: 安装环境

```bash
# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# 安装 Nginx
sudo apt install nginx -y

# 安装 PM2
sudo npm install -g pm2
```

#### 步骤 2: 配置数据库

```bash
# 登录 MySQL
sudo mysql -u root -p

# 创建数据库和用户
CREATE DATABASE jike CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jike_user'@'localhost' IDENTIFIED BY '你的密码';
GRANT ALL PRIVILEGES ON jike.* TO 'jike_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 步骤 3: 部署代码

```bash
# 克隆代码
cd /var/www
git clone https://github.com/2814186114/jike.git
cd jike

# 安装依赖
npm install --production

# 创建环境变量
nano .env
```

#### 步骤 4: 初始化数据库

```bash
cd server/useData
node init_social_tables.js
cd ../..
```

#### 步骤 5: 构建前端

```bash
npm run build
```

#### 步骤 6: 启动后端

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 步骤 7: 配置 Nginx

```bash
# 复制配置文件
sudo cp nginx.conf.example /etc/nginx/sites-available/jike

# 修改域名
sudo nano /etc/nginx/sites-available/jike
# 将 your-domain.com 替换为你的域名

# 启用站点
sudo ln -s /etc/nginx/sites-available/jike /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 步骤 8: 配置 SSL

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d 你的域名.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 📁 目录结构

```
/var/www/jike/
├── build/                 # 前端构建文件
├── server/               # 后端代码
│   └── useData/
│       ├── uploads/      # 上传文件
│       └── logs/         # 日志文件
├── logs/                 # PM2 日志
├── .env                  # 环境变量
├── ecosystem.config.js   # PM2 配置
└── nginx.conf.example    # Nginx 配置示例
```

---

## 🔧 常用命令

### PM2 进程管理

```bash
pm2 status              # 查看服务状态
pm2 logs jike-server    # 查看日志
pm2 restart jike-server # 重启服务
pm2 stop jike-server    # 停止服务
pm2 delete jike-server  # 删除服务
pm2 monit               # 监控面板
```

### Nginx 管理

```bash
sudo systemctl start nginx    # 启动
sudo systemctl stop nginx     # 停止
sudo systemctl restart nginx  # 重启
sudo systemctl reload nginx   # 重载配置
sudo nginx -t                 # 测试配置
```

### 更新部署

```bash
cd /var/www/jike
git pull
npm install --production
npm run build
pm2 restart jike-server
```

---

## 🔒 安全建议

1. **修改默认端口**: 修改后端服务端口
2. **配置防火墙**: 只开放 80、443、22 端口
3. **定期备份**: 数据库定期备份
4. **更新密钥**: 修改 JWT_SECRET 为随机字符串
5. **HTTPS**: 强制使用 HTTPS

---

## 📊 性能优化

### 1. 开启 Gzip 压缩
Nginx 配置已包含 Gzip 压缩

### 2. 静态资源缓存
配置中已设置 1 年缓存

### 3. PM2 集群模式
配置中已启用集群模式，自动利用多核 CPU

### 4. 数据库优化
```sql
-- 添加索引
ALTER TABLE comments ADD INDEX idx_created_at (created_at);
ALTER TABLE likes ADD INDEX idx_created_at (created_at);
```

---

## ❓ 常见问题

### Q: 502 Bad Gateway
检查后端服务是否运行: `pm2 status`

### Q: 数据库连接失败
检查 .env 配置和 MySQL 服务状态

### Q: 上传文件无法访问
检查 Nginx 配置中的 uploads 路径

---

## 📞 技术支持

- GitHub: https://github.com/2814186114/jike
- 问题反馈: GitHub Issues
