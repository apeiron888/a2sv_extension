import { getFromStorage } from './storage.js';

const BACKEND_URL = 'https://a2sv-companion-backend.onrender.com';

export async function submitSolution(data) {
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