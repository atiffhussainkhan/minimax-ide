/* Video export — the piece the product is missing.
 *
 * The open risk (RISK-2) is that a recording reports the right length but stops
 * playing early. That is a property of REALTIME capture: the encoder timestamps
 * frames against the wall clock, so a slow frame or a backgrounded tab drops
 * content and the file lies about its duration.
 *
 * This module avoids realtime capture entirely. `canvas.captureStream(0)` with
 * a manual `requestFrame()` means the encoder is fed one frame at a time, at the
 * pace we render them, not the pace the device happens to run. The scene is
 * therefore frame-deterministic: the same photo and the same anchors always
 * produce the same file, which is the U8 differentiator.
 *
 * Where WebCodecs exists it is preferred, because it takes explicit timestamps
 * and never consults the wall clock. It needs a muxer to become a file, and a
 * muxer is third-party code, which the privacy model forbids from the page — so
 * the default path stays on MediaRecorder with manual frame pushing.
 */
(function (global) {
  "use strict";

  /* What this browser can actually do. Reported honestly rather than assumed. */
  function capabilities() {
    const c = {
      captureStream: typeof HTMLCanvasElement !== "undefined" &&
        typeof HTMLCanvasElement.prototype.captureStream === "function",
      requestFrame: typeof CanvasCaptureMediaStreamTrack !== "undefined" &&
        "requestFrame" in CanvasCaptureMediaStreamTrack.prototype,
      mediaRecorder: typeof MediaRecorder !== "undefined",
      webCodecs: typeof VideoEncoder !== "undefined",
      offscreen: typeof OffscreenCanvas !== "undefined",
    };
    c.mimeTypes = c.mediaRecorder ? [
      "video/mp4;codecs=avc1.42E01E", "video/mp4",
      "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm",
    ].filter(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) : [];
    // MP4 first where supported: WhatsApp will not take WebM, and the share
    // target is WhatsApp.
    c.mime = c.mimeTypes[0] || null;
    c.sharesToWhatsApp = !!(c.mime && c.mime.indexOf("mp4") === 0);
    c.deterministic = c.requestFrame;      // manual frame pacing
    return c;
  }

  /* Export the scene as a video file. Frame-paced, never wall-clock paced.
   *
   *   canvas   the compositing canvas, already sized
   *   render   (t) => void   draws the scene at normalised time t
   *   duration seconds
   *   fps      frames per second
   *   onProgress (fraction) => void
   *   returns   { blob, mime, frames, deterministic }
   */
  async function exportVideo(canvas, render, opts) {
    const o = Object.assign({ duration: 11, fps: 30 }, opts || {});
    const caps = capabilities();
    if (!caps.mediaRecorder) {
      throw new Error("This browser cannot record video (MediaRecorder is missing).");
    }
    if (!caps.captureStream) {
      throw new Error("This browser cannot capture a canvas as video.");
    }
    if (!caps.mime) {
      throw new Error("This browser offers no supported video encoder.");
    }

    // captureStream(0) disables the automatic frame pump; we push frames by hand.
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0];

    const chunks = [];
    const rec = new MediaRecorder(stream, {
      mimeType: caps.mime,
      videoBitsPerSecond: 4_000_000,
    });
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start();

    const total = Math.round(o.duration * o.fps);
    for (let i = 0; i < total; i++) {
      const t = i / (total - 1);
      render(t);
      // Ask the encoder to take the frame we just drew, and yield so it can.
      if (caps.requestFrame) track.requestFrame();
      await new Promise((r) => requestAnimationFrame(r));
      if (o.onProgress) o.onProgress((i + 1) / total);
    }

    rec.stop();
    await stopped;
    track.stop();

    const blob = new Blob(chunks, { type: caps.mime });
    return {
      blob, mime: caps.mime, frames: total,
      deterministic: caps.deterministic,
      size: blob.size,
    };
  }

  /* A short still, for the share card and the postcards' thumbnail. */
  async function exportStill(canvas, render, t) {
    render(t === undefined ? 0.55 : t);
    return new Promise((r) => canvas.toBlob(r, "image/png"));
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function suggestName(ext) {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `santas-visit-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
  }

  global.ExportVideo = {
    capabilities, exportVideo, exportStill, download, suggestName,
  };
})(typeof window !== "undefined" ? window : globalThis);
