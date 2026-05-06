document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const apiTokenInput = document.getElementById('apiToken');
  const replaceHomepageInput = document.getElementById('replaceHomepage');
  const replaceNewtabInput = document.getElementById('replaceNewtab');
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

  saveBtn.addEventListener('click', async () => {
    const newConfig = {
      apiUrl: apiUrlInput.value,
      apiToken: apiTokenInput.value,
      replaceHomepage: replaceHomepageInput.checked,
      replaceNewtab: replaceNewtabInput.checked
    };

    await chrome.storage.local.set(newConfig);
    
    showStatus('success', '设置保存成功！');
    
    if (newConfig.replaceHomepage) {
      chrome.browserSettings.homepageOverride.set({ value: chrome.runtime.getURL('src/newtab/index.html') });
    }
  });

  const showStatus = (type, message) => {
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
  };
});
