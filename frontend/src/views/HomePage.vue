<template>
  <div class="home-page">
    <GuestView v-if="!isLoggedIn" @login="goToLogin" @register="goToRegister" />

    <div v-else class="user-view">
      <UserHeader
        :active-view="activeView"
        @switch-view="switchView"
        @add-bookmark="openAddBookmark"
        @settings="showSettings = true"
        @logout="handleLogout"
        @search="handleSearch"
        @search-clear="handleSearchClear"
      />

      <HomeBoard
        v-if="activeView === 'home'"
        :home-items="homeItems"
        :bookmarks="bookmarks"
        :folders="folders"
        :show-icons="config.showIcons"
        @open-bookmark="openHomeBookmark"
        @open-folder="openHomeFolder"
        @remove="removeHomeItem"
        @reorder="reorderHomeItems"
        @manage="switchView('manage')"
      />

      <main
        v-else
        class="main-content"
        :class="{ 'sidebar-hidden': sidebarCollapsed || !config.showFolders }"
      >
        <FolderSidebar
          v-if="config.showFolders"
          :folder-tree="folderTree"
          :selected-folder-id="selectedFolderId"
          :expanded-folders="expandedFolders"
          :collapsed="sidebarCollapsed"
          :home-items="homeItems"
          @select="selectFolder"
          @add-folder="handleAddFolder"
          @toggle-expand="toggleFolderExpand"
          @edit="editFolder"
          @delete="handleFolderDelete"
          @toggle-home="toggleFolderHome"
          @folder-drop="handleFolderDrop"
          @toggle-collapse="toggleSidebar"
        />

        <div
          v-if="config.showFolders && !sidebarCollapsed && isMobile"
          class="sidebar-backdrop"
          @click="sidebarCollapsed = true"
        ></div>

        <button
          v-if="config.showFolders && sidebarCollapsed"
          class="sidebar-toggle-btn"
          @click="toggleSidebar"
          title="显示侧栏"
        >
          <SidebarOpen />
        </button>

        <BookmarkSection
          :bookmarks="filteredBookmarks"
          :sub-folders="currentSubFolders"
          :all-folders="folders"
          :current-folder-path="currentFolderPath"
          :selected-folder-id="selectedFolderId"
          :is-edit-mode="isEditMode"
          :show-icons="config.showIcons"
          :is-mobile="isMobile"
          :home-items="homeItems"
          :dragging-id="draggingBookmark?.id"
          :drop-target-index="dropTargetIndex"
          :selected-ids="selectedBookmarkIds"
          :is-search-result="!!currentSearchQuery"
          :dragging-folder-id="draggingSubFolder?.id"
          :folder-drop-target-index="subFolderDropIndex"
          @select-folder="selectFolder"
          @subfolder-open="openSubFolder"
          @subfolder-dragstart="handleSubFolderDragStart"
          @subfolder-dragend="handleSubFolderDragEnd"
          @subfolder-dragover="handleSubFolderDragOver"
          @subfolder-drop="handleSubFolderDrop"
          @toggle-edit="toggleEditMode"
          @open-bookmark="openBookmark"
          @edit-bookmark="editBookmark"
          @delete-bookmark="deleteBookmark"
          @toggle-home="toggleBookmarkHome"
          @toggle-home-folder="toggleFolderHome"
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
        :default-folder-id="selectedFolderId"
        @save="saveBookmark"
      />

      <AddFolderModal
        v-model:visible="showAddFolder"
        :folders="folders"
        :editing-folder="editingFolder"
        :default-parent-id="selectedFolderId"
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
import { SidebarOpen } from "lucide-vue-next";

import GuestView from "../components/GuestView.vue";
import UserHeader from "../components/UserHeader.vue";
import HomeBoard from "../components/HomeBoard.vue";
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
const activeView = ref("home");
const isEditMode = ref(false);
const draggingBookmark = ref(null);
const dropTargetIndex = ref(-1);
const expandedFolders = ref([]);
const sidebarCollapsed = ref(true);
const currentSearchQuery = ref('');

const homeItems = computed(() =>
  Array.isArray(config.value.homeItems) ? config.value.homeItems : [],
);

const draggingSubFolder = ref(null);
const subFolderDropIndex = ref(-1);

const showAddBookmark = ref(false);
const showAddFolder = ref(false);
const showSettings = ref(false);
const showMoveModal = ref(false);

const selectedBookmarkIds = ref([]);

const editingFolder = ref(null);
const editingBookmark = ref(null);
const targetFolderId = ref(null);

const isMobile = ref(window.innerWidth <= 768);

const handleResize = () => {
  const wasMobile = isMobile.value;
  isMobile.value = window.innerWidth <= 768;
  if (!wasMobile && isMobile.value) {
    sidebarCollapsed.value = true;
  }
};

const sortFolders = (list) => {
  return [...list].sort((a, b) => {
    const orderA = a.sortOrder ?? 0;
    const orderB = b.sortOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
  });
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

const currentSubFolders = computed(() => {
  if (currentSearchQuery.value) return [];
  const parentId = selectedFolderId.value;
  const hasParent = parentId !== null && parentId !== undefined && parentId !== "";

  return sortFolders(
    folders.value.filter((folder) => {
      const folderParentId = folder.parentId;
      const folderHasParent =
        folderParentId !== null && folderParentId !== undefined && folderParentId !== "";
      if (!hasParent) return !folderHasParent;
      return folderHasParent && String(folderParentId) === String(parentId);
    }),
  );
});

const buildFolderTree = (parentId = null) => {
  const children = sortFolders(
    folders.value.filter((f) => {
      const folderParentId = f.parentId;
      const folderHasParent =
        folderParentId !== null && folderParentId !== undefined && folderParentId !== "";
      if (parentId === null) return !folderHasParent;
      return folderHasParent && String(folderParentId) === String(parentId);
    }),
  );
  return children.map((folder) => ({
    id: folder.id,
    label: folder.name,
    name: folder.name,
    parentId: folder.parentId,
    sortOrder: folder.sortOrder,
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
  const path = [{ id: null, name: "全部书签" }];
  if (selectedFolderId.value === null || selectedFolderId.value === undefined) {
    return path;
  }
  const folderId = selectedFolderId.value;
  const folderPath = [];
  let currentId = folderId;
  while (currentId) {
    const folder = folders.value.find(
      (f) => String(f.id) === String(currentId),
    );
    if (!folder) break;
    folderPath.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }
  return [...path, ...folderPath];
});

const switchView = (view) => {
  activeView.value = view === "manage" ? "manage" : "home";
};

const openHomeBookmark = (bookmark) => {
  window.open(bookmark.url, "_blank");
};

const openHomeFolder = async (folder) => {
  switchView("manage");
  await selectFolder(folder.id);
  revealFolderInTree(folder.id);
};

const toggleHomeItem = async (type, id) => {
  const items = [...homeItems.value];
  const index = items.findIndex(
    (item) => item.type === type && String(item.id) === String(id),
  );

  if (index > -1) {
    items.splice(index, 1);
    ElMessage.success("已从首页移除");
  } else {
    items.push({ type, id });
    ElMessage.success("已添加到首页");
  }

  await configStore.saveConfig({ homeItems: items });
};

const toggleBookmarkHome = (bookmark) => toggleHomeItem("bookmark", bookmark.id);
const toggleFolderHome = (folder) => toggleHomeItem("folder", folder.id);
const removeHomeItem = (item) => toggleHomeItem(item.type, item.id);

const reorderHomeItems = async (items) => {
  await configStore.saveConfig({ homeItems: items });
};

const removeHomeEntries = async (predicate) => {
  const nextItems = homeItems.value.filter((item) => !predicate(item));
  if (nextItems.length !== homeItems.value.length) {
    await configStore.saveConfig({ homeItems: nextItems });
  }
};

const goToLogin = () => {
    emit("navigate", "LoginPage");
  };

  const goToRegister = () => {
    emit("navigate", "RegisterPage");
  };

  const handleSearch = async (query) => {
    switchView("manage");
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
  const folderId =
    typeof folderOrId === "object" ? folderOrId?.id ?? null : folderOrId;
  selectedFolderId.value = folderId ?? null;

  if (folderId === null || folderId === undefined) {
    localStorage.setItem("selectedFolderId", "root");
  } else {
    localStorage.setItem("selectedFolderId", folderId);
  }

  selectedBookmarkIds.value = [];

  if (isMobile.value) {
    sidebarCollapsed.value = true;
  }
};

const revealFolderInTree = (folderId) => {
  let currentId = folderId;
  const parentIds = [];
  while (currentId) {
    const folder = folders.value.find((f) => String(f.id) === String(currentId));
    if (!folder || !folder.parentId) break;
    parentIds.unshift(folder.parentId);
    currentId = folder.parentId;
  }
  parentIds.forEach((id) => {
    if (!expandedFolders.value.includes(id)) {
      expandedFolders.value.push(id);
    }
  });
};

const openSubFolder = async (folder) => {
  const folderId = typeof folder === "object" ? folder.id : folder;
  await selectFolder(folderId);
  revealFolderInTree(folderId);
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
    await removeHomeEntries(
      (item) => item.type === "folder" && String(item.id) === String(folder.id),
    );
    if (String(selectedFolderId.value) === String(folder.id)) {
      selectedFolderId.value = null;
      localStorage.setItem("selectedFolderId", "root");
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

const getChildrenOf = (parentId) =>
  sortFolders(
    folders.value.filter((folder) => {
      const folderParentId = folder.parentId;
      const folderHasParent =
        folderParentId !== null && folderParentId !== undefined && folderParentId !== "";
      if (parentId === null || parentId === undefined) return !folderHasParent;
      return folderHasParent && String(folderParentId) === String(parentId);
    }),
  );

const isDescendantOf = (folderId, ancestorId) => {
  let current = folders.value.find((f) => String(f.id) === String(folderId));
  while (current && current.parentId) {
    if (String(current.parentId) === String(ancestorId)) return true;
    current = folders.value.find((f) => String(f.id) === String(current.parentId));
  }
  return false;
};

const handleFolderDrop = async (dropData) => {
  const { draggedId, targetId, dropType } = dropData;
  const draggedFolder = folders.value.find(
    (f) => String(f.id) === String(draggedId),
  );
  const targetFolder = folders.value.find(
    (f) => String(f.id) === String(targetId),
  );

  if (!draggedFolder || !targetFolder) return;
  if (String(draggedFolder.id) === String(targetFolder.id)) return;
  if (isDescendantOf(targetId, draggedId)) {
    ElMessage.warning("不能将文件夹移动到它自己的子文件夹中");
    return;
  }

  if (dropType === "inner") {
    const siblings = getChildrenOf(targetId);
    const maxSortOrder = siblings.length
      ? Math.max(...siblings.map((f) => f.sortOrder ?? 0))
      : -1;

    await bookmarkStore.updateFolderParent(draggedFolder.id, targetId);
    await bookmarkStore.updateFolderOrder([
      { id: draggedFolder.id, sortOrder: maxSortOrder + 1 },
    ]);
    await bookmarkStore.loadFolders();

    if (!expandedFolders.value.includes(targetId)) {
      expandedFolders.value.push(targetId);
    }
    ElMessage.success("文件夹已移动到目标文件夹");
    return;
  }

  const targetParentId = targetFolder.parentId ?? null;
  const draggedParentId = draggedFolder.parentId ?? null;
  const sameParent = String(draggedParentId ?? "") === String(targetParentId ?? "");

  const siblings = getChildrenOf(targetParentId);
  const withoutDragged = siblings.filter(
    (f) => String(f.id) !== String(draggedFolder.id),
  );

  let insertIndex = withoutDragged.findIndex(
    (f) => String(f.id) === String(targetId),
  );
  if (insertIndex === -1) {
    insertIndex = withoutDragged.length;
  } else if (dropType === "after") {
    insertIndex += 1;
  }

  if (!sameParent) {
    await bookmarkStore.updateFolderParent(draggedFolder.id, targetParentId);
  }

  withoutDragged.splice(insertIndex, 0, draggedFolder);

  await bookmarkStore.updateFolderOrder(
    withoutDragged.map((folder, index) => ({
      id: folder.id,
      sortOrder: index,
    })),
  );
  await bookmarkStore.loadFolders();
  ElMessage.success("文件夹顺序已更新");
};

const handleSubFolderDragStart = (event, folder) => {
  draggingSubFolder.value = folder;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(
    "text/plain",
    JSON.stringify({ type: "folder", id: folder.id }),
  );
};

const handleSubFolderDragEnd = () => {
  draggingSubFolder.value = null;
  subFolderDropIndex.value = -1;
};

const handleSubFolderDragOver = (event, index) => {
  if (!draggingSubFolder.value) return;
  event.dataTransfer.dropEffect = "move";
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left;
  subFolderDropIndex.value = x < rect.width / 2 ? index : index + 1;
};

const handleSubFolderDrop = async () => {
  if (!draggingSubFolder.value) return;

  const targetIndex = subFolderDropIndex.value;
  const list = [...currentSubFolders.value];
  const sourceIndex = list.findIndex(
    (f) => String(f.id) === String(draggingSubFolder.value.id),
  );

  draggingSubFolder.value = null;
  subFolderDropIndex.value = -1;

  if (sourceIndex === -1 || targetIndex === -1) return;

  if (sourceIndex < targetIndex) {
    const [removed] = list.splice(sourceIndex, 1);
    list.splice(targetIndex - 1, 0, removed);
  } else if (sourceIndex > targetIndex) {
    const [removed] = list.splice(sourceIndex, 1);
    list.splice(targetIndex, 0, removed);
  }

  await bookmarkStore.updateFolderOrder(
    list.map((folder, index) => ({ id: folder.id, sortOrder: index })),
  );
  await bookmarkStore.loadFolders();
  ElMessage.success("文件夹顺序已更新");
};

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
  if (!isEditMode.value) {
    if (!currentSearchQuery.value) {
      saveBookmarkOrder();
    }
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
  if (
    targetFolderId.value === null ||
    targetFolderId.value === undefined ||
    targetFolderId.value === ""
  ) {
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
    const deletedIds = new Set(selectedBookmarkIds.value.map((id) => String(id)));
    await removeHomeEntries(
      (item) => item.type === "bookmark" && deletedIds.has(String(item.id)),
    );
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

const openAddBookmark = () => {
  editingBookmark.value = null;
  showAddBookmark.value = true;
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
    await removeHomeEntries(
      (item) => item.type === "bookmark" && String(item.id) === String(bookmark.id),
    );
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
    if (pId !== null && pId !== undefined) {
      revealFolderInTree(pId);
      if (!expandedFolders.value.includes(pId)) {
        expandedFolders.value.push(pId);
      }
    }
    ElMessage.success("添加成功");
  }
  showAddFolder.value = false;
  editingFolder.value = null;
};

const normalizeFolderId = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === "root" || text === "null" || text === "undefined") {
    return null;
  }
  const numeric = Number(text);
  return Number.isNaN(numeric) ? text : numeric;
};

const loadUserData = async () => {
  await configStore.loadConfig();

  await Promise.all([
    bookmarkStore.loadFolders(),
    bookmarkStore.loadBookmarks(),
  ]);

  await nextTick(() => {
    const storedValue = localStorage.getItem("selectedFolderId");
    const hasStoredSelection = storedValue !== null;

    let targetFolderId = hasStoredSelection
      ? normalizeFolderId(storedValue)
      : normalizeFolderId(configStore.config.defaultFolderId);

    if (
      targetFolderId !== null &&
      !folders.value.some((f) => String(f.id) === String(targetFolderId))
    ) {
      targetFolderId = null;
    }

    if (!targetFolderId && !hasStoredSelection) {
      const rootFolder = folders.value.find((f) => !f.parentId);
      targetFolderId = rootFolder?.id ?? null;
    }

    selectedFolderId.value = targetFolderId;

    if (targetFolderId) {
      localStorage.setItem("selectedFolderId", targetFolderId);
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
    } else {
      localStorage.setItem("selectedFolderId", "root");
    }
  });

  const validHomeItems = homeItems.value.filter((item) =>
    item.type === "bookmark"
      ? bookmarks.value.some((b) => String(b.id) === String(item.id))
      : folders.value.some((f) => String(f.id) === String(item.id)),
  );
  if (validHomeItems.length !== homeItems.value.length) {
    await configStore.saveConfig({ homeItems: validHomeItems });
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

.main-content.sidebar-hidden {
  gap: 0;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 105;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.sidebar-toggle-btn {
  display: flex;
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 120;
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

.sidebar-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.sidebar-toggle-btn:hover svg {
  color: #fff;
}

@media (max-width: 768px) {
  .sidebar-toggle-btn {
    left: 0;
    transition: left 0.3s ease;
  }

  .main-content {
    flex-direction: column;
    /* 移动端头部为三行（标题 / 功能按钮 / 搜索栏），需预留对应高度 */
    padding: 160px 12px 16px;
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
