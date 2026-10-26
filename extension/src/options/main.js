const normalizeApiUrl = (apiUrl) => (apiUrl || '').trim().replace(/\/+$/, '');

document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const apiTokenInput = document.getElementById('apiToken');
  const replaceHomepageInput = document.getElementById('replaceHomepage');
  const replaceNewtabInput = document.getElementById('replaceNewtab');
  const testBtn = document.getElementById('testBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  const config = await chrome.storage.local.get([
    'apiUrl',
    'apiToken',
    'replaceHomepage',
    'replaceNewtab'
  ]);

  apiUrlInput.value = config.apiUrl || '';
  apiTokenInput.value = config.apiToken || '';
  replaceHomepageInput.checked = config.replaceHomepage || false;
  replaceNewtabInput.checked = config.replaceNewtab || false;

  testBtn.addEventListener('click', async () => {
    const apiUrl = normalizeApiUrl(apiUrlInput.value);
    const apiToken = apiTokenInput.value.trim();

    if (!apiUrl || !apiToken) {
      showStatus('error', '请先填写 API URL 和 API Token');
      return;
    }

    showStatus('success', '正在验证 Token...');

    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { 'X-API-Token': apiToken }
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const username = data.data?.user?.username;
        showStatus('success', `连接成功${username ? `，当前用户：${username}` : ''}`);
      } else {
        showStatus('error', `验证失败：${data.message || `HTTP ${response.status}`}`);
      }
    } catch (error) {
      showStatus('error', '无法连接到 API 服务，请检查 API URL');
    }
  });

  saveBtn.addEventListener('click', async () => {
    const newConfig = {
      apiUrl: normalizeApiUrl(apiUrlInput.value),
      apiToken: apiTokenInput.value.trim(),
      replaceHomepage: replaceHomepageInput.checked,
      replaceNewtab: replaceNewtabInput.checked
    };

    await chrome.storage.local.set(newConfig);

    showStatus('success', '设置保存成功！');

    if (newConfig.replaceHomepage) {
      // browserSettings 是 Firefox 专有 API；Chrome 不提供该能力，只能提示用户手动设置
      const homepageOverride = chrome.browserSettings?.homepageOverride;

      if (!homepageOverride) {
        showStatus('info', '当前浏览器不支持由插件修改主页，请在浏览器设置中手动将主页设为书签面板');
        return;
      }

      try {
        await homepageOverride.set({
          value: chrome.runtime.getURL('src/newtab/index.html')
        });
      } catch (error) {
        console.warn('设置主页失败:', error);
        showStatus('error', '设置主页失败，请在浏览器设置中手动设置');
      }
    }
  });

  const showStatus = (type, message) => {
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
  };
});
