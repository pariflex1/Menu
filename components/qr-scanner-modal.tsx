'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (context: { type: string; name: string; sessionToken?: string }) => void;
  /** If true, the close button is hidden (QR is required) */
  required?: boolean;
}

export default function QRScannerModal({ isOpen, onClose, onSuccess, required = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    setScanError(null);
    startCamera();

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function startCamera() {
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      setCameraError('Camera access was denied. Please allow camera access to scan the QR code on your table.');
    }
  }

  function stopCamera() {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function handleTokenScanned(token: string) {
    if (resolving) return;
    setResolving(true);
    setScanError(null);
    stopCamera();

    // Clean token if a full URL was scanned (e.g. https://.../q?t=T01-XYZ789)
    let cleanToken = token.trim();
    if (cleanToken.includes('?t=')) {
      try {
        const url = new URL(cleanToken, window.location.origin);
        cleanToken = url.searchParams.get('t') || cleanToken;
      } catch { /* not a valid URL */ }
    }

    try {
      const res = await fetch('/api/qr/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: cleanToken }),
      });

      const data = await res.json();

      if (res.ok && data.session_token) {
        localStorage.setItem('session_token', data.session_token);
        localStorage.setItem('session_expires_at', data.expires_at);
        const orderCtx = {
          type: data.source_type,
          name: data.source_name,
        };
        localStorage.setItem('order_context', JSON.stringify(orderCtx));
        onSuccess({ ...orderCtx, sessionToken: data.session_token });
        onClose();
      } else {
        setScanError(
          'This QR code was not recognised. Please scan the QR code on your table or room door.'
        );
        setResolving(false);
        startCamera(); // let user try again
      }
    } catch {
      setScanError('Network error. Please check your connection and try again.');
      setResolving(false);
      startCamera();
    }
  }

  function tick() {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(tick);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      animationFrameId.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameId.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      handleTokenScanned(code.data);
      return;
    }

    animationFrameId.current = requestAnimationFrame(tick);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div className="relative w-full sm:max-w-sm overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-emerald-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-100 bg-[#F4F9F4] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs">
              QR
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Scan Table / Room QR</h2>
              {required && (
                <p className="text-[10px] text-amber-600 font-bold">Required to place order</p>
              )}
            </div>
          </div>
          {!required && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/80 text-slate-700 hover:bg-slate-300 text-sm font-black transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Camera Viewfinder */}
        <div className="p-4 space-y-3">
          {scanError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700 font-semibold flex items-start gap-2">
              <span className="shrink-0">⚠️</span>
              <span>{scanError}</span>
            </div>
          )}

          {resolving ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-2xl bg-emerald-50 text-center p-6 space-y-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
              <p className="font-extrabold text-emerald-900 text-sm">Verifying QR Code...</p>
              <p className="text-xs text-emerald-700">Connecting your order to the table</p>
            </div>
          ) : !cameraError ? (
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black shadow-inner">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative h-52 w-52 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                  <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Animated scan line */}
                  <div className="qr-scan-line" />
                </div>
              </div>

              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="inline-block rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white">
                  Point camera at the QR code on your table
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-50 p-5 border border-amber-200 text-sm text-amber-900 leading-relaxed text-center space-y-2">
              <div className="text-3xl">📷</div>
              <p className="font-bold">{cameraError}</p>
              <button
                type="button"
                onClick={() => { setCameraError(null); startCamera(); }}
                className="mt-1 text-xs font-bold text-emerald-700 underline"
              >
                Try Again
              </button>
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400 font-medium pb-1">
            Find the QR code on your table card or hotel room door
          </p>
        </div>
      </div>
    </div>
  );
}
