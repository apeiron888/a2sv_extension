import { getFromStorage, setToStorage } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const emailInput = document.getElementById('email');
  const nameInput = document.getElementById('studentName');
  const handleInput = document.getElementById('githubHandle');
  const repoInput = document.getElementById('repoName');
  const groupInput = document.getElementById('groupName');
  const githubBtn = document.getElementById('github-btn');
  const githubStatus = document.getElementById('github-status');
  const form = document.getElementById('config-form');

  const { email, studentName, githubHandle, repoName, groupName, groupSheetId, githubConnected } = await getFromStorage([
    'email',
    'studentName',
    'githubHandle',
    'repoName',
    'groupName',
    'groupSheetId',
    'githubConnected'
  ]);
  if (email) emailInput.value = email;
  if (studentName) nameInput.value = studentName;
  if (githubHandle) handleInput.value = githubHandle;
  if (repoName) repoInput.value = repoName;
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
      studentName: nameInput.value.trim(),
      githubHandle: handleInput.value.trim(),
      repoName: repoInput.value.trim(),
      groupName: groupInput.value.trim()
    });
    alert('Settings saved');
  });

  githubBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const studentName = nameInput.value.trim();
    const githubHandle = handleInput.value.trim();
    const repoName = repoInput.value.trim();
    const group = groupInput.value.trim();
    if (!email || !studentName || !githubHandle || !group) {
      alert('Please enter email, full name, GitHub handle, and group name first');
      return;
    }
    const repoParam = repoName ? `&repoName=${encodeURIComponent(repoName)}` : '';
    const authUrl = `https://a2sv-companion-backend.onrender.com/api/auth/github?email=${encodeURIComponent(email)}&groupName=${encodeURIComponent(group)}&studentName=${encodeURIComponent(studentName)}&githubHandle=${encodeURIComponent(githubHandle)}${repoParam}&extensionId=${chrome.runtime.id}`;
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