import { getFromStorage } from '../utils/storage.js';
import { submitSolution } from '../utils/api.js';

let fallbackPanel = null;

// Show a temporary toast notification
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '5px';
  toast.style.color = '#fff';
  toast.style.zIndex = '10000';
  toast.style.backgroundColor = type === 'error' ? '#f44336' : '#4caf50';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Create the floating fallback panel
export function createFallbackPanel() {
  if (fallbackPanel) return fallbackPanel;

  const container = document.createElement('div');
  container.id = 'a2sv-fallback-panel';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '300px';
  container.style.backgroundColor = '#fff';
  container.style.border = '1px solid #ccc';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  container.style.zIndex = '10001';
  container.style.padding = '10px';
  container.style.display = 'none'; // initially hidden

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <strong>A2SV Sync</strong>
      <button id="a2sv-fallback-hide" style="border: none; background: none; cursor: pointer;">✖</button>
    </div>
    <div>
      <label>Trial #</label>
      <input type="number" id="a2sv-fallback-trial" min="1" value="1" style="width: 100%; margin-bottom: 8px;">
      <label>Time (min)</label>
      <input type="number" id="a2sv-fallback-time" min="0" style="width: 100%; margin-bottom: 8px;">
      <label>Code</label>
      <textarea id="a2sv-fallback-code" rows="5" style="width: 100%; font-family: monospace;"></textarea>
      <button id="a2sv-fallback-submit" style="margin-top: 8px; width: 100%; background: #007bff; color: white; border: none; padding: 8px; border-radius: 4px;">Submit</button>
    </div>
  `;

  document.body.appendChild(container);

  const hideBtn = container.querySelector('#a2sv-fallback-hide');
  hideBtn.addEventListener('click', () => {
    container.style.display = 'none';
  });

  const submitBtn = container.querySelector('#a2sv-fallback-submit');
  submitBtn.addEventListener('click', async () => {
    const trial = parseInt(container.querySelector('#a2sv-fallback-trial').value, 10);
    const time = parseInt(container.querySelector('#a2sv-fallback-time').value, 10);
    const code = container.querySelector('#a2sv-fallback-code').value;
    const problemTitle = document.title.split(' - ')[0]; // naive

    if (!code) {
      showToast('Please enter code', 'error');
      return;
    }

    const { email, groupSheetId } = await getFromStorage(['email', 'groupSheetId']);
    if (!email || !groupSheetId) {
      showToast('Please configure extension first', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const res = await submitSolution({
        platform: 'generic',
        problemTitle,
        code,
        timeTaken: time,
        trial,
        language: 'unknown'
      });
      if (res.success) {
        showToast('Submitted!');
        container.style.display = 'none';
      } else {
        showToast(res.error || 'Error', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  });

  fallbackPanel = container;
  return container;
}

// Show the fallback panel (with optional pre-filled data)
export function showFallbackPanel(data = {}) {
  const panel = createFallbackPanel();
  if (data.trial) panel.querySelector('#a2sv-fallback-trial').value = data.trial;
  if (data.time) panel.querySelector('#a2sv-fallback-time').value = data.time;
  if (data.code) panel.querySelector('#a2sv-fallback-code').value = data.code;
  panel.style.display = 'block';
}