<template>
  <section class="home-board">
    <div class="board-header">
      <div class="board-title">
        <h2>我的首页</h2>
        <p v-if="resolvedItems.length > 0">
          共 {{ resolvedItems.length }} 项 · 拖拽卡片可调整顺序
        </p>
        <p v-else>把常用书签和文件夹放到首页，打开面板就能直达</p>
      </div>
      <button class="manage-btn" @click="$emit('manage')">
        <LayoutGrid />
        <span>书签管理</span>
      </button>
    </div>

    <div v-if="resolvedItems.length === 0" class="board-empty">
      <Home />
      <h3>首页还没有内容</h3>
      <p>去「书签管理」，把常用书签或文件夹添加到首页</p>
      <button class="manage-btn primary" @click="$emit('manage')">
        <LayoutGrid />
        <span>去书签管理</span>
      </button>
    </div>

    <div v-else class="home-grid">
      <div
        v-for="(item, index) in resolvedItems"
        :key="`${item.type}-${item.id}`"
        class="home-card"
        :class="{
          dragging: dragIndex === index,
          'drop-before': dropIndex === index && dragIndex !== index,
          'drop-after': dropIndex === index + 1 && dragIndex !== index,
        }"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragend="handleDragEnd"
        @dragover.prevent="handleDragOver($event, index)"
        @drop.prevent="handleDrop"
        @click="openItem(item)"
      >
        <div class="drag-handle" title="拖拽排序">
          <GripVertical />
        </div>

        <button
          class="remove-btn"
          title="从首页移除"
          @click.stop="$emit('remove', { type: item.type, id: item.id })"
        >
          <X />
        </button>

        <template v-if="item.type === 'folder'">
          <div class="home-card-icon folder-icon">
            <Folder />
          </div>
          <div class="home-card-info">
            <h3>{{ item.data.name }}</h3>
            <p>
              {{ folderBookmarkCount(item.id) }} 个书签 ·
              {{ childFolderCount(item.id) }} 个子文件夹
            </p>
          </div>
          <ChevronRight class="card-chevron" />
        </template>

        <template v-else>
          <div v-if="showIcons" class="home-card-icon">
            <img
              v-if="item.data.icon"
              :src="getIconUrl(item.data.icon)"
              :alt="item.data.title"
              @click.stop
            />
            <div v-else class="text-icon" :style="getTextIconStyle(item.data.title)">
              {{ getFirstLetter(item.data.title) }}
            </div>
          </div>
          <div class="home-card-info">
            <h3>{{ item.data.title }}</h3>
            <p class="bookmark-url">{{ item.data.url }}</p>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import {
  Home,
  LayoutGrid,
  Folder,
  ChevronRight,
  X,
  GripVertical,
} from 'lucide-vue-next';

const props = defineProps({
  homeItems: {
    type: Array,
    default: () => [],
  },
  bookmarks: {
    type: Array,
    default: () => [],
  },
  folders: {
    type: Array,
    default: () => [],
  },
  showIcons: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['open-bookmark', 'open-folder', 'remove', 'reorder', 'manage']);

const dragIndex = ref(-1);
const dropIndex = ref(-1);

const resolvedItems = computed(() =>
  props.homeItems
    .map((item) => {
      const data =
        item.type === 'bookmark'
          ? props.bookmarks.find((bookmark) => String(bookmark.id) === String(item.id))
          : props.folders.find((folder) => String(folder.id) === String(item.id));
      return data ? { ...item, data } : null;
    })
    .filter(Boolean),
);

const folderBookmarkCount = (folderId) =>
  props.bookmarks.filter((bookmark) => String(bookmark.folderId) === String(folderId)).length;

const childFolderCount = (folderId) =>
  props.folders.filter(
    (folder) =>
      folder.parentId !== null &&
      folder.parentId !== undefined &&
      String(folder.parentId) === String(folderId),
  ).length;

const openItem = (item) => {
  if (dragIndex.value !== -1) return;
  if (item.type === 'folder') {
    emit('open-folder', item.data);
  } else {
    emit('open-bookmark', item.data);
  }
};

const handleDragStart = (event, index) => {
  dragIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', String(index));
};

const handleDragOver = (event, index) => {
  if (dragIndex.value === -1) return;
  event.dataTransfer.dropEffect = 'move';
  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  dropIndex.value = y < rect.height / 2 ? index : index + 1;
};

const handleDrop = () => {
  if (dragIndex.value === -1 || dropIndex.value === -1) {
    handleDragEnd();
    return;
  }

  const list = [...resolvedItems.value];
  const [moved] = list.splice(dragIndex.value, 1);
  let targetIndex = dropIndex.value;
  if (dragIndex.value < targetIndex) targetIndex -= 1;
  list.splice(targetIndex, 0, moved);

  emit(
    'reorder',
    list.map((item) => ({ type: item.type, id: item.id })),
  );
  handleDragEnd();
};

const handleDragEnd = () => {
  dragIndex.value = -1;
  dropIndex.value = -1;
};

const getIconUrl = (icon) => {
  if (!icon) return '';
  if (/^(https?:|data:|blob:)/i.test(icon)) return icon;
  return icon.startsWith('/') ? icon : `/${icon}`;
};

const getFirstLetter = (title) => {
  if (!title || typeof title !== 'string') return '?';
  const firstChar = title.charAt(0);
  if (/[\u4e00-\u9fa5]/.test(firstChar)) {
    return firstChar;
  }
  return firstChar.toUpperCase();
};

const getTextIconStyle = (title) => {
  const colors = [
    '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399',
    '#7232dd', '#3b82f6', '#06b6d4', '#10b981', '#f97316',
    '#ec4899', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b',
  ];

  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }

  return {
    backgroundColor: colors[Math.abs(hash) % colors.length],
  };
};
</script>

<style scoped>
.home-board {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 100px 24px 24px;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.board-title h2 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}

.board-title p {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
}

.manage-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.manage-btn svg {
  width: 16px;
  height: 16px;
}

.manage-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

.manage-btn.primary {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.45) 0%, rgba(103, 194, 58, 0.45) 100%);
  border-color: rgba(64, 158, 255, 0.45);
  color: #fff;
}

.manage-btn.primary:hover {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.65) 0%, rgba(103, 194, 58, 0.65) 100%);
}

.board-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  padding: 40px 20px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.board-empty > svg {
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
  color: rgba(64, 158, 255, 0.6);
}

.board-empty h3 {
  margin: 0 0 8px;
  font-size: 18px;
  color: rgba(255, 255, 255, 0.85);
}

.board-empty p {
  margin: 0 0 20px;
  font-size: 14px;
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding-bottom: 8px;
}

.home-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.home-card:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(64, 158, 255, 0.35);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.home-card.dragging {
  opacity: 0.45;
  transform: scale(0.98);
}

.home-card.drop-before {
  box-shadow: inset 3px 0 0 #409eff;
}

.home-card.drop-after {
  box-shadow: inset -3px 0 0 #409eff;
}

.drag-handle {
  position: absolute;
  top: 6px;
  left: 6px;
  opacity: 0;
  cursor: grab;
  transition: opacity 0.2s ease;
}

.drag-handle svg {
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.5);
}

.home-card:hover .drag-handle {
  opacity: 1;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: rgba(230, 162, 60, 0.2);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
}

.remove-btn svg {
  width: 14px;
  height: 14px;
  color: #e6a23c;
}

.home-card:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: rgba(245, 108, 108, 0.4);
}

.remove-btn:hover svg {
  color: #fff;
}

.home-card-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
}

.home-card-icon.folder-icon {
  background: rgba(230, 162, 60, 0.18);
}

.home-card-icon.folder-icon svg {
  width: 24px;
  height: 24px;
  color: #e6a23c;
}

.home-card-icon img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.text-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
}

.home-card-info {
  flex: 1;
  min-width: 0;
  padding-right: 20px;
}

.home-card-info h3 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-card-info p {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-chevron {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.35);
}

@media (max-width: 768px) {
  .home-board {
    padding: 130px 12px 16px;
  }

  .board-header {
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .board-title h2 {
    font-size: 20px;
  }

  .manage-btn span {
    display: none;
  }

  .manage-btn {
    padding: 9px;
  }

  .board-empty {
    min-height: 280px;
  }

  .home-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .remove-btn,
  .drag-handle {
    opacity: 1;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .home-board {
    padding: 90px 20px 20px;
  }

  .home-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;
  }
}
</style>
