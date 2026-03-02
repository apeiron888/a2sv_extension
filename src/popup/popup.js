import { getFromStorage, setToStorage } from '../utils/storage.js';
import { BACKEND_URL, fetchFromBackend } from '../utils/config.js';

document.addEventListener('DOMContentLoaded', async () => {
  const emailInput = document.getElementById('email');
  const nameInput = document.getElementById('studentName');
  const handleInput = document.getElementById('githubHandle');
  const repoInput = document.getElementById('repoName');
  const groupInput = document.getElementById('groupName');
  const githubBtn = document.getElementById('github-btn');
  const githubStatus = document.getElementById('github-status');
  const settingsStatus = document.getElementById('settings-status');
  const form = document.getElementById('config-form');
  let lastSavedEmail = '';
  let statusPollTimer = null;
  let authPollTimer = null;

  const setSettingsStatus = (message, type = 'info') => {
    if (!settingsStatus) return;
    settingsStatus.textContent = message || '';
    settingsStatus.classList.remove('success', 'error', 'info');
    if (message) settingsStatus.classList.add(type);
  };

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
  lastSavedEmail = (email || '').trim().toLowerCase();

  const setGithubStatus = (connected) => {
    if (connected) {
      githubStatus.textContent = '✓ Connected';
      githubStatus.style.color = '#10b981';
    } else {
      githubStatus.textContent = 'Not connected';
      githubStatus.style.color = '#f87171';
    }
  };

  const setGithubStatusChecking = () => {
    githubStatus.textContent = 'Checking…';
    githubStatus.style.color = '#64748b';
  };

  const setGithubStatusUnknown = () => {
    githubStatus.textContent = 'Unable to verify';
    githubStatus.style.color = '#f59e0b';
  };

  setGithubStatusChecking();

  const fetchGithubStatus = async (emailValue) => {
    const { response } = await fetchFromBackend(`/api/auth/github/status?email=${encodeURIComponent(emailValue)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || `Status check failed (${response.status})`);
    }
    return data;
  };

  const refreshGithubStatus = async () => {
    const email = emailInput.value.trim().toLowerCase();
    if (!email) {
      setGithubStatus(false);
      await setToStorage({ githubConnected: false });
      return;
    }
    try {
      const data = await fetchGithubStatus(email);
      await setToStorage({ githubConnected: !!data.connected });
      setGithubStatus(!!data.connected);
    } catch (err) {
      await setToStorage({ githubConnected: false });
      setGithubStatusUnknown();
      console.error('[A2SV][popup][github-status-check-failed]', err?.message || String(err));
    }
  };

  refreshGithubStatus();

  const startStatusPolling = () => {
    if (statusPollTimer) clearInterval(statusPollTimer);
    statusPollTimer = setInterval(() => {
      if (!document.hidden) refreshGithubStatus();
    }, 5000);
  };

  startStatusPolling();

  const debounce = (fn, ms = 300) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const refreshDebounced = debounce(refreshGithubStatus, 400);
  emailInput.addEventListener('input', refreshDebounced);
  emailInput.addEventListener('blur', refreshGithubStatus);
  window.addEventListener('focus', refreshGithubStatus);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshGithubStatus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      email: emailInput.value.trim().toLowerCase(),
      previousEmail: lastSavedEmail || undefined,
      studentName: nameInput.value.trim(),
      githubHandle: handleInput.value.trim(),
      repoName: repoInput.value.trim(),
      groupName: groupInput.value.trim(),
    };

    await setToStorage({
      email: payload.email,
      studentName: payload.studentName,
      githubHandle: payload.githubHandle,
      repoName: payload.repoName,
      groupName: payload.groupName,
    });

    setSettingsStatus('Saving settings to backend…', 'info');

    try {
      const { response } = await fetchFromBackend('/api/student/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || `Save failed (${response.status})`);
      }

      const connected = !!result.connected;
      lastSavedEmail = payload.email;

      await setToStorage({
        email: result.email || payload.email,
        groupSheetId: result.groupSheetId || undefined,
        groupName: result.groupName || payload.groupName,
        githubConnected: connected,
      });

      setGithubStatus(connected);
      setSettingsStatus('✓ Settings saved and synced to backend.', 'success');
    } catch (err) {
      setSettingsStatus(`Saved locally, but backend sync failed: ${err.message}`, 'error');
    }
  });

  const startAuthStatusPolling = () => {
    if (authPollTimer) clearInterval(authPollTimer);
    let tries = 0;
    authPollTimer = setInterval(async () => {
      tries += 1;
      await refreshGithubStatus();
      const { githubConnected: connected } = await getFromStorage(['githubConnected']);
      if (connected) {
        setSettingsStatus('✓ GitHub connected successfully.', 'success');
        clearInterval(authPollTimer);
        authPollTimer = null;
      } else if (tries >= 90) {
        setSettingsStatus('Still not connected. If you already approved GitHub, wait 20–30 seconds and click Save once.', 'error');
        clearInterval(authPollTimer);
        authPollTimer = null;
      }
    }, 2000);
  };

  githubBtn.addEventListener('click', () => {
    const email = emailInput.value.trim().toLowerCase();
    const studentName = nameInput.value.trim();
    const githubHandle = handleInput.value.trim();
    const repoName = repoInput.value.trim();
    const group = groupInput.value.trim();
    if (!email || !studentName || !githubHandle || !group) {
      alert('Please enter email, full name, GitHub handle, and group name first');
      return;
    }
    const repoParam = repoName ? `&repoName=${encodeURIComponent(repoName)}` : '';
    const extensionId = chrome?.runtime?.id ? `&extensionId=${encodeURIComponent(chrome.runtime.id)}` : '';
    const authUrl = `${BACKEND_URL}/api/auth/github?email=${encodeURIComponent(email)}&groupName=${encodeURIComponent(group)}&studentName=${encodeURIComponent(studentName)}&githubHandle=${encodeURIComponent(githubHandle)}${repoParam}${extensionId}`;
    chrome.tabs.create({ url: authUrl });
    setSettingsStatus('Waiting for GitHub authorization…', 'info');
    startAuthStatusPolling();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'GITHUB_SUCCESS') {
      setSettingsStatus('GitHub callback received. Verifying…', 'info');
      refreshGithubStatus().then(async () => {
        const { githubConnected: connected } = await getFromStorage(['githubConnected']);
        if (connected) {
          setSettingsStatus('✓ GitHub connected successfully.', 'success');
        } else {
          setSettingsStatus('GitHub verification failed. Reconnect and check console.', 'error');
        }
      });
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.githubConnected) {
      setGithubStatus(!!changes.githubConnected.newValue);
    }
  });
});