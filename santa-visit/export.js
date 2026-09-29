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

  /* 9:16 vertical, for Stories / Reels / TikTok / Shorts.
   *
   * A naive crop of the middle throws away the door or the sofa — the very two
   * things the user placed. Instead: fit the whole frame inside the vertical
   * canvas, letterboxed on a soft dark ground, so the composition survives even
   * though the aspect ratio does not. The band above the frame carries the
   * caption, because vertical space is the one thing a crop cannot buy back.
   */
  function verticalCanvas(source, opts) {
    const o = Object.assign({ caption: "", ground: "#0d1120" }, opts || {});
    const targetAR = 9 / 16;
    const band = Math.round(source.height * 0.18);      // room for the caption
    const areaH = source.height - band;
    const w = Math.round(areaH * targetAR);
    const h = areaH + band;
    const c = document.createElement("canvas");
    c.width = Math.max(w, Math.round(source.width * 0.5));
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = o.ground;
    ctx.fillRect(0, 0, c.width, c.height);
    // Letterbox the source, centred in the photo area.
    const s = Math.min(c.width / source.width, areaH / source.height);
    const dw = source.width * s, dh = source.height * s;
    ctx.drawImage(source, (c.width - dw) / 2, (areaH - dh) / 2, dw, dh);
    if (o.caption) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 " + Math.round(c.width * 0.062) + "px -apple-system, Helvetica, Arial, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(o.caption, c.width / 2, areaH + band * 0.5, c.width * 0.92);
    }
    return c;
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
    capabilities, exportVideo, exportStill, verticalCanvas, download, suggestName,
  };
})(typeof window !== "undefined" ? window : globalThis);
