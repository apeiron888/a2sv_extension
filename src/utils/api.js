import { getFromStorage } from './storage.js';

export async function submitSolution(data) {
  if (!chrome?.runtime?.id) {
    throw new Error('Extension was reloaded. Please refresh the page.');
  }
  const { email, groupName, groupSheetId, githubConnected } = await getFromStorage(['email', 'groupName', 'groupSheetId', 'githubConnected']);
  const group = groupName || groupSheetId;
  if (!email || !group || !githubConnected) {
    throw new Error('Please configure your email, group name, and connect GitHub in the extension popup.');
  }
  const fullData = { ...data, email };
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'SUBMIT', data: fullData }, (response) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(response);
    });
  });
}