# API 参考

## 1. 基础约定

- 基础路径：`/api`
- 请求与响应：`application/json`（导入、上传除外）
- 认证方式：
  - `Authorization: Bearer <JWT>`
  - `X-API-Token: <API Token>`
- 服务地址示例：`http://localhost:3000`

### 响应包装

除特别说明外，业务接口返回：

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "获取书签列表成功",
  "data": [],
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

错误示例：

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "url 不是有效的URL地址",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

以下接口**不使用**统一包装，直接返回业务对象：

- `GET /api/config`
- `PUT /api/config`
- `GET /api/config/export`
- `POST /api/config/import`
- `/api/tokens/*`
- `POST /api/bookmarks/icon`
- 认证中间件产生的 401：`{ "message": "..." }`

### 认证错误

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{ "message": "No token, authorization denied" }
```

可能的消息：

- `No token, authorization denied`
- `Token is not valid`
- `Invalid API token`
- `API token validation failed`

## 2. 认证

### POST `/api/auth/register`

注册并直接返回 JWT，同时创建默认文件夹。

请求：

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "secret123"
}
```

响应 `201`：

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "注册成功",
  "data": {
    "token": "<JWT>",
    "user": { "id": 1, "username": "alice", "email": "alice@example.com" }
  },
  "timestamp": "..."
}
```

### POST `/api/auth/login`

请求：

```json
{ "email": "alice@example.com", "password": "secret123" }
```

响应：`data.token` + `data.user`，结构同注册。

### POST `/api/auth/token-login`

使用 API Token 换取 JWT，供插件免密进入面板。

请求：

```json
{ "token": "<API Token 明文>" }
```

响应：`data.token` + `data.user`。

失败时返回 `401`：

```json
{
  "success": false,
  "code": "INVALID_API_TOKEN",
  "message": "API Token 无效",
  "timestamp": "..."
}
```

### GET `/api/auth/me`

需要认证。

响应：

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "获取用户信息成功",
  "data": {
    "user": { "id": 1, "username": "alice", "email": "alice@example.com" }
  },
  "timestamp": "..."
}
```

### POST `/api/auth/logout`

无需认证，仅返回成功。JWT 为无状态凭证，服务端不维护会话；客户端需自行删除本地 Token。

## 3. 书签

以下接口均需要认证。

### GET `/api/bookmarks`

获取当前用户全部书签，按 `sortOrder ASC, createdAt DESC` 排序。

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "获取书签列表成功",
  "data": [
    {
      "id": 1,
      "userId": 1,
      "folderId": 2,
      "title": "Example",
      "url": "https://example.com",
      "description": "",
      "icon": "https://example.com/favicon.ico",
      "sortOrder": 0,
      "createdAt": "2026-01-01T12:00:00.000Z",
      "updatedAt": "2026-01-01T12:00:00.000Z"
    }
  ],
  "timestamp": "..."
}
```

### GET `/api/bookmarks/folder/:folderId`

按文件夹查询书签。仍会校验 `userId`。

### GET `/api/bookmarks/search?q=<keyword>`

在 `title`、`url`、`description` 中做 `LIKE %keyword%` 匹配。`q` 为空时返回 400。

### GET `/api/bookmarks/:id`

获取单个书签。不存在或不属于当前用户时返回 404。

### POST `/api/bookmarks`

创建书签。

请求：

```json
{
  "title": "Example",
  "url": "https://example.com",
  "description": "可选",
  "icon": "可选",
  "folderId": 2,
  "sortOrder": 0
}
```

约束：

- `title` 必填，最长 255。
- `url` 必填，必须是 `http://` 或 `https://` 开头的合法 URL。
- `folderId` 可为空；不为空时必须是当前用户自己的文件夹。

响应 `201`，`data` 为新书签对象。

### PUT `/api/bookmarks/:id`

更新书签，请求体字段同创建，按需传部分字段。

### PUT `/api/bookmarks/:id/folder`

把单个书签移动到指定文件夹。

```json
{ "folderId": 3 }
```

`folderId` 为 `null` 表示移动到根目录。

### PUT `/api/bookmarks/batch/folder`

批量移动书签到目标文件夹，并重排源文件夹与目标文件夹的 `sortOrder`。

```json
{
  "ids": [1, 2, 3],
  "folderId": 5
}
```

### PUT `/api/bookmarks/order`

按数组顺序重写书签排序，数组下标即新的 `sortOrder`。

```json
{
  "bookmarks": [
    { "id": 3 },
    { "id": 1 },
    { "id": 2 }
  ]
}
```

### DELETE `/api/bookmarks/:id`

删除书签。不存在或不属于当前用户时返回 404。

### POST `/api/bookmarks/import`

导入书签。请求体为 JSON。

HTML 格式：

```json
{
  "format": "html",
  "htmlContent": "<!DOCTYPE NETSCAPE-Bookmark-file-1>...",
  "folderId": 1
}
```

Chrome 格式：

```json
{
  "format": "chrome",
  "bookmarks": { "roots": { "bookmark_bar": { "children": [] } } },
  "folderId": 1
}
```

Firefox 格式：

```json
{
  "format": "firefox",
  "bookmarks": { "children": [] },
  "folderId": 1
}
```

规则：

- `folderId` 是导入的根目标文件夹。
- HTML 中的多层文件夹路径会转换为 `/` 分隔的路径并自动创建；Chrome / Firefox JSON 中的嵌套文件夹也会按层级创建。
- 已存在相同 URL 的书签会跳过。
- 非 `http://` / `https://` 链接会被忽略。
- 响应：

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "成功导入 12 个书签",
  "data": { "count": 12, "foldersCreated": 3 },
  "timestamp": "..."
}
```

### GET `/api/bookmarks/export?format=html|chrome|firefox`

导出书签文件。

- `html`：`text/html`，默认格式。
- `chrome` / `firefox`：`application/json`。
- 其他格式：返回书签数组 JSON。

响应头包含 `Content-Disposition: attachment`。

### POST `/api/bookmarks/icon`

上传书签图标，`multipart/form-data`，字段名 `icon`。

- 允许类型：PNG、JPEG、JPG、SVG、GIF。
- 大小上限：5 MB。
- 响应（无统一包装）：

```json
{ "iconUrl": "/uploads/1730000000000-abc123.png" }
```

可通过 `http://localhost:3000/uploads/...` 访问。

## 4. 文件夹

### GET `/api/folders`

获取当前用户全部文件夹，按 `sortOrder ASC, name ASC` 排序。

### GET `/api/folders/:id`

获取单个文件夹。

### POST `/api/folders`

```json
{
  "name": "技术",
  "parentId": null,
  "sortOrder": 1
}
```

- `name` 必填。
- `parentId` 可为空；不为空时必须属于当前用户。
- `sortOrder` 可选，缺省为 0。

响应 `201`。

### PUT `/api/folders/:id`

重命名。

```json
{ "name": "新名称" }
```

### PUT `/api/folders/:id/parent`

移动文件夹。

```json
{ "parentId": 2 }
```

`parentId = null` 表示移动到顶层。

### PUT `/api/folders/order`

批量更新排序。

```json
{
  "folders": [
    { "id": 1, "sortOrder": 0 },
    { "id": 2, "sortOrder": 1 }
  ]
}
```

### DELETE `/api/folders/:id`

删除文件夹。存在子文件夹或书签时拒绝删除。

## 5. 配置

### GET `/api/config`

返回当前用户的配置对象（无包装）：

```json
{
  "siteName": "Bookmark-Panel",
  "searchEngine": "https://www.google.com/search?q=",
  "showIcons": true,
  "showFolders": true,
  "backgroundColor": "#1a1a2e",
  "backgroundType": "color",
  "backgroundImage": "",
  "defaultFolderId": null,
  "homeItems": []
}
```

### PUT `/api/config`

请求体为键值对，逐项写入后返回最新配置对象。

```json
{
  "siteName": "我的书签",
  "showIcons": false,
  "homeItems": [
    { "type": "bookmark", "id": 12 },
    { "type": "folder", "id": 3 }
  ]
}
```

字符串原样存储，其他类型 JSON 序列化存储。

### GET `/api/config/export`

导出当前用户数据，响应为 JSON 下载：

```json
{
  "user": { "username": "alice", "email": "alice@example.com" },
  "bookmarks": [],
  "folders": [],
  "configs": {}
}
```

### POST `/api/config/import`

导入用户数据，`multipart/form-data`，字段名 `file`。

- 仅接受 `.json` 或 `application/json`。
- 大小上限 10 MB。
- 文件夹按 `(name, parentId)` 合并，书签按 URL 去重，配置覆盖写入。
- 响应：`{ "message": "User data imported successfully" }`。

## 6. API Token

以下接口均需要 JWT 或 API Token 认证。响应不使用统一包装。

### GET `/api/tokens`

```json
[
  {
    "id": 1,
    "name": "Chrome",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "lastUsedAt": "2026-01-02T08:00:00.000Z"
  }
]
```

不会返回 Token 明文或哈希。

### POST `/api/tokens`

```json
{ "name": "Chrome" }
```

响应 `201`：

```json
{
  "id": 1,
  "name": "Chrome",
  "token": "<64 位十六进制明文>",
  "createdAt": "2026-01-01T12:00:00.000Z"
}
```

明文只在此响应中出现一次。

### PUT `/api/tokens/:id/rotate`

轮转 Token，响应结构同创建。旧 Token 立即失效。

### DELETE `/api/tokens/:id`

删除 Token。

### POST `/api/tokens/verify`

验证指定 Token 是否属于当前用户。

```json
{ "token": "<API Token 明文>" }
```

成功：

```json
{ "valid": true }
```

失败：`401 { "valid": false }`。

## 7. 常见状态码

| 状态码 | 场景 |
| --- | --- |
| 200 | 查询、更新、删除成功 |
| 201 | 注册、创建书签/文件夹/Token 成功 |
| 400 | 参数校验失败、缺少搜索关键词、导入文件缺失 |
| 401 | 未认证、JWT 失效、API Token 无效 |
| 404 | 资源不存在、更新/删除失败 |
| 500 | 未捕获的服务端错误 |
