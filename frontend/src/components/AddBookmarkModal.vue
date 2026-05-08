<template>
  <el-dialog 
    :title="editingBookmark ? '编辑书签' : '添加书签'" 
    v-model="localVisible"
    :width="isMobile ? '90%' : '500px'"
    :fullscreen="isMobile"
    @close="handleClose"
  >
    <el-form :model="form">
      <el-form-item label="标题">
        <template #label>
          标题 <span class="required-star">*</span>
        </template>
        <div class="title-input-group">
          <el-input 
            v-model="form.title" 
            placeholder="请输入标题" 
            :disabled="isFetchingTitle"
          />
          <el-button 
            type="primary" 
            size="small" 
            @click="fetchTitleFromUrl"
            :loading="isFetchingTitle"
            :disabled="!form.url || isFetchingTitle"
          >
            获取标题
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="URL">
        <template #label>
          URL <span class="required-star">*</span>
        </template>
        <el-input v-model="form.url" placeholder="请输入网址" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" placeholder="请输入描述" />
      </el-form-item>
      <el-form-item label="文件夹">
        <template #label>
          文件夹 <span class="required-star">*</span>
        </template>
        <el-tree-select
          v-model="form.folderId"
          :data="folderTree"
          :props="treeProps"
          placeholder="请选择文件夹"
          :render-after-expand="false"
          :check-strictly="true"
          :expand-on-click-node="false"
        >
          <template #empty>
            <div style="padding: 12px; text-align: center; color: rgba(255,255,255,0.5);">
              暂无文件夹，请先创建
            </div>
          </template>
        </el-tree-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElDialog, ElForm, ElFormItem, ElInput, ElTreeSelect, ElButton } from 'element-plus';

const isMobile = ref(window.innerWidth < 768);

const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  folders: {
    type: Array,
    default: () => []
  },
  editingBookmark: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:visible', 'save']);

const localVisible = ref(false);
const isFetchingTitle = ref(false);

watch(() => props.visible, (newVal) => {
  localVisible.value = newVal;
});

const form = ref({
  title: '',
  url: '',
  description: '',
  folderId: null
});

const treeProps = {
  label: 'label',
  children: 'children',
  value: 'id'
};

const folderTree = computed(() => {
  const buildTree = (parentId = null) => {
    return props.folders
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

const resetForm = () => {
  form.value = {
    title: '',
    url: '',
    description: '',
    folderId: null
  };
};

watch(() => props.editingBookmark, (newVal) => {
  if (newVal && typeof newVal === 'object') {
    form.value = { 
      id: newVal.id,
      title: newVal.title || '',
      url: newVal.url || '',
      description: newVal.description || '',
      folderId: newVal.folderId || null
    };
  } else {
    resetForm();
  }
}, { immediate: true });

watch(() => localVisible.value, (newVal) => {
  if (!newVal) {
    emit('update:visible', false);
    if (!props.editingBookmark) {
      resetForm();
    }
  }
});

const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const fetchTitleFromUrl = async () => {
  if (!form.value.url) {
    ElMessage.error('请先输入URL');
    return;
  }
  
  if (!isValidUrl(form.value.url)) {
    ElMessage.error('请输入有效的URL地址，需要以 http:// 或 https:// 开头');
    return;
  }
  
  isFetchingTitle.value = true;
  
  try {
    const response = await fetch(form.value.url, {
      mode: 'cors',
      headers: {
        'Accept': 'text/html'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const title = doc.querySelector('title')?.textContent || '';
    
    if (title) {
      form.value.title = title.trim();
      ElMessage.success('标题获取成功');
    } else {
      ElMessage.error('该网页没有标题');
    }
  } catch (error) {
    console.error('Fetch title error:', error);
    if (error.message.includes('CORS')) {
      ElMessage.warning('该网站禁止跨域访问，无法自动获取标题，请手动输入');
    } else {
      ElMessage.error('获取标题失败，请检查URL是否正确或该网站是否可访问');
    }
  } finally {
    isFetchingTitle.value = false;
  }
};

const handleClose = () => {
  localVisible.value = false;
};

const handleSave = () => {
  if (!form.value.title) {
    ElMessage.error('请填写标题');
    return;
  }
  
  if (!form.value.url) {
    ElMessage.error('请填写URL');
    return;
  }
  
  if (!form.value.folderId) {
    ElMessage.error('请选择文件夹');
    return;
  }
  
  emit('save', { ...form.value });
  localVisible.value = false;
};
</script>

<style>
.title-input-group {
  display: flex;
  gap: 8px;
}

.title-input-group .el-input {
  flex: 1;
}

.required-star {
  color: #f56c6c;
}

.el-dialog {
  background: rgba(30, 30, 50, 0.98) !important;
  backdrop-filter: blur(10px) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4) !important;
}

.el-dialog__header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  padding: 20px 24px !important;
  background: transparent !important;
}

.el-dialog__title {
  color: #fff !important;
  font-size: 18px !important;
  font-weight: 600 !important;
}

.el-dialog__body {
  padding: 24px !important;
  background: transparent !important;
}

.el-dialog__footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
  padding: 16px 24px !important;
  background: transparent !important;
}

.el-form-item__label {
  color: rgba(255, 255, 255, 0.8) !important;
  font-weight: 500 !important;
}

.el-input__wrapper {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 12px !important;
  transition: all 0.3s ease !important;
}

.el-input__wrapper:hover {
  border-color: rgba(64, 158, 255, 0.5) !important;
}

.el-input__wrapper.is-focus {
  border-color: #409eff !important;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1) !important;
}

.el-input__inner {
  color: #fff !important;
  background: transparent !important;
}

.el-input__inner::placeholder {
  color: rgba(255, 255, 255, 0.5) !important;
}

.el-textarea__inner {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 12px !important;
  color: #fff !important;
}

.el-textarea__inner:hover {
  border-color: rgba(64, 158, 255, 0.5) !important;
}

.el-textarea__inner:focus {
  border-color: #409eff !important;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1) !important;
}

.el-textarea__inner::placeholder {
  color: rgba(255, 255, 255, 0.5) !important;
}

.el-select-dropdown {
  background: rgba(30, 30, 50, 0.98) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
}

.el-select-dropdown__wrap {
  background: transparent !important;
}

.el-select-dropdown__list {
  background: transparent !important;
}

.el-select-dropdown__item {
  color: #fff !important;
}

.el-select-dropdown__item:hover {
  background: rgba(64, 158, 255, 0.2) !important;
}

.el-tree-select .el-input__wrapper {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 12px !important;
}

.el-select__wrapper {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 12px !important;
}

.el-select__placeholder {
  color: rgba(255, 255, 255, 0.5) !important;
}

.el-select__placeholder.is-transparent {
  color: rgba(255, 255, 255, 0.5) !important;
}

.el-tree-select-dropdown {
  background: rgba(30, 30, 50, 0.98) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
}

.el-tree-select-dropdown .el-scrollbar {
  background: transparent !important;
}

.el-tree-select-dropdown .el-select-dropdown__wrap {
  background: transparent !important;
}

.el-tree-select-dropdown .el-select-dropdown__list {
  background: transparent !important;
}

.el-tree-select-dropdown .el-tree {
  background: transparent !important;
}

.el-tree-select-dropdown .el-tree-node__content {
  background: transparent !important;
}

.el-tree-select-dropdown .el-tree-node__content:hover {
  background: rgba(64, 158, 255, 0.15) !important;
}

.el-tree-node__label {
  color: #fff !important;
}

.el-tree-node:hover .el-tree-node__label {
  color: #409eff !important;
}

.el-tree-select-dropdown .el-tree-node.is-current > .el-tree-node__content {
  background: rgba(64, 158, 255, 0.2) !important;
}

.el-tree-select-dropdown .el-tree-node.is-current .el-tree-node__label {
  color: #409eff !important;
}

.el-tree-select-dropdown .el-tree-node__content .el-tree-node__expand-icon {
  color: rgba(255, 255, 255, 0.6) !important;
}

.el-tree-select-dropdown .el-tree-node__content .el-tree-node__expand-icon:hover {
  color: #409eff !important;
}

.el-tree-select-dropdown .el-tree-node__content .el-tree-node__expand-icon.is-leaf {
  color: transparent !important;
}

.el-tree-select-dropdown .el-tree-node__content .el-checkbox__inner {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

.el-tree-select-dropdown .el-tree-node__content .el-checkbox__input.is-checked .el-checkbox__inner {
  background: #409eff !important;
  border-color: #409eff !important;
}

.el-popper {
  background: rgba(30, 30, 50, 0.98) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.el-popper .el-popper__arrow::before {
  background: rgba(30, 30, 50, 0.98) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

.el-popper .el-select-dropdown {
  background: transparent !important;
  border: none !important;
}

.el-popper .el-select-dropdown__wrap {
  background: transparent !important;
}

.el-popper .el-select-dropdown__list {
  background: transparent !important;
}

.el-popper .el-tree {
  background: transparent !important;
}

.el-popper .el-tree-node__content {
  background: transparent !important;
}

.el-popper .el-tree-node__content:hover {
  background: rgba(64, 158, 255, 0.15) !important;
}

.el-popper .el-tree-node__label {
  color: #fff !important;
}

.el-popper .el-tree-node:hover .el-tree-node__label {
  color: #409eff !important;
}

.el-popper .el-tree-node.is-current > .el-tree-node__content {
  background: rgba(64, 158, 255, 0.2) !important;
}

.el-popper .el-tree-node.is-current .el-tree-node__label {
  color: #409eff !important;
}

.el-popper .el-tree-node__content .el-tree-node__expand-icon {
  color: rgba(255, 255, 255, 0.6) !important;
}

.el-popper .el-tree-node__content .el-tree-node__expand-icon:hover {
  color: #409eff !important;
}

.el-popper .el-tree-node__content .el-tree-node__expand-icon.is-leaf {
  color: transparent !important;
}

.el-popper .el-tree-node__content .el-checkbox__inner {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

.el-popper .el-tree-node__content .el-checkbox__input.is-checked .el-checkbox__inner {
  background: #409eff !important;
  border-color: #409eff !important;
}

.el-button--primary {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%) !important;
  border: none !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  padding: 10px 24px !important;
}

.el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.4) !important;
}

.el-button--default {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: rgba(255, 255, 255, 0.8) !important;
  border-radius: 10px !important;
  font-weight: 500 !important;
  padding: 10px 24px !important;
}

.el-button--default:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

.el-dialog__close {
  color: rgba(255, 255, 255, 0.6) !important;
}

.el-dialog__close:hover {
  color: #fff !important;
}
</style>
