// Global mouse-drag horizontal scroll.
// Enables click-and-drag panning on any element that scrolls horizontally
// (overflow-x: auto/scroll and scrollWidth > clientWidth), so admins/desktop
// users can navigate carousels/tabs with the mouse.

let installed = false;

const DRAG_THRESHOLD = 4; // px before we treat it as a drag (avoids blocking clicks)
const IGNORE_SELECTOR =
  'input, textarea, select, button, a, [role="button"], [role="slider"], [contenteditable="true"], [data-no-drag], .no-drag';

function isHorizontallyScrollable(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const overflowX = style.overflowX;
  if (overflowX !== 'auto' && overflowX !== 'scroll') return false;
  return el.scrollWidth > el.clientWidth + 1;
}

function findScrollTarget(start: EventTarget | null): HTMLElement | null {
  let node = start as HTMLElement | null;
  while (node && node !== document.body) {
    if (isHorizontallyScrollable(node)) return node as HTMLElement;
    node = node.parentElement;
  }
  return null;
}

export function enableMouseDragScroll() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  let target: HTMLElement | null = null;
  let startX = 0;
  let startScroll = 0;
  let dragging = false;
  let moved = false;

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // left click only
    const el = e.target as HTMLElement | null;
    if (!el) return;
    if (el.closest(IGNORE_SELECTOR)) return;
    const scroller = findScrollTarget(el);
    if (!scroller) return;
    target = scroller;
    startX = e.clientX;
    startScroll = scroller.scrollLeft;
    dragging = true;
    moved = false;
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging || !target) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!moved) {
      moved = true;
      target.style.cursor = 'grabbing';
      target.style.userSelect = 'none';
    }
    target.scrollLeft = startScroll - dx;
    e.preventDefault();
  };

  const endDrag = (e?: MouseEvent) => {
    if (!dragging) return;
    dragging = false;
    if (target) {
      target.style.cursor = '';
      target.style.userSelect = '';
    }
    if (moved && e) {
      // Prevent the trailing click from firing on links/buttons after a drag.
      const stop = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
        window.removeEventListener('click', stop, true);
      };
      window.addEventListener('click', stop, true);
      setTimeout(() => window.removeEventListener('click', stop, true), 0);
    }
    target = null;
    moved = false;
  };

  window.addEventListener('mousedown', onMouseDown, { passive: true });
  window.addEventListener('mousemove', onMouseMove, { passive: false });
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('mouseleave', endDrag);
}
