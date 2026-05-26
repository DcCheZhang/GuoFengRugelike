import { EventBus, GameEvent } from '@/engine/EventBus';

export function initToast(): void {
  EventBus.on(GameEvent.TOAST, (d: { msg: string; dur?: number }) => {
    showToast(d.msg, d.dur);
  });
}

export function showToast(msg: string, dur = 2500): void {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  const container = document.getElementById('toasts');
  if (container) {
    container.appendChild(t);
    setTimeout(() => t.remove(), dur);
  }
}
