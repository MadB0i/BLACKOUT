// Short replay capture: MediaRecorder over the WebGL canvas stream.
// Target ~8–12s WebM. Graceful fallback when unsupported.

export interface CaptureResult {
  ok: boolean;
  message: string;
}

function pickMime(): string | null {
  const cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  for (const c of cands) {
    try {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      continue;
    }
  }
  return null;
}

export async function recordClip(seconds = 10): Promise<CaptureResult> {
  const canvas = document.querySelector('#bo-gl canvas') as HTMLCanvasElement | null;
  if (!canvas) return { ok: false, message: 'Globe canvas not found.' };
  if (!('captureStream' in canvas) || typeof window.MediaRecorder === 'undefined') {
    return {
      ok: false,
      message: 'Video capture unsupported here — use EXPORT PNG or OS screen recording instead.',
    };
  }
  const mime = pickMime();
  if (!mime) {
    return {
      ok: false,
      message: 'No supported recorder format — use EXPORT PNG or OS screen recording instead.',
    };
  }
  return new Promise((resolve) => {
    try {
      const stream = (canvas as HTMLCanvasElement).captureStream(60);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onerror = () => resolve({ ok: false, message: 'Recorder errored mid-capture.' });
      rec.onstop = () => {
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: mime.split(';')[0] });
        if (!blob.size) {
          resolve({ ok: false, message: 'Capture produced no data.' });
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blackout-replay-${seconds}s.${ext}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        resolve({ ok: true, message: `${seconds}s replay exported (${ext.toUpperCase()}).` });
      };
      rec.start(250);
      window.setTimeout(() => {
        if (rec.state !== 'inactive') rec.stop();
      }, seconds * 1000);
    } catch (err) {
      resolve({ ok: false, message: `Capture failed: ${err instanceof Error ? err.message : 'unknown'}` });
    }
  });
}
