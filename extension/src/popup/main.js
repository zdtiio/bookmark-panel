document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
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
        showStatus('success', '保存成功！');
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        showStatus('error', '保存失败，请检查配置');
      }
    } catch (error) {
      showStatus('error', '网络错误，请稍后重试');
    }
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
