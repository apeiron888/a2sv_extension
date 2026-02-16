const BACKEND_URL = 'https://a2sv-companion.onrender.com';

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUBMIT') {
    handleSubmit(message.data).then(sendResponse);
    return true; // async response
  }
  if (message.type === 'FETCH_CF_CODE') {
    fetchCodeforcesCode(message.contestId, message.submissionId).then(sendResponse);
    return true;
  }
  if (message.type === 'GITHUB_SUCCESS') {
    chrome.storage.local.set({ githubConnected: true });
    sendResponse({ ok: true });
  }
  if (message.type === 'GET_CONFIG') {
    chrome.storage.local.get(['email', 'groupSheetId', 'githubConnected'], (result) => {
      sendResponse(result);
    });
    return true;
  }
});

async function handleSubmit(data) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    return { error: err.message };
  }
}

async function fetchCodeforcesCode(contestId, submissionId) {
  const url = `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;
  try {
    const response = await fetch(url, { credentials: 'include' });
    const html = await response.text();
    // Extract code from <pre id="program-source-text">
    const match = html.match(/<pre[^>]*id="program-source-text"[^>]*>([\s\S]*?)<\/pre>/i);
    if (match) {
      // Decode HTML entities
      const text = match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      return { code: text };
    }
    return { error: 'Code not found' };
  } catch (err) {
    return { error: err.message };
  }
}