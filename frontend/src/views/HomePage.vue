<template>
  <div class="home-page">
    <GuestView v-if="!isLoggedIn" @login="goToLogin" @register="goToRegister" />

    <div v-else class="user-view">
      <UserHeader
        @add-bookmark="showAddBookmark = true"
        @settings="showSettings = true"
        @logout="handleLogout"
        @search="handleSearch"
        @search-clear="handleSearchClear"
      />

      <main class="main-content">
        <FolderSidebar
          v-if="config.showFolders"
          :folder-tree="folderTree"
          :selected-folder-id="selectedFolderId"
          :expanded-folders="expandedFolders"
          :collapsed="sidebarCollapsed"
          @select="selectFolder"
          @add-folder="handleAddFolder"
          @toggle-expand="toggleFolderExpand"
          @edit="editFolder"
          @delete="handleFolderDelete"
          @folder-drop="handleFolderDrop"
        />

        <button
          class="sidebar-toggle-btn"
          @click="toggleSidebar"
          title="切换文件夹"
        >
          <Menu :class="{ rotate: sidebarCollapsed }" />
        </button>

        <BookmarkSection
          :bookmarks="filteredBookmarks"
          :current-folder-path="currentFolderPath"
          :selected-folder-id="selectedFolderId"
          :is-edit-mode="isEditMode"
          :show-icons="config.showIcons"
          :dragging-id="draggingBookmark?.id"
          :drop-target-index="dropTargetIndex"
          :selected-ids="selectedBookmarkIds"
          :is-search-result="!!currentSearchQuery"
          @select-folder="selectFolder"
          @toggle-edit="toggleEditMode"
          @open-bookmark="openBookmark"
          @edit-bookmark="editBookmark"
          @delete-bookmark="deleteBookmark"
          @select-bookmark="handleSelectBookmark"
          @toggle-select-all="handleToggleSelectAll"
          @batch-move="handleBatchMove"
          @batch-delete="handleBatchDelete"
          @bookmark-dragstart="handleBookmarkDragStart"
          @bookmark-dragend="handleBookmarkDragEnd"
          @bookmark-dragover="handleBookmarkDragOver"
          @bookmark-drop="handleBookmarkDrop"
          @bookmark-touchstart="handleTouchStart"
          @bookmark-touchmove="handleTouchMove"
          @bookmark-touchend="handleTouchEnd"
        />
      </main>

      <AddBookmarkModal
        v-model:visible="showAddBookmark"
        :folders="folders"
        :editing-bookmark="editingBookmark"
        @save="saveBookmark"
      />

      <AddFolderModal
        v-model:visible="showAddFolder"
        :folders="folders"
        :editing-folder="editingFolder"
        @save="saveFolder"
      />

      <el-dialog title="移动到文件夹" v-model="showMoveModal" width="400px">
        <div class="move-modal-content">
          <p>已选择 {{ selectedBookmarkIds.length }} 个书签</p>
          <el-tree-select
            v-model="targetFolderId"
            :data="moveFolderTree"
            :props="treeProps"
            placeholder="请选择目标文件夹"
            :render-after-expand="false"
            :check-strictly="true"
            :expand-on-click-node="false"
            class="folder-select"
          >
            <template #empty>
              <div
                style="
                  padding: 12px;
                  text-align: center;
                  color: rgba(255, 255, 255, 0.5);
                "
              >
                暂无文件夹，请先创建
              </div>
            </template>
          </el-tree-select>
        </div>
        <template #footer>
          <el-button @click="showMoveModal = false">取消</el-button>
          <el-button type="primary" @click="confirmBatchMove"
            >确定移动</el-button
          >
        </template>
      </el-dialog>

      <el-dialog 
        title="设置" 
        v-model="showSettings" 
        :width="isMobile ? '90%' : '600px'"
        :fullscreen="isMobile"
      >
        <SettingsPanel @close="showSettings = false" />
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useAuthStore } from "../stores/auth";
import { useBookmarkStore } from "../stores/bookmarks";
import { useConfigStore } from "../stores/config";
import { ElMessage, ElMessageBox } from "element-plus";
import { Menu } from "lucide-vue-next";

import GuestView from "../components/GuestView.vue";
import UserHeader from "../components/UserHeader.vue";
import FolderSidebar from "../components/FolderSidebar.vue";
import BookmarkSection from "../components/BookmarkSection.vue";
import AddBookmarkModal from "../components/AddBookmarkModal.vue";
import AddFolderModal from "../components/AddFolderModal.vue";
import SettingsPanel from "../components/SettingsPanel.vue";

const emit = defineEmits(["navigate"]);

const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore();
const configStore = useConfigStore();

const isLoggedIn = computed(() => authStore.isAuthenticated());
const config = computed(() => configStore.config);
const bookmarks = computed(() => bookmarkStore.bookmarks);
const folders = computed(() => bookmarkStore.folders);

const selectedFolderId = ref(null);
const isEditMode = ref(false);
const draggingBookmark = ref(null);
const dropTargetIndex = ref(-1);
const expandedFolders = ref([]);
const sidebarCollapsed = ref(false);
const currentSearchQuery = ref('');

const showAddBookmark = ref(false);
const showAddFolder = ref(false);
const showSettings = ref(false);
const showMoveModal = ref(false);

const selectedBookmarkIds = ref([]);

const editingFolder = ref(null);
const editingBookmark = ref(null);
const targetFolderId = ref(null);

const isMobile = ref(window.innerWidth < 768);

const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
};



const filteredBookmarks = computed(() => {
  let result = bookmarks.value;

  if (currentSearchQuery.value) {
    result = bookmarkStore.searchResults;
  } else if (selectedFolderId.value !== null && selectedFolderId.value !== undefined) {
    const folderId = selectedFolderId.value;
    result = result.filter((b) => String(b.folderId) === String(folderId));
  }

  return result;
});

const buildFolderTree = (parentId = null) => {
  const children = folders.value.filter((f) => f.parentId === parentId);
  return children.map((folder) => ({
    id: folder.id,
    label: folder.name,
    name: folder.name,
    parentId: folder.parentId,
    children: buildFolderTree(folder.id),
  }));
};

const folderTree = computed(() => buildFolderTree(null));

const treeProps = {
  label: "label",
  children: "children",
  value: "id",
};

const moveFolderTree = computed(() => {
  const buildTree = (parentId = null) => {
    return folders.value
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((folder) => ({
        id: folder.id,
        label: folder.name,
        children: buildTree(folder.id),
      }));
  };
  return buildTree(null);
});

const currentFolderPath = computed(() => {
  if (selectedFolderId.value === null || selectedFolderId.value === undefined) {
    const rootFolder = folders.value.find((f) => !f.parentId);
    return rootFolder
      ? [{ id: rootFolder.id, name: rootFolder.name }]
      : [{ id: null, name: "全部书签" }];
  }
  const folderId = selectedFolderId.value;
  const path = [];
  let currentId = folderId;
  while (currentId) {
    const folder = folders.value.find(
      (f) => String(f.id) === String(currentId),
    );
    if (!folder) break;
    path.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }
  return path.length > 0 ? path : [{ id: null, name: "未知文件夹" }];
});

const goToLogin = () => {
    emit("navigate", "LoginPage");
  };

  const goToRegister = () => {
    emit("navigate", "RegisterPage");
  };

  const handleSearch = async (query) => {
    currentSearchQuery.value = query;
    await bookmarkStore.searchBookmarks(query);
  };

  const handleSearchClear = () => {
    currentSearchQuery.value = '';
    bookmarkStore.clearSearch();
  };

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm("确定要退出登录吗？", "确认退出", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    localStorage.removeItem("selectedFolderId");
    await authStore.logout();
    ElMessage.success("登出成功");
    window.location.reload();
  } catch {
    ElMessage.info("已取消退出");
  }
};

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const selectFolder = async (folderOrId) => {
  const folderId = typeof folderOrId === "object" ? folderOrId.id : folderOrId;
  selectedFolderId.value = folderId;
  localStorage.setItem("selectedFolderId", folderId);
  
  await bookmarkStore.loadBookmarksByFolder(folderId);
};

const toggleFolderExpand = (folderId) => {
  const index = expandedFolders.value.indexOf(folderId);
  if (index > -1) {
    expandedFolders.value.splice(index, 1);
  } else {
    expandedFolders.value.push(folderId);
  }
};

const handleAddFolder = () => {
  editingFolder.value = null;
  showAddFolder.value = true;
};

const editFolder = (folder) => {
  editingFolder.value = folder;
  showAddFolder.value = true;
};

const handleFolderDelete = async (folder) => {
  const hasChildren = folder.children && folder.children.length > 0;
  const folderBookmarks = bookmarks.value.filter(
    (b) => b.folderId === folder.id,
  );
  const hasBookmarks = folderBookmarks.length > 0;

  if (hasChildren || hasBookmarks) {
    ElMessage.warning("请先将该文件夹内的数据移动到其他文件夹后再进行删除操作");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除文件夹「${folder.label || folder.name}」吗？`,
      "确认删除",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
    await bookmarkStore.deleteFolder(folder.id);
    if (selectedFolderId.value === folder.id) {
      selectedFolderId.value = null;
    }
    ElMessage.success("删除成功");
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("Cannot delete folder")
    ) {
      ElMessage.warning(
        "请先将该文件夹内的数据移动到其他文件夹后再进行删除操作",
      );
    } else if (error !== "cancel") {
      ElMessage.error("删除失败");
    }
  }
};

const handleFolderDrop = async (dropData) => {
  const { draggedId, targetId, dropType } = dropData;
  const draggedFolder = folders.value.find((f) => f.id === draggedId);
  const targetFolder = folders.value.find((f) => f.id === targetId);

  if (!draggedFolder || !targetFolder) return;

  if (dropType === "inner") {
    if (targetId === draggedFolder.id) return;
    await bookmarkStore.updateFolderParent(draggedFolder.id, targetId);
    await bookmarkStore.loadFolders();
    ElMessage.success("文件夹已移动到目标文件夹");
  } else {
    const targetParentId = targetFolder.parentId;
    const draggedParentId = draggedFolder.parentId;

    if (targetParentId !== draggedParentId) {
      await bookmarkStore.updateFolderParent(draggedFolder.id, targetParentId);
    }

    const siblings = folders.value.filter((f) => f.parentId === targetParentId);
    const sortedSiblings = [...siblings].sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0),
    );

    const targetIndex = sortedSiblings.findIndex((s) => s.id === targetId);
    let newIndex = targetIndex;

    if (dropType === "after") {
      newIndex = targetIndex + 1;
    }

    const filtered = sortedSiblings.filter((s) => s.id !== draggedId);
    filtered.splice(newIndex, 0, draggedFolder);

    const updateData = filtered.map((folder, index) => ({
      id: folder.id,
      sortOrder: index,
    }));

    await bookmarkStore.updateFolderOrder(updateData);
    await bookmarkStore.loadFolders();
    ElMessage.success("文件夹顺序已更新");
  }
};

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
  if (!isEditMode.value) {
    saveBookmarkOrder();
    selectedBookmarkIds.value = [];
  }
};

const handleSelectBookmark = (bookmark) => {
  const index = selectedBookmarkIds.value.indexOf(bookmark.id);
  if (index > -1) {
    selectedBookmarkIds.value.splice(index, 1);
  } else {
    selectedBookmarkIds.value.push(bookmark.id);
  }
};

const handleToggleSelectAll = () => {
  if (selectedBookmarkIds.value.length === filteredBookmarks.value.length) {
    selectedBookmarkIds.value = [];
  } else {
    selectedBookmarkIds.value = filteredBookmarks.value.map((b) => b.id);
  }
};

const handleBatchMove = () => {
  if (selectedBookmarkIds.value.length === 0) {
    ElMessage.warning("请先选择要移动的书签");
    return;
  }
  showMoveModal.value = true;
};

const confirmBatchMove = async () => {
  if (targetFolderId.value === null && targetFolderId.value !== null) {
    ElMessage.warning("请选择目标文件夹");
    return;
  }

  try {
    await bookmarkStore.batchUpdateBookmarkFolder(
      selectedBookmarkIds.value,
      targetFolderId.value,
    );
    await bookmarkStore.loadBookmarks();
    selectedBookmarkIds.value = [];
    showMoveModal.value = false;
    targetFolderId.value = null;
    ElMessage.success("书签移动成功");
  } catch (error) {
    ElMessage.error("移动失败");
  }
};

const handleBatchDelete = async () => {
  if (selectedBookmarkIds.value.length === 0) {
    ElMessage.warning("请先选择要删除的书签");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedBookmarkIds.value.length} 个书签吗？`,
      "确认删除",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    for (const id of selectedBookmarkIds.value) {
      await bookmarkStore.deleteBookmark(id);
    }
    selectedBookmarkIds.value = [];
    ElMessage.success("删除成功");
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败");
    }
  }
};

const handleBookmarkDragStart = (event, bookmark) => {
  draggingBookmark.value = bookmark;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", bookmark.id.toString());
};

const handleBookmarkDragEnd = () => {
  draggingBookmark.value = null;
  dropTargetIndex.value = -1;
};

const handleBookmarkDragOver = (event, index) => {
  event.dataTransfer.dropEffect = "move";

  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const halfHeight = rect.height / 2;

  if (y < halfHeight) {
    dropTargetIndex.value = index;
  } else {
    dropTargetIndex.value = index + 1;
  }
};

const handleBookmarkDrop = async (event) => {
  if (!draggingBookmark.value) return;

  const targetIndex = dropTargetIndex.value;
  const filtered = [...filteredBookmarks.value];

  const sourceIndex = filtered.findIndex(
    (b) => b.id === draggingBookmark.value.id,
  );

  if (sourceIndex === -1 || targetIndex === -1) {
    draggingBookmark.value = null;
    dropTargetIndex.value = -1;
    return;
  }

  if (sourceIndex < targetIndex) {
    const [removed] = filtered.splice(sourceIndex, 1);
    filtered.splice(targetIndex - 1, 0, removed);
  } else {
    const [removed] = filtered.splice(sourceIndex, 1);
    filtered.splice(targetIndex, 0, removed);
  }

  const folderId = selectedFolderId.value;
  let allBookmarks = [...bookmarks.value];

  if (folderId !== null && folderId !== undefined) {
    const otherBookmarks = allBookmarks.filter((b) => b.folderId !== folderId);
    const folderBookmarks = filtered.map((b, idx) => ({
      ...b,
      sortOrder: idx,
    }));
    allBookmarks = [...otherBookmarks, ...folderBookmarks];
  } else {
    allBookmarks = filtered.map((b, idx) => ({ ...b, sortOrder: idx }));
  }

  try {
    await bookmarkStore.updateBookmarkOrder(allBookmarks);
    await bookmarkStore.loadBookmarks();
    ElMessage.success("书签顺序已更新");
  } catch (error) {
    ElMessage.error("更新顺序失败");
  }

  draggingBookmark.value = null;
  dropTargetIndex.value = -1;
};

const touchDragState = ref({
  startY: 0,
  currentIndex: -1,
  bookmark: null,
});

const handleTouchStart = (event, bookmark, index) => {
  if (!isEditMode.value) return;
  touchDragState.value = {
    startY: event.touches[0].clientY,
    currentIndex: index,
    bookmark,
  };
  draggingBookmark.value = bookmark;
};

const handleTouchMove = (event, index) => {
  if (!isEditMode.value || !touchDragState.value.bookmark) return;

  const touch = event.touches[0];
  const cards = document.querySelectorAll(".bookmark-card");
  let targetIndex = -1;

  cards.forEach((card, i) => {
    const rect = card.getBoundingClientRect();
    if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
      targetIndex = i;
    }
  });

  if (targetIndex !== -1) {
    const card = cards[targetIndex];
    const rect = card.getBoundingClientRect();
    const y = touch.clientY - rect.top;
    const halfHeight = rect.height / 2;

    if (y < halfHeight) {
      dropTargetIndex.value = targetIndex;
    } else {
      dropTargetIndex.value = targetIndex + 1;
    }
  }
};

const handleTouchEnd = async () => {
  if (!isEditMode.value || !touchDragState.value.bookmark) {
    touchDragState.value = { startY: 0, currentIndex: -1, bookmark: null };
    return;
  }

  const targetIndex = dropTargetIndex.value;
  const filtered = [...filteredBookmarks.value];
  const sourceIndex = filtered.findIndex(
    (b) => b.id === touchDragState.value.bookmark.id,
  );

  if (sourceIndex === -1 || targetIndex === -1) {
    draggingBookmark.value = null;
    dropTargetIndex.value = -1;
    touchDragState.value = { startY: 0, currentIndex: -1, bookmark: null };
    return;
  }

  if (sourceIndex < targetIndex) {
    const [removed] = filtered.splice(sourceIndex, 1);
    filtered.splice(targetIndex - 1, 0, removed);
  } else {
    const [removed] = filtered.splice(sourceIndex, 1);
    filtered.splice(targetIndex, 0, removed);
  }

  const folderId = selectedFolderId.value;
  let allBookmarks = [...bookmarks.value];

  if (folderId !== null && folderId !== undefined) {
    const otherBookmarks = allBookmarks.filter((b) => b.folderId !== folderId);
    const folderBookmarks = filtered.map((b, idx) => ({
      ...b,
      sortOrder: idx,
    }));
    allBookmarks = [...otherBookmarks, ...folderBookmarks];
  } else {
    allBookmarks = filtered.map((b, idx) => ({ ...b, sortOrder: idx }));
  }

  try {
    await bookmarkStore.updateBookmarkOrder(allBookmarks);
    await bookmarkStore.loadBookmarks();
    ElMessage.success("书签顺序已更新");
  } catch (error) {
    ElMessage.error("更新顺序失败");
  }

  draggingBookmark.value = null;
  dropTargetIndex.value = -1;
  touchDragState.value = { startY: 0, currentIndex: -1, bookmark: null };
};

const saveBookmarkOrder = async () => {
  const folderId = selectedFolderId.value;
  let allBookmarks = [...bookmarks.value];

  if (folderId !== null && folderId !== undefined) {
    const otherBookmarks = allBookmarks.filter((b) => b.folderId !== folderId);
    const folderBookmarks = filteredBookmarks.value.map((b, idx) => ({
      ...b,
      sortOrder: idx,
    }));
    allBookmarks = [...otherBookmarks, ...folderBookmarks];
  } else {
    allBookmarks = filteredBookmarks.value.map((b, idx) => ({
      ...b,
      sortOrder: idx,
    }));
  }

  await bookmarkStore.updateBookmarkOrder(allBookmarks);
  ElMessage.success("排序已保存");
};

const openBookmark = (bookmark) => {
  if (!isEditMode.value) {
    window.open(bookmark.url, "_blank");
  }
};

const editBookmark = (bookmark) => {
  editingBookmark.value = bookmark;
  showAddBookmark.value = true;
};

const deleteBookmark = async (bookmark) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除书签「${bookmark.title}」吗？`,
      "确认删除",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
    await bookmarkStore.deleteBookmark(bookmark.id);
    ElMessage.success("删除成功");
  } catch {
    ElMessage.info("已取消删除");
  }
};

const saveBookmark = async ({ resolve, reject, ...formData }) => {
  if (!formData.title || !formData.url) {
    ElMessage.error("请填写标题和URL");
    reject && reject(new Error('请填写标题和URL'));
    return;
  }

  try {
    if (formData.id) {
      await bookmarkStore.updateBookmark(formData.id, formData);
      ElMessage.success("更新成功");
    } else {
      const folderId = formData.folderId;
      const folderBookmarks = bookmarks.value.filter(
        (b) => b.folderId === folderId,
      );
      const maxSortOrder =
        folderBookmarks.length > 0
          ? Math.max(...folderBookmarks.map((b) => b.sortOrder || 0))
          : 0;
      await bookmarkStore.addBookmark({
        ...formData,
        folderId,
        sortOrder: maxSortOrder + 1,
      });
      ElMessage.success("添加成功");
    }
    showAddBookmark.value = false;
    editingBookmark.value = null;
    resolve && resolve();
  } catch (error) {
    console.error('Save bookmark failed:', error);
    reject && reject(error);
  }
};

const saveFolder = async ({ name, parentId, editingFolder: folderToEdit }) => {
  if (!name) {
    ElMessage.error("请输入文件夹名称");
    return;
  }

  if (folderToEdit) {
    await bookmarkStore.updateFolder(folderToEdit.id, name);
    if (parentId !== folderToEdit.parentId) {
      await bookmarkStore.updateFolderParent(folderToEdit.id, parentId);
    }
    ElMessage.success("修改成功");
  } else {
    const pId = parentId !== null ? parentId : null;
    const siblingFolders = folders.value.filter((f) => f.parentId === pId);
    const maxSortOrder =
      siblingFolders.length > 0
        ? Math.max(...siblingFolders.map((f) => f.sortOrder || 0))
        : 0;
    await bookmarkStore.addFolder(name, maxSortOrder + 1, pId);
    ElMessage.success("添加成功");
  }
  showAddFolder.value = false;
  editingFolder.value = null;
};

const loadUserData = async () => {
  await configStore.loadConfig();
  
  await bookmarkStore.loadFolders();

  await nextTick(() => {
    let targetFolderId = localStorage.getItem("selectedFolderId");

    if (!targetFolderId) {
      targetFolderId = configStore.config.defaultFolderId;
    }

    if (!targetFolderId) {
      const rootFolder = folders.value.find((f) => !f.parentId);
      targetFolderId = rootFolder?.id;
    }

    selectedFolderId.value = targetFolderId;

    if (targetFolderId) {
      const parentIds = [];
      let currentId = targetFolderId;
      while (currentId) {
        const folder = folders.value.find(
          (f) => String(f.id) === String(currentId),
        );
        if (!folder) break;
        if (folder.parentId) {
          parentIds.unshift(folder.parentId);
        }
        currentId = folder.parentId;
      }

      parentIds.forEach((parentId) => {
        if (!expandedFolders.value.includes(parentId)) {
          expandedFolders.value.push(parentId);
        }
      });
    }
  });

  if (selectedFolderId.value) {
    await bookmarkStore.loadBookmarksByFolder(selectedFolderId.value);
  }
};

onMounted(() => {
  if (isLoggedIn.value) {
    loadUserData();
  }
  window.addEventListener('resize', handleResize);
});

watch(isLoggedIn, (newVal) => {
  if (newVal) {
    loadUserData();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  color: #fff;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  background-attachment: fixed;
}

.move-modal-content p {
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.8);
}

.folder-select {
  width: 100%;
}

.user-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
  padding: 100px 24px 24px;
  gap: 24px;
  min-height: 0;
  overflow: hidden;
}

.sidebar-toggle-btn {
  display: none;
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0 8px 8px 0;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.sidebar-toggle-btn svg {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.8);
  transition: transform 0.3s ease;
}

.sidebar-toggle-btn svg.rotate {
  transform: rotate(180deg);
}

.sidebar-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.sidebar-toggle-btn:hover svg {
  color: #fff;
}

@media (max-width: 768px) {
  .sidebar-toggle-btn {
    display: flex;
    left: 0;
    transition: left 0.3s ease;
  }

  .sidebar.collapsed ~ .sidebar-toggle-btn {
    left: 260px;
  }

  .main-content {
    flex-direction: column;
    padding: 130px 12px 16px;
    gap: 16px;
    overflow-y: auto;
    max-height: calc(100vh - 16px);
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    padding: 90px 20px 20px;
    gap: 20px;
  }
}
</style>
