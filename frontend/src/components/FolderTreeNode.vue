<template>
  <div 
    :key="folder.id" 
    class="folder-tree-item"
    :class="{ 'child': level > 0 }"
  >
    <div 
      class="folder-node-wrapper"
      :class="{ 'selected': folder.id === selectedFolderId }"
      @click="$emit('select', folder)"
      @contextmenu.prevent="$emit('contextmenu', $event, folder)"
    >
      <div class="folder-row">
        <button 
          v-if="folder.children && folder.children.length > 0" 
          class="expand-btn"
          @click.stop="$emit('toggle-expand', folder.id)"
        >
          <ChevronDown v-if="expandedFolders.includes(folder.id)" class="expand-icon" :class="{ 'small': level > 0 }" />
          <ChevronRight v-else class="expand-icon" :class="{ 'small': level > 0 }" />
        </button>
        <div v-else class="expand-placeholder"></div>
        
        <div class="folder-icon-wrapper">
          <FolderOpen v-if="expandedFolders.includes(folder.id)" class="folder-icon" :class="{ 'small': level > 0 }" />
          <Folder v-else class="folder-icon" :class="{ 'small': level > 0 }" />
        </div>
        
        <span class="folder-label">{{ folder.label }}</span>
        <span v-if="folder.id === selectedFolderId" class="current-folder-badge"></span>
      </div>
    </div>
    
    <transition name="slide-down">
      <div 
        v-if="folder.children && folder.children.length > 0 && expandedFolders.includes(folder.id)" 
        class="folder-children"
      >
        <FolderTreeNode
          v-for="child in folder.children"
          :key="child.id"
          :folder="child"
          :level="level + 1"
          :selected-folder-id="selectedFolderId"
          :expanded-folders="expandedFolders"
          @select="$emit('select', $event)"
          @contextmenu="$emit('contextmenu', $event, folder)"
          @toggle-expand="$emit('toggle-expand', $event)"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { Folder, FolderOpen, ChevronDown, ChevronRight } from 'lucide-vue-next';

defineProps({
  folder: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  selectedFolderId: {
    type: [Number, String, null],
    default: null
  },
  expandedFolders: {
    type: Array,
    default: () => []
  }
});

defineEmits(['select', 'contextmenu', 'toggle-expand']);
</script>

<style scoped>
.folder-tree-item {
  margin-bottom: 2px;
}

.folder-tree-item.child {
  padding-left: 20px;
}

.folder-node-wrapper {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 2px 0;
}

.folder-node-wrapper:hover {
  background: rgba(255, 255, 255, 0.08);
}

.folder-node-wrapper.selected {
  background: rgba(64, 158, 255, 0.15);
  border-left: 2px solid #409eff;
}

.folder-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.expand-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  padding: 0;
}

.expand-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.expand-icon {
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.6);
  transition: transform 0.2s ease;
}

.expand-icon.small {
  width: 12px;
  height: 12px;
}

.expand-placeholder {
  width: 20px;
  height: 20px;
}

.folder-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.folder-icon {
  width: 18px;
  height: 18px;
  color: #e6a23c;
  transition: all 0.2s ease;
}

.folder-icon.small {
  width: 16px;
  height: 16px;
}

.folder-node-wrapper:hover .folder-icon {
  transform: scale(1.1);
}

.folder-label {
  flex: 1;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-node-wrapper.selected .folder-label {
  color: #fff;
  font-weight: 500;
}

.current-folder-badge {
  width: 8px;
  height: 8px;
  background: #409eff;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(64, 158, 255, 0.5);
}

.folder-children {
  margin-top: 2px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 1000px;
  transform: translateY(0);
}
</style>