chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-bookmark') {
    await saveCurrentPage();
  }
});

chrome.action.onClicked.addListener(async () => {
  await saveCurrentPage();
});

const saveCurrentPage = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  const config = await chrome.storage.local.get(['apiUrl', 'apiToken']);
  if (!config.apiUrl || !config.apiToken) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: '书签面板',
      message: '请先配置 API URL 和 Token'
    });
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
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon48.png',
        title: '书签面板',
        message: '书签保存成功！'
      });
    } else {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon48.png',
        title: '书签面板',
        message: '保存失败，请检查配置'
      });
    }
  } catch (error) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: '书签面板',
      message: '网络错误，请稍后重试'
    });
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveBookmark') {
    saveCurrentPage().then(() => sendResponse({ success: true }));
    return true;
  }
});
