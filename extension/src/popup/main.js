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

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  const openPanelBtn = document.getElementById('openPanelBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  const statusDiv = document.getElementById('status');

  saveBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showStatus('error', '无法获取当前页面');
      return;
    }

    const config = await chrome.storage.local.get(['apiUrl', 'apiToken']);
    if (!config.apiUrl || !config.apiToken) {
      showStatus('error', '请先配置 API URL 和 Token');
      return;
    }

    showStatus('success', '正在保存...');

    try {
      const response = await fetch(`${normalizeApiUrl(config.apiUrl)}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': config.apiToken
        },
        body: JSON.stringify({
          title: tab.title || '',
          url: tab.url,
          description: ''
        })
      });

      if (response.ok) {
        showStatus('success', '保存成功！');
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        const message = await getErrorMessage(response);
        showStatus('error', message ? `保存失败：${message}` : '保存失败，请检查配置');
      }
    } catch (error) {
      showStatus('error', '网络错误，请稍后重试');
    }
  });

  openPanelBtn.addEventListener('click', async () => {
    const config = await chrome.storage.local.get(['apiUrl', 'apiToken']);
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

  const showStatus = (type, message) => {
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
  };
});
