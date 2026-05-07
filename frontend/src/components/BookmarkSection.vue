<template>
  <section class="bookmark-section">
    <div class="bookmark-header">
      <div class="folder-breadcrumb">
        <div 
          v-for="(item, index) in currentFolderPath" 
          :key="item.id"
          class="breadcrumb-item"
          :class="{ 'active': index === currentFolderPath.length - 1 }"
          @click="item.id !== null && $emit('select-folder', item.id)"
        >
          <Folder v-if="index === 0" class="folder-icon" />
          <ChevronRight v-else class="chevron-icon" />
          <span>{{ item.name }}</span>
        </div>
      </div>
      <button 
        v-if="selectedFolderId !== null && bookmarks.length > 0"
        @click="$emit('toggle-edit')"
        class="edit-mode-btn"
        :class="{ 'active': isEditMode }"
      >
        <Pencil />
        <span>{{ isEditMode ? '完成编辑' : '编辑' }}</span>
      </button>
    </div>

    <div v-if="isEditMode" class="batch-actions">
      <div class="select-all-wrapper">
        <input 
          type="checkbox" 
          :checked="isAllSelected" 
          id="select-all"
          @change="$emit('toggle-select-all')"
          class="checkbox"
        />
        <label for="select-all" class="checkbox-custom" :class="{ 'checked': isAllSelected }">
          <Check v-if="isAllSelected" />
        </label>
        <span class="select-all-text">全选</span>
      </div>
      <div class="batch-buttons">
        <button 
          v-if="selectedCount > 0"
          @click="$emit('batch-move')"
          class="batch-btn move-btn"
        >
          <Move />
          <span>移动到文件夹</span>
        </button>
        <button 
          v-if="selectedCount > 0"
          @click="$emit('batch-delete')"
          class="batch-btn delete-btn"
        >
          <Trash2 />
          <span>删除选中 ({{ selectedCount }})</span>
        </button>
      </div>
    </div>

    <div class="bookmark-content">
      <div v-if="bookmarks.length === 0" class="empty-state">
        <BookmarkMinus />
        <p>暂无书签</p>
      </div>
      <div 
        v-else 
        class="bookmark-grid"
        :class="{ 'edit-mode': isEditMode }"
      >
        <BookmarkCard
          v-for="(bookmark, index) in bookmarks" 
          :key="bookmark.id"
          :bookmark="bookmark"
          :index="index"
          :is-edit-mode="isEditMode"
          :show-icons="showIcons"
          :dragging-id="draggingId"
          :drop-target-index="dropTargetIndex"
          :is-selected="selectedIds.includes(bookmark.id)"
          @click="$emit('open-bookmark', bookmark)"
          @edit="$emit('edit-bookmark', bookmark)"
          @delete="$emit('delete-bookmark', bookmark)"
          @select="$emit('select-bookmark', $event)"
          @dragstart="$emit('bookmark-dragstart', $event, bookmark)"
          @dragend="$emit('bookmark-dragend')"
          @dragover="$emit('bookmark-dragover', $event, index)"
          @drop="$emit('bookmark-drop', $event)"
          @touchstart="$emit('bookmark-touchstart', $event, bookmark, index)"
          @touchmove="$emit('bookmark-touchmove', $event, index)"
          @touchend="$emit('bookmark-touchend', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { Folder, ChevronRight, Pencil, BookmarkMinus, Check, Move, Trash2 } from 'lucide-vue-next';
import BookmarkCard from './BookmarkCard.vue';

const props = defineProps({
  bookmarks: {
    type: Array,
    required: true
  },
  currentFolderPath: {
    type: Array,
    required: true
  },
  selectedFolderId: {
    type: [Number, String, null],
    default: null
  },
  isEditMode: {
    type: Boolean,
    default: false
  },
  showIcons: {
    type: Boolean,
    default: true
  },
  draggingId: {
    type: [Number, String, null],
    default: null
  },
  dropTargetIndex: {
    type: Number,
    default: -1
  },
  selectedIds: {
    type: Array,
    default: () => []
  }
});

const selectedCount = computed(() => props.selectedIds.length);

const isAllSelected = computed(() => {
  return props.bookmarks.length > 0 && 
         props.bookmarks.every(b => props.selectedIds.includes(b.id));
});

defineEmits([
  'select-folder',
  'toggle-edit',
  'open-bookmark',
  'edit-bookmark',
  'delete-bookmark',
  'select-bookmark',
  'toggle-select-all',
  'batch-move',
  'batch-delete',
  'bookmark-dragstart',
  'bookmark-dragend',
  'bookmark-dragover',
  'bookmark-drop',
  'bookmark-touchstart',
  'bookmark-touchmove',
  'bookmark-touchend'
]);
</script>

<style scoped>
.bookmark-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.bookmark-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.select-all-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.select-all-wrapper .checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.select-all-wrapper .checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.1);
}

.select-all-wrapper .checkbox-custom:hover {
  border-color: rgba(64, 158, 255, 0.8);
}

.select-all-wrapper .checkbox-custom.checked {
  background: #409eff;
  border-color: #409eff;
}

.select-all-wrapper .checkbox-custom svg {
  width: 12px;
  height: 12px;
  color: #fff;
}

.select-all-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.batch-buttons {
  display: flex;
  gap: 10px;
}

.batch-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.batch-btn svg {
  width: 14px;
  height: 14px;
}

.batch-btn.move-btn {
  background: rgba(64, 158, 255, 0.3);
  color: #409eff;
}

.batch-btn.move-btn:hover {
  background: rgba(64, 158, 255, 0.5);
  transform: translateY(-1px);
}

.batch-btn.delete-btn {
  background: rgba(245, 108, 108, 0.3);
  color: #f56c6c;
}

.batch-btn.delete-btn:hover {
  background: rgba(245, 108, 108, 0.5);
  transform: translateY(-1px);
}

.bookmark-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.bookmark-content::-webkit-scrollbar {
  width: 4px;
}

.bookmark-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.bookmark-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.bookmark-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.folder-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.breadcrumb-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.breadcrumb-item.active {
  color: #409eff;
  font-weight: 600;
  background: rgba(64, 158, 255, 0.15);
}

.breadcrumb-item .folder-icon,
.breadcrumb-item .chevron-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.breadcrumb-item .folder-icon {
  color: #67c23a;
}

.breadcrumb-item .chevron-icon {
  color: rgba(255, 255, 255, 0.4);
  margin-right: 2px;
}

.edit-mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.edit-mode-btn svg {
  width: 16px;
  height: 16px;
  transition: all 0.3s ease;
}

.edit-mode-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.edit-mode-btn.active {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.4) 0%, rgba(103, 194, 58, 0.4) 100%);
  border-color: rgba(64, 158, 255, 0.5);
  color: #fff;
}

.edit-mode-btn.active:hover {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.6) 0%, rgba(103, 194, 58, 0.6) 100%);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
}

.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.bookmark-grid.edit-mode .bookmark-card {
  cursor: move;
}

@media (max-width: 768px) {
  .bookmark-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .bookmark-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .bookmark-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .edit-mode-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .empty-state {
    height: 300px;
  }

  .empty-state svg {
    width: 48px;
    height: 48px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .bookmark-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }
}
</style>