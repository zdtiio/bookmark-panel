<template>
  <div 
    class="bookmark-card"
    :class="{ 
      'dragging': draggingId === bookmark.id,
      'drop-before': dropTargetIndex === index && draggingId !== bookmark.id,
      'drop-after': dropTargetIndex === index + 1 && draggingId !== bookmark.id,
      'edit-mode': isEditMode,
      'selected': isSelected,
      'search-result': isSearchResult
    }"
    @click="handleClick"
    :draggable="isEditMode && !isSearchResult"
    @dragstart="handleDragStart($event, bookmark)"
    @dragend="$emit('dragend')"
    @dragover.prevent="$emit('dragover', $event, index)"
    @drop="$emit('drop', $event)"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div v-if="isEditMode && !isSearchResult" class="drag-handle">
      <GripVertical />
    </div>
    <div v-if="isEditMode" class="checkbox-wrapper" @click.stop="handleSelect">
      <input 
        type="checkbox" 
        :checked="isSelected" 
        class="checkbox"
      />
      <div class="checkbox-custom" :class="{ 'checked': isSelected }">
        <Check v-if="isSelected" />
      </div>
    </div>
    <div class="bookmark-icon" v-if="showIcons">
      <img 
        v-if="bookmark.icon" 
        :src="getIconUrl(bookmark.icon)" 
        :alt="bookmark.title"
        @click.stop
      />
      <div v-else class="text-icon" :style="getTextIconStyle(bookmark.title)">
        {{ getFirstLetter(bookmark.title) }}
      </div>
    </div>
    <div class="bookmark-info">
      <CustomTooltip :text="bookmark.title">
        <h4>{{ bookmark.title }}</h4>
      </CustomTooltip>
      <p class="bookmark-url">{{ bookmark.url }}</p>
    </div>
    <div v-if="!isSearchResult" class="bookmark-actions">
      <button
        class="action-btn home-btn"
        :class="{ active: isInHome }"
        :title="isInHome ? '从首页移除' : '添加到首页'"
        @click.stop="$emit('toggle-home', bookmark)"
      >
        <Pin />
      </button>
      <template v-if="isEditMode">
        <button class="action-btn edit-btn" @click.stop="$emit('edit', bookmark)">
          <Pencil />
        </button>
        <button class="action-btn delete-btn" @click.stop="$emit('delete', bookmark)">
          <Trash2 />
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { GripVertical, Pencil, Trash2, Check, Pin } from 'lucide-vue-next';
import CustomTooltip from './CustomTooltip.vue';

const props = defineProps({
  bookmark: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    default: 0
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
  isSelected: {
    type: Boolean,
    default: false
  },
  isSearchResult: {
    type: Boolean,
    default: false
  },
  isInHome: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'click',
  'edit',
  'delete',
  'dragstart',
  'dragend',
  'dragover',
  'drop',
  'touchstart',
  'touchmove',
  'touchend',
  'select',
  'toggle-home'
]);

const handleClick = () => {
  if (props.isEditMode) {
    emit('select', props.bookmark);
  } else {
    emit('click', props.bookmark);
  }
};

const handleSelect = () => {
  emit('select', props.bookmark);
};

// 只有编辑模式下按住拖动手柄才进入拖动；
// 其余情况不拦截 touchmove，否则整个书签列表都无法上下滑动
let touchDragging = false;

const handleTouchStart = (event) => {
  if (!props.isEditMode || props.isSearchResult) return;
  if (!event.target?.closest?.('.drag-handle')) return;
  touchDragging = true;
  emit('touchstart', event, props.bookmark, props.index);
};

const handleTouchMove = (event) => {
  if (!touchDragging) return;
  event.preventDefault();
  emit('touchmove', event, props.index);
};

const handleTouchEnd = (event) => {
  if (touchDragging) {
    emit('touchend', event);
  }
  touchDragging = false;
};

const handleDragStart = (event, bookmark) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', bookmark.id.toString());
  }
  emit('dragstart', event, bookmark);
};

// 仅在确认是安全位图时才允许 data: 伪协议；
// data:image/svg+xml 可以内嵌脚本，必须排除（纵深防御，后端已过滤）。
const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|bmp|x-icon|avif);/i;

const getIconUrl = (icon) => {
  if (!icon || typeof icon !== 'string') return '';
  if (/^https?:\/\//i.test(icon)) return icon;
  if (/^data:/i.test(icon)) return SAFE_DATA_IMAGE.test(icon) ? icon : '';
  if (/^(javascript|vbscript|file):/i.test(icon)) return '';
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
    '#ec4899', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b'
  ];
  
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  
  return {
    backgroundColor: colors[colorIndex]
  };
};
</script>

<style scoped>
.bookmark-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.bookmark-card:hover {
  background: rgba(255, 255, 255, 0.15);
}

.bookmark-card.edit-mode {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(64, 158, 255, 0.3);
}

.bookmark-card.selected {
  background: rgba(64, 158, 255, 0.25);
  border-color: rgba(64, 158, 255, 0.6);
}

.bookmark-card.dragging {
  opacity: 0.5;
  transform: scale(1.02);
}

.drag-handle {
  cursor: grab;
  padding: 4px;
  opacity: 0.5;
}

.drag-handle:hover {
  opacity: 1;
}

.bookmark-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  flex-shrink: 0;
}

.bookmark-icon img {
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

.bookmark-info {
  flex: 1;
  min-width: 0;
}

.bookmark-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmark-url {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmark-actions {
  display: flex;
  gap: 6px;
  opacity: 1;
  transition: all 0.2s ease;
}

.checkbox-wrapper {
  position: relative;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  cursor: pointer;
}

.checkbox {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.1);
}

.checkbox-custom:hover {
  border-color: rgba(64, 158, 255, 0.8);
  background: rgba(64, 158, 255, 0.1);
}

.checkbox-custom.checked {
  background: #409eff;
  border-color: #409eff;
}

.checkbox-custom svg {
  width: 12px;
  height: 12px;
  color: #fff;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.08);
}

.action-btn svg {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.action-btn:hover svg {
  color: #fff;
}

.edit-btn {
  background: rgba(64, 158, 255, 0.2);
}

.edit-btn svg {
  color: #409eff;
}

.edit-btn:hover {
  background: rgba(64, 158, 255, 0.4);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.delete-btn {
  background: rgba(245, 108, 108, 0.2);
}

.delete-btn svg {
  color: #f56c6c;
}

.delete-btn:hover {
  background: rgba(245, 108, 108, 0.4);
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);
}

.home-btn {
  background: rgba(230, 162, 60, 0.18);
}

.home-btn svg {
  color: #e6a23c;
}

.home-btn:hover {
  background: rgba(230, 162, 60, 0.35);
}

.home-btn.active {
  background: rgba(230, 162, 60, 0.45);
}

.home-btn.active svg {
  color: #fff;
}

.bookmark-card.drop-before {
  border-top: 4px solid #409eff;
  background: rgba(64, 158, 255, 0.15);
}

.bookmark-card.drop-before::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid #409eff;
}

.bookmark-card.drop-after {
  border-bottom: 4px solid #409eff;
  background: rgba(64, 158, 255, 0.15);
}

.bookmark-card.drop-after::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid #409eff;
}

@media (max-width: 768px) {
  .bookmark-card {
    padding: 10px;
    gap: 10px;
  }

  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    flex-shrink: 0;
    opacity: 0.8;
  }

  .bookmark-icon {
    width: 36px;
    height: 36px;
  }

  .bookmark-icon img {
    width: 28px;
    height: 28px;
  }

  .text-icon {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .bookmark-info h4 {
    font-size: 13px;
  }

  .bookmark-url {
    font-size: 11px;
  }

  .action-btn {
    width: 28px;
    height: 28px;
  }
}
</style>