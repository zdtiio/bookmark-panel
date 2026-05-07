<template>
  <div 
    :key="folder.id" 
    class="folder-tree-item"
    :class="{ 'child': level > 0 }"
  >
    <div 
      v-if="dropIndicator === 'before'" 
      class="drop-indicator before"
    ></div>
    <div 
      class="folder-node-wrapper"
      :class="{ 
        'selected': String(folder.id) === String(selectedFolderId), 
        'dragging': isDragging, 
        'drag-over': isDragOver,
        'drop-inside': isDragOver && dropIndicator === 'inside',
        'drop-before': isDragOver && dropIndicator === 'before',
        'drop-after': isDragOver && dropIndicator === 'after'
      }"
      @click="$emit('select', folder)"
      @contextmenu.prevent="$emit('contextmenu', $event, folder)"
      :draggable="true"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop="handleDrop"
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
        <span v-if="String(folder.id) === String(selectedFolderId)" class="current-folder-badge"></span>
        
        <div class="folder-actions">
          <button 
            class="action-btn edit-btn" 
            @click.stop="$emit('edit', folder)"
            title="编辑"
          >
            <Pencil />
          </button>
          <button 
            class="action-btn delete-btn" 
            @click.stop="$emit('delete', folder)"
            title="删除"
          >
            <Trash2 />
          </button>
        </div>
      </div>
    </div>
    
    <div 
      v-if="dropIndicator === 'after'" 
      class="drop-indicator after"
    ></div>
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
          @contextmenu="$emit('contextmenu', $event, child)"
          @toggle-expand="$emit('toggle-expand', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
          @folder-drop="$emit('folder-drop', $event)"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Folder, FolderOpen, ChevronDown, ChevronRight, Pencil, Trash2, GripVertical } from 'lucide-vue-next';

const props = defineProps({
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

const emit = defineEmits(['select', 'contextmenu', 'toggle-expand', 'edit', 'delete', 'folder-drop']);

const isDragging = ref(false);
const isDragOver = ref(false);
const dropIndicator = ref(null);

const handleDragStart = (event) => {
  isDragging.value = true;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', JSON.stringify({ id: props.folder.id, label: props.folder.label }));
};

const handleDragEnd = () => {
  isDragging.value = false;
  isDragOver.value = false;
  dropIndicator.value = null;
};

const handleDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  
  isDragOver.value = true;
  
  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const height = rect.height;
  const topThird = height * 0.25;
  const bottomThird = height * 0.75;
  
  let newIndicator;
  if (y < topThird) {
    newIndicator = 'before';
  } else if (y > bottomThird) {
    newIndicator = 'after';
  } else {
    newIndicator = 'inside';
  }
  
  if (newIndicator !== dropIndicator.value) {
    dropIndicator.value = newIndicator;
  }
};

const handleDragLeave = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const { clientX, clientY } = event;
  
  if (clientX < rect.left || clientX > rect.right ||
      clientY < rect.top || clientY > rect.bottom) {
    isDragOver.value = false;
    dropIndicator.value = null;
  }
};

const handleDrop = (event) => {
  isDragOver.value = false;
  try {
    const draggedData = JSON.parse(event.dataTransfer.getData('text/plain'));
    if (draggedData.id !== props.folder.id) {
      const rect = event.currentTarget.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const height = rect.height;
      const topThird = height * 0.33;
      const bottomThird = height * 0.67;
      
      let dropType;
      if (y < topThird) {
        dropType = 'before';
      } else if (y > bottomThird) {
        dropType = 'after';
      } else {
        dropType = 'inner';
      }
      
      emit('folder-drop', {
        draggedId: draggedData.id,
        targetId: props.folder.id,
        dropType: dropType
      });
    }
  } catch (e) {
    console.error('Drop error:', e);
  } finally {
    dropIndicator.value = null;
  }
};
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

.folder-node-wrapper.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.folder-node-wrapper.drag-over {
  background: rgba(64, 158, 255, 0.1);
}

.folder-node-wrapper.drop-inside {
  background: rgba(64, 158, 255, 0.2);
  border: 1px solid #409eff;
}

.folder-node-wrapper.drop-before,
.folder-node-wrapper.drop-after {
  background: rgba(255, 255, 255, 0.05);
}

.drop-indicator {
  height: 3px;
  background: #409eff;
  border-radius: 2px;
  margin: 2px 0;
  transition: all 0.2s ease;
}

.drop-indicator.before {
  box-shadow: 0 0 8px rgba(64, 158, 255, 0.5);
}

.drop-indicator.after {
  box-shadow: 0 0 8px rgba(64, 158, 255, 0.5);
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

.folder-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.folder-node-wrapper:hover .folder-actions {
  opacity: 1;
}

.folder-actions .action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.08);
}

.folder-actions .action-btn svg {
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.2s ease;
}

.folder-actions .action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.folder-actions .action-btn:hover svg {
  color: #fff;
}

.folder-actions .edit-btn {
  background: rgba(64, 158, 255, 0.2);
}

.folder-actions .edit-btn svg {
  color: #409eff;
}

.folder-actions .edit-btn:hover {
  background: rgba(64, 158, 255, 0.4);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.folder-actions .delete-btn {
  background: rgba(245, 108, 108, 0.2);
}

.folder-actions .delete-btn svg {
  color: #f56c6c;
}

.folder-actions .delete-btn:hover {
  background: rgba(245, 108, 108, 0.4);
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);
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