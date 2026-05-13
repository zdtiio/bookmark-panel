# 书签管理面板

一个基于 Node.js 的现代化书签管理系统，支持多用户、跨浏览器书签导入导出、数据备份恢复等功能。整体开发基于TRAE的AI功能和脑子里的idea。

## ✨ 功能特性

### 后端服务

- 基于 Node.js 20 + Express 4.x 构建
- SQLite 嵌入式数据库，无需额外服务
- 支持 Docker 容器化部署
- 多用户支持，数据完全隔离
- API Token 认证机制，支持手动轮转
- 书签图标自动获取和手动上传
- 内存缓存提升响应速度

### 前端面板

- Vue 3 + Element Plus 2.x 现代化 UI
- 首页背景自定义（图片/纯色）
- 书签文件夹树形管理
- 自定义搜索引擎配置
- 图标展示控制开关
- 未登录状态展示时间、搜索框、登录注册按钮
- 开放用户注册功能

### 浏览器插件

- 支持 Chrome、Firefox、Edge 浏览器
- `Ctrl+Shift+S` / `Command+Shift+S` 快捷键快速保存页面
- 可设置取代默认主页和新标签页
- API Token 长期有效，支持轮转

### 数据管理

- 支持 Chrome (JSON)、Firefox (JSON)、Edge (HTML) 书签格式导入导出
- 用户数据完整备份恢复

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
| 构建工具 | Vite         | 6.x  |
| 状态管理 | Pinia        | -    |

### 浏览器插件

- Vue 3 + Vite
- Chrome Extension API（跨浏览器兼容）

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
│   │   ├── newtab/             # 新标签页替换
│   │   └── manifest.json       # 插件配置
│   └── package.json
├── docker/                     # Docker 配置
│   ├── Dockerfile
│   └── docker-compose.yml
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
| `npm run build` | 通用构建 |
| `npm run build:chrome` | Chrome 专属构建 |
| `npm run build:firefox` | Firefox 专属构建 |
| `npm run build:edge` | Edge 专属构建 |

**调试安装：**

- **Chrome / Edge**: 打开扩展页面 (`chrome://extensions/` 或 `edge://extensions/`)，开启「开发者模式」，点击「加载已解压的扩展程序」，选择 `extension/dist` 目录
- **Firefox**: 打开附加组件页面 (`about:addons`)，设置 → 调试附加组件，点击「临时加载附加组件」，选择扩展目录

**插件结构说明：**

```
extension/src/
├── background/     # 后台脚本（快捷键监听、事件处理）
├── popup/          # 点击插件图标弹出的窗口
├── options/        # 插件设置页面
├── newtab/         # 新标签页替换页面
└── manifest.json   # 插件配置文件（核心）
```

### Docker 部署

#### 使用 docker-compose（推荐）

```bash
cd docker
docker-compose up -d
```

#### 手动构建

```bash
cd backend
docker build -t bookmark-panel .
docker run -p 3000:3000 -v $(pwd)/database:/app/database bookmark-panel
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
| GET  | `/api/configs`        | 获取用户配置 |
| PUT  | `/api/configs`        | 更新配置     |
| GET  | `/api/configs/export` | 导出用户数据 |
| POST | `/api/configs/import` | 导入用户数据 |

### API Token

| 方法   | 路径                     | 说明              |
| ------ | ------------------------ | ----------------- |
| GET    | `/api/tokens`            | 获取 Token 列表   |
| POST   | `/api/tokens`            | 创建 Token        |
| DELETE | `/api/tokens/:id`        | 删除 Token        |
| PUT    | `/api/tokens/:id/rotate` | 轮转 Token        |
| POST   | `/api/tokens/verify`     | 验证 Token 有效性 |

## 🌐 浏览器插件安装

### Chrome / Edge

1. 打开浏览器扩展页面 (`chrome://extensions/` 或 `edge://extensions/`)
2. 开启开发者模式
3. 点击"加载已解压的扩展程序"
4. 选择 `extension/dist` 目录

### Firefox

1. 打开附加组件页面 (`about:addons`)
2. 点击设置图标 → 调试附加组件
3. 点击"临时加载附加组件"
4. 选择扩展目录

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
- **API Token**: 用户的 API Token（从前端设置页面获取）
- **取代主页**: 是否将插件设置为浏览器主页
- **取代新标签页**: 是否将插件设置为新标签页

## 🔒 安全特性

- 密码使用 bcrypt 加密存储
- JWT 认证，支持过期时间配置
- Sequelize ORM 防止 SQL 注入
- 数据越权验证
- API Token 加密存储，支持手动轮转

## 📄 许可证

MIT License
