# 浏览器插件

## 1. 支持范围

| 浏览器 | 清单 | 后台形态 |
| --- | --- | --- |
| Chrome | `manifest.chrome.json` | MV3 `service_worker` |
| Edge | 复用 Chrome 清单 | MV3 `service_worker` |
| Firefox | `manifest.firefox.json` | MV3 `background.scripts` |

Firefox 额外声明 `browserSettings` 权限，用于尝试修改主页；Chrome 不提供等价的扩展 API。

## 2. 目录结构

```text
extension/
├── src/
│   ├── background/
│   │   └── background.js   # 快捷键、通知、保存请求
│   ├── popup/
│   │   ├── index.html
│   │   └── main.js         # 添加书签表单
│   ├── options/
│   │   ├── index.html
│   │   └── main.js         # API URL / Token / 主页设置
│   └── newtab/
│       ├── index.html
│       └── main.js         # 新标签页接管页
├── manifests/
│   ├── manifest.chrome.json
│   └── manifest.firefox.json
├── icons/
├── vite.config.js
└── package.json
```

## 3. 构建

```bash
cd extension
npm install
npm run build
```

输出：

```text
extension/dist/chrome/
extension/dist/firefox/
```

也可以单独构建：

```bash
npm run build:chrome
npm run build:firefox
npm run build:edge
```

Vite 会：

- 以多页面方式打包 `popup`、`options`、`newtab`。
- 根据 `--mode` 复制对应清单为 `manifest.json`。
- 复制 `icons/`。
- 复制 `src/background/` 到产物。

Edge 使用 Chrome 清单，输出到 `dist/edge`。

## 4. 安装与调试

### Chrome

1. 打开 `chrome://extensions/`。
2. 开启「开发者模式」。
3. 点击「加载已解压的扩展程序」。
4. 选择 `extension/dist/chrome`。

### Edge

1. 打开 `edge://extensions/`。
2. 开启「开发人员模式」。
3. 加载 `extension/dist/edge`。

### Firefox

1. 打开 `about:addons`。
2. 设置 → 调试附加组件。
3. 「临时加载附加组件」，选择 `extension/dist/firefox/manifest.json`。

Firefox 临时加载的扩展在重启后会失效，正式使用需要签名或使用开发者版持续加载。

## 5. 配置

打开插件设置页（`options`），填写：

| 配置 | 说明 |
| --- | --- |
| API URL | 后端地址，例如 `http://localhost:3000`，不要带尾部 `/` |
| API Token | 面板「设置 → API Token」中创建的明文 Token |
| 取代主页 | 仅 Firefox 可尝试自动设置，其他浏览器会提示手动设置 |
| 取代新标签页 | 保存偏好；新标签页实际由清单中的 `chrome_url_overrides` 接管 |

「测试连接」会请求：

```http
GET /api/auth/me
X-API-Token: <token>
```

成功时显示当前用户名。

配置保存在 `chrome.storage.local`，键为：

```text
apiUrl
apiToken
replaceHomepage
replaceNewtab
```

## 6. 主要流程

### 6.1 添加书签弹窗

点击工具栏图标打开 `popup`：

1. 读取当前标签页的标题和 URL。
2. 并行请求 `GET /api/folders` 与 `GET /api/config`。
3. 用 `defaultFolderId` 预选默认文件夹；如果不存在则选「根目录」。
4. 提交 `POST /api/bookmarks`，请求头带 `X-API-Token`。
5. 成功后 0.8 秒自动关闭窗口。

文件夹下拉框按 `sortOrder` 和名称排序，并以缩进展示层级。

### 6.2 快捷键

清单注册了：

```text
Ctrl+Shift+S        Windows / Linux
Command+Shift+S     macOS
```

触发后，后台脚本会在新标签页打开 `src/popup/index.html`，并把当前页面的 `title`、`url` 作为查询参数传入。也就是说，快捷键打开的是**预填好的添加书签页面**，需要用户确认后保存。

后台还提供了 `saveCurrentPage()`，可通过 `chrome.runtime.sendMessage({ action: 'saveBookmark' })` 直接保存，但当前页面 UI 没有调用它。

### 6.3 新标签页

清单通过 `chrome_url_overrides.newtab` 接管新标签页：

- 如果已配置 `apiUrl` 和 `apiToken`：立即跳转到书签面板，并在 URL hash 中携带 `apiToken`。
- 如果未配置：显示本地新标签页，包含时钟、搜索框、保存当前页、打开面板、设置入口。

本地新标签页的搜索固定跳转 Google：

```text
https://www.google.com/search?q=<keyword>
```

它不读取面板中的 `searchEngine` 配置。

### 6.4 打开书签面板

插件通过以下方式拼接面板地址：

```text
https://your-panel.example.com/#apiToken=<urlencoded token>
```

面板 `App.vue` 会读取该 Token，调用 `POST /api/auth/token-login` 换取 JWT，然后立即从地址栏移除 Token。这样避免每次手动输入账号密码，也降低 Token 停留在历史记录中的风险。

## 7. 权限说明

Chrome/Edge：

```json
["storage", "activeTab", "tabs", "bookmarks", "notifications"]
```

Firefox 额外包含：

```json
"browserSettings"
```

用途：

- `storage`：保存 API URL、Token 和偏好。
- `activeTab` / `tabs`：读取当前标签页标题和 URL。
- `notifications`：后台保存结果提示。
- `bookmarks`：清单中声明，当前代码未使用浏览器书签 API。
- `browserSettings`：Firefox 尝试设置主页。

## 8. 已知限制

- `replaceNewtab` 复选框只保存值，不会动态启用/停用新标签页接管；实际接管由清单固定开启。
- Chrome 不支持由扩展修改主页，设置页会提示用户手动设置。
- 新标签页未配置 Token 时不会请求面板，因此无法展示服务端书签。
- 新标签页搜索固定 Google，不支持自定义搜索引擎。
- 后台的 `chrome.action.onClicked` 监听在配置了 `default_popup` 时通常不会触发；实际入口是弹窗本身和快捷键命令。
- 插件没有独立的构建测试；修改后请手动加载 `dist` 验证。

## 9. 调试建议

- 修改 `manifests/*.json` 后重新执行构建，确认 `dist/<browser>/manifest.json` 已更新。
- MV3 不允许内联脚本，页面脚本必须通过外部 `.js` 引入。
- 如果请求失败，先在设置页点「测试连接」；仍失败时检查 API URL 协议、CORS、反向代理和 Token 是否已轮转。
- Chrome 的 Service Worker 日志在 `chrome://extensions/` → 对应扩展 →「Service Worker」中查看。
- Firefox 的日志在 `about:debugging` → 对应扩展 →「检查」中查看。
