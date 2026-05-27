# 服务器管理常用命令速查

> 项目：工具箱 (toolbox) | 路径：`/opt/toolbox` | PM2 进程名：`toolbox`

---

## SSH 登录

```bash
ssh root@<服务器IP>

# 如果创建了 deploy 用户
ssh deploy@<服务器IP>
```

---

## PM2 进程管理

```bash
# 查看状态
pm2 status                    # 进程列表
pm2 show toolbox              # 详细信息
pm2 monit                     # 实时监控面板（CPU/内存）

# 日志
pm2 logs toolbox              # 实时日志（--lines 100 显示最近 100 行）
pm2 logs toolbox --err        # 只看错误日志
pm2 logs toolbox --out        # 只看标准输出
pm2 flush                     # 清空所有日志

# 重启/重载
pm2 restart toolbox           # 硬重启（有短暂中断）
pm2 reload toolbox            # 零停机重载（推荐更新时用）
pm2 stop toolbox              # 停止
pm2 start toolbox             # 启动
pm2 delete toolbox            # 从 PM2 列表中删除

# 开机自启
pm2 save                      # 保存当前进程列表
pm2 startup                   # 生成开机自启脚本（按提示执行输出的命令）
pm2 unstartup                 # 取消开机自启
```

---

## 项目更新

```bash
cd /opt/toolbox

# 拉取最新代码
git pull

# 查看改了什么（可选）
git log --oneline -5

# 安装新依赖（如有）
npm run install:all

# 重新构建前端
npm run build

# 零停机重启
pm2 reload toolbox

# 全流程一行版
cd /opt/toolbox && git pull && npm run build && pm2 reload toolbox
```

---

## Nginx 管理

```bash
# 状态与测试
sudo systemctl status nginx    # 查看运行状态
sudo nginx -t                  # 测试配置语法
sudo nginx -T | less           # 查看完整配置（展开 include）

# 启停
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx    # 重载配置（不断开连接，推荐）

# 日志
sudo tail -f /var/log/nginx/access.log    # 访问日志
sudo tail -f /var/log/nginx/error.log     # 错误日志

# 配置文件位置
# /etc/nginx/sites-available/toolbox  站点配置
# /etc/nginx/sites-enabled/           已启用站点（符号链接）
```

---

## 数据库管理

```bash
# 查看数据库文件
ls -lh /opt/toolbox/server/data/notes.db

# 进入 SQLite 命令行
sqlite3 /opt/toolbox/server/data/notes.db

# 常用 SQLite 命令（在 sqlite3 内执行）
.tables                         # 列出所有表
.schema notes                   # 查看表结构
SELECT COUNT(*) FROM notes;     # 笔记总数
SELECT id, title, updated_at FROM notes ORDER BY updated_at DESC LIMIT 10;
.q                              # 退出

# 备份
cp /opt/toolbox/server/data/notes.db /opt/toolbox/server/data/notes.db.$(date +%Y%m%d)

# 恢复
cp /opt/toolbox/server/data/notes.db.20260501 /opt/toolbox/server/data/notes.db
pm2 restart toolbox

# 查看备份文件
ls -lh /opt/toolbox/server/data/
```

---

## 系统监控

```bash
# 磁盘
df -h                         # 磁盘使用概览
du -sh /opt/toolbox/          # 项目占用空间
du -sh /var/log/              # 日志占用

# 内存
free -h                       # 内存使用
free -h -s 3                  # 每 3 秒刷新

# CPU / 进程
top                           # 实时进程（按 q 退出）
htop                          # 更友好的 top（需 apt install htop）

# 端口占用
sudo lsof -i :80              # 查看 80 端口被谁占用
sudo lsof -i :3000            # 查看 3000 端口
sudo netstat -tlnp            # 所有监听端口

# 系统信息
uname -a                      # 内核版本
lsb_release -a                # 系统版本
uptime                        # 运行时间 / 负载
```

---

## 防火墙 (UFW)

```bash
sudo ufw status               # 查看规则
sudo ufw status numbered      # 带编号的规则列表
sudo ufw allow 80             # 开放端口
sudo ufw delete <编号>        # 按编号删除规则
sudo ufw enable               # 启用防火墙
sudo ufw disable              # 禁用防火墙
sudo ufw reload               # 重载规则
```

---

## 快速排查

```bash
# 网站打不开？依次检查：
pm2 status                              # 1. Node 进程是否 online
curl http://localhost:3000/api/auth/login  # 2. 本地 API 是否正常
sudo systemctl status nginx             # 3. Nginx 是否运行
sudo tail -20 /var/log/nginx/error.log  # 4. Nginx 错误日志
sudo ufw status                         # 5. 防火墙是否开放 80
df -h                                   # 6. 磁盘是否满了

# API 报错？看日志：
pm2 logs toolbox --err --lines 50       # 最近 50 行错误日志

# 代码更新后异常？
pm2 restart toolbox                     # 先试试硬重启
pm2 logs toolbox --lines 30             # 看日志找线索
git log --oneline -3                    # 确认更新了什么
```

---

## 定时任务 (Crontab)

```bash
crontab -e                   # 编辑
crontab -l                   # 查看已有任务

# 常用表达式
# 0 3 * * *   每天凌晨 3 点
# */5 * * * * 每 5 分钟
# 0 * * * *   每小时整点
# 0 2 * * 0   每周日凌晨 2 点
```

---

## HTTPS 证书 (Let's Encrypt)

```bash
# 安装 certbot
sudo apt install -y certbot python3-certbot-nginx

# 签发证书（需要域名已解析到服务器）
sudo certbot --nginx -d your-domain.com

# 测试自动续期
sudo certbot renew --dry-run

# 证书到期时间
sudo certbot certificates
```

---

## 其他常用

```bash
# 清理 npm 缓存
npm cache clean --force

# 查看 Node 版本
node -v
npm -v

# 查找大文件
find /opt/toolbox -type f -size +10M

# 查看最近登录记录
last -10

# 重启服务器
sudo reboot

# curl 测试 API
curl http://localhost:3000/api/auth/login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```
