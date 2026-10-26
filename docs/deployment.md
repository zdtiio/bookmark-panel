# 部署指南

## 1. 部署形态

生产环境使用单个容器运行 Node.js 服务：

- Express 提供 `/api/*`。
- Express 托管构建后的前端静态文件。
- SQLite 与上传图标通过卷持久化。

默认端口 `3000`。

## 2. 使用 Docker Compose（推荐）

`docker/docker-compose.yml` 默认拉取 GHCR 镜像：

```yaml
services:
  bookmark-panel:
    image: ghcr.io/zdtiio/bookmark-panel:${IMAGE_TAG:-latest}
    container_name: bookmark-panel
    ports:
      - "3000:3000"
    volumes:
      - ./database:/app/database
      - ./uploads:/app/uploads
    environment:
      - PORT=3000
      - JWT_SECRET=your-secret-key-change-in-production
      - JWT_EXPIRES_IN=7d
      - DB_PATH=./database/bookmarks.db
      - UPLOAD_PATH=./uploads
    restart: unless-stopped
```

步骤：

```bash
cd docker
docker compose up -d
```

首次部署前请修改 `JWT_SECRET`。也可以使用环境变量指定版本：

```bash
IMAGE_TAG=latest docker compose up -d
```

如果镜像仓库是私有的，先登录：

```bash
echo <PAT> | docker login ghcr.io -u <username> --password-stdin
```

### 数据目录

Compose 会在 `docker/` 下创建：

```text
docker/database/bookmarks.db
docker/uploads/
```

删除容器不会删除这两个目录；删除它们等于清空业务数据和图标。

## 3. 手动构建镜像

必须在**仓库根目录**执行，Dockerfile 需要同时访问 `frontend/` 和 `backend/`：

```bash
docker build -f docker/Dockerfile -t bookmark-panel:local .
```

运行：

```bash
docker run -d \
  --name bookmark-panel \
  -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e JWT_EXPIRES_IN=7d \
  -v "$(pwd)/data/database:/app/database" \
  -v "$(pwd)/data/uploads:/app/uploads" \
  bookmark-panel:local
```

Windows PowerShell 示例：

```powershell
docker run -d --name bookmark-panel -p 3000:3000 `
  -e JWT_SECRET="please-change-me" `
  -v "${PWD}/data/database:/app/database" `
  -v "${PWD}/data/uploads:/app/uploads" `
  bookmark-panel:local
```

### 镜像构建过程

`docker/Dockerfile` 为多阶段构建：

1. `node:20-alpine` 中安装前端依赖并执行 `npm run build`。
2. 新的 `node:20-alpine` 中安装后端生产依赖。
3. 复制后端源码。
4. 把前端 `dist` 复制到 `/app/dist`。
5. 创建 `database`、`uploads` 目录，暴露 `3000`，以 `npm start` 启动。

## 4. 反向代理

推荐用 Nginx/Caddy 终止 TLS，并转发到 `127.0.0.1:3000`。

Nginx 示例：

```nginx
server {
    listen 443 ssl http2;
    server_name bookmarks.example.com;

    ssl_certificate     /etc/letsencrypt/live/bookmarks.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookmarks.example.com/privkey.pem;

    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

说明：

- `client_max_body_size` 至少覆盖 10 MB 的 JSON 导入和 5 MB 的图标上传。
- 不需要单独转发 `/api` 或 `/uploads`，它们都由同一个后端处理。
- 如果插件和面板都走 HTTPS，插件中的 API URL 也必须使用 HTTPS。

## 5. 环境变量

| 变量 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `PORT` | 否 | `3000` | 容器内监听端口 |
| `JWT_SECRET` | 是 | 无 | JWT 签名密钥，建议 32 字节以上随机值 |
| `JWT_EXPIRES_IN` | 否 | `7d` | JWT 有效期 |
| `DB_PATH` | 否 | `./database/bookmarks.db` | SQLite 路径 |
| `UPLOAD_PATH` | 否 | `./uploads` | 图标目录 |
| `NODE_ENV` | 否 | - | 生产建议设为 `production` |

生成密钥：

```bash
openssl rand -hex 32
```

或 PowerShell：

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

## 6. 备份与恢复

### 6.1 文件级备份（推荐）

```bash
docker compose stop bookmark-panel
tar -czf bookmark-panel-backup-$(date +%F).tar.gz database uploads
docker compose start bookmark-panel
```

恢复：

```bash
docker compose stop bookmark-panel
tar -xzf bookmark-panel-backup-2026-01-01.tar.gz
docker compose start bookmark-panel
```

### 6.2 用户级导出

登录后调用：

```text
GET /api/config/export
```

得到 JSON，包含用户信息、书签、文件夹、配置。注意它不包含图标文件本身。

### 6.3 恢复注意事项

- 恢复数据库文件前先停止服务，避免 SQLite 写入冲突。
- 数据库文件与上传目录应成对恢复，否则图标可能丢失。
- 更换 `JWT_SECRET` 后，所有网页登录态失效，用户需要重新登录；API Token 不受影响。

## 7. 升级

1. 备份 `database/` 和 `uploads/`。
2. 拉取新镜像：

   ```bash
   docker compose pull
   docker compose up -d
   ```

3. 观察日志：

   ```bash
   docker compose logs -f bookmark-panel
   ```

项目使用 `sequelize.sync({ force: false })`，只会创建缺失的表，**不会自动迁移已有字段**。如果新版本包含数据库结构变更，需要阅读对应发布说明并手动迁移。

## 8. CI / 自动发布

仓库包含两个 GitHub Actions 工作流，均由 `v*` 标签或手动触发。

### 8.1 Docker 镜像

`.github/workflows/docker-build.yml`：

- 登录 `ghcr.io`。
- 使用 `docker/metadata-action` 生成标签：
  - Git tag 原样
  - 语义化版本 `{{version}}`
  - `{{major}}.{{minor}}`
  - commit SHA
  - `latest`
- 使用 `docker/Dockerfile` 构建并推送。

镜像名：`ghcr.io/<owner>/<repo>`。

### 8.2 浏览器插件

`.github/workflows/extension-build.yml`：

- 校验 Chrome 与 Firefox 清单版本一致。
- 标签发布时以标签版本为准（`v1.2.3` → `1.2.3`），手动触发时使用清单版本。
- 构建 `dist/chrome` 与 `dist/firefox`。
- 写入构建版本并打包 zip。
- 上传 Actions artifact。
- 标签触发时创建 GitHub Release 并上传两个 zip。

> 发布新版本需要打 `v*` 标签。仅提交代码不会触发镜像或插件发布。

## 9. 安全清单

- 修改默认 `JWT_SECRET`，不要使用 Compose 示例值。
- 使用 HTTPS，避免 JWT/API Token 在明文链路传输。
- 限制数据库和上传目录的文件权限。
- 服务默认开启 CORS（`cors()` 允许所有来源）。如只供自己的前端使用，建议在反向代理层限制来源或改造 CORS 配置。
- 注册接口默认开放，没有邀请码或邮箱验证；公网部署请评估是否需要关闭注册。
- 当前没有登录限流、验证码、Helmet 等防护，公网暴露时建议在网关层增加限流和 WAF。
- API Token 明文只显示一次，遗失后请轮转，不要通过聊天工具长期传递。
