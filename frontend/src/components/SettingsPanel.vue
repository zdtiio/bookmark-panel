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
              <el-radio label="color">纯色</el-radio>
              <el-radio label="image">图片</el-radio>
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
        <div v-if="tokens.length === 0" class="empty-token">
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
import { tokenApi } from '../api';
import { ElMessage } from 'element-plus';
import { Plus } from 'lucide-vue-next';

const authStore = useAuthStore();
const configStore = useConfigStore();

defineEmits(['close']);

const activeTab = ref('appearance');
const localConfig = ref({ ...configStore.config });
const customSearchEngine = ref('');

const tokens = ref([]);
const showCreateToken = ref(false);
const showNewToken = ref(false);
const newTokenValue = ref('');

const tokenForm = ref({
  name: ''
});

const loadTokens = async () => {
  try {
    tokens.value = await tokenApi.getTokens();
  } catch (error) {
    console.error('Failed to load tokens:', error);
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
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

onMounted(() => {
  loadTokens();
});
</script>

<style scoped>
.settings-panel {
  padding: 20px;
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
</style>
