# 本地开发

## 1. 环境要求

- Node.js >= 20
- npm >= 10
- 可编译/加载 SQLite 原生模块的环境（`sqlite3` 提供预编译包，必要时需安装构建工具）
- 浏览器：Chrome / Edge / Firefox（调试插件时）

## 2. 初始化

### 2.1 后端

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
npm run dev
```

默认监听 `http://localhost:3000`。首次启动会自动建表并创建 SQLite 文件；仓库中已包含 `database/` 与 `uploads/` 目录，如果手动删除，请先重新创建，避免 SQLite 无法打开数据库文件。

### 2.2 前端

```bash
cd frontend
npm install
npm run dev
```

默认地址 `http://localhost:5173`。Vite 会把 `/api` 代理到 `http://localhost:3000`，因此本地开发不需要额外配置跨域。

### 2.3 插件

```bash
cd extension
npm install
npm run dev
```

`npm run dev` 使用 Vite 开发模式，适合调试页面；要加载到浏览器请使用构建产物，见 [extension.md](./extension.md)。

## 3. 环境变量

后端读取 `backend/.env`：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | HTTP 端口 |
| `JWT_SECRET` | 无（示例值） | JWT 签名密钥，生产必须改为高强度随机值 |
| `JWT_EXPIRES_IN` | `7d` | JWT 有效期，支持 `1h`、`7d` 等格式 |
| `NODE_ENV` | `development` | `development` 时打印 SQL 日志 |
| `DB_PATH` | `./database/bookmarks.db` | SQLite 文件路径，相对后端启动目录 |
| `UPLOAD_PATH` | `./uploads` | 图标上传目录 |

注意事项：

- 修改 `JWT_SECRET` 会使已签发的 JWT 全部失效，但不会影响 API Token。
- 静态资源 `/uploads` 固定映射到 `backend/uploads`。如果把 `UPLOAD_PATH` 改到其他目录，上传成功但图标 URL 可能无法访问；除非同时调整静态映射。
- `.env` 已被 `.gitignore` 忽略，不要提交真实密钥。

## 4. 常用命令

### 后端

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | nodemon 热重载 |
| `npm start` | 生产模式启动 |
| `npm test` | 预留的 jest 命令 |

> 当前仓库没有测试文件，`jest` 也未加入依赖，`npm test` 不能直接作为 CI 测试使用。

### 前端

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | Vite 开发服务器 |
| `npm run build` | 构建到 `frontend/dist` |
| `npm run preview` | 预览构建产物 |

### 插件

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | Vite 开发模式 |
| `npm run build` | 依次构建 Chrome 与 Firefox |
| `npm run build:chrome` | 输出到 `extension/dist/chrome` |
| `npm run build:firefox` | 输出到 `extension/dist/firefox` |
| `npm run build:edge` | 输出到 `extension/dist/edge` |

## 5. 构建与本地联调

### 5.1 只构建前端

```bash
cd frontend
npm run build
```

产物在 `frontend/dist`。

### 5.2 模拟生产单服务

Express 托管的是 `backend/dist`，不是 `frontend/dist`。本地模拟生产时：

```bash
cd frontend
npm run build

# 将产物复制到后端静态目录
# Windows PowerShell
Remove-Item -Recurse -Force ../backend/dist -ErrorAction SilentlyContinue
Copy-Item -Recurse dist ../backend/dist

cd ../backend
npm start
```

也可以直接使用 `docker/Dockerfile` 的多阶段构建，它会自动完成这一步。

### 5.3 数据位置

```text
backend/database/bookmarks.db
backend/uploads/
```

重置本地数据时删除这两个路径即可；服务重启后会重新建表。

## 6. 代码组织约定

### 后端新增接口

1. 在 `backend/src/models/` 定义或复用模型。
2. 在 `backend/src/services/` 写业务逻辑，所有查询带 `userId`。
3. 在 `backend/src/controllers/` 接收参数、调用 Service、返回统一响应。
4. 在 `backend/src/routes/` 注册路由并挂 `authMiddleware`。
5. 同步更新 [api.md](./api.md)。

### 前端新增接口

1. 在 `frontend/src/api/` 增加方法。
2. 在对应的 Pinia store 中维护状态。
3. 组件通过 store 调用，不直接拼接 URL。
4. axios 拦截器会自动加 JWT 并统一提示错误。

### 配置项

新增配置时：

1. 在 `frontend/src/stores/config.js` 的默认值中加入键。
2. 在 `SettingsPanel.vue` 中提供编辑入口。
3. 在 [data-model.md](./data-model.md) 的配置键表中登记。

## 7. 常见问题

### 端口被占用

```powershell
Get-NetTCPConnection -LocalPort 3000
```

修改 `backend/.env` 的 `PORT`，同时修改 `frontend/vite.config.js` 的代理目标。

### 前端 401 后自动刷新

`frontend/src/api/config.js` 在收到 401 时会清除本地 `token` 和 `user`，1.5 秒后刷新页面。这是预期行为。

### SQLite 报 `SQLITE_BUSY`

SQLite 同一时间只允许一个写入者。不要对同一个数据库文件启动多个后端实例；确认没有残留的 `node src/app.js` 进程。

### 图标上传成功但打不开

检查：

- `UPLOAD_PATH` 是否为默认的 `./uploads`。
- 文件是否实际写入 `backend/uploads`。
- 反向代理是否把 `/uploads` 转发到后端。

### 数据库结构变更没有生效

项目使用 `sequelize.sync({ force: false })`，不会修改已有列。开发阶段可以备份后删除数据库文件重建；生产环境需要手动执行迁移 SQL。

### 插件请求失败

- 检查插件设置中的 API URL 是否包含协议（`http://` 或 `https://`）。
- 用「测试连接」验证 Token。
- 如果面板是 HTTPS，插件请求 HTTP 后端会被浏览器拦截；两者应保持同协议或使用 HTTPS 反向代理。

## 8. 提交前检查

```bash
cd frontend && npm run build
cd ../extension && npm run build
```

后端没有自动化测试时，至少手动验证：

- 注册 / 登录 / 登出
- 书签增删改查与拖拽排序
- 文件夹创建、移动、删除限制
- 首页收藏与拖拽排序
- 配置保存与刷新后恢复
- Token 创建、轮换、删除
- 导入 / 导出
