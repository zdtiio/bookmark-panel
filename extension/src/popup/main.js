const normalizeApiUrl = (apiUrl) => (apiUrl || '').trim().replace(/\/+$/, '');

const buildPanelUrl = (apiUrl, apiToken) => {
  const baseUrl = normalizeApiUrl(apiUrl) || 'http://localhost:3000';
  if (!apiToken) return baseUrl;

  try {
    const url = new URL(baseUrl);
    url.hash = `apiToken=${encodeURIComponent(apiToken)}`;
    return url.toString();
  } catch (error) {
    return baseUrl;
  }
};

const getErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.message || data.error || '';
  } catch (error) {
    return '';
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('addForm');
  const titleInput = document.getElementById('title');
  const urlInput = document.getElementById('url');
  const descriptionInput = document.getElementById('description');
  const folderSelect = document.getElementById('folderId');
  const saveBtn = document.getElementById('saveBtn');
  const openPanelBtn = document.getElementById('openPanelBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  const statusDiv = document.getElementById('status');

  let config = {};
  let folders = [];
  let isSaving = false;

  const showStatus = (type, message) => {
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
  };

  const clearStatus = () => {
    statusDiv.className = 'status';
    statusDiv.textContent = '';
  };

  const setFormEnabled = (enabled) => {
    [titleInput, urlInput, descriptionInput, folderSelect, saveBtn].forEach((element) => {
      element.disabled = !enabled;
    });
  };

  const apiFetch = (path, options = {}) => {
    return fetch(`${normalizeApiUrl(config.apiUrl)}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': config.apiToken,
        ...(options.headers || {})
      }
    });
  };

  const hasParent = (folder) =>
    folder.parentId !== null && folder.parentId !== undefined && folder.parentId !== '';

  const sortFolders = (list) =>
    [...list].sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
    });

  const buildFolderOptions = (parentId, depth, visited) => {
    const children = sortFolders(
      folders.filter((folder) => {
        if (visited.has(String(folder.id))) return false;
        if (parentId === null) return !hasParent(folder);
        return hasParent(folder) && String(folder.parentId) === String(parentId);
      })
    );

    children.forEach((folder) => {
      visited.add(String(folder.id));
      const option = document.createElement('option');
      const prefix = depth > 0 ? `${'　'.repeat(depth)}└ ` : '';
      option.value = String(folder.id);
      option.textContent = `${prefix}${folder.name}`;
      folderSelect.appendChild(option);
      buildFolderOptions(folder.id, depth + 1, visited);
    });
  };

  const renderFolderOptions = (defaultFolderId) => {
    folderSelect.innerHTML = '';
    const rootOption = document.createElement('option');
    rootOption.value = '';
    rootOption.textContent = '根目录';
    folderSelect.appendChild(rootOption);

    buildFolderOptions(null, 0, new Set());

    const matched =
      defaultFolderId !== null && defaultFolderId !== undefined
        ? folders.find((folder) => String(folder.id) === String(defaultFolderId))
        : null;
    folderSelect.value = matched ? String(matched.id) : '';
  };

  const loadFolders = async () => {
    try {
      const [foldersResponse, configResponse] = await Promise.all([
        apiFetch('/api/folders'),
        apiFetch('/api/config')
      ]);

      let defaultFolderId = null;

      if (configResponse.ok) {
        const configData = await configResponse.json().catch(() => ({}));
        defaultFolderId = configData?.defaultFolderId ?? null;
      }

      if (foldersResponse.ok) {
        const data = await foldersResponse.json().catch(() => ({}));
        folders = Array.isArray(data?.data) ? data.data : [];
      } else {
        showStatus('error', '文件夹加载失败，将保存到根目录');
      }

      renderFolderOptions(defaultFolderId);
    } catch (error) {
      renderFolderOptions(null);
      showStatus('error', '文件夹加载失败，将保存到根目录');
    }
  };

  const init = async () => {
    config = await chrome.storage.local.get(['apiUrl', 'apiToken']);

    const params = new URLSearchParams(window.location.search);
    const presetTitle = params.get('title');
    const presetUrl = params.get('url');

    if (presetTitle || presetUrl) {
      titleInput.value = presetTitle || '';
      urlInput.value = presetUrl || '';
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      titleInput.value = tab?.title || '';
      urlInput.value = tab?.url || '';
    }

    if (!config.apiUrl || !config.apiToken) {
      setFormEnabled(false);
      showStatus('error', '请先在设置中配置 API URL 和 Token');
      return;
    }

    await loadFolders();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSaving) return;

    if (!config.apiUrl || !config.apiToken) {
      showStatus('error', '请先在设置中配置 API URL 和 Token');
      return;
    }

    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    const description = descriptionInput.value.trim();
    const folderValue = folderSelect.value;
    const folderId = folderValue ? Number(folderValue) : null;

    if (!title) {
      showStatus('error', '请填写标题');
      return;
    }

    if (!url) {
      showStatus('error', '请填写 URL');
      return;
    }

    isSaving = true;
    setFormEnabled(false);
    saveBtn.textContent = '保存中...';
    clearStatus();

    try {
      const response = await apiFetch('/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ title, url, description, folderId })
      });

      if (response.ok) {
        showStatus('success', '添加成功！');
        setTimeout(() => {
          window.close();
        }, 800);
        return;
      }

      const message = await getErrorMessage(response);
      showStatus('error', message ? `添加失败：${message}` : '添加失败，请检查配置');
    } catch (error) {
      showStatus('error', '网络错误，请稍后重试');
    }

    isSaving = false;
    setFormEnabled(true);
    saveBtn.textContent = '添加书签';
  });

  openPanelBtn.addEventListener('click', () => {
    if (!config.apiUrl) {
      showStatus('error', '请先配置 API URL');
      return;
    }
    chrome.tabs.create({ url: buildPanelUrl(config.apiUrl, config.apiToken) });
    window.close();
  });

  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  await init();
});
