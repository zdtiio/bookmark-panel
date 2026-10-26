const normalizeApiUrl = (apiUrl) => (apiUrl || '').trim().replace(/\/+$/, '');

const buildPanelUrl = (apiUrl, apiToken) => {
  const baseUrl = normalizeApiUrl(apiUrl);
  if (!apiToken) return baseUrl;

  try {
    const url = new URL(baseUrl);
    url.hash = `apiToken=${encodeURIComponent(apiToken)}`;
    return url.toString();
  } catch (error) {
    return baseUrl;
  }
};

const getConfig = () => chrome.storage.local.get(['apiUrl', 'apiToken']);

// 隐藏浏览器新标签页自带的元素（自定义按钮、扩展提示等）
const removeChromeElements = () => {
  setTimeout(() => {
    document.querySelectorAll('*').forEach((el) => {
      const ariaLabel = el.getAttribute('aria-label');
      const className = typeof el.className === 'string' ? el.className : '';
      const id = el.id;

      if (
        (ariaLabel && (ariaLabel.includes('自定义') || ariaLabel.includes('书签') || ariaLabel.includes('插件'))) ||
        (className && (className.includes('customize') || className.includes('chrome') || className.includes('extension'))) ||
        (id && (id.includes('customize') || id.includes('chrome'))) ||
        (el.textContent && (el.textContent.includes('自定义') || el.textContent.includes('书签管理面板')))
      ) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      }
    });
  }, 100);
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
  const config = await getConfig();

  if (config.apiToken && config.apiUrl) {
    window.location.replace(buildPanelUrl(config.apiUrl, config.apiToken));
    return;
  }

  document.body.style.display = 'flex';
  removeChromeElements();

  const timeDiv = document.getElementById('time');
  const dateDiv = document.getElementById('date');
  const searchInput = document.getElementById('searchInput');
  const saveBtn = document.getElementById('saveBtn');
  const openPanelBtn = document.getElementById('openPanelBtn');
  const optionsBtn = document.getElementById('optionsBtn');

  const updateTime = () => {
    const now = new Date();
    timeDiv.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    dateDiv.textContent = now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  updateTime();
  setInterval(updateTime, 1000);

  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchInput.value)}`;
      window.open(searchUrl, '_blank');
    }
  });

  saveBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const currentConfig = await getConfig();
    if (!currentConfig.apiUrl || !currentConfig.apiToken) {
      alert('请先配置 API URL 和 Token');
      return;
    }

    try {
      const response = await fetch(`${normalizeApiUrl(currentConfig.apiUrl)}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': currentConfig.apiToken
        },
        body: JSON.stringify({
          title: tab.title || '',
          url: tab.url,
          description: ''
        })
      });

      if (response.ok) {
        alert('保存成功！');
      } else {
        const message = await getErrorMessage(response);
        alert(`保存失败${message ? `：${message}` : '，请检查配置'}`);
      }
    } catch (error) {
      alert('网络错误');
    }
  });

  openPanelBtn.addEventListener('click', async () => {
    const currentConfig = await getConfig();
    window.open(buildPanelUrl(currentConfig.apiUrl || 'http://localhost:3000', currentConfig.apiToken), '_blank');
  });

  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
