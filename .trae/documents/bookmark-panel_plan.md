# 书签管理面板项目实现计划

## 1. 需求分析

### 1.1 后端服务需求

| 需求点        | 描述                          | 优先级 |
| :--------- | :-------------------------- | :-- |
| Node.js 服务 | 基于 Node.js 开发，使用 Express 框架 | 高   |
| SQLite 数据库 | 轻量级数据库，无需额外服务               | 高   |
| Docker 部署  | 支持打包为 Docker 镜像部署           | 高   |
| 本地快速启动     | 支持本地服务快速启动                  | 高   |
| 多用户支持      | 多个用户数据隔离                    | 高   |
| 书签导入导出     | 支持 Chrome、Firefox、Edge 格式   | 高   |
| 数据备份恢复     | 支持用户数据的导入导出                 | 高   |

### 1.2 前端面板需求

| 需求点      | 描述            | 优先级 |
| :------- | :------------ | :-- |
| 首页背景自定义  | 支持图片或纯色背景     | 高   |
| 文件夹展示控制  | 可选择是否展示书签文件夹  | 高   |
| 搜索框      | 支持自定义搜索引擎     | 高   |
| 设置按钮     | 修改配置项         | 高   |
| 单个添加书签   | 手动添加书签功能      | 高   |
| 书签图标自动获取 | 本地获取网站图标后上传   | 高   |
| 书签图标手动上传 | 支持手动上传图标文件    | 高   |
| 图标展示控制   | 首页可配置是否展示书签图标 | 高   |
| 未登录首页展示  | 显示当前时间、搜索框、登录注册按钮 | 高   |
| 开放注册     | 允许用户自由注册账号     | 高   |

### 1.3 浏览器插件需求

| 需求点          | 描述                      | 优先级 |
| :----------- | :---------------------- | :-- |
| 快捷键设置        | 快速保存当前页面                | 高   |
| 主页替换         | 可设置取代默认主页               | 高   |
| 新标签页替换       | 可设置取代新建标签页              | 高   |
| 多浏览器支持       | Chrome、Firefox、Edge     | 高   |
| API Token 认证 | 插件连接后端使用 API 和对应的 token | 高   |
| Token 长期有效   | token 有效期为长期            | 高   |
| Token 手动轮转   | 用户可以手动轮转 token          | 高   |

### 1.4 性能优化需求

| 需求点    | 描述         | 优先级 |
| :----- | :--------- | :-- |
| 首页加载速度 | 首页要求加载速度极快 | 高   |

***

## 2. 技术架构

### 2.1 后端技术栈

| 分类     | 技术         | 版本   | 说明             |
| :----- | :--------- | :--- | :------------- |
| 语言     | Node.js    | 20.x | LTS 版本，性能稳定    |
| 框架     | Express    | 4.x  | 轻量级 Web 框架     |
| 数据库    | SQLite     | 3.x  | 嵌入式数据库，无需额外服务  |
| ORM    | Sequelize  | 6.x  | SQL 数据库 ORM 工具 |
| 用户认证   | JWT        | -    | JSON Web Token |
| 密码加密   | bcrypt     | 5.x  | 密码哈希           |
| Docker | Dockerfile | -    | 容器化部署          |
| 缓存     | Node Cache | -    | 内存缓存，提升响应速度    |
| 文件上传   | multer     | 1.x  | 处理文件上传         |

### 2.2 前端技术栈

| 分类   | 技术                          | 版本  | 说明                |
| :--- | :-------------------------- | :-- | :---------------- |
| 框架   | Vue.js                      | 3.x | 渐进式 JavaScript 框架 |
| UI 库 | Element Plus                | 2.x | Vue 3 组件库         |
| 图标   | Lucide                      | -   | 现代图标库             |
| 构建工具 | Vite                        | 6.x | 快速构建工具            |
| 缓存策略 | LocalStorage/SessionStorage | -   | 本地缓存，提升首屏加载       |

### 2.3 浏览器插件技术栈

| 分类      | 技术                   | 说明           |
| :------ | :------------------- | :----------- |
| 框架      | Vue.js 3             | 插件 UI 使用 Vue |
| 打包工具    | Vite                 | 统一构建工具       |
| 浏览器 API | Chrome Extension API | 跨浏览器兼容       |
| 存储      | Chrome Storage API   | 存储配置和 token  |

***

## 3. 目录结构设计

```
bookmark-panel/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── controllers/        # 控制器
│   │   ├── models/             # 数据模型
│   │   ├── routes/             # 路由
│   │   ├── middleware/         # 中间件
│   │   ├── services/           # 业务服务
│   │   ├── utils/              # 工具函数
│   │   └── app.js              # 应用入口
│   ├── database/               # SQLite 数据库文件
│   ├── uploads/                # 上传文件存储（书签图标）
│   ├── package.json
│   └── Dockerfile
├── frontend/                   # 前端面板
│   ├── src/
│   │   ├── components/         # 组件
│   │   ├── views/              # 页面视图
│   │   ├── stores/             # 状态管理
│   │   ├── api/                # API 调用
│   │   └── main.js             # 入口文件
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── extension/                  # 浏览器插件
│   ├── src/
│   │   ├── background/         # 背景脚本
│   │   ├── popup/              # 弹出窗口
│   │   ├── options/            # 设置页面
│   │   ├── newtab/             # 新标签页
│   │   └── manifest.json       # 插件配置
│   ├── package.json
│   └── vite.config.js
└── README.md
```

***

## 4. 数据库设计

### 4.1 用户表 (users)

| 字段名         | 类型           | 约束                         | 说明     |
| :---------- | :----------- | :------------------------- | :----- |
| id          | INTEGER      | PRIMARY KEY AUTOINCREMENT  | 用户ID   |
| username    | VARCHAR(50)  | UNIQUE NOT NULL            | 用户名    |
| email       | VARCHAR(100) | UNIQUE NOT NULL            | 邮箱     |
| password    | VARCHAR(255) | NOT NULL                   | 加密后的密码 |
| created\_at | DATETIME     | DEFAULT CURRENT\_TIMESTAMP | 创建时间   |
| updated\_at | DATETIME     | DEFAULT CURRENT\_TIMESTAMP | 更新时间   |

### 4.2 书签文件夹表 (folders)

| 字段名         | 类型           | 约束                         | 说明     |
| :---------- | :----------- | :------------------------- | :----- |
| id          | INTEGER      | PRIMARY KEY AUTOINCREMENT  | 文件夹ID  |
| user\_id    | INTEGER      | FOREIGN KEY NOT NULL       | 所属用户ID |
| name        | VARCHAR(100) | NOT NULL                   | 文件夹名称  |
| parent\_id  | INTEGER      | FOREIGN KEY                | 父文件夹ID |
| created\_at | DATETIME     | DEFAULT CURRENT\_TIMESTAMP | 创建时间   |

### 4.3 书签表 (bookmarks)

| 字段名         | 类型            | 约束                         | 说明      |
| :---------- | :------------ | :------------------------- | :------ |
| id          | INTEGER       | PRIMARY KEY AUTOINCREMENT  | 书签ID    |
| user\_id    | INTEGER       | FOREIGN KEY NOT NULL       | 所属用户ID  |
| folder\_id  | INTEGER       | FOREIGN KEY                | 所属文件夹ID |
| title       | VARCHAR(255)  | NOT NULL                   | 书签标题    |
| url         | VARCHAR(1024) | NOT NULL                   | 书签URL   |
| description | TEXT          | <br />                     | 描述信息    |
| icon        | VARCHAR(512)  | <br />                     | 图标URL   |
| created\_at | DATETIME      | DEFAULT CURRENT\_TIMESTAMP | 创建时间    |
| updated\_at | DATETIME      | DEFAULT CURRENT\_TIMESTAMP | 更新时间    |

### 4.4 用户配置表 (configs)

| 字段名         | 类型           | 约束                         | 说明     |
| :---------- | :----------- | :------------------------- | :----- |
| id          | INTEGER      | PRIMARY KEY AUTOINCREMENT  | 配置ID   |
| user\_id    | INTEGER      | FOREIGN KEY NOT NULL       | 所属用户ID |
| key         | VARCHAR(100) | NOT NULL                   | 配置键    |
| value       | TEXT         | <br />                     | 配置值    |
| created\_at | DATETIME     | DEFAULT CURRENT\_TIMESTAMP | 创建时间   |

### 4.5 API Token 表 (api\_tokens)

| 字段名            | 类型           | 约束                         | 说明         |
| :------------- | :----------- | :------------------------- | :--------- |
| id             | INTEGER      | PRIMARY KEY AUTOINCREMENT  | Token ID   |
| user\_id       | INTEGER      | FOREIGN KEY NOT NULL       | 所属用户ID     |
| token          | VARCHAR(255) | UNIQUE NOT NULL            | 加密后的 token |
| name           | VARCHAR(100) | <br />                     | Token 名称   |
| created\_at    | DATETIME     | DEFAULT CURRENT\_TIMESTAMP | 创建时间       |
| last\_used\_at | DATETIME     | <br />                     | 最后使用时间     |

***

## 5. API 接口设计

### 5.1 用户认证接口

| 接口     | 方法   | 路径                 | 说明       |
| :----- | :--- | :----------------- | :------- |
| 注册     | POST | /api/auth/register | 用户注册     |
| 登录     | POST | /api/auth/login    | 用户登录     |
| 登出     | POST | /api/auth/logout   | 用户登出     |
| 获取当前用户 | GET  | /api/auth/me       | 获取当前用户信息 |

### 5.2 书签接口

| 接口     | 方法     | 路径                    | 说明       |
| :----- | :----- | :-------------------- | :------- |
| 获取书签列表 | GET    | /api/bookmarks        | 获取用户书签列表 |
| 添加书签   | POST   | /api/bookmarks        | 添加单个书签   |
| 更新书签   | PUT    | /api/bookmarks/:id    | 更新书签     |
| 删除书签   | DELETE | /api/bookmarks/:id    | 删除书签     |
| 导入书签   | POST   | /api/bookmarks/import | 导入浏览器书签  |
| 导出书签   | GET    | /api/bookmarks/export | 导出书签     |
| 上传图标   | POST   | /api/bookmarks/icon   | 上传书签图标   |

### 5.3 文件夹接口

| 接口      | 方法     | 路径               | 说明      |
| :------ | :----- | :--------------- | :------ |
| 获取文件夹列表 | GET    | /api/folders     | 获取文件夹列表 |
| 创建文件夹   | POST   | /api/folders     | 创建文件夹   |
| 更新文件夹   | PUT    | /api/folders/:id | 更新文件夹   |
| 删除文件夹   | DELETE | /api/folders/:id | 删除文件夹   |

### 5.4 配置接口

| 接口     | 方法   | 路径                  | 说明       |
| :----- | :--- | :------------------ | :------- |
| 获取配置   | GET  | /api/configs        | 获取用户配置   |
| 更新配置   | PUT  | /api/configs        | 更新配置     |
| 导出用户数据 | GET  | /api/configs/export | 导出所有用户数据 |
| 导入用户数据 | POST | /api/configs/import | 导入用户数据   |

### 5.5 API Token 接口

| 接口          | 方法     | 路径                     | 说明             |
| :---------- | :----- | :--------------------- | :------------- |
| 获取 Token 列表 | GET    | /api/tokens            | 获取用户的所有 token  |
| 创建 Token    | POST   | /api/tokens            | 创建新的 API token |
| 删除 Token    | DELETE | /api/tokens/:id        | 删除指定 token     |
| 轮转 Token    | PUT    | /api/tokens/:id/rotate | 手动轮转 token     |
| Token 验证    | POST   | /api/tokens/verify     | 验证 token 有效性   |

***

## 6. 实现步骤

### 6.1 后端服务实现 (预计 10 小时)

| 步骤 | 任务                               | 负责人 |
| :- | :------------------------------- | :-- |
| 1  | 初始化 Node.js 项目，安装依赖              | 开发  |
| 2  | 配置 Express 框架和中间件（含 multer 文件上传） | 开发  |
| 3  | 配置 Sequelize 和 SQLite            | 开发  |
| 4  | 创建数据库模型（含 API Token 表）           | 开发  |
| 5  | 实现用户认证功能                         | 开发  |
| 6  | 实现书签 CRUD 功能                     | 开发  |
| 7  | 实现文件夹 CRUD 功能                    | 开发  |
| 8  | 实现书签导入导出功能                       | 开发  |
| 9  | 实现用户数据备份恢复功能                     | 开发  |
| 10 | 实现 API Token 管理功能（创建、删除、轮转）      | 开发  |
| 11 | 实现书签图标上传功能                       | 开发  |
| 12 | 配置内存缓存提升响应速度                     | 开发  |
| 13 | 配置 Dockerfile                    | 开发  |

### 6.2 前端面板实现 (预计 8 小时)

| 步骤 | 任务                     | 负责人 |
| :- | :--------------------- | :-- |
| 1  | 初始化 Vue 3 + Vite 项目    | 开发  |
| 2  | 安装 Element Plus 和依赖    | 开发  |
| 3  | 创建登录/注册页面（开放注册）       | 开发  |
| 4  | 创建首页面板（未登录状态：时间、搜索框、登录注册按钮） | 开发  |
| 5  | 实现首页登录/未登录状态切换        | 开发  |
| 6  | 实现背景自定义功能              | 开发  |
| 7  | 实现搜索框功能                | 开发  |
| 8  | 实现书签展示和管理（含图标展示控制）     | 开发  |
| 9  | 实现书签图标自动获取（本地获取后上传）    | 开发  |
| 10 | 实现书签图标手动上传功能           | 开发  |
| 11 | 实现设置页面（含 API Token 管理） | 开发  |
| 12 | 实现本地缓存策略，提升加载速度        | 开发  |

### 6.3 浏览器插件实现 (预计 7 小时)

| 步骤 | 任务                                       | 负责人 |
| :- | :--------------------------------------- | :-- |
| 1  | 创建插件项目结构                                 | 开发  |
| 2  | 配置 manifest.json（支持 Chrome、Firefox、Edge） | 开发  |
| 3  | 实现背景脚本（快捷键监听、书签保存）                       | 开发  |
| 4  | 实现弹出窗口（快速保存书签）                           | 开发  |
| 5  | 实现设置页面（API 配置、Token 管理、主页设置）             | 开发  |
| 6  | 实现新标签页替换功能                               | 开发  |
| 7  | 实现主页替换功能                                 | 开发  |
| 8  | 打包各浏览器版本                                 | 开发  |

***

## 7. 浏览器书签格式说明

### 7.1 Chrome 书签格式 (JSON)

```json
{
  "checksum": "xxx",
  "roots": {
    "bookmark_bar": {
      "children": [...]
    },
    "other": {
      "children": [...]
    },
    "synced": {
      "children": [...]
    }
  },
  "version": 1
}
```

### 7.2 Firefox 书签格式 (JSON)

```json
{
  "title": "Bookmarks",
  "id": "root________",
  "type": "text/x-moz-place-container",
  "children": [...]
}
```

### 7.3 Edge 书签格式 (HTML)

```html
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><A HREF="..." ADD_DATE="..." LAST_MODIFIED="...">...</A>
</DL><p>
```

***

## 8. 安全性考虑

| 风险点          | 措施                        |
| :----------- | :------------------------ |
| 密码泄露         | 使用 bcrypt 加密存储            |
| JWT 伪造       | 使用安全密钥，设置过期时间             |
| SQL 注入       | 使用 Sequelize ORM，避免原生 SQL |
| XSS 攻击       | 前端输入过滤，后端参数验证             |
| CSRF 攻击      | 使用 JWT 无状态认证，无需 CSRF      |
| 数据越权         | 所有查询验证用户权限                |
| API Token 泄露 | Token 加密存储，支持手动轮转         |
| Token 滥用     | 记录最后使用时间，支持失效检测           |

***

## 9. 部署说明

### 9.1 本地开发

```bash
# 启动后端
cd backend
npm install
npm run dev

# 启动前端
cd frontend
npm install
npm run dev
```

### 9.2 Docker 部署

```bash
# 构建镜像
docker build -t bookmark-panel .

# 运行容器
docker run -p 3000:3000 bookmark-panel
```

***

## 10. 项目依赖

### 后端依赖

| 依赖                | 说明        |
| :---------------- | :-------- |
| express           | Web 框架    |
| sequelize         | ORM       |
| sqlite3           | SQLite 驱动 |
| bcrypt            | 密码加密      |
| jsonwebtoken      | JWT 认证    |
| cors              | 跨域支持      |
| dotenv            | 环境变量      |
| express-validator | 参数验证      |

### 前端依赖

| 依赖              | 说明       |
| :-------------- | :------- |
| vue             | Vue 3    |
| element-plus    | UI 组件    |
| lucide-vue-next | 图标库      |
| axios           | HTTP 客户端 |
| pinia           | 状态管理     |

### 插件依赖

| 依赖              | 说明    |
| :-------------- | :---- |
| vue             | Vue 3 |
| lucide-vue-next | 图标库   |
| vite            | 构建工具  |

