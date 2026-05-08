<template>
  <div class="settings-panel">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="外观" name="appearance">
        <el-form :model="localConfig">
          <el-form-item label="站点名称">
            <el-input v-model="localConfig.siteName" placeholder="请输入站点名称" />
          </el-form-item>
          <el-form-item label="背景类型">
            <el-radio-group v-model="localConfig.backgroundType">
              <el-radio value="color">纯色</el-radio>
              <el-radio value="image">图片</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="背景颜色" v-if="localConfig.backgroundType === 'color'">
            <el-color-picker v-model="localConfig.backgroundColor" show-alpha />
          </el-form-item>
          <el-form-item label="背景图片" v-if="localConfig.backgroundType === 'image'">
            <el-input v-model="localConfig.backgroundImage" placeholder="请输入图片URL" />
          </el-form-item>
          <el-form-item>
            <el-switch v-model="localConfig.showIcons" active-text="显示图标" inactive-text="隐藏图标" />
          </el-form-item>
          <el-form-item>
            <el-switch v-model="localConfig.showFolders" active-text="显示文件夹" inactive-text="隐藏文件夹" />
          </el-form-item>
          <el-form-item label="默认文件夹">
            <el-tree-select
              :model-value="String(localConfig.defaultFolderId || '')"
              :data="defaultFolderTree"
              :props="treeProps"
              node-key="id"
              placeholder="请选择登录后默认显示的文件夹"
              :render-after-expand="false"
              :check-strictly="true"
              :expand-on-click-node="false"
              class="folder-select"
              @update:model-value="(val) => localConfig.defaultFolderId = val ? Number(val) : null"
            >
              <template #empty>
                <div style="padding: 12px; text-align: center; color: rgba(255,255,255,0.5);">
                  暂无文件夹，请先创建
                </div>
              </template>
            </el-tree-select>
            <span class="form-tip">该设置仅在首次登录时生效，刷新页面将显示上次访问的文件夹</span>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="搜索引擎" name="search">
        <el-form :model="localConfig">
          <el-form-item label="搜索引擎">
            <el-select v-model="localConfig.searchEngine">
              <el-option label="Google" value="https://www.google.com/search?q=" />
              <el-option label="百度" value="https://www.baidu.com/s?wd=" />
              <el-option label="必应" value="https://www.bing.com/search?q=" />
              <el-option label="自定义" value="custom" />
            </el-select>
          </el-form-item>
          <el-form-item label="自定义搜索引擎URL" v-if="localConfig.searchEngine === 'custom'">
            <el-input v-model="customSearchEngine" placeholder="例如: https://example.com/search?q=" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="API Token" name="token">
        <div v-if="!tokensLoaded" class="empty-token">
          <p>加载中...</p>
        </div>
        <div v-else-if="tokens.length === 0" class="empty-token">
          <p>暂无 API Token，请创建一个</p>
        </div>
        <div v-else class="token-list">
          <div v-for="token in tokens" :key="token.id" class="token-item">
            <div class="token-info">
              <span class="token-name">{{ token.name }}</span>
              <span class="token-date">创建于 {{ formatDate(token.createdAt) }}</span>
            </div>
            <div class="token-actions">
              <el-button size="small" @click="rotateToken(token.id)">轮转 Token</el-button>
              <el-button size="small" type="danger" @click="deleteToken(token.id)">删除</el-button>
            </div>
          </div>
        </div>
        <el-button type="primary" @click="createToken" class="create-token-btn">
          <Plus /> 创建 Token
        </el-button>
        <el-dialog title="创建 Token" v-model="showCreateToken">
          <el-form :model="tokenForm">
            <el-form-item label="Token 名称">
              <el-input v-model="tokenForm.name" placeholder="请输入 Token 名称" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="showCreateToken = false">取消</el-button>
            <el-button type="primary" @click="confirmCreateToken">创建</el-button>
          </template>
        </el-dialog>
        <el-dialog title="新 Token" v-model="showNewToken">
          <p>请保存以下 Token，它只会显示一次：</p>
          <el-input :value="newTokenValue" readonly class="token-value" />
          <template #footer>
            <el-button @click="showNewToken = false">确定</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <el-tab-pane label="数据备份" name="backup">
        <div class="backup-section">
          <h3>导出数据</h3>
          <p>导出您的所有书签、文件夹和配置</p>
          <el-button type="primary" @click="exportData">导出数据</el-button>
        </div>
        <div class="backup-section">
          <h3>导入数据</h3>
          <p>从备份文件导入数据</p>
          <el-upload
            action="/api/configs/import"
            :headers="{ Authorization: `Bearer ${authStore.token}` }"
            :on-success="handleImportSuccess"
            :before-upload="beforeImport"
            accept=".json"
            class="import-upload"
          >
            <el-button>选择文件</el-button>
          </el-upload>
        </div>
      </el-tab-pane>

      <el-tab-pane label="书签导入导出" name="bookmark-import-export">
        <div class="backup-section">
          <h3>导出书签</h3>
          <p>导出HTML格式书签，可导入到Chrome、360等浏览器</p>
          <el-button type="primary" @click="exportBookmarks">导出书签</el-button>
        </div>
        <div class="backup-section">
          <h3>导入书签</h3>
          <p>从Chrome、360等浏览器导出的HTML文件导入书签</p>
          <el-form-item label="目标文件夹" required>
            <template #label>
              目标文件夹 <span class="required-star">*</span>
            </template>
            <el-tree-select
              v-model="importFolderId"
              :data="folderTree"
              :props="treeProps"
              placeholder="请选择文件夹"
              :render-after-expand="false"
              :check-strictly="true"
              :expand-on-click-node="false"
              :disabled="folders.length === 0"
            >
              <template #empty>
                <div style="padding: 12px; text-align: center; color: rgba(255,255,255,0.5);">
                  暂无文件夹，请先创建
                </div>
              </template>
            </el-tree-select>
          </el-form-item>
          <el-upload
            :action="''"
            :headers="{ Authorization: `Bearer ${authStore.token}` }"
            :on-change="handleBookmarkFileChange"
            :before-upload="beforeBookmarkImport"
            accept=".html"
            class="import-upload"
          >
            <el-button>选择HTML文件</el-button>
          </el-upload>
          <p v-if="importingBookmarks" class="importing-text">正在导入...</p>
        </div>
      </el-tab-pane>
    </el-tabs>

    <div class="settings-footer">
      <el-button @click="$emit('close')">取消</el-button>
      <el-button type="primary" @click="saveSettings">保存设置</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useConfigStore } from '../stores/config';
import { tokenApi, bookmarkApi, folderApi } from '../api';
import { ElMessage } from 'element-plus';
import ElUpload from 'element-plus/es/components/upload/index';
import { Plus } from 'lucide-vue-next';

const authStore = useAuthStore();
const configStore = useConfigStore();

const emit = defineEmits(['close']);

const activeTab = ref('appearance');
const localConfig = ref({ ...configStore.config });
const customSearchEngine = ref('');

const tokens = ref([]);
const tokensLoaded = ref(false);
const showCreateToken = ref(false);
const showNewToken = ref(false);
const newTokenValue = ref('');
const importingBookmarks = ref(false);
const folders = ref([]);
const importFolderId = ref('');

const treeProps = {
  label: 'label',
  children: 'children',
  value: 'id'
};

const folderTree = computed(() => {
  const buildTree = (parentId = null) => {
    return folders.value
      .filter(f => f.parentId === parentId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(folder => ({
        id: folder.id,
        label: folder.name,
        children: buildTree(folder.id)
      }));
  };
  return buildTree(null);
});

const defaultFolderTree = computed(() => {
  const buildTree = (parentId = null) => {
    return folders.value
      .filter(f => String(f.parentId) === String(parentId))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(folder => ({
        id: String(folder.id),
        label: folder.name,
        children: buildTree(folder.id)
      }));
  };
  const tree = buildTree(null);
  return tree;
});

const selectedDefaultFolderPath = computed(() => {
  const folderId = localConfig.value.defaultFolderId;
  if (!folderId && folderId !== 0) return null;
  const path = [];
  let currentId = folderId;
  while (currentId) {
    const folder = folders.value.find(f => String(f.id) === String(currentId));
    if (!folder) break;
    path.unshift(folder.name);
    currentId = folder.parentId;
  }
  return path.length > 0 ? path.join('/') : null;
});

const tokenForm = ref({
  name: ''
});

const loadTokens = async () => {
  try {
    const result = await tokenApi.getTokens();
    tokens.value = Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Failed to load tokens:', error);
    tokens.value = [];
  } finally {
    tokensLoaded.value = true;
  }
};

const createToken = () => {
  tokenForm.value = { name: '' };
  showCreateToken.value = true;
};

const confirmCreateToken = async () => {
  try {
    const response = await tokenApi.createToken(tokenForm.value.name || 'Default');
    newTokenValue.value = response.token;
    showCreateToken.value = false;
    showNewToken.value = true;
    await loadTokens();
  } catch (error) {
    ElMessage.error('创建失败');
  }
};

const rotateToken = async (id) => {
  try {
    const response = await tokenApi.rotateToken(id);
    newTokenValue.value = response.token;
    showNewToken.value = true;
    await loadTokens();
  } catch (error) {
    ElMessage.error('轮转失败');
  }
};

const deleteToken = async (id) => {
  try {
    await tokenApi.deleteToken(id);
    ElMessage.success('删除成功');
    await loadTokens();
  } catch (error) {
    ElMessage.error('删除失败');
  }
};

const exportData = async () => {
    try {
      const response = await fetch('/api/configs/export', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      a.download = `bookmark-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      ElMessage.success('导出成功');
    } catch (error) {
      ElMessage.error('导出失败');
    }
  };

  const exportBookmarks = async () => {
    try {
      const response = await fetch('/api/bookmarks/export?format=html', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}`;
      a.download = `chrome_bookmarks_${dateStr}.html`;
      a.click();
      URL.revokeObjectURL(url);
      ElMessage.success('书签导出成功');
    } catch (error) {
      ElMessage.error('书签导出失败');
    }
  };

  const handleBookmarkFileChange = async (file) => {
    if (!importFolderId.value) {
      ElMessage.error('请先选择目标文件夹');
      return;
    }
    
    importingBookmarks.value = true;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const htmlContent = e.target.result;
        try {
          const importResponse = await fetch('/api/bookmarks/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authStore.token}`
            },
            body: JSON.stringify({ 
              format: 'html', 
              htmlContent,
              folderId: importFolderId.value
            })
          });
          const result = await importResponse.json();
          ElMessage.success(`成功导入 ${result.count} 个书签，创建 ${result.foldersCreated || 0} 个子文件夹`);
        } catch (error) {
          ElMessage.error('书签导入失败');
        } finally {
          importingBookmarks.value = false;
        }
      };
      reader.readAsText(file.raw, 'UTF-8');
    } catch (error) {
      ElMessage.error('读取文件失败');
      importingBookmarks.value = false;
    }
  };

  const beforeBookmarkImport = () => {
    return false;
  };

const handleImportSuccess = () => {
  ElMessage.success('导入成功');
  window.location.reload();
};

const beforeImport = (file) => {
  const isJson = file.type === 'application/json' || file.name.endsWith('.json');
  if (!isJson) {
    ElMessage.error('请上传 JSON 文件');
    return false;
  }
  return true;
};

const saveSettings = async () => {
  const configToSave = { ...localConfig.value };
  if (configToSave.searchEngine === 'custom') {
    configToSave.searchEngine = customSearchEngine.value;
  }
  await configStore.saveConfig(configToSave);
  ElMessage.success('设置已保存');
  emit('close');
  setTimeout(() => {
    window.location.reload();
  }, 300);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

const loadFolders = async () => {
  try {
    folders.value = await folderApi.getAllFolders();
  } catch (error) {
    console.error('Failed to load folders:', error);
  }
};

const loadConfig = async () => {
  await configStore.loadConfig();
  localConfig.value = { ...configStore.config };
};

onMounted(async () => {
  await loadFolders();
  await loadConfig();
  loadTokens();
});
</script>

<style scoped>
.settings-panel {
  padding: 20px;
  height: 100%;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.settings-footer {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.empty-token {
  padding: 40px;
  text-align: center;
  color: #999;
}

.token-list {
  margin-bottom: 16px;
}

.token-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 8px;
}

.token-name {
  font-weight: 600;
  margin-right: 16px;
}

.token-date {
  font-size: 12px;
  color: #999;
}

.create-token-btn {
  width: 100%;
}

.token-value {
  font-family: monospace;
  font-size: 14px;
  word-break: break-all;
}

.backup-section {
  margin-bottom: 24px;
}

.backup-section h3 {
  margin: 0 0 8px 0;
}

.backup-section p {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
}

.import-upload {
    margin-top: 8px;
  }

  .form-tip {
    display: block;
    margin-top: 8px;
    font-size: 12px;
    color: #999;
  }

  .folder-select {
    width: 100%;
  }

  :deep(.el-tabs__header) {
    margin: 0 0 16px 0;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px 8px 0 0;
    padding: 0 8px;
  }

  :deep(.el-tabs__nav) {
    border-bottom: none;
  }

  :deep(.el-tabs__item) {
    color: rgba(255, 255, 255, 0.7);
    margin: 0 8px;
    padding: 12px 16px;
    border-radius: 6px;
    transition: all 0.3s ease;
  }

  :deep(.el-tabs__item:hover) {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.1);
  }

  :deep(.el-tabs__item.is-active) {
    color: #409eff;
    background: rgba(64, 158, 255, 0.15);
  }

  :deep(.el-tabs__active-bar) {
    display: none;
  }

  :deep(.el-tabs__content) {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0 0 8px 8px;
    padding: 16px;
  }
</style>
