import { showFallbackPanel } from './shared.js';

function createFallbackToggle() {
  if (document.getElementById('a2sv-fallback-toggle')) return;

  const btn = document.createElement('button');
  btn.id = 'a2sv-fallback-toggle';
  btn.type = 'button';
  btn.textContent = 'A2SV Fallback';
  btn.style.position = 'fixed';
  btn.style.right = '16px';
  btn.style.bottom = '16px';
  btn.style.zIndex = '999999';
  btn.style.background = '#22c55e';
  btn.style.color = '#0b0b0b';
  btn.style.border = 'none';
  btn.style.padding = '10px 12px';
  btn.style.borderRadius = '8px';
  btn.style.fontWeight = '600';
  btn.style.cursor = 'pointer';
  btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let moved = false;

  const onPointerMove = (event) => {
    if (!isDragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!moved && Math.hypot(dx, dy) > 4) moved = true;
    btn.style.left = `${startLeft + dx}px`;
    btn.style.top = `${startTop + dy}px`;
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  };

  btn.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    isDragging = true;
    moved = false;
    const rect = btn.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    btn.style.left = `${rect.left}px`;
    btn.style.top = `${rect.top}px`;
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
    if (btn.setPointerCapture) {
      btn.setPointerCapture(event.pointerId);
    }
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });

  btn.addEventListener('click', (event) => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const url = window.location.href;
    const host = window.location.hostname.toLowerCase();
    let platform = 'generic';
    if (host.includes('hackerrank.com')) platform = 'hackerrank';
    else if (host.includes('atcoder.jp')) platform = 'atcoder';
    else if (host.includes('geeksforgeeks.org') || host.includes('practice.geeksforgeeks.org')) platform = 'geeksforgeeks';

    const problemTitle = document.title.split(' - ')[0];

    showFallbackPanel({
      platform,
      problemTitle,
      problemUrl: url
    });
  });

  document.body.appendChild(btn);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFallbackToggle);
} else {
  createFallbackToggle();
}
