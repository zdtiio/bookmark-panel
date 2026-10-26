# 书签管理面板

一个基于 Node.js 的现代化书签管理系统，支持多用户、跨浏览器书签导入导出、数据备份恢复等功能。

## ✨ 功能特性

### 后端服务

- 基于 Node.js 20 + Express 4.x 构建
- SQLite 嵌入式数据库，无需额外服务
- 支持 Docker 容器化部署
- 多用户支持，数据完全隔离
- API Token 认证机制，支持手动轮转
- 书签图标展示，后端提供图标上传接口
- 内置 NodeCache 缓存实例，可按需扩展

### 前端面板

- Vue 3 + Element Plus 2.x 现代化 UI
- 首页背景自定义（图片/纯色）
- 自定义首页：收藏常用书签和文件夹，支持拖拽排序
- 书签文件夹树形管理，侧栏默认收起，面包屑可返回根目录
- 自定义搜索引擎配置
- 图标展示控制开关
- 未登录状态展示时间、搜索框、登录注册按钮
- 开放用户注册功能

### 浏览器插件

- 支持 Chrome、Firefox、Edge 浏览器
- `Ctrl+Shift+S` / `Command+Shift+S` 打开预填当前页面的添加书签页
- 新标签页接管，配置 Token 后可一键进入面板
- API Token 长期有效，支持轮转

### 数据管理

- 支持 Chrome (JSON)、Firefox (JSON)、Edge (HTML) 书签格式导入导出
- 用户数据完整备份恢复

## 📚 项目文档

完整文档位于 [`docs/`](./docs/README.md)：

- [架构说明](./docs/architecture.md)：系统组成、请求链路、认证与缓存策略
- [功能说明](./docs/features.md)：首页、管理视图、文件夹、搜索与设置
- [API 参考](./docs/api.md)：接口路径、参数、响应格式与示例
- [数据模型](./docs/data-model.md)：数据表、索引、关联关系与配置项
- [本地开发](./docs/development.md)：环境变量、构建命令与排错
- [部署指南](./docs/deployment.md)：Docker、Compose、反向代理、备份与 CI
- [浏览器插件](./docs/extension.md)：结构、构建、安装与配置

## 🛠️ 技术栈

### 后端

| 分类     | 技术         | 版本 |
| -------- | ------------ | ---- |
| 语言     | Node.js      | 20.x |
| 框架     | Express      | 4.x  |
| ORM      | Sequelize    | 6.x  |
| 数据库   | SQLite       | 3.x  |
| 认证     | JWT + bcrypt | -    |
| 文件上传 | multer       | 1.x  |
| 缓存     | Node Cache   | -    |

### 前端

| 分类     | 技术         | 版本 |
| -------- | ------------ | ---- |
| 框架     | Vue.js       | 3.x  |
| UI 库    | Element Plus | 2.x  |
| 图标     | Lucide Vue   | -    |
| 构建工具 | Vite         | 5.x  |
| 状态管理 | Pinia        | -    |

### 浏览器插件

- 原生 JavaScript + Vite 多页面构建
- Manifest V3，Chrome Extension API（跨浏览器兼容）

## 📁 项目结构

```
bookmark-panel/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── controllers/        # REST API 控制器
│   │   ├── models/             # Sequelize 数据模型
│   │   ├── routes/             # 路由定义
│   │   ├── middleware/         # 中间件（认证、Token验证）
│   │   ├── services/           # 业务逻辑服务
│   │   ├── config/             # 数据库配置
│   │   └── app.js              # Express 应用入口
│   ├── database/               # SQLite 数据库文件
│   ├── uploads/                # 书签图标上传目录
│   ├── .env.example            # 环境变量示例
│   └── package.json
├── frontend/                   # 前端面板
│   ├── src/
│   │   ├── components/         # Vue 组件
│   │   ├── views/              # 页面视图（登录/注册/首页）
│   │   ├── stores/             # Pinia 状态管理
│   │   ├── api/                # API 调用封装
│   │   └── main.js             # 入口文件
│   ├── index.html
│   └── package.json
├── extension/                  # 浏览器插件
│   ├── src/
│   │   ├── background/         # 背景脚本（快捷键监听）
│   │   ├── popup/              # 弹出窗口
│   │   ├── options/            # 设置页面
│   │   └── newtab/             # 新标签页替换
│   ├── manifests/              # 各浏览器清单
│   │   ├── manifest.chrome.json
│   │   └── manifest.firefox.json
│   └── package.json
├── docker/                     # Docker 配置
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/                       # 项目文档
├── .github/workflows/          # CI：镜像与插件发布
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js >= 20.0.0
- npm >= 10.0.0

### 本地开发

#### 启动后端服务

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

#### 启动前端面板

```bash
cd frontend
npm install
npm run dev
```

#### 开发浏览器插件

```bash
cd extension
npm install
npm run dev
```

**开发命令：**

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（热更新） |
| `npm run build` | 同时构建 Chrome 和 Firefox 两个版本 |
| `npm run build:chrome` | Chrome 专属构建 → `dist/chrome` |
| `npm run build:firefox` | Firefox 专属构建 → `dist/firefox` |
| `npm run build:edge` | Edge 专属构建 → `dist/edge` |

**调试安装：**

- **Chrome / Edge**: 打开扩展页面 (`chrome://extensions/` 或 `edge://extensions/`)，开启「开发者模式」，点击「加载已解压的扩展程序」，选择 `extension/dist/chrome`（Edge 用 `extension/dist/edge`）目录
- **Firefox**: 打开附加组件页面 (`about:addons`)，设置 → 调试附加组件，点击「临时加载附加组件」，选择扩展目录 `extension/dist/firefox`

**插件结构说明：**

```
extension/
├── src/                # 三个浏览器共用的页面与脚本
│   ├── background/     # 后台脚本（快捷键监听、事件处理）
│   ├── popup/          # 点击插件图标弹出的窗口
│   ├── options/        # 插件设置页面
│   └── newtab/         # 新标签页替换页面
└── manifests/          # 各浏览器专属清单
    ├── manifest.chrome.json
    └── manifest.firefox.json
```

### Docker 部署

#### 使用 docker-compose（推荐）

```bash
cd docker
docker-compose up -d
```

#### 手动构建

```bash
# 在仓库根目录执行
docker build -f docker/Dockerfile -t bookmark-panel .
docker run -p 3000:3000 -v $(pwd)/database:/app/database -v $(pwd)/uploads:/app/uploads bookmark-panel
```

### 访问地址

- 后端 API: `http://localhost:3000`
- 前端面板: `http://localhost:5173`

## 🔌 API 接口

### 用户认证

| 方法 | 路径                 | 说明             |
| ---- | -------------------- | ---------------- |
| POST | `/api/auth/register` | 用户注册         |
| POST | `/api/auth/login`    | 用户登录         |
| GET  | `/api/auth/me`       | 获取当前用户信息 |
| POST | `/api/auth/logout`   | 用户登出         |

### 书签管理

| 方法   | 路径                    | 说明           |
| ------ | ----------------------- | -------------- |
| GET    | `/api/bookmarks`        | 获取书签列表   |
| POST   | `/api/bookmarks`        | 添加书签       |
| PUT    | `/api/bookmarks/:id`    | 更新书签       |
| DELETE | `/api/bookmarks/:id`    | 删除书签       |
| POST   | `/api/bookmarks/import` | 导入浏览器书签 |
| GET    | `/api/bookmarks/export` | 导出书签       |
| POST   | `/api/bookmarks/icon`   | 上传书签图标   |

### 文件夹管理

| 方法   | 路径               | 说明           |
| ------ | ------------------ | -------------- |
| GET    | `/api/folders`     | 获取文件夹列表 |
| POST   | `/api/folders`     | 创建文件夹     |
| PUT    | `/api/folders/:id` | 更新文件夹     |
| DELETE | `/api/folders/:id` | 删除文件夹     |

### 配置管理

| 方法 | 路径                  | 说明         |
| ---- | --------------------- | ------------ |
| GET  | `/api/config`         | 获取用户配置 |
| PUT  | `/api/config`         | 更新配置     |
| GET  | `/api/config/export`  | 导出用户数据 |
| POST | `/api/config/import`  | 导入用户数据 |

### API Token

| 方法   | 路径                     | 说明              |
| ------ | ------------------------ | ----------------- |
| GET    | `/api/tokens`            | 获取 Token 列表   |
| POST   | `/api/tokens`            | 创建 Token        |
| DELETE | `/api/tokens/:id`        | 删除 Token        |
| PUT    | `/api/tokens/:id/rotate` | 轮转 Token        |
| POST   | `/api/tokens/verify`     | 验证 Token 有效性 |

所有需要登录的接口同时支持两种认证方式：

- `Authorization: Bearer <JWT>`：网页登录后使用
- `X-API-Token: <API Token>`：浏览器插件等第三方客户端使用

`POST /api/auth/token-login` 可以用 API Token 直接换取 JWT，浏览器插件通过该接口实现免密进入面板。

更完整的参数、响应格式和示例见 [docs/api.md](./docs/api.md)。

## 🌐 浏览器插件安装

### Chrome / Edge

1. 打开浏览器扩展页面 (`chrome://extensions/` 或 `edge://extensions/`)
2. 开启开发者模式
3. 点击"加载已解压的扩展程序"
4. 选择 `extension/dist/chrome` 目录（Edge 选择 `extension/dist/edge`）

### Firefox

1. 打开附加组件页面 (`about:addons`)
2. 点击设置图标 → 调试附加组件
3. 点击"临时加载附加组件"
4. 选择扩展目录 `extension/dist/firefox`

## ⌨️ 快捷键

- `Ctrl+Shift+S` (Windows/Linux) / `Command+Shift+S` (Mac) - 快速保存当前页面

## ⚙️ 配置说明

### 后端环境变量 (.env)

```env
PORT=3000
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
DB_PATH=./database/bookmarks.db
UPLOAD_PATH=./uploads
```

### 插件配置

- **API URL**: 后端服务地址（如 `http://localhost:3000`）
- **API Token**: 用户的 API Token（从前端设置页面获取，可在插件设置页点击「测试连接」验证）
- **取代主页**: Firefox 可尝试自动设置；Chrome/Edge 需在浏览器设置中手动设置
- **取代新标签页**: 保存偏好；新标签页接管由插件清单固定开启

配置好 API URL 和 API Token 后，新标签页 / 插件中的「打开书签面板」会自动携带 Token 登录，无需再输入账号密码。

## 🔒 安全特性

- 密码使用 bcrypt 加密存储
- JWT 认证，支持过期时间配置
- Sequelize ORM 防止 SQL 注入
- 数据越权验证
- API Token 加密存储，支持手动轮转

## 📄 许可证

MIT License
