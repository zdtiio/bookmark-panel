# 首页加载性能优化方案

## 一、问题分析

通过分析代码库，发现首页加载慢主要存在以下几个层面的问题：

### 1. 前端请求串行问题
- `loadUserData()` 在 `onMounted` 时串行调用三个 API 请求：`loadBookmarks()`、`loadFolders()`、`loadConfig()`
- 总加载时间 = 书签加载时间 + 文件夹加载时间 + 配置加载时间
- **影响程度：高**

### 2. 数据加载策略问题（核心问题）
- `getAllBookmarks()` 一次性加载所有书签，没有按需加载
- 当用户书签数量较大时，首次加载时间显著增加
- 用户可能只需要查看某个文件夹的书签，却加载了全部数据
- **影响程度：高**

### 3. 数据库查询优化问题
- 使用 SQLite 数据库，对于大量数据查询性能有限
- `searchBookmarks()` 使用 `LIKE %query%` 查询，无法使用索引
- `userId`、`folderId` 等字段没有创建索引
- **影响程度：中**

### 4. 组件渲染性能问题
- `BookmarkSection` 使用 `v-for` 渲染所有书签，无虚拟滚动
- 大量书签时 DOM 节点过多，导致渲染和交互卡顿
- **影响程度：高**

---

## 二、优化方案

### 方案 1：按需加载书签（高优先级）

**核心思路：**
- **先加载 config**（获取默认文件夹配置）
- **再加载 folders**（获取文件夹列表）
- **最后根据配置加载当前选中文件夹的书签**（而不是全部书签）

**修改文件：**
- `frontend/src/views/HomePage.vue` - 修改 `loadUserData()` 逻辑
- `frontend/src/api/bookmarks.js` - 添加按文件夹获取书签的 API
- `frontend/src/stores/bookmarks.js` - 添加按文件夹加载书签的方法
- `backend/src/controllers/bookmarkController.js` - 添加按文件夹查询接口
- `backend/src/services/bookmarkService.js` - 添加按文件夹查询方法

**优化内容：**
1. 加载顺序改为：`config` → `folders` → `bookmarks(按文件夹)`
2. 添加 `/api/bookmarks/folder/{folderId}` 接口
3. 切换文件夹时动态加载对应书签
4. 首次登录时根据 `config.defaultFolderId` 加载默认文件夹的书签

### 方案 2：数据库索引优化（中优先级）

**修改文件：**
- `backend/src/models/Bookmark.js` - 为 `userId`、`folderId` 添加索引
- `backend/src/models/Folder.js` - 为 `userId`、`parentId` 添加索引

**优化内容：**
- 为 `userId`、`folderId` 字段创建复合索引
- 提升按文件夹查询书签的性能

### 方案 3：前端分页/懒加载（中优先级）

**修改文件：**
- `backend/src/controllers/bookmarkController.js`
- `backend/src/services/bookmarkService.js`
- `frontend/src/api/bookmarks.js`
- `frontend/src/stores/bookmarks.js`

**优化内容：**
- 为按文件夹查询书签接口添加分页参数支持（page、limit）
- 单个文件夹书签数量较多时启用分页加载

### 方案 4：虚拟滚动（中优先级）

**修改文件：**
- `frontend/src/components/BookmarkSection.vue`

**优化内容：**
- 使用虚拟滚动组件，只渲染可视区域内的书签卡片
- 减少 DOM 节点数量，提升渲染性能

---

## 三、实施步骤

| 步骤 | 任务 | 优先级 | 预计时间 |
|-----|------|--------|---------|
| 1 | 后端添加按文件夹查询书签接口 | 高 | 0.5 天 |
| 2 | 前端修改加载逻辑（config → folders → bookmarks） | 高 | 1 天 |
| 3 | 数据库索引优化 | 中 | 0.5 天 |
| 4 | 分页支持（可选，根据数据量决定） | 中 | 1 天 |
| 5 | 虚拟滚动优化（可选，根据数据量决定） | 中 | 1 天 |
| 6 | 测试验证 | 中 | 0.5 天 |

---

## 四、预期效果

| 优化项 | 优化前 | 优化后 | 提升比例 |
|-------|--------|--------|---------|
| 书签加载量 | 全部书签 | 当前文件夹书签 | ~50-90%（取决于文件夹分布） |
| 首次加载时间 | 加载所有书签 | 加载单个文件夹书签 | ~50-90% |
| API 请求次数 | 3 次（串行） | 3 次（优化顺序） | 保持一致 |
| 查询性能 | 无索引 | 有索引 | ~90%（查询速度） |

---

## 五、加载流程（优化后）

```
页面初始化
    ↓
加载 config（获取 defaultFolderId）
    ↓
加载 folders（获取文件夹列表）
    ↓
确定当前选中文件夹（优先级：localStorage → config.defaultFolderId → 根文件夹）
    ↓
加载当前文件夹的书签
    ↓
渲染页面
    ↓
用户切换文件夹 → 动态加载对应文件夹的书签
```

---

## 六、关键代码改动说明

### 1. 后端 - 按文件夹查询书签
```javascript
// backend/src/controllers/bookmarkController.js
async getBookmarksByFolder(req, res, next) {
    try {
        const bookmarks = await bookmarkService.getBookmarksByFolder(
            req.user.id, 
            req.params.folderId
        );
        res.json(successResponse(bookmarks, '获取书签列表成功'));
    } catch (error) {
        next(error);
    }
}
```

### 2. 前端 - 修改加载逻辑
```javascript
// frontend/src/views/HomePage.vue
const loadUserData = async () => {
    // 先加载配置
    await configStore.loadConfig();
    
    // 再加载文件夹
    await bookmarkStore.loadFolders();
    
    // 确定当前选中文件夹
    let targetFolderId = localStorage.getItem('selectedFolderId');
    
    if (!targetFolderId) {
        targetFolderId = configStore.config.defaultFolderId;
    }
    
    if (!targetFolderId) {
        const rootFolder = folders.value.find(f => !f.parentId);
        targetFolderId = rootFolder?.id;
    }
    
    selectedFolderId.value = targetFolderId;
    
    // 最后加载当前文件夹的书签
    await bookmarkStore.loadBookmarksByFolder(targetFolderId);
};
```

### 3. 前端 - 切换文件夹时加载
```javascript
const selectFolder = async (folderOrId) => {
    const folderId = typeof folderOrId === "object" ? folderOrId.id : folderOrId;
    selectedFolderId.value = folderId;
    localStorage.setItem("selectedFolderId", folderId);
    
    // 动态加载该文件夹的书签
    await bookmarkStore.loadBookmarksByFolder(folderId);
};
```

---

## 七、风险评估

| 风险 | 描述 | 应对措施 |
|-----|------|---------|
| 网络请求增加 | 每次切换文件夹都需要请求 | 添加请求缓存机制 |
| 数据一致性 | 书签更新后需要刷新当前视图 | 添加刷新按钮或自动刷新机制 |
| 索引开销 | 索引影响写入性能 | 评估索引收益，选择性创建 |

---

## 八、推荐实施顺序

1. **第一步**：实施方案 1（按需加载书签），这是核心优化，效果最显著
2. **第二步**：实施方案 2（数据库索引），提升查询性能
3. **第三步**：根据实际数据量决定是否实施方案 3 和方案 4