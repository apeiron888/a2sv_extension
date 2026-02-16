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

  btn.addEventListener('click', () => {
    showFallbackPanel();
  });

  document.body.appendChild(btn);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFallbackToggle);
} else {
  createFallbackToggle();
}
