# 书签管理面板

一个基于 Node.js 的书签管理面板，支持多用户、跨浏览器书签导入导出、数据备份恢复等功能。

## 功能特性

### 后端服务
- 基于 Node.js + Express
- SQLite 数据库，无需额外服务
- 支持 Docker 部署和本地快速启动
- 多用户支持，数据隔离
- API Token 认证，支持手动轮转

### 前端面板
- Vue 3 + Element Plus
- 首页背景自定义（图片/纯色）
- 书签文件夹管理
- 自定义搜索引擎
- 书签图标自动获取和手动上传
- 未登录状态展示时间、搜索框、登录注册按钮

### 浏览器插件
- 支持 Chrome、Firefox、Edge
- 快捷键快速保存页面
- 可设置取代默认主页和新标签页

## 技术栈

### 后端
- Node.js 20.x
- Express 4.x
- Sequelize 6.x
- SQLite 3.x
- JWT + bcrypt 认证

### 前端
- Vue 3.x
- Element Plus 2.x
- Vite 6.x
- Pinia 状态管理

### 插件
- Vue 3.x
- Chrome Extension API

## 项目结构

```
bookmark-panel/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── models/       # 数据模型
│   │   ├── routes/       # 路由
│   │   ├── middleware/   # 中间件
│   │   ├── services/     # 业务服务
│   │   ├── config/       # 配置
│   │   └── app.js        # 入口文件
│   ├── database/         # 数据库文件
│   ├── uploads/          # 上传文件
│   └── package.json
├── frontend/             # 前端面板
│   ├── src/
│   │   ├── components/   # 组件
│   │   ├── views/        # 页面视图
│   │   ├── stores/       # 状态管理
│   │   ├── api/          # API 调用
│   │   └── main.js       # 入口文件
│   └── package.json
├── extension/            # 浏览器插件
│   ├── src/
│   │   ├── background/   # 背景脚本
│   │   ├── popup/        # 弹出窗口
│   │   ├── options/      # 设置页面
│   │   └── newtab/       # 新标签页
│   └── package.json
└── README.md
```

## 快速开始

### 本地开发

#### 启动后端
```bash
cd backend
npm install
npm run dev
```

#### 启动前端
```bash
cd frontend
npm install
npm run dev
```

### Docker 部署
```bash
cd backend
docker build -t bookmark-panel .
docker run -p 3000:3000 bookmark-panel
```

## API 接口

### 用户认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 书签管理
- `GET /api/bookmarks` - 获取书签列表
- `POST /api/bookmarks` - 添加书签
- `PUT /api/bookmarks/:id` - 更新书签
- `DELETE /api/bookmarks/:id` - 删除书签
- `POST /api/bookmarks/import` - 导入书签
- `GET /api/bookmarks/export` - 导出书签

### 文件夹管理
- `GET /api/folders` - 获取文件夹列表
- `POST /api/folders` - 创建文件夹
- `PUT /api/folders/:id` - 更新文件夹
- `DELETE /api/folders/:id` - 删除文件夹

### 配置管理
- `GET /api/configs` - 获取配置
- `PUT /api/configs` - 更新配置
- `GET /api/configs/export` - 导出用户数据
- `POST /api/configs/import` - 导入用户数据

### API Token
- `GET /api/tokens` - 获取 Token 列表
- `POST /api/tokens` - 创建 Token
- `DELETE /api/tokens/:id` - 删除 Token
- `PUT /api/tokens/:id/rotate` - 轮转 Token

## 浏览器书签格式

支持导入/导出以下格式：
- Chrome (JSON)
- Firefox (JSON)
- Edge (HTML)

## 浏览器插件安装

### Chrome
1. 打开 Chrome 浏览器
2. 进入扩展程序页面 (`chrome://extensions/`)
3. 开启开发者模式
4. 点击"加载已解压的扩展程序"
5. 选择 `extension/dist` 目录

### Firefox
1. 打开 Firefox 浏览器
2. 进入附加组件页面 (`about:addons`)
3. 点击设置图标 -> 调试附加组件
4. 点击"临时加载附加组件"
5. 选择扩展目录

### Edge
1. 打开 Edge 浏览器
2. 进入扩展页面 (`edge://extensions/`)
3. 开启开发者模式
4. 点击"加载已解压的扩展程序"
5. 选择 `extension/dist` 目录

## 快捷键

- `Ctrl+Shift+S` (Windows/Linux) / `Command+Shift+S` (Mac) - 快速保存当前页面

## 配置说明

### 后端配置 (.env)
```
PORT=3000
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
DB_PATH=./database/bookmarks.db
UPLOAD_PATH=./uploads
```

### 插件配置
- API URL: 后端服务地址
- API Token: 用户的 API Token
- 取代主页: 是否将插件设置为浏览器主页
- 取代新标签页: 是否将插件设置为新标签页

## 许可证

MIT
