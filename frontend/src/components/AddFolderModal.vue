<template>
  <el-dialog 
    :title="editingFolder ? '修改文件夹' : '添加文件夹'" 
    v-model="localVisible"
    :width="isMobile ? '90%' : '500px'"
    :fullscreen="isMobile"
    @close="handleClose"
  >
    <el-form :model="form">
      <el-form-item label="文件夹名称">
        <el-input v-model="form.name" placeholder="请输入文件夹名称" />
      </el-form-item>
      <el-form-item label="父文件夹">
        <el-tree-select
          v-model="form.parentId"
          :data="parentFolderTree"
          :props="treeProps"
          placeholder="选择父文件夹（可选）"
          :render-after-expand="false"
          :check-strictly="true"
          :expand-on-click-node="false"
        >
          <template #empty>
            <div style="padding: 12px; text-align: center; color: rgba(255,255,255,0.5);">
              暂无文件夹
            </div>
          </template>
          <template #default-value>
            <span v-if="selectedParentFolderPath">{{ selectedParentFolderPath }}</span>
            <span v-else style="color: rgba(255,255,255,0.5);">选择父文件夹（可选）</span>
          </template>
        </el-tree-select>
        <div v-if="form.parentId !== null && editingFolder" style="margin-top: 8px;">
          <button 
            type="button" 
            @click="form.parentId = null" 
            class="clear-parent-btn"
          >
            清空父文件夹（设为顶级）
          </button>
        </div>
        <div v-if="form.parentId === null" style="margin-top: 8px; font-size: 12px; color: rgba(255,255,255,0.5);">
          当前为顶级文件夹
        </div>
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
  editingFolder: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:visible', 'save']);

const localVisible = ref(false);

watch(() => props.visible, (newVal) => {
  localVisible.value = newVal;
});

const form = ref({
  name: '',
  parentId: null
});

const treeProps = {
  label: 'label',
  children: 'children',
  value: 'id'
};

const availableParentFolders = computed(() => {
  if (!props.editingFolder) return props.folders;
  const excludeIds = [props.editingFolder.id];
  const getChildIds = (folderId) => {
    const children = props.folders.filter(f => f.parentId === folderId);
    children.forEach(child => {
      excludeIds.push(child.id);
      getChildIds(child.id);
    });
  };
  getChildIds(props.editingFolder.id);
  return props.folders.filter(f => !excludeIds.includes(f.id));
});

const parentFolderTree = computed(() => {
  const buildTree = (parentId = null) => {
    return availableParentFolders.value
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

const selectedParentFolderPath = computed(() => {
  const folderId = form.value.parentId;
  if (!folderId) return null;
  const path = [];
  let currentId = folderId;
  while (currentId) {
    const folder = props.folders.find(f => String(f.id) === String(currentId));
    if (!folder) break;
    path.unshift(folder.name);
    currentId = folder.parentId;
  }
  return path.join('/');
});

const resetForm = () => {
  form.value = {
    name: '',
    parentId: null
  };
};

watch(() => props.editingFolder, (newVal) => {
  if (newVal && typeof newVal === 'object') {
    form.value = { 
      name: newVal.name || newVal.label || '', 
      parentId: newVal.parentId || null 
    };
  } else {
    resetForm();
  }
}, { immediate: true });

watch(() => localVisible.value, (newVal) => {
  if (!newVal) {
    emit('update:visible', false);
    if (!props.editingFolder) {
      resetForm();
    }
  }
});

const handleClose = () => {
  localVisible.value = false;
};

const handleSave = () => {
  if (!form.value.name) {
    ElMessage.error('请输入文件夹名称');
    return;
  }
  emit('save', { 
    ...form.value,
    editingFolder: props.editingFolder 
  });
  localVisible.value = false;
};
</script>

<style scoped>
.clear-parent-btn {
  background: rgba(245, 108, 108, 0.15);
  border: 1px solid rgba(245, 108, 108, 0.3);
  color: #f56c6c;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-parent-btn:hover {
  background: rgba(245, 108, 108, 0.3);
  border-color: rgba(245, 108, 108, 0.5);
}
</style>
