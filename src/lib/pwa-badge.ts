'use client';

/**
 * PWA Dynamic Badging & Dynamic Favicon Generator.
 * Dynamically updates:
 * 1. Native PWA App Badge (taskbar / home screen icon) via navigator.setAppBadge()
 * 2. Real-time in-browser Tab Favicon using HTML5 Canvas with glowing status indicator and task counter
 */

let _canvas: HTMLCanvasElement | null = null;

function getCanvas(): HTMLCanvasElement {
  if (!_canvas && typeof document !== 'undefined') {
    _canvas = document.createElement('canvas');
    _canvas.width = 64;
    _canvas.height = 64;
  }
  return _canvas!;
}

export interface DynamicBadgeOptions {
  count: number;
  isTimerRunning?: boolean;
  isSyncing?: boolean;
  statusText?: string;
}

/**
 * Updates the native PWA App Badge on the OS taskbar / launcher.
 */
export async function updatePwaNativeBadge(count: number): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    }

    // Also notify active Service Worker
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_BADGE',
        count,
      });
    }
  } catch (error) {
    // Graceful fallback on unsupported browsers
  }
}

/**
 * Dynamically redraws the browser tab favicon with a live notification counter and status ring.
 */
export function updateDynamicFavicon(options: DynamicBadgeOptions): void {
  if (typeof document === 'undefined') return;

  const { count, isTimerRunning = false, isSyncing = false } = options;

  // If no badge, timer, or sync is active, restore default SVG icon
  if (count <= 0 && !isTimerRunning && !isSyncing) {
    setFaviconHref('/icons/icon.svg');
    return;
  }

  const canvas = getCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, 64, 64);

  // 1. Base Icon Squircle Background
  ctx.save();
  ctx.beginPath();
  const r = 14;
  ctx.moveTo(r, 0);
  ctx.lineTo(64 - r, 0);
  ctx.quadraticCurveTo(64, 0, 64, r);
  ctx.lineTo(64, 64 - r);
  ctx.quadraticCurveTo(64, 64, 64 - r, 64);
  ctx.lineTo(r, 64);
  ctx.quadraticCurveTo(0, 64, 0, 64 - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();

  // Dark Slate / Navy Gradient
  const grad = ctx.createLinearGradient(0, 0, 64, 64);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = grad;
  ctx.fill();

  // Border ring
  ctx.lineWidth = 3;
  ctx.strokeStyle = isTimerRunning ? '#10b981' : isSyncing ? '#38bdf8' : '#3b82f6';
  ctx.stroke();
  ctx.restore();

  // 2. Central Symbol (Diamond / Compass Glyph)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(32, 14);
  ctx.lineTo(48, 32);
  ctx.lineTo(32, 50);
  ctx.lineTo(16, 32);
  ctx.closePath();
  ctx.fillStyle = '#6366f1';
  ctx.fill();

  // Core Center Light
  ctx.beginPath();
  ctx.arc(32, 32, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // 3. Status Indicator Dot (Lower-Left if Timer is active)
  if (isTimerRunning) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(14, 50, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
    ctx.restore();
  }

  // 4. Dynamic Counter Badge Pill (Upper-Right)
  if (count > 0) {
    ctx.save();
    const countText = count > 99 ? '99+' : String(count);
    ctx.font = 'bold 22px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const textWidth = ctx.measureText(countText).width;
    const badgeW = Math.max(textWidth + 10, 26);
    const badgeH = 24;
    const badgeX = 64 - badgeW / 2 - 2;
    const badgeY = badgeH / 2 + 2;

    // Glowing badge background
    ctx.beginPath();
    const br = badgeH / 2;
    ctx.arc(badgeX - badgeW / 2 + br, badgeY, br, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(badgeX + badgeW / 2 - br, badgeY, br, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();

    ctx.fillStyle = '#ef4444'; // Bright Red Alert
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Badge text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(countText, badgeX, badgeY + 1);
    ctx.restore();
  }

  // Set to DOM Favicon links
  try {
    const dataUrl = canvas.toDataURL('image/png');
    setFaviconHref(dataUrl);
  } catch (err) {
    // In case of canvas export restrictions
  }
}

function setFaviconHref(href: string): void {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;

  let appleLink = document.querySelector<HTMLLinkElement>("link[rel~='apple-touch-icon']");
  if (appleLink) {
    appleLink.href = href;
  }
}
