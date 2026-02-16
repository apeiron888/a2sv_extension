import { getFromStorage, setToStorage } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const emailInput = document.getElementById('email');
  const groupInput = document.getElementById('groupName');
  const githubBtn = document.getElementById('github-btn');
  const githubStatus = document.getElementById('github-status');
  const form = document.getElementById('config-form');

  const { email, groupName, groupSheetId, githubConnected } = await getFromStorage(['email', 'groupName', 'groupSheetId', 'githubConnected']);
  if (email) emailInput.value = email;
  if (groupName) groupInput.value = groupName;
  else if (groupSheetId) groupInput.value = groupSheetId;
  if (githubConnected) {
    githubStatus.textContent = '✓ Connected';
    githubStatus.style.color = 'green';
  } else {
    githubStatus.textContent = 'Not connected';
    githubStatus.style.color = 'red';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await setToStorage({
      email: emailInput.value.trim(),
      groupName: groupInput.value.trim()
    });
    alert('Settings saved');
  });

  githubBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const group = groupInput.value.trim();
    if (!email || !group) {
      alert('Please enter email and group name first');
      return;
    }
    const authUrl = `https://a2sv-companion-backend.onrender.com/api/auth/github?email=${encodeURIComponent(email)}&groupName=${encodeURIComponent(group)}&extensionId=${chrome.runtime.id}`;
    chrome.tabs.create({ url: authUrl });
    window.close();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'GITHUB_SUCCESS') {
      githubStatus.textContent = '✓ Connected';
      githubStatus.style.color = 'green';
    }
  });
});