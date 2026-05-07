<template>
  <div class="home-page">
    <div v-if="!isLoggedIn" class="guest-view">
      <div class="site-name">Bookmark-Panel</div>
      <div class="time-display">
        <div class="time">{{ currentTime }}</div>
        <div class="date">{{ currentDate }}</div>
      </div>
      <div class="search-container">
        <div class="search-bar">
          <div class="search-engine-wrapper">
            <div 
              class="search-engine-btn" 
              @click="toggleEngineDropdown"
            >
              <span :class="['engine-icon', guestSearchEngine]">{{ selectedLabel }}</span>
            </div>
            <div 
              v-if="showEngineDropdown" 
              class="engine-dropdown"
              style="background: #2d2d4a !important; opacity: 1 !important;"
            >
              <div 
                v-for="engine in engineList" 
                :key="engine"
                class="engine-option"
                @click="selectEngine(engine)"
              >
                <span :class="['engine-icon', engine]">{{ getEngineLabel(engine) }}</span>
                <span class="engine-name">{{ engineNames[engine] }}</span>
              </div>
            </div>
          </div>
          <div class="search-input-wrapper">
            <el-input 
              v-model="searchQuery" 
              placeholder="请输入搜索内容" 
              class="search-input"
              @keyup.enter="handleSearch"
            />
          </div>
          <button class="search-submit-btn" @click="handleSearch">
            <Search />
          </button>
        </div>
      </div>
      <div class="auth-buttons">
        <el-button class="login-btn" @click="goToLogin">登录</el-button>
        <el-button class="register-btn" @click="goToRegister">注册</el-button>
      </div>
    </div>

    <div v-else class="user-view">
      <header class="header">
        <div class="header-left">
          <div class="title-section">
            <h1>{{ config.siteName }}</h1>
            <div class="time-display">
              <span class="time">{{ currentTime }}</span>
              <span class="date">{{ currentDate }}</span>
            </div>
          </div>
        </div>
        <div class="header-center">
          <div class="header-search-container">
            <div class="search-bar">
              <div class="search-engine-wrapper">
                <div 
                  class="search-engine-btn" 
                  @click="toggleEngineDropdown"
                >
                  <span :class="['engine-icon', guestSearchEngine]">{{ selectedLabel }}</span>
                </div>
                <div 
                  v-if="showEngineDropdown" 
                  class="engine-dropdown"
                  style="background: #2d2d4a !important; opacity: 1 !important;"
                >
                  <div 
                    v-for="engine in engineList" 
                    :key="engine"
                    class="engine-option"
                    @click="selectEngine(engine)"
                  >
                    <span :class="['engine-icon', engine]">{{ getEngineLabel(engine) }}</span>
                    <span class="engine-name">{{ engineNames[engine] }}</span>
                  </div>
                </div>
              </div>
              <div class="search-input-wrapper">
                <el-input 
                  v-model="searchQuery" 
                  placeholder="搜索书签..." 
                  class="search-input"
                  @keyup.enter="handleSearch"
                />
              </div>
              <button class="search-submit-btn" @click="handleSearch">
                <Search />
              </button>
            </div>
          </div>
        </div>
        <div class="header-right">
          <button class="header-btn add-btn" @click="showAddBookmark = true" title="添加书签">
            <Plus />
          </button>
          <button class="header-btn settings-btn" @click="showSettings = true" title="设置">
            <Settings />
          </button>
          <button class="header-btn logout-btn" @click="handleLogout" title="退出登录">
            <LogOut />
          </button>
        </div>
      </header>

      <main class="main-content">
        <aside v-if="config.showFolders" class="sidebar" :class="{ 'collapsed': sidebarCollapsed }">
          <div class="sidebar-header">
            <h3>文件夹</h3>
            <button class="add-folder-btn" @click="showAddFolder = true">
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
            @select="selectFolder"
            @contextmenu="handleFolderContextMenu"
            @toggle-expand="toggleFolderExpand"
            @edit="handleFolderEdit"
            @delete="handleFolderDelete"
            @folder-drop="handleFolderDrop"
          />
            
            <div v-if="folderTree.length === 0" class="empty-folders">
              <Folder class="empty-folder-icon" />
              <span>暂无文件夹</span>
            </div>
          </div>
        </aside>

        <button class="sidebar-toggle-btn" @click="toggleSidebar" title="切换文件夹">
          <Menu :class="{ 'rotate': sidebarCollapsed }" />
        </button>

        <section class="bookmark-section">
          <div class="bookmark-header">
            <div class="folder-breadcrumb">
              <div 
                v-for="(item, index) in currentFolderPath" 
                :key="item.id"
                class="breadcrumb-item"
                :class="{ 'active': index === currentFolderPath.length - 1 }"
                @click="item.id !== null && selectFolder(item.id)"
              >
                <Folder v-if="index === 0" class="folder-icon" />
                <ChevronRight v-else class="chevron-icon" />
                <span>{{ item.name }}</span>
              </div>
            </div>
            <button 
              v-if="selectedFolderId !== null && filteredBookmarks.length > 0"
              @click="toggleEditMode"
              class="edit-mode-btn"
              :class="{ 'active': isEditMode }"
            >
              <Pencil />
              <span>{{ isEditMode ? '完成编辑' : '编辑' }}</span>
            </button>
          </div>

          <div class="bookmark-content">
          <div v-if="filteredBookmarks.length === 0" class="empty-state">
            <BookmarkMinus />
            <p>暂无书签</p>
          </div>
          <div 
            v-else 
            class="bookmark-grid"
            :class="{ 'edit-mode': isEditMode }"
          >
            <div 
            v-for="(bookmark, index) in filteredBookmarks" 
            :key="bookmark.id" 
            class="bookmark-card"
            :class="{ 
              'dragging': draggingBookmark?.id === bookmark.id,
              'drop-before': dropTargetIndex === index && draggingBookmark?.id !== bookmark.id,
              'drop-after': dropTargetIndex === index + 1 && draggingBookmark?.id !== bookmark.id,
              'edit-mode': isEditMode
            }"
            @click="openBookmark(bookmark)"
            :draggable="isEditMode"
            @dragstart="handleBookmarkDragStart($event, bookmark)"
            @dragend="handleBookmarkDragEnd"
            @dragover.prevent="handleBookmarkDragOver($event, index)"
            @drop="handleBookmarkDrop($event)"
            @touchstart="handleTouchStart($event, bookmark, index)"
            @touchmove.prevent="handleTouchMove($event, index)"
            @touchend="handleTouchEnd($event)"
          >
            <div v-if="isEditMode" class="drag-handle">
              <GripVertical />
            </div>
              <div class="bookmark-icon" v-if="config.showIcons">
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
                <h4>{{ bookmark.title }}</h4>
                <p class="bookmark-url">{{ bookmark.url }}</p>
              </div>
              <div v-if="isEditMode" class="bookmark-actions">
                <button class="action-btn edit-btn" @click.stop="editBookmark(bookmark)">
                  <Pencil />
                </button>
                <button class="action-btn delete-btn" @click.stop="deleteBookmark(bookmark)">
                  <Trash2 />
                </button>
              </div>
            </div>
          </div>
          </div>
        </section>
      </main>

      <el-dialog title="书签" v-model="showAddBookmark" @close="resetBookmarkForm">
        <el-form :model="bookmarkForm">
          <el-form-item label="标题">
            <el-input v-model="bookmarkForm.title" placeholder="请输入标题" />
          </el-form-item>
          <el-form-item label="URL">
            <el-input v-model="bookmarkForm.url" placeholder="请输入网址" />
          </el-form-item>
          <el-form-item label="描述">
            <el-textarea v-model="bookmarkForm.description" placeholder="请输入描述" />
          </el-form-item>
          <el-form-item label="文件夹">
            <el-select v-model="bookmarkForm.folderId" placeholder="选择文件夹">
              <el-option :value="null" label="无文件夹" />
              <el-option 
                v-for="folder in folders" 
                :key="folder.id" 
                :value="folder.id" 
                :label="folder.name" 
              />
            </el-select>
          </el-form-item>
          <el-form-item label="图标">
            <el-upload
              action="/api/bookmarks/icon"
              :headers="{ Authorization: `Bearer ${authStore.token}` }"
              :on-success="handleIconUpload"
              :before-upload="beforeIconUpload"
              class="icon-upload"
            >
              <el-button size="small" type="primary">上传图标</el-button>
            </el-upload>
            <button v-if="bookmarkForm.icon" type="button" @click="bookmarkForm.icon = ''" class="clear-icon-btn">
              清除图标
            </button>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showAddBookmark = false">取消</el-button>
          <el-button type="primary" @click="saveBookmark">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog :title="editingFolder ? '修改文件夹' : '添加文件夹'" v-model="showAddFolder">
        <el-form :model="folderForm">
          <el-form-item label="文件夹名称">
            <el-input v-model="folderForm.name" placeholder="请输入文件夹名称" />
          </el-form-item>
          <el-form-item label="父文件夹">
            <el-tree-select
              v-model="folderForm.parentId"
              :data="parentFolderTree"
              :props="treeProps"
              placeholder="选择父文件夹（可选）"
              :render-after-expand="false"
              :check-strictly="true"
            >
              <template #empty>
                <div style="padding: 12px; text-align: center; color: rgba(255,255,255,0.5);">
                  暂无文件夹
                </div>
              </template>
              <template #default-value>
                <span v-if="selectedParentFolderPath">{{ selectedParentFolderPath }}</span>
                <span v-else style="color: rgba(255,255,255,0.5);">选择父文件夹（可选）</span>
              </template>
            </el-tree-select>
            <div v-if="folderForm.parentId !== null && editingFolder" style="margin-top: 8px;">
              <button 
                type="button" 
                @click="folderForm.parentId = null" 
                class="clear-parent-btn"
              >
                清空父文件夹（设为顶级）
              </button>
            </div>
            <div v-if="folderForm.parentId === null" style="margin-top: 8px; font-size: 12px; color: rgba(255,255,255,0.5);">
              当前为顶级文件夹
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="closeFolderDialog">取消</el-button>
          <el-button type="primary" @click="saveFolder">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog title="设置" v-model="showSettings" width="600px">
        <SettingsPanel @close="showSettings = false" />
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useBookmarkStore } from '../stores/bookmarks';
import { useConfigStore } from '../stores/config';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus, Settings, LogOut, Globe, BookmarkMinus, Pencil, Trash2, Move, GripVertical, Folder, FolderOpen, ChevronRight, ChevronDown, Menu } from 'lucide-vue-next';
import SettingsPanel from '../components/SettingsPanel.vue';
import FolderTreeNode from '../components/FolderTreeNode.vue';

const emit = defineEmits(['navigate']);
const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore();
const configStore = useConfigStore();

const isLoggedIn = computed(() => authStore.isAuthenticated());
const config = computed(() => configStore.config);
const bookmarks = computed(() => bookmarkStore.bookmarks);
const folders = computed(() => bookmarkStore.folders);

const currentTime = ref('');
const currentDate = ref('');
const searchQuery = ref('');
const guestSearchEngine = ref('baidu');
const selectedFolderId = ref(null);
const isEditMode = ref(false);
const draggingBookmark = ref(null);
const dropTargetIndex = ref(-1);
const expandedFolders = ref([]);
const sidebarCollapsed = ref(false);

const showAddBookmark = ref(false);
const showAddFolder = ref(false);
const showSettings = ref(false);
const showEngineDropdown = ref(false);

const editingFolder = ref(null);

const bookmarkForm = ref({
  title: '',
  url: '',
  description: '',
  folderId: null,
  icon: ''
});

const folderForm = ref({
  name: '',
  parentId: null
});

let timeInterval = null;

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  currentDate.value = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
};

const filteredBookmarks = computed(() => {
  let result = bookmarks.value;
  
  if (selectedFolderId.value !== null && selectedFolderId.value !== undefined) {
    result = result.filter(b => b.folderId === selectedFolderId.value);
  }
  
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(b => 
      b.title.toLowerCase().includes(query) || 
      b.url.toLowerCase().includes(query)
    );
  }
  
  return result;
});

const buildFolderTree = (parentId = null) => {
  const children = folders.value.filter(f => f.parentId === parentId);
  return children.map(folder => ({
    id: folder.id,
    label: folder.name,
    children: buildFolderTree(folder.id)
  }));
};

const folderTree = computed(() => {
  return buildFolderTree(null);
});

const treeProps = {
  label: 'label',
  children: 'children',
  value: 'id'
};

const currentFolderPath = computed(() => {
  if (selectedFolderId.value === null || selectedFolderId.value === undefined) {
    const rootFolder = folders.value.find(f => !f.parentId);
    return rootFolder ? [{ id: rootFolder.id, name: rootFolder.name }] : [{ id: null, name: '全部书签' }];
  }
  const folderId = selectedFolderId.value;
  const path = [];
  let currentId = folderId;
  while (currentId) {
    const folder = folders.value.find(f => String(f.id) === String(currentId));
    if (!folder) break;
    path.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }
  return path.length > 0 ? path : [{ id: null, name: '未知文件夹' }];
});

const selectedParentFolderPath = computed(() => {
  const folderId = folderForm.value.parentId;
  if (!folderId) return null;
  const path = [];
  let currentId = folderId;
  while (currentId) {
    const folder = folders.value.find(f => String(f.id) === String(currentId));
    if (!folder) break;
    path.unshift(folder.name);
    currentId = folder.parentId;
  }
  return path.join('/');
});

const availableParentFolders = computed(() => {
  const excludeIds = [];
  if (editingFolder.value) {
    excludeIds.push(editingFolder.value.id);
    const getChildIds = (folderId) => {
      const children = folders.value.filter(f => f.parentId === folderId);
      children.forEach(child => {
        excludeIds.push(child.id);
        getChildIds(child.id);
      });
    };
    getChildIds(editingFolder.value.id);
  }
  return folders.value.filter(f => !excludeIds.includes(f.id));
});

const parentFolderTree = computed(() => {
  const buildTree = (parentId = null) => {
    return availableParentFolders.value
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

const getSelectedFolderPath = (folderId) => {
  if (!folderId) return null;
  const path = [];
  let currentId = folderId;
  while (currentId) {
    const folder = folders.value.find(f => f.id === currentId);
    if (!folder) break;
    path.unshift(folder.name);
    currentId = folder.parentId;
  }
  return path.join('/');
};

const searchEngines = {
  google: 'https://www.google.com/search?q=',
  baidu: 'https://www.baidu.com/s?wd=',
  bing: 'https://www.bing.com/search?q='
};

const engineNames = {
  google: 'Google',
  baidu: '百度',
  bing: '必应'
};

const engineList = ['baidu', 'google', 'bing'];

const selectedLabel = computed(() => {
  const labels = { google: 'G', baidu: 'B', bing: 'Bi' };
  return labels[guestSearchEngine.value] || 'B';
});

const getEngineLabel = (engine) => {
  const labels = { google: 'G', baidu: 'B', bing: 'Bi' };
  return labels[engine] || 'B';
};

const toggleEngineDropdown = () => {
  showEngineDropdown.value = !showEngineDropdown.value;
};

const selectEngine = (engine) => {
  guestSearchEngine.value = engine;
  showEngineDropdown.value = false;
};

const handleSearch = () => {
  if (!searchQuery.value.trim()) return;
  let searchUrl;
  searchUrl = searchEngines[guestSearchEngine.value] + encodeURIComponent(searchQuery.value);
  window.open(searchUrl, '_blank');
};

const handleSearchEngineChange = () => {
};

const goToLogin = () => {
  emit('navigate', 'LoginPage');
};

const goToRegister = () => {
  emit('navigate', 'RegisterPage');
};

const handleLogout = async () => {
  await authStore.logout();
  ElMessage.success('登出成功');
  window.location.reload();
};

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const selectFolder = (folderOrId) => {
  if (typeof folderOrId === 'object') {
    selectedFolderId.value = folderOrId.id;
  } else {
    selectedFolderId.value = folderOrId;
  }
};

const toggleFolderExpand = (folderId) => {
  const index = expandedFolders.value.indexOf(folderId);
  if (index > -1) {
    expandedFolders.value.splice(index, 1);
  } else {
    expandedFolders.value.push(folderId);
  }
};

const handleFolderContextMenu = async (event, node) => {
  event.preventDefault();
  const menuItems = [
    { label: '重命名', action: 'rename' },
    { label: '删除', action: 'delete' }
  ];
  
  try {
    const { action } = await ElMessageBox.confirm(
      `选择操作：`,
      '文件夹操作',
      {
        confirmButtonText: '重命名',
        cancelButtonText: '删除',
        type: 'info',
        customClass: 'folder-context-menu'
      }
    );
    if (action === 'confirm') {
      editFolder(node.data);
    } else {
      deleteFolder(node.data);
    }
  } catch (error) {
    if (error !== 'cancel') {
      deleteFolder(node.data);
    }
  }
};

const editFolder = (folder) => {
  const originalFolder = folders.value.find(f => f.id === folder.id);
  if (originalFolder) {
    editingFolder.value = originalFolder;
    folderForm.value = { name: originalFolder.name, parentId: originalFolder.parentId || null };
  } else {
    editingFolder.value = folder;
    folderForm.value = { name: folder.label || folder.name || '', parentId: folder.parentId || null };
  }
  showAddFolder.value = true;
};

const handleFolderEdit = (folder) => {
  editFolder(folder);
};

const handleFolderDelete = async (folder) => {
  deleteFolder(folder);
};

const deleteFolder = async (folder) => {
  try {
    const hasChildren = folder.children && folder.children.length > 0;
    const folderBookmarks = bookmarks.value.filter(b => b.folderId === folder.id);
    const hasBookmarks = folderBookmarks.length > 0;
    
    if (hasChildren || hasBookmarks) {
      ElMessage.warning('请先将该文件夹内的数据移动到其他文件夹后再进行删除操作');
      return;
    }
    
    await ElMessageBox.confirm(
      `确定要删除文件夹「${folder.label || folder.name}」吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    await bookmarkStore.deleteFolder(folder.id);
    if (selectedFolderId.value === folder.id) {
      selectedFolderId.value = null;
    }
    ElMessage.success('删除成功');
  } catch (error) {
    if (error && error.message && error.message.includes('Cannot delete folder')) {
      ElMessage.warning('请先将该文件夹内的数据移动到其他文件夹后再进行删除操作');
    } else if (error !== 'cancel') {
      ElMessage.error('删除失败');
    } else {
      ElMessage.info('已取消删除');
    }
  }
};

const allowFolderDrop = (draggingNode, dropNode) => {
  return true;
};

const handleFolderDrop = async (dropData) => {
  const { draggedId, targetId, dropType } = dropData;
  const draggedFolder = folders.value.find(f => f.id === draggedId);
  const targetFolder = folders.value.find(f => f.id === targetId);
  
  if (!draggedFolder || !targetFolder) return;

  if (dropType === 'inner') {
    if (targetId === draggedFolder.id) return;
    await bookmarkStore.updateFolderParent(draggedFolder.id, targetId);
    await bookmarkStore.loadFolders();
    ElMessage.success('文件夹已移动到目标文件夹');
  } else {
    const targetParentId = targetFolder.parentId;
    const draggedParentId = draggedFolder.parentId;
    
    if (targetParentId !== draggedParentId) {
      await bookmarkStore.updateFolderParent(draggedFolder.id, targetParentId);
    }
    
    const siblings = folders.value.filter(f => f.parentId === targetParentId);
    const sortedSiblings = [...siblings].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    const targetIndex = sortedSiblings.findIndex(s => s.id === targetId);
    let newIndex = targetIndex;
    
    if (dropType === 'after') {
      newIndex = targetIndex + 1;
    }
    
    const filtered = sortedSiblings.filter(s => s.id !== draggedId);
    filtered.splice(newIndex, 0, draggedFolder);
    
    const updateData = filtered.map((folder, index) => ({
      id: folder.id,
      sortOrder: index
    }));
    
    await bookmarkStore.updateFolderOrder(updateData);
    await bookmarkStore.loadFolders();
    ElMessage.success('文件夹顺序已更新');
  }
};

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
  if (!isEditMode.value) {
    saveBookmarkOrder();
  }
};

const handleBookmarkDragStart = (event, bookmark) => {
  console.log('Drag start:', bookmark.title, bookmark.id);
  draggingBookmark.value = bookmark;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', bookmark.id.toString());
};

const handleBookmarkDragEnd = () => {
  console.log('Drag end');
  draggingBookmark.value = null;
  dropTargetIndex.value = -1;
};

const handleBookmarkDragOver = (event, index) => {
  console.log('Drag over index:', index);
  event.dataTransfer.dropEffect = 'move';
  
  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const halfHeight = rect.height / 2;
  
  if (y < halfHeight) {
    dropTargetIndex.value = index;
    console.log('Drop before index:', index);
  } else {
    dropTargetIndex.value = index + 1;
    console.log('Drop after index:', index + 1);
  }
};

const handleBookmarkDrop = async (event) => {
  console.log('Drop event triggered');
  console.log('dropTargetIndex:', dropTargetIndex.value);
  console.log('draggingBookmark:', draggingBookmark.value?.title);
  
  if (!draggingBookmark.value) {
    console.log('No dragging bookmark');
    return;
  }
  
  const targetIndex = dropTargetIndex.value;
  const filtered = [...filteredBookmarks.value];
  console.log('Filtered bookmarks count:', filtered.length);
  
  const sourceIndex = filtered.findIndex(b => b.id === draggingBookmark.value.id);
  console.log('Source index:', sourceIndex, 'Target index:', targetIndex);
  
  if (sourceIndex === -1 || targetIndex === -1) {
    console.log('Invalid source or target index');
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
    const otherBookmarks = allBookmarks.filter(b => b.folderId !== folderId);
    const folderBookmarks = filtered.map((b, idx) => ({ ...b, sortOrder: idx }));
    allBookmarks = [...otherBookmarks, ...folderBookmarks];
  } else {
    allBookmarks = filtered.map((b, idx) => ({ ...b, sortOrder: idx }));
  }
  
  console.log('New order to save:', allBookmarks.slice(0, 3).map(b => ({ id: b.id, title: b.title, sortOrder: b.sortOrder })));
  
  try {
    await bookmarkStore.updateBookmarkOrder(allBookmarks);
    console.log('Order updated successfully');
    await bookmarkStore.loadBookmarks();
    console.log('Bookmarks reloaded');
    ElMessage.success('书签顺序已更新');
  } catch (error) {
    console.error('Failed to update order:', error);
    ElMessage.error('更新顺序失败');
  }
  
  draggingBookmark.value = null;
  dropTargetIndex.value = -1;
};

const touchDragState = ref({
  startY: 0,
  currentIndex: -1,
  bookmark: null
});

const handleTouchStart = (event, bookmark, index) => {
  if (!isEditMode.value) return;
  touchDragState.value = {
    startY: event.touches[0].clientY,
    currentIndex: index,
    bookmark
  };
  draggingBookmark.value = bookmark;
};

const handleTouchMove = (event, index) => {
  if (!isEditMode.value || !touchDragState.value.bookmark) return;

  const touch = event.touches[0];
  const cards = document.querySelectorAll('.bookmark-card');
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
  const sourceIndex = filtered.findIndex(b => b.id === touchDragState.value.bookmark.id);

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
    const otherBookmarks = allBookmarks.filter(b => b.folderId !== folderId);
    const folderBookmarks = filtered.map((b, idx) => ({ ...b, sortOrder: idx }));
    allBookmarks = [...otherBookmarks, ...folderBookmarks];
  } else {
    allBookmarks = filtered.map((b, idx) => ({ ...b, sortOrder: idx }));
  }

  try {
    await bookmarkStore.updateBookmarkOrder(allBookmarks);
    await bookmarkStore.loadBookmarks();
    ElMessage.success('书签顺序已更新');
  } catch (error) {
    ElMessage.error('更新顺序失败');
  }

  draggingBookmark.value = null;
  dropTargetIndex.value = -1;
  touchDragState.value = { startY: 0, currentIndex: -1, bookmark: null };
};

const saveBookmarkOrder = async () => {
  const folderId = selectedFolderId.value;
  let allBookmarks = [...bookmarks.value];
  
  if (folderId !== null && folderId !== undefined) {
    const otherBookmarks = allBookmarks.filter(b => b.folderId !== folderId);
    const folderBookmarks = filteredBookmarks.value.map((b, idx) => ({ ...b, sortOrder: idx }));
    allBookmarks = [...otherBookmarks, ...folderBookmarks];
  } else {
    allBookmarks = filteredBookmarks.value.map((b, idx) => ({ ...b, sortOrder: idx }));
  }
  
  await bookmarkStore.updateBookmarkOrder(allBookmarks);
  ElMessage.success('排序已保存');
};

const openBookmark = (bookmark) => {
  if (!isEditMode.value) {
    window.open(bookmark.url, '_blank');
  }
};

const editBookmark = (bookmark) => {
  bookmarkForm.value = { ...bookmark };
  showAddBookmark.value = true;
};

const deleteBookmark = async (bookmark) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除书签「${bookmark.title}」吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    await bookmarkStore.deleteBookmark(bookmark.id);
    ElMessage.success('删除成功');
  } catch {
    ElMessage.info('已取消删除');
  }
};

const resetBookmarkForm = () => {
  bookmarkForm.value = {
    title: '',
    url: '',
    description: '',
    folderId: null,
    icon: ''
  };
};

const closeFolderDialog = () => {
  showAddFolder.value = false;
  editingFolder.value = null;
  folderForm.value = { name: '', parentId: null };
};

const saveBookmark = async () => {
  if (!bookmarkForm.value.title || !bookmarkForm.value.url) {
    ElMessage.error('请填写标题和URL');
    return;
  }
  
  if (bookmarkForm.value.id) {
    await bookmarkStore.updateBookmark(bookmarkForm.value.id, bookmarkForm.value);
    ElMessage.success('更新成功');
  } else {
    const folderId = selectedFolderId.value !== null ? selectedFolderId.value : null;
    const folderBookmarks = bookmarks.value.filter(b => b.folderId === folderId);
    const maxSortOrder = folderBookmarks.length > 0 
      ? Math.max(...folderBookmarks.map(b => b.sortOrder || 0)) 
      : 0;
    await bookmarkStore.addBookmark({ 
      ...bookmarkForm.value, 
      folderId,
      sortOrder: maxSortOrder + 1
    });
    ElMessage.success('添加成功');
  }
  showAddBookmark.value = false;
  resetBookmarkForm();
};

const saveFolder = async () => {
  if (!folderForm.value.name) {
    ElMessage.error('请输入文件夹名称');
    return;
  }
  
  if (editingFolder.value) {
    await bookmarkStore.updateFolder(editingFolder.value.id, folderForm.value.name);
    if (folderForm.value.parentId !== editingFolder.value.parentId) {
      await bookmarkStore.updateFolderParent(editingFolder.value.id, folderForm.value.parentId);
    }
    ElMessage.success('修改成功');
  } else {
    const parentId = folderForm.value.parentId !== null ? folderForm.value.parentId : null;
    const siblingFolders = folders.value.filter(f => f.parentId === parentId);
    const maxSortOrder = siblingFolders.length > 0 
      ? Math.max(...siblingFolders.map(f => f.sortOrder || 0)) 
      : 0;
    await bookmarkStore.addFolder(folderForm.value.name, maxSortOrder + 1, parentId);
    ElMessage.success('添加成功');
  }
  closeFolderDialog();
};

const handleIconUpload = (response) => {
  bookmarkForm.value.icon = response.iconUrl;
};

const beforeIconUpload = (file) => {
  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    ElMessage.error('请上传图片文件');
    return false;
  }
  return true;
};

const getIconUrl = (icon) => {
  if (icon.startsWith('http')) return icon;
  return '/api' + icon;
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

const loadUserData = async () => {
  await bookmarkStore.loadBookmarks();
  await bookmarkStore.loadFolders();
  await configStore.loadConfig();
  
  await nextTick(() => {
    const rootFolder = folders.value.find(f => !f.parentId);
    if (rootFolder) {
      selectedFolderId.value = rootFolder.id;
    }
  });
};

const handleClickOutside = (event) => {
  const engineWrapper = document.querySelector('.search-engine-wrapper');
  if (engineWrapper && !engineWrapper.contains(event.target)) {
    showEngineDropdown.value = false;
  }
};

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
  
  if (isLoggedIn.value) {
    loadUserData();
  }
  
  document.addEventListener('click', handleClickOutside);
});

watch(isLoggedIn, (newVal) => {
  if (newVal) {
    loadUserData();
  }
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  color: #fff;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  background-attachment: fixed;
}

.guest-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.guest-view .site-name {
  font-size: 36px;
  font-weight: 600;
  margin-bottom: 30px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.guest-view .time-display {
  text-align: center;
  margin-bottom: 40px;
}

.time-display {
  text-align: center;
}

.time-display .time {
  font-size: 72px;
  font-weight: 300;
  margin-bottom: 10px;
}

.time-display .date {
  font-size: 18px;
  opacity: 0.8;
}

.search-container {
  width: 100%;
  max-width: 650px;
  margin-bottom: 40px;
}

.search-bar {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 50%, #1e3a5f 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 40px;
  padding: 4px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.search-engine-wrapper {
  display: flex;
  align-items: center;
}

.search-engine-btn {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-right: 4px;
  position: relative;
}

.search-engine-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.search-engine-btn:active {
  transform: scale(0.95);
}

.search-engine-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.engine-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background-color: #2d2d4a !important;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 6px;
  min-width: 150px;
  z-index: 999999 !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  opacity: 1 !important;
  filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  background-image: none !important;
  overflow: visible;
  pointer-events: auto;
}

.engine-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.engine-option:hover {
  background: rgba(102, 126, 234, 0.3);
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.search-input-wrapper :deep(.el-input__wrapper) {
  background: transparent;
  border: none;
  box-shadow: none;
  width: 100%;
}

.search-input-wrapper :deep(.el-input__inner) {
  color: #fff;
  background: transparent;
  font-size: 16px;
  border: none;
  box-shadow: none;
}

.search-input-wrapper :deep(.el-input__inner)::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.search-input-wrapper :deep(.el-input__clear) {
  color: rgba(255, 255, 255, 0.5);
}

.search-submit-btn {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-left: 4px;
}

.search-submit-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(1.05);
}

.search-submit-btn:active {
  transform: scale(0.95);
}

.search-submit-btn svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.engine-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.engine-icon.google {
  background: linear-gradient(135deg, #4285f4 0%, #ea4335 50%, #fbbc05 100%);
}

.engine-icon.baidu {
  background: #3385ff;
}

.engine-icon.bing {
  background: linear-gradient(135deg, #0066cc 0%, #2d5bef 100%);
}

.engine-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.search-input {
  width: 100%;
}

.header-search-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-buttons {
  display: flex;
  gap: 20px;
}

.login-btn {
  width: 120px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  transition: all 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.4);
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
}

.login-btn:active {
  transform: translateY(0);
}

.register-btn {
  width: 120px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: #fff;
  transition: all 0.3s ease;
}

.register-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.register-btn:active {
  transform: translateY(0);
}

.user-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(20px);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: flex-start;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-section h1 {
  font-size: 24px;
  margin: 0;
  font-weight: 600;
}

.title-section .time-display {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.title-section .time {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
}

.title-section .date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.header-center {
  flex: 1;
  max-width: 650px;
  margin: 0 40px;
}

.header-search-container {
  width: 100%;
}

.header-right {
  display: flex;
  gap: 10px;
}

.header-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.header-btn svg {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.3s ease;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.header-btn:hover svg {
  color: #fff;
  transform: scale(1.1);
}

.header-btn:active {
  transform: translateY(0);
}

.add-btn {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.3) 0%, rgba(103, 194, 58, 0.3) 100%);
  border: 1px solid rgba(64, 158, 255, 0.3);
}

.add-btn:hover {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.5) 0%, rgba(103, 194, 58, 0.5) 100%);
  box-shadow: 0 4px 20px rgba(64, 158, 255, 0.4);
}

.add-btn svg {
  color: #67c23a;
}

.add-btn:hover svg {
  color: #fff;
}

.settings-btn:hover {
  background: rgba(230, 162, 60, 0.25);
}

.settings-btn:hover svg {
  color: #e6a23c;
}

.logout-btn:hover {
  background: rgba(245, 108, 108, 0.25);
}

.logout-btn:hover svg {
  color: #f56c6c;
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

.folder-tree-item {
  margin-bottom: 2px;
}

.folder-tree-item.child {
  padding-left: 20px;
}

.folder-tree-item.grandchild {
  padding-left: 40px;
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
  max-height: 500px;
  transform: translateY(0);
}

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

.bookmark-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
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

.bookmark-icon svg {
  width: 24px;
  height: 24px;
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

.icon-upload {
  margin-bottom: 8px;
}

.clear-icon-btn {
  background: none;
  border: none;
  color: #f56c6c;
  font-size: 12px;
  cursor: pointer;
}

.clear-parent-btn {
  background: rgba(245, 108, 108, 0.15);
  border: 1px solid rgba(245, 108, 108, 0.3);
  color: #f56c6c;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-parent-btn:hover {
  background: rgba(245, 108, 108, 0.3);
  border-color: rgba(245, 108, 108, 0.5);
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

.folder-context-menu {
  .el-message-box__content {
    display: none;
  }
}

@media (max-width: 768px) {
  .guest-view .site-name {
    font-size: 24px;
    margin-bottom: 20px;
  }

  .time-display .time {
    font-size: 48px;
  }

  .time-display .date {
    font-size: 14px;
  }

  .search-container {
    max-width: 100%;
  }

  .search-bar {
    padding: 3px;
  }

  .search-engine-btn {
    width: 40px;
    height: 40px;
    margin-right: 2px;
  }

  .search-submit-btn {
    width: 40px;
    height: 40px;
    margin-left: 2px;
  }

  .auth-buttons {
    gap: 12px;
  }

  .login-btn, .register-btn {
    width: 100px;
    height: 42px;
    font-size: 14px;
  }

  .header {
    flex-wrap: wrap;
    padding: 8px 12px;
    gap: 8px;
  }

  .header-left {
    order: 1;
    width: 100%;
    justify-content: center;
  }

  .title-section {
    align-items: center;
    gap: 2px;
  }

  .title-section h1 {
    font-size: 16px;
    margin: 0;
  }

  .title-section .time-display {
    gap: 6px;
    line-height: 1;
  }

  .title-section .time {
    font-size: 12px;
    line-height: 1.2;
  }

  .title-section .date {
    font-size: 10px;
    line-height: 1.2;
  }

  .header-center {
    order: 3;
    width: 100%;
    max-width: 100%;
    margin: 0;
  }

  .header-right {
    order: 2;
    margin-left: auto;
  }

  .header-btn {
    width: 40px;
    height: 40px;
  }

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

  .bookmark-card {
    padding: 10px;
    gap: 10px;
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
  .header {
    padding: 14px 20px;
  }

  .header-center {
    max-width: 500px;
    margin: 0 20px;
  }

  .main-content {
    padding: 90px 20px 20px;
    gap: 20px;
  }

  .sidebar {
    width: 220px;
    padding: 16px;
  }

  .bookmark-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }

  .bookmark-card {
    padding: 11px;
  }
}
</style>