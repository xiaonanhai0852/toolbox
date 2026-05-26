# 工具箱 — VPS 部署指南

> 适用系统：Ubuntu 20.04+ / Debian 11+
> 技术栈：Node.js 20 + Express + SQLite + PM2 + Nginx

---

## 前置准备

### 1. 购买 VPS

推荐阿里云 ECS、腾讯云 CVM 或任意 VPS 提供商，最低配置：
- CPU: 1 核
- 内存: 1 GB
- 系统: Ubuntu 22.04 LTS
- 带宽: 按量或 1Mbps 即可

### 2. 登录服务器

```bash
ssh root@<你的服务器IP>

# 创建非 root 用户（可选但推荐）
adduser deploy
usermod -aG sudo deploy
su - deploy
```

---

## 一、安装环境

### 1.1 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 安装 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v    # 应显示 v20.x.x
npm -v     # 应显示 10.x.x
```

### 1.3 安装 PM2（全局）

```bash
sudo npm install -g pm2
```

### 1.4 安装 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 1.5 安装 Git 和其他工具

```bash
sudo apt install -y git openssl curl
```

---

## 二、配置防火墙

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS（以后配证书用）
sudo ufw enable
sudo ufw status
```

---

## 三、部署项目

### 3.1 拉取代码

```bash
cd /opt
git clone <你的仓库地址> toolbox
cd toolbox
```

> 如果是私有仓库，需要先配 SSH key 或输入账号密码。

### 3.2 安装依赖

```bash
npm run install:all
```

这会依次安装 server 和 client 的依赖。

### 3.3 生成 JWT 密钥

```bash
openssl rand -hex 32
```

把输出内容记下来，下一步要用。例如：`a1b2c3d4e5f6...`

### 3.4 修改 PM2 配置

编辑项目根目录的 `ecosystem.config.js`：

```bash
nano ecosystem.config.js
```

把 `JWT_SECRET` 的值换成上一步生成的密钥：

```js
module.exports = {
  apps: [{
    name: 'toolbox',
    cwd: './server',
    script: 'src/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      JWT_SECRET: '这里填你生成的随机密钥'
    }
  }]
};
```

### 3.5 构建前端

```bash
npm run build
```

构建产物在 `client/dist/` 目录下。

### 3.6 启动服务

```bash
pm2 start ecosystem.config.js
pm2 save           # 保存进程列表，重启后自动恢复
pm2 startup        # 设置开机自启
```

> 执行 `pm2 startup` 后会输出一行命令，复制粘贴运行即可。

### 3.7 验证服务

```bash
pm2 status          # 应显示 toolbox 状态为 online
curl http://localhost:3000/api/auth/login
```

`curl` 应返回 JSON：`{"success":false,"message":"请求的接口不存在。"}` — 说明 API 服务正常。

---

## 四、配置 Nginx 反向代理

### 4.1 创建站点配置

```bash
sudo nano /etc/nginx/sites-available/toolbox
```

粘贴以下内容：

```nginx
server {
    listen 80;
    server_name _;

    # 静态资源直接由 Nginx 返回（性能更好）
    location /assets/ {
        alias /opt/toolbox/client/dist/assets/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API 转发到 Node 进程
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # 其他请求（SPA 路由）转发到 Node
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 4.2 启用站点

```bash
sudo ln -sf /etc/nginx/sites-available/toolbox /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t                             # 检查配置语法
sudo systemctl reload nginx               # 重新加载
```

### 4.3 测试

浏览器访问 `http://<服务器IP>`，应显示登录页面。

---

## 五、数据备份

### 5.1 配置定时备份

```bash
crontab -e
```

添加以下行（每天凌晨 3:00 备份数据库，保留最近 7 天）：

```
0 3 * * * cp /opt/toolbox/server/data/notes.db /opt/toolbox/server/data/backup/notes.db.$(date +\%Y\%m\%d) && find /opt/toolbox/server/data/backup -name 'notes.db.*' -mtime +7 -delete
```

### 5.2 创建备份目录

```bash
mkdir -p /opt/toolbox/server/data/backup
```

### 5.3 手动备份（测试用）

```bash
cp /opt/toolbox/server/data/notes.db /opt/toolbox/server/data/backup/notes.db.manual
```

---

## 六、日常运维

### 查看状态

```bash
pm2 status           # 进程状态
pm2 logs toolbox     # 实时日志
pm2 monit            # 资源监控面板
```

### 更新代码

连上服务器后执行：

```bash
cd /opt/toolbox
git pull
npm run build             # 重新构建前端
pm2 reload toolbox        # 零停机重启
```

### 重启服务

```bash
pm2 restart toolbox
```

### 查看错误日志

```bash
pm2 logs toolbox --err
```

---

## 七、安全建议

| 项目 | 建议 |
|------|------|
| JWT 密钥 | 长度 ≥ 32 位随机字符串，不要用默认值 |
| SSH 登录 | 禁用 root 密码登录，改用密钥登录 |
| 数据库 | 定期备份到服务器外部（如本地下载） |
| HTTPS | 后续可通过 Let's Encrypt 免费获取证书 |
| 防火墙 | 只开放必要的端口（22, 80, 443） |

### 配置 HTTPS（可选）

```bash
# 如果有域名
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run   # 测试自动续期
```

---

## 快速命令速查

```bash
# 部署
cd /opt && git clone <repo> toolbox && cd toolbox
npm run install:all
npm run build
nano ecosystem.config.js        # 改 JWT_SECRET
pm2 start ecosystem.config.js
pm2 save && pm2 startup

# 更新
cd /opt/toolbox && git pull && npm run build && pm2 reload toolbox

# 排错
pm2 status
pm2 logs toolbox
pm2 logs toolbox --err
curl http://localhost:3000/api/auth/login
sudo nginx -t
cat /opt/toolbox/server/data/notes.db    # 确认数据库存在
```
