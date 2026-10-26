# 系统架构

## 1. 总体组成

书签管理面板由三个可独立构建的部分组成：

```text
┌─────────────────────┐        ┌──────────────────────┐
│ 浏览器插件           │        │ 前端面板（Vue 3）      │
│ Chrome / Edge / FF  │        │ 首页 / 管理 / 设置     │
└─────────┬───────────┘        └──────────┬───────────┘
          │ X-API-Token                   │ Bearer JWT
          └──────────────┬────────────────┘
                         ▼
              ┌────────────────────┐
              │ Express API         │
              │ /api/auth           │
              │ /api/bookmarks      │
              │ /api/folders        │
              │ /api/config         │
              │ /api/tokens         │
              └─────────┬──────────┘
                        ▼
              ┌────────────────────┐
              │ Service 层          │
              │ 业务规则 / 导入导出   │
              └─────────┬──────────┘
                        ▼
              ┌────────────────────┐
              │ Sequelize + SQLite │
              │ database/*.db      │
              └────────────────────┘
```

生产环境只暴露一个 Node.js 服务：它既处理 `/api/*`，也托管 `frontend` 的构建产物。浏览器插件通过 HTTP API 连接该服务。

## 2. 仓库目录

```text
bookmark-panel/
├── backend/                  # Express API + SQLite
│   ├── src/
│   │   ├── app.js            # 应用入口、模型关联、路由挂载、静态托管
│   │   ├── config/           # Sequelize 数据库配置
│   │   ├── controllers/      # 参数接收与响应封装
│   │   ├── middleware/       # JWT / API Token 认证、错误处理
│   │   ├── models/           # User / Folder / Bookmark / Config / ApiToken
│   │   ├── routes/           # 路由定义
│   │   ├── services/         # 业务逻辑
│   │   └── utils/            # 统一响应结构
│   ├── database/             # SQLite 数据文件（运行时生成）
│   ├── uploads/              # 书签图标（运行时生成）
│   └── .env.example
├── frontend/                 # Vue 3 单页应用
│   ├── src/
│   │   ├── api/              # axios 封装与接口调用
│   │   ├── components/       # 首页看板、侧栏、书签卡片、设置等
│   │   ├── stores/           # Pinia：auth / bookmarks / config
│   │   ├── views/            # 登录、注册、首页
│   │   ├── App.vue           # 视图切换与插件免密登录
│   │   └── main.js
│   └── vite.config.js
├── extension/                # Manifest V3 浏览器插件
│   ├── src/
│   │   ├── background/       # 快捷键、通知、保存请求
│   │   ├── popup/            # 添加书签弹窗页
│   │   ├── options/          # API URL / Token / 主页设置
│   │   └── newtab/           # 新标签页接管页
│   ├── manifests/            # Chrome/Edge 与 Firefox 清单
│   └── vite.config.js
├── docker/                   # 多阶段镜像与 Compose
├── docs/                     # 项目文档
└── .github/workflows/        # 镜像与插件发布
```

## 3. 后端分层

### 3.1 入口与中间件

`backend/src/app.js` 依次完成：

1. 加载 `.env`。
2. 创建 Express 应用，开启 CORS，JSON 请求体上限 `10mb`。
3. 将 `backend/uploads` 挂载到 `/uploads`，用于访问上传的图标。
4. 挂载五组业务路由。
5. 注册统一错误处理中间件。
6. 托管 `backend/dist`（构建后的前端），并用 `GET *` 回退到 `index.html`，支持前端直接访问任意路径。
7. 调用 `sequelize.sync({ force: false })` 建表，然后监听端口。

> 当前没有数据库迁移框架。`sync` 只会补齐缺失的表，不会自动修改已有字段；涉及结构变更时需要自行迁移或重建数据库。

### 3.2 控制器与服务

- **Controller**：解析 `req.body` / `req.params` / `req.query`，调用 Service，使用 `successResponse` 包装结果，错误交给 `next(error)`。
- **Service**：承载查询、归属校验、排序、导入导出等业务规则。
- **Model**：Sequelize 模型定义字段、校验和索引。

所有业务查询都会带 `userId` 条件，避免跨用户访问。

### 3.3 统一响应

大多数业务接口返回：

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "操作成功",
  "data": {},
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

错误由 `errorHandler` 统一输出：

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "url 不是有效的URL地址",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

`/api/config`、`/api/tokens`、图标上传等少量接口直接返回业务对象，不使用上述包装，具体见 [api.md](./api.md)。

## 4. 前端结构

- `App.vue` 通过 `currentView` 在 `HomePage`、`LoginPage`、`RegisterPage` 之间切换，没有使用 vue-router。
- `HomePage.vue` 是核心页面：
  - `activeView = 'home'` 时展示自定义首页看板 `HomeBoard`。
  - `activeView = 'manage'` 时展示文件夹侧栏与书签区域。
  - 登录态由 `useAuthStore` 维护。
- `stores/bookmarks.js` 缓存书签、文件夹和搜索结果。
- `stores/config.js` 缓存用户配置到 `localStorage`（键名 `bookmark-panel-config`），用于首屏快速渲染。
- `api/config.js` 创建 axios 实例，自动附加 `Authorization: Bearer <JWT>`，并统一处理错误提示与 401 清理登录态。

### 免密登录流程

浏览器插件打开面板时会拼接 `#apiToken=<API Token>`。`App.vue` 在挂载时：

1. 从 URL hash（兼容 query）读取 `apiToken`。
2. 立即从地址栏移除 Token，避免留在历史记录中。
3. 调用 `POST /api/auth/token-login` 换取 JWT。
4. 写入 `localStorage` 后进入正常登录态。

## 5. 认证体系

系统同时支持两种凭证：

| 凭证 | 请求头 | 使用方 | 特点 |
| --- | --- | --- | --- |
| JWT | `Authorization: Bearer <token>` | 网页面板 | 有过期时间，由 `JWT_EXPIRES_IN` 控制 |
| API Token | `X-API-Token: <token>` | 浏览器插件、第三方客户端 | 长期有效，可创建、删除、轮转 |

`middleware/auth.js` 的优先级：

1. 如果存在 Bearer Token，先验证 JWT。
2. JWT 缺失或失效时，如果存在 `X-API-Token`，回退到 API Token 校验。
3. 两者都不可用时返回 401。

API Token 的明文只在创建或轮转时返回一次，数据库仅保存 SHA-256 哈希；校验时使用常量时间比较。每次成功校验都会更新 `lastUsedAt`。

## 6. 数据库与部署形态

- 默认数据库文件：`backend/database/bookmarks.db`，由 `DB_PATH` 覆盖。
- 上传目录：`backend/uploads`，由 `UPLOAD_PATH` 覆盖。
- 开发环境：前端 Vite `5173`，将 `/api` 代理到后端 `3000`。
- 生产环境：Docker 多阶段构建先打包前端，再把 `frontend/dist` 复制到后端镜像的 `dist/`，由 Express 统一提供页面和 API。

详细字段见 [data-model.md](./data-model.md)，部署步骤见 [deployment.md](./deployment.md)。

## 7. 当前性能策略

首页数据加载顺序（`HomePage.vue` 的 `loadUserData`）：

1. 先读取 `localStorage` 中的配置并立即渲染，然后请求 `GET /api/config` 刷新。
2. 并行请求 `GET /api/folders` 与 `GET /api/bookmarks`。
3. 书签在前端按 `selectedFolderId` 过滤，切换文件夹不会重新请求后端。
4. 搜索时调用 `GET /api/bookmarks/search?q=`，结果单独存放在 `searchResults`。

数据库层面已建立组合索引：

- `Folders(userId, parentId)`
- `Folders(userId, sortOrder)`
- `Bookmarks(userId, folderId)`
- `Bookmarks(userId, sortOrder)`

`app.js` 初始化了一个 TTL 为 600 秒的 `node-cache` 实例，但当前版本尚未在路由或 Service 中接入缓存；实际的首屏加速主要来自 `localStorage` 配置缓存和并行请求。

当书签量很大时，当前实现仍会一次性加载全部书签并在前端过滤，且没有分页或虚拟滚动。相关取舍见 [features.md](./features.md) 的“已知限制”。
