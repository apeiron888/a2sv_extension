import { getFromStorage } from './storage.js';

const BACKEND_URL = 'https://a2sv-companion.onrender.com';

export async function submitSolution(data) {
  const { email, groupSheetId, githubConnected } = await getFromStorage(['email', 'groupSheetId', 'githubConnected']);
  if (!email || !groupSheetId || !githubConnected) {
    throw new Error('Please configure your email and connect GitHub in the extension popup.');
  }
  const fullData = { ...data, email, groupSheetId };
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'SUBMIT', data: fullData }, (response) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(response);
    });
  });
}