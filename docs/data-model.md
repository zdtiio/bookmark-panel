# 数据模型

数据库使用 SQLite，通过 Sequelize 定义。默认文件为 `backend/database/bookmarks.db`，可通过 `DB_PATH` 修改。

Sequelize 默认使用复数表名，因此实际表名为 `Users`、`Folders`、`Bookmarks`、`Configs`、`ApiTokens`。

## 1. 关系概览

```text
User 1 ── N Folder
User 1 ── N Bookmark
User 1 ── N Config
User 1 ── N ApiToken
Folder 1 ── N Bookmark        (删除文件夹时书签 folderId 置空)
Folder 1 ── N Folder          (parentId 自关联)
```

- 删除用户时，其文件夹、书签、配置和 Token 级联删除。
- 删除文件夹时，`Bookmark.folderId` 关联设置为 `SET NULL`；但业务层会阻止删除仍包含书签或子文件夹的文件夹。

## 2. Users

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | INTEGER | PK, AUTOINCREMENT | 用户 ID |
| `username` | STRING(50) | NOT NULL, UNIQUE | 用户名 |
| `email` | STRING(100) | NOT NULL, UNIQUE, 邮箱校验 | 登录邮箱 |
| `password` | STRING(255) | NOT NULL | bcrypt 哈希（cost 10） |
| `createdAt` | DATE | 默认当前时间 | 创建时间 |
| `updatedAt` | DATE | 默认当前时间 | 更新时间 |

注册时通过 `beforeCreate` 钩子自动哈希密码；更新密码时通过 `beforeUpdate` 重新哈希。

注册成功后会在 `Folders` 中创建一条 `name = '默认文件夹'`、`parentId = null` 的记录。

## 3. Folders

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | INTEGER | PK, AUTOINCREMENT | 文件夹 ID |
| `userId` | INTEGER | NOT NULL | 所属用户 |
| `name` | STRING(100) | NOT NULL | 文件夹名称 |
| `parentId` | INTEGER | NULL | 父文件夹，NULL 表示顶层 |
| `sortOrder` | INTEGER | NOT NULL, 默认 0 | 同级排序值 |
| `createdAt` | DATE | 默认当前时间 | 创建时间 |

索引：

| 索引名 | 字段 |
| --- | --- |
| `idx_folder_user_parent` | `userId`, `parentId` |
| `idx_folder_user_sort` | `userId`, `sortOrder` |

排序规则：`sortOrder ASC, name ASC`。

## 4. Bookmarks

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | INTEGER | PK, AUTOINCREMENT | 书签 ID |
| `userId` | INTEGER | NOT NULL | 所属用户 |
| `folderId` | INTEGER | NULL | 所属文件夹，NULL 表示根目录 |
| `title` | STRING(255) | NOT NULL | 标题 |
| `url` | STRING(1024) | NOT NULL | 链接，必须是 http(s) URL |
| `description` | TEXT | NULL | 描述 |
| `icon` | STRING(512) | NULL | 图标 URL 或上传路径 |
| `sortOrder` | INTEGER | NOT NULL, 默认 0 | 排序值 |
| `createdAt` | DATE | 默认当前时间 | 创建时间 |
| `updatedAt` | DATE | 默认当前时间 | 更新时间 |

索引：

| 索引名 | 字段 |
| --- | --- |
| `idx_bookmark_user_folder` | `userId`, `folderId` |
| `idx_bookmark_user_sort` | `userId`, `sortOrder` |

URL 校验有两条：

1. Sequelize `isUrl` 校验。
2. 自定义校验，必须以 `http://` 或 `https://` 开头。

排序规则：`sortOrder ASC, createdAt DESC`。

## 5. Configs

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | INTEGER | PK, AUTOINCREMENT | 配置 ID |
| `userId` | INTEGER | NOT NULL | 所属用户 |
| `key` | STRING(100) | NOT NULL | 配置键 |
| `value` | TEXT | NULL | 配置值 |
| `createdAt` | DATE | 默认当前时间 | 创建时间 |

存储规则：

- 字符串原样存储。
- 对象、数组、数字、布尔值使用 `JSON.stringify` 存储。
- 读取时尝试 `JSON.parse`，失败则按字符串返回。

当前使用的配置键：

| 键 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `siteName` | string | `Bookmark-Panel` | 站点名称 |
| `searchEngine` | string | `https://www.google.com/search?q=` | 搜索引擎 URL 前缀 |
| `showIcons` | boolean | `true` | 是否展示图标 |
| `showFolders` | boolean | `true` | 是否展示文件夹侧栏 |
| `backgroundColor` | string | `#1a1a2e` | 纯色背景 |
| `backgroundType` | string | `color` | `color` 或 `image` |
| `backgroundImage` | string | 空 | 背景图片 URL |
| `defaultFolderId` | number/null | `null` | 默认文件夹 |
| `homeItems` | array | `[]` | 首页收藏项，元素为 `{type, id}` |

`homeItems` 的 `type` 只能是 `bookmark` 或 `folder`，顺序即首页展示顺序。

> `Configs` 没有 `(userId, key)` 唯一索引。`findOrCreate` 在并发写入时理论上可能产生重复键，当前 UI 为单用户串行保存，实际影响较小；如需严格保证，可补充唯一索引。

## 6. ApiTokens

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | INTEGER | PK, AUTOINCREMENT | Token ID |
| `userId` | INTEGER | NOT NULL | 所属用户 |
| `token` | STRING(255) | NOT NULL, UNIQUE | 明文 Token 的 SHA-256 十六进制哈希 |
| `name` | STRING(100) | NULL | Token 名称 |
| `createdAt` | DATE | 默认当前时间 | 创建时间 |
| `lastUsedAt` | DATE | NULL | 最后使用时间 |

- 明文 Token 由 32 字节随机数生成，格式为 64 位十六进制字符串。
- 明文只在创建或轮转响应中出现一次。
- 校验使用 `crypto.timingSafeEqual` 比较哈希，避免时序攻击。
- 校验成功会更新 `lastUsedAt`。

## 7. 数据文件与备份

需要备份的运行时数据：

```text
backend/database/bookmarks.db   # 业务数据
backend/uploads/                # 书签图标
```

推荐方式：

1. 先停止写入（停止容器或服务）。
2. 复制上述目录。
3. 恢复时保持相同目录结构和 `DB_PATH` / `UPLOAD_PATH` 配置。

也可以使用用户级导出：

```text
GET /api/config/export
```

该接口导出用户信息、书签、文件夹和配置的 JSON，但不包含图标文件本身；图标的 `icon` 字段会保留 URL 或 `/uploads/...` 路径。
