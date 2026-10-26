<template>
  <section class="bookmark-section">
    <div class="bookmark-header">
      <div v-if="isSearchResult" class="search-result-label">
        <Search class="search-icon" />
        <span>搜索结果</span>
      </div>
      <div v-else class="folder-breadcrumb">
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
        v-if="bookmarks.length > 0"
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
      <div v-if="subFolders.length > 0" class="subfolder-section">
        <div class="section-title">
          <FolderOpen class="section-icon" />
          <span>子文件夹</span>
          <span class="section-count">{{ subFolders.length }}</span>
        </div>
        <div class="subfolder-grid">
          <div
            v-for="(folder, index) in subFolders"
            :key="folder.id"
            class="folder-card"
            :class="{
              'active': activeSubFolderId === folder.id,
              'dragging': draggingFolderId === folder.id,
              'drop-before': folderDropTargetIndex === index && draggingFolderId !== folder.id,
              'drop-after': folderDropTargetIndex === index + 1 && draggingFolderId !== folder.id
            }"
            draggable="true"
            @click="handleFolderClick(folder)"
            @dblclick="handleFolderDblClick(folder)"
            @dragstart="$emit('subfolder-dragstart', $event, folder)"
            @dragend="$emit('subfolder-dragend')"
            @dragover.prevent="$emit('subfolder-dragover', $event, index)"
            @drop.prevent="$emit('subfolder-drop', $event)"
          >
            <div class="folder-card-icon">
              <Folder class="folder-glyph" />
            </div>
            <div class="folder-card-info">
              <h4>{{ folder.name }}</h4>
              <p>{{ subFolderCount(folder) }} 个子文件夹</p>
            </div>
            <button
              class="open-folder-btn"
              title="打开文件夹"
              @click.stop="$emit('subfolder-open', folder)"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>

      <div v-if="subFolders.length > 0" class="section-title bookmark-title">
        <Bookmark class="section-icon" />
        <span>书签</span>
        <span class="section-count">{{ bookmarks.length }}</span>
      </div>

      <div
        v-if="bookmarks.length === 0"
        class="empty-state"
        :class="{ compact: subFolders.length > 0 }"
      >
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
          :dragging-id="isSearchResult ? null : draggingId"
          :drop-target-index="isSearchResult ? -1 : dropTargetIndex"
          :is-selected="selectedIds.includes(bookmark.id)"
          :is-search-result="isSearchResult"
          @click="$emit('open-bookmark', bookmark)"
          @edit="$emit('edit-bookmark', bookmark)"
          @delete="$emit('delete-bookmark', bookmark)"
          @select="$emit('select-bookmark', $event)"
          @dragstart="!isSearchResult && $emit('bookmark-dragstart', $event, bookmark)"
          @dragend="!isSearchResult && $emit('bookmark-dragend')"
          @dragover="!isSearchResult && $emit('bookmark-dragover', $event, index)"
          @drop="!isSearchResult && $emit('bookmark-drop', $event)"
          @touchstart="!isSearchResult && $emit('bookmark-touchstart', $event, bookmark, index)"
          @touchmove="!isSearchResult && $emit('bookmark-touchmove', $event, index)"
          @touchend="!isSearchResult && $emit('bookmark-touchend', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Folder, FolderOpen, ChevronRight, Pencil, Bookmark, BookmarkMinus, Check, Move, Trash2, Search } from 'lucide-vue-next';
import BookmarkCard from './BookmarkCard.vue';

const props = defineProps({
  bookmarks: {
    type: Array,
    required: true
  },
  subFolders: {
    type: Array,
    default: () => []
  },
  allFolders: {
    type: Array,
    default: () => []
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
  isMobile: {
    type: Boolean,
    default: false
  },
  draggingId: {
    type: [Number, String, null],
    default: null
  },
  dropTargetIndex: {
    type: Number,
    default: -1
  },
  draggingFolderId: {
    type: [Number, String, null],
    default: null
  },
  folderDropTargetIndex: {
    type: Number,
    default: -1
  },
  selectedIds: {
    type: Array,
    default: () => []
  },
  isSearchResult: {
    type: Boolean,
    default: false
  }
});

const activeSubFolderId = ref(null);

const selectedCount = computed(() => props.selectedIds.length);

const isAllSelected = computed(() => {
  return props.bookmarks.length > 0 && 
         props.bookmarks.every(b => props.selectedIds.includes(b.id));
});

const emit = defineEmits([
  'select-folder',
  'subfolder-open',
  'subfolder-dragstart',
  'subfolder-dragend',
  'subfolder-dragover',
  'subfolder-drop',
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

const subFolderCount = (folder) => {
  return props.allFolders.filter(
    (f) => f.parentId !== null && f.parentId !== undefined &&
           String(f.parentId) === String(folder.id),
  ).length;
};

const handleFolderClick = (folder) => {
  activeSubFolderId.value = folder.id;
  if (props.isMobile) {
    emit('subfolder-open', folder);
  }
};

const handleFolderDblClick = (folder) => {
  if (!props.isMobile) {
    emit('subfolder-open', folder);
  }
};
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

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.section-title .section-icon {
  width: 16px;
  height: 16px;
  color: #e6a23c;
}

.section-title .section-count {
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.bookmark-title {
  margin-top: 20px;
}

.bookmark-title .section-icon {
  color: #409eff;
}

.subfolder-section {
  margin-bottom: 4px;
}

.subfolder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.folder-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  user-select: none;
}

.folder-card:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.folder-card.active {
  border-color: rgba(230, 162, 60, 0.6);
  background: rgba(230, 162, 60, 0.15);
}

.folder-card.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.folder-card.drop-before::before,
.folder-card.drop-after::after {
  content: '';
  position: absolute;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 2px;
  background: #409eff;
  box-shadow: 0 0 8px rgba(64, 158, 255, 0.6);
}

.folder-card.drop-before::before {
  left: -6px;
}

.folder-card.drop-after::after {
  right: -6px;
}

.folder-card-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(230, 162, 60, 0.18);
}

.folder-glyph {
  width: 20px;
  height: 20px;
  color: #e6a23c;
}

.folder-card-info {
  flex: 1;
  min-width: 0;
}

.folder-card-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-card-info p {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.open-folder-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
}

.folder-card:hover .open-folder-btn {
  opacity: 1;
}

.open-folder-btn svg {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.open-folder-btn:hover {
  background: rgba(64, 158, 255, 0.35);
}

.open-folder-btn:hover svg {
  color: #fff;
}

.search-result-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(64, 158, 255, 0.15);
  border-radius: 6px;
  color: #409eff;
  font-size: 14px;
  font-weight: 600;
}

.search-result-label .search-icon {
  width: 16px;
  height: 16px;
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

.empty-state.compact {
  height: 160px;
}

.empty-state.compact svg {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
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

  .subfolder-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .open-folder-btn {
    opacity: 1;
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