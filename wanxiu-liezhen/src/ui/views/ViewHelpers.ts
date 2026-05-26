import { GS } from '@/state/GameState';

let campAF: number = 0;

export function switchView(v: string): void {
  if (v !== 'prepare' && campAF) {
    cancelAnimationFrame(campAF);
    campAF = 0;
  }

  document.querySelectorAll('.view').forEach((el) => {
    if (el.classList.contains('active')) {
      (el as HTMLElement).style.opacity = '0';
      setTimeout(() => {
        el.classList.remove('active');
        (el as HTMLElement).style.opacity = '';
      }, 300);
    }
  });

  setTimeout(() => {
    const el = document.getElementById('view-' + v);
    if (el) {
      el.classList.add('active');
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transition = 'opacity 0.3s';
      requestAnimationFrame(() => {
        (el as HTMLElement).style.opacity = '1';
      });
    }
    GS.cv = v;
  }, 300);
}
