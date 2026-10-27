# 书签管理面板文档

本目录是书签管理面板的完整项目文档，面向使用者、部署者和二次开发者。文档内容以当前仓库代码为准，重点说明实际行为、接口契约和运维方式。

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [architecture.md](./architecture.md) | 系统组成、目录结构、请求链路、认证与缓存策略 |
| [features.md](./features.md) | 首页、管理视图、文件夹、书签、搜索、设置等功能说明 |
| [api.md](./api.md) | REST API 参考、请求参数、响应格式与示例 |
| [data-model.md](./data-model.md) | 数据表、字段、索引、关联关系与配置项 |
| [development.md](./development.md) | 本地开发、环境变量、构建命令与排错 |
| [deployment.md](./deployment.md) | Docker、Compose、反向代理、备份与 CI 发布 |
| [extension.md](./extension.md) | 浏览器插件的结构、构建、安装与配置 |

## 项目速览

- **后端**：Node.js 24.22.1 LTS + Express 4 + Sequelize 6 + SQLite
- **前端**：Vue 3 + Element Plus + Pinia + Vite 5
- **插件**：Manifest V3，Chrome / Edge / Firefox 共用一套源码
- **默认端口**：后端 `3000`，前端开发服务器 `5173`
- **持久化目录**：`backend/database/`（SQLite）与 `backend/uploads/`（书签图标）
- **生产形态**：后端同时提供 `/api` 接口和构建后的前端静态文件

## 推荐阅读路径

- 只想部署：先看 [deployment.md](./deployment.md)，再看 [development.md](./development.md) 的环境变量部分。
- 想了解功能：看 [features.md](./features.md)。
- 想接第三方客户端：看 [api.md](./api.md) 和 [data-model.md](./data-model.md)。
- 想改代码：看 [architecture.md](./architecture.md) 和 [development.md](./development.md)。

## 文档维护约定

- 接口路径、字段、默认值以 `backend/src/` 与 `frontend/src/` 中的实现为准。
- 修改接口或数据结构时，同步更新 [api.md](./api.md) 与 [data-model.md](./data-model.md)。
- 修改部署方式或环境变量时，同步更新 [deployment.md](./deployment.md) 与 `README.md`。
- 文档中的示例默认使用 `http://localhost:3000`，生产环境请替换为实际域名。
