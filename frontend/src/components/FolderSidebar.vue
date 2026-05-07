<template>
  <aside class="sidebar" :class="{ 'collapsed': collapsed }">
    <div class="sidebar-header">
      <h3>文件夹</h3>
      <button class="add-folder-btn" @click="$emit('add-folder')">
        <Plus />
      </button>
    </div>
    <div class="folder-tree-container">
      <FolderTreeNode
        v-for="folder in folderTree"
        :key="folder.id"
        :folder="folder"
        :level="0"
        :selected-folder-id="selectedFolderId"
        :expanded-folders="expandedFolders"
        @select="handleSelect"
        @contextmenu="handleContextMenu"
        @toggle-expand="handleToggleExpand"
        @edit="handleEdit"
        @delete="handleDelete"
        @folder-drop="handleDrop"
      />
      
      <div v-if="folderTree.length === 0" class="empty-folders">
        <Folder class="empty-folder-icon" />
        <span>暂无文件夹</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { Plus, Folder } from 'lucide-vue-next';
import FolderTreeNode from './FolderTreeNode.vue';

defineProps({
  folderTree: {
    type: Array,
    required: true
  },
  selectedFolderId: {
    type: [Number, String, null],
    default: null
  },
  expandedFolders: {
    type: Array,
    default: () => []
  },
  collapsed: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'select',
  'add-folder',
  'toggle-expand',
  'edit',
  'delete',
  'folder-drop'
]);

const handleSelect = (folderOrId) => {
  emit('select', folderOrId);
};

const handleContextMenu = (event, node) => {
  emit('contextmenu', event, node);
};

const handleToggleExpand = (folderId) => {
  emit('toggle-expand', folderId);
};

const handleEdit = (folder) => {
  emit('edit', folder);
};

const handleDelete = (folder) => {
  emit('delete', folder);
};

const handleDrop = (dropData) => {
  emit('folder-drop', dropData);
};
</script>

<style scoped>
.sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-header h3::before {
  content: '';
  width: 4px;
  height: 16px;
  background: linear-gradient(180deg, #409eff 0%, #67c23a 100%);
  border-radius: 2px;
}

.add-folder-btn {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-folder-btn svg {
  width: 16px;
  height: 16px;
  color: #fff;
}

.add-folder-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.folder-tree-container {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  min-height: 0;
}

.folder-tree-container::-webkit-scrollbar {
  width: 4px;
}

.folder-tree-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.folder-tree-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.folder-tree-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.empty-folders {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
  color: rgba(255, 255, 255, 0.4);
}

.empty-folder-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    width: 260px;
    padding: 16px;
    padding-top: 70px;
    transform: translateX(-100%);
    z-index: 110;
    border-radius: 0 16px 16px 0;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
  }

  .sidebar.collapsed {
    transform: translateX(0);
  }

  .sidebar-header {
    position: absolute;
    top: 70px;
    left: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .sidebar-header h3 {
    font-size: 14px;
    margin: 0;
  }

  .folder-tree-container {
    max-height: calc(100vh - 140px);
    margin-top: 60px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar {
    width: 220px;
    padding: 16px;
  }
}
</style>