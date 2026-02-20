import { getFromStorage } from '../utils/storage.js';
import { submitSolution } from '../utils/api.js';

let fallbackPanel = null;

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

export function createFallbackPanel() {
  if (fallbackPanel) return fallbackPanel;

  const container = document.createElement('div');
  container.id = 'a2sv-fallback-panel';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '300px';
  container.style.backgroundColor = '#1e1e1e';
  container.style.color = '#f5f5f5';
  container.style.border = '1px solid #333';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
  container.style.zIndex = '10001';
  container.style.padding = '10px';
  container.style.display = 'none';

  container.innerHTML = `
    <div id="a2sv-fallback-drag-handle" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; cursor: move; user-select: none; -webkit-user-select: none; touch-action: none;">
      <strong style="color: #f5f5f5;">A2SV Sync</strong>
      <button id="a2sv-fallback-hide" style="border: none; background: none; color: #f5f5f5; cursor: pointer;">✖</button>
    </div>
    <div style="color: #f5f5f5;">
      <label style="display: block; margin-bottom: 4px;">Trial #</label>
      <input type="number" id="a2sv-fallback-trial" min="1" value="1" style="width: 100%; margin-bottom: 8px; background: #2b2b2b; color: #f5f5f5; border: 1px solid #444; border-radius: 4px; padding: 6px;">
      <label style="display: block; margin-bottom: 4px;">Time (min)</label>
      <input type="number" id="a2sv-fallback-time" min="0" style="width: 100%; margin-bottom: 8px; background: #2b2b2b; color: #f5f5f5; border: 1px solid #444; border-radius: 4px; padding: 6px;">
      <label style="display: block; margin-bottom: 4px;">Language</label>
      <select id="a2sv-fallback-language" style="width: 100%; margin-bottom: 8px; background: #2b2b2b; color: #f5f5f5; border: 1px solid #444; border-radius: 4px; padding: 6px;">
        <option value="unknown">Select language</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
        <option value="c++">C++</option>
        <option value="javascript">JavaScript</option>
        <option value="c#">C#</option>
        <option value="go">Go</option>
        <option value="kotlin">Kotlin</option>
        <option value="rust">Rust</option>
        <option value="php">PHP</option>
      </select>
      <label style="display: block; margin-bottom: 4px;">Code</label>
      <textarea id="a2sv-fallback-code" rows="6" style="width: 100%; font-family: monospace; background: #2b2b2b; color: #f5f5f5; border: 1px solid #444; border-radius: 4px; padding: 6px;"></textarea>
      <button id="a2sv-fallback-submit" style="margin-top: 8px; width: 100%; background: #22c55e; color: #0b0b0b; border: none; padding: 8px; border-radius: 4px; font-weight: 600;">Submit</button>
    </div>
  `;

  document.body.appendChild(container);

  const dragHandle = container.querySelector('#a2sv-fallback-drag-handle');
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const onPointerMove = (event) => {
    if (!isDragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    container.style.left = `${startLeft + dx}px`;
    container.style.top = `${startTop + dy}px`;
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  };

  dragHandle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target && event.target.id === 'a2sv-fallback-hide') return;
    isDragging = true;
    const rect = container.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    container.style.left = `${rect.left}px`;
    container.style.top = `${rect.top}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
    if (dragHandle.setPointerCapture) {
      dragHandle.setPointerCapture(event.pointerId);
    }
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });

  container.querySelector('#a2sv-fallback-hide').addEventListener('click', () => {
    container.style.display = 'none';
  });

  container.querySelector('#a2sv-fallback-submit').addEventListener('click', async () => {
    const trial = parseInt(container.querySelector('#a2sv-fallback-trial').value, 10);
    const time = parseInt(container.querySelector('#a2sv-fallback-time').value, 10);
    const language = (container.querySelector('#a2sv-fallback-language')?.value || 'unknown').toLowerCase();
    const code = container.querySelector('#a2sv-fallback-code').value;
    const problemTitle = container.dataset.problemTitle || document.title.split(' - ')[0];
    const platform = container.dataset.platform || 'generic';
    const problemUrl = container.dataset.problemUrl || null;

    if (!code) {
      showToast('Please enter code', 'error');
      return;
    }

    const { email, groupName, groupSheetId } = await getFromStorage(['email', 'groupName', 'groupSheetId']);
    const group = groupName || groupSheetId;
    if (!email || !group) {
      showToast('Please configure extension first', 'error');
      return;
    }

    const btn = container.querySelector('#a2sv-fallback-submit');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      const res = await submitSolution({
        platform,
        problemTitle,
        problemUrl,
        code,
        timeTaken: time,
        trial,
        language
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
      btn.disabled = false;
      btn.textContent = 'Submit';
    }
  });

  fallbackPanel = container;
  return container;
}

export function showFallbackPanel(data = {}) {
  const panel = createFallbackPanel();
  if (data.trial) panel.querySelector('#a2sv-fallback-trial').value = data.trial;
  if (data.time) panel.querySelector('#a2sv-fallback-time').value = data.time;
  if (data.code) panel.querySelector('#a2sv-fallback-code').value = data.code;
  if (data.problemTitle) panel.dataset.problemTitle = data.problemTitle;
  if (data.language) panel.querySelector('#a2sv-fallback-language').value = data.language;
  if (data.platform) panel.dataset.platform = data.platform;
  if (data.problemUrl) panel.dataset.problemUrl = data.problemUrl;
  panel.style.display = 'block';
}