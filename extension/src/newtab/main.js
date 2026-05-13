document.addEventListener('DOMContentLoaded', async () => {
  const config = await chrome.storage.local.get(['apiUrl', 'apiToken']);
  
  if (config.apiToken && config.apiUrl) {
    window.location.href = config.apiUrl;
    return;
  }

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

    const config = await chrome.storage.local.get(['apiUrl', 'apiToken']);
    if (!config.apiUrl || !config.apiToken) {
      alert('请先配置 API URL 和 Token');
      return;
    }

    try {
      const response = await fetch(`${config.apiUrl}/api/bookmarks`, {
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
        alert('保存成功！');
      } else {
        alert('保存失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  });

  openPanelBtn.addEventListener('click', async () => {
    const config = await chrome.storage.local.get('apiUrl');
    const url = config.apiUrl || 'http://localhost:3000';
    window.open(url, '_blank');
  });

  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});