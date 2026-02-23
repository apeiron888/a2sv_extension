chrome.runtime.sendMessage({ type: 'GITHUB_SUCCESS' }, () => {
  setTimeout(() => window.close(), 2000);
});
