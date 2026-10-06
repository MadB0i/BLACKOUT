// Polished PNG snapshot: globe + BLACKOUT mark + scenario + key metric.
// Browser-only, no server. Requires preserveDrawingBuffer (enabled).

export interface ShotMeta {
  scenario: string | null;
  connectivityPct: string;
  resilience: number;
  simT: string;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function exportScreenshot(meta: ShotMeta): Promise<{ ok: boolean; message: string }> {
  try {
    const src = document.querySelector('#bo-gl canvas') as HTMLCanvasElement | null;
    if (!src) return { ok: false, message: 'Globe canvas not found.' };
    const W = 1920;
    const H = 1080;
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const ctx = out.getContext('2d');
    if (!ctx) return { ok: false, message: 'Canvas 2D unavailable.' };

    ctx.fillStyle = '#05070b';
    ctx.fillRect(0, 0, W, H);
    // cover-fit the WebGL frame
    const sRatio = Math.max(W / src.width, H / src.height);
    const dw = src.width * sRatio;
    const dh = src.height * sRatio;
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
    // legibility scrim
    const grad = ctx.createLinearGradient(0, H - 260, 0, H);
    grad.addColorStop(0, 'rgba(5,7,11,0)');
    grad.addColorStop(1, 'rgba(5,7,11,0.88)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - 260, W, 260);

    // mark
    ctx.fillStyle = '#e8edf1';
    ctx.fillRect(72, 64, 26, 26);
    ctx.fillStyle = '#05070b';
    ctx.fillRect(72, 76, 26, 5);
    ctx.fillStyle = '#e8edf1';
    ctx.font = '800 44px Archivo, Arial, sans-serif';
    ctx.fillText('BLACKOUT', 114, 92);
    ctx.fillStyle = '#7fd4dc';
    ctx.font = '500 20px "IBM Plex Mono", monospace';
    ctx.fillText('BREAK THE INTERNET · WATCH WHAT SURVIVES', 114, 122);

    ctx.fillStyle = '#e8edf1';
    ctx.font = '500 30px "IBM Plex Mono", monospace';
    ctx.fillText(`SCENARIO  ${(meta.scenario ?? 'FREE PLAY').toUpperCase()}`, 72, H - 152);
    ctx.fillStyle = '#7fd4dc';
    ctx.font = '500 30px "IBM Plex Mono", monospace';
    ctx.fillText(`CONNECTIVITY ${meta.connectivityPct}   RESILIENCE ${meta.resilience}/100   T+${meta.simT}`, 72, H - 108);
    ctx.fillStyle = '#5d6a76';
    ctx.font = '400 20px "IBM Plex Mono", monospace';
    ctx.fillText('SIMPLIFIED EDUCATIONAL SIMULATION — NOT A LIVE OUTAGE MAP', 72, H - 64);

    // red status chip
    ctx.strokeStyle = '#c1362f';
    ctx.lineWidth = 3;
    roundRect(ctx, W - 320, 56, 248, 56, 4);
    ctx.stroke();
    ctx.fillStyle = '#e0574a';
    ctx.font = '700 24px "IBM Plex Mono", monospace';
    ctx.fillText('● SIMULATED', W - 292, 92);

    const url = out.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `blackout-${(meta.scenario ?? 'freeplay').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-t${meta.simT.replace(':', '')}.png`;
    a.click();
    return { ok: true, message: 'PNG snapshot exported (1920×1080).' };
  } catch (err) {
    return { ok: false, message: `Screenshot failed: ${err instanceof Error ? err.message : 'unknown error'}` };
  }
}
