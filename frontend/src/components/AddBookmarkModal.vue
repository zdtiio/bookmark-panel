<template>
  <el-dialog 
    :title="editingBookmark ? '编辑书签' : '添加书签'" 
    v-model="localVisible"
    @close="handleClose"
  >
    <el-form :model="form">
      <el-form-item label="标题">
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
        <el-input v-model="form.url" placeholder="请输入网址" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" placeholder="请输入描述" />
      </el-form-item>
      <el-form-item label="文件夹">
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
import { ref, computed, watch } from 'vue';
import { ElMessage, ElDialog, ElForm, ElFormItem, ElInput, ElTreeSelect, ElButton } from 'element-plus';

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

const fetchTitleFromUrl = async () => {
  if (!form.value.url) {
    ElMessage.error('请先输入URL');
    return;
  }
  
  isFetchingTitle.value = true;
  
  try {
    const response = await fetch('/api/bookmarks/title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: form.value.url })
    });
    
    const data = await response.json();
    
    if (data.success && data.title) {
      form.value.title = data.title;
      ElMessage.success('标题获取成功');
    } else {
      ElMessage.error(data.message || '获取标题失败');
    }
  } catch (error) {
    ElMessage.error('获取标题失败，请检查URL是否正确');
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

<style scoped>
.title-input-group {
  display: flex;
  gap: 8px;
}

.title-input-group .el-input {
  flex: 1;
}
</style>
