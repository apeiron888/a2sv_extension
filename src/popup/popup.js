import { getFromStorage, setToStorage } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const emailInput = document.getElementById('email');
  const groupInput = document.getElementById('groupSheetId');
  const githubBtn = document.getElementById('github-btn');
  const githubStatus = document.getElementById('github-status');
  const form = document.getElementById('config-form');

  // Load saved data
  const { email, groupSheetId, githubConnected } = await getFromStorage(['email', 'groupSheetId', 'githubConnected']);
  if (email) emailInput.value = email;
  if (groupSheetId) groupInput.value = groupSheetId;
  if (githubConnected) {
    githubStatus.textContent = '✓ Connected';
    githubStatus.style.color = 'green';
  } else {
    githubStatus.textContent = 'Not connected';
    githubStatus.style.color = 'red';
  }

  // Save on form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await setToStorage({
      email: emailInput.value.trim(),
      groupSheetId: groupInput.value.trim()
    });
    alert('Settings saved');
  });

  // GitHub OAuth
  githubBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const group = groupInput.value.trim();
    if (!email || !group) {
      alert('Please enter email and group sheet ID first');
      return;
    }
    const authUrl = `https://a2sv-companion.onrender.com/api/auth/github?email=${encodeURIComponent(email)}&groupSheetId=${encodeURIComponent(group)}&extensionId=${chrome.runtime.id}`;
    chrome.tabs.create({ url: authUrl });
    window.close(); // close popup
  });

  // Listen for OAuth completion (via background)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'GITHUB_SUCCESS') {
      githubStatus.textContent = '✓ Connected';
      githubStatus.style.color = 'green';
    }
  });
});