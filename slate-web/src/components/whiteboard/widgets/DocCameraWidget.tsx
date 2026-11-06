import React, { useState, useEffect, useRef } from "react";
import { Camera, Pause, Play, RotateCw, PlusCircle, VideoOff, SwitchCamera } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocCameraWidgetProps {
  onClose?: () => void;
}

export function DocCameraWidget({ onClose }: DocCameraWidgetProps) {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const { t } = useTranslation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Discover connected camera devices (built-in, USB visualizers, document cameras)
  useEffect(() => {
    async function loadDevices() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          // Prefer environment / back / document cameras if found
          const docCam = videoDevices.find(
            (d) =>
              d.label.toLowerCase().includes("doc") ||
              d.label.toLowerCase().includes("visualizer") ||
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("external"),
          );
          setSelectedDeviceId(docCam ? docCam.deviceId : videoDevices[0].deviceId);
        }
      } catch (e) {
        console.warn("Failed to enumerate video devices", e);
      }
    }
    loadDevices();
  }, []);

  // Start or switch camera stream
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        setErrorMsg(null);
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setErrorMsg(err.message || "Could not connect to camera device.");
      }
    }

    startCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId]);

  // Capture current frame from video onto internal canvas
  function captureCurrentFrame(): string | null {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = rotation % 180 === 0 ? w : h;
    canvas.height = rotation % 180 === 0 ? h : w;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(video, -w / 2, -h / 2, w, h);
    ctx.restore();

    return canvas.toDataURL("image/png");
  }

  // Freeze / Unfreeze frame
  function toggleFreeze() {
    if (isFrozen) {
      setIsFrozen(false);
      setFrozenFrame(null);
      if (videoRef.current && stream) {
        videoRef.current.play().catch(() => {});
      }
    } else {
      const frame = captureCurrentFrame();
      if (frame) {
        setFrozenFrame(frame);
        setIsFrozen(true);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }
    }
  }

  // Insert captured textbook / document frame directly onto whiteboard canvas
  function handleInsertToBoard() {
    const frame = isFrozen && frozenFrame ? frozenFrame : captureCurrentFrame();
    if (!frame) {
      toast.error("Unable to capture camera frame");
      return;
    }

    pushHistory();

    const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 800;

    // Center on canvas view
    const targetW = 600;
    const targetH = 450;
    const cx = (screenW / 2 - camera.x) / camera.zoom - targetW / 2;
    const cy = (screenH / 2 - camera.y) / camera.zoom - targetH / 2;

    addObject({
      id: "doc-cam-" + Math.random().toString(36).slice(2, 9),
      kind: "image",
      x: Math.round(cx),
      y: Math.round(cy),
      w: targetW,
      h: targetH,
      src: frame,
    });

    toast.success("Document added to board. You can now write over it!");
  }

  return (
    <div className="flex flex-col gap-2 w-80 sm:w-96 select-none">
      {/* Video / Snapshot Display Viewport */}
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-black flex items-center justify-center border border-border">
        {errorMsg ? (
          <div className="flex flex-col items-center justify-center p-4 text-center text-xs text-muted-foreground gap-2">
            <VideoOff className="h-8 w-8 text-rose-500" />
            <span>{errorMsg}</span>
            <span className="text-[10px]">Connect a USB camera or grant permission.</span>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "h-full w-full object-contain transition-transform duration-200",
                isFrozen && "hidden",
              )}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            {isFrozen && frozenFrame && (
              <img
                src={frozenFrame}
                alt="Frozen document frame"
                className="h-full w-full object-contain"
              />
            )}
            {/* Frozen Indicator Badge */}
            {isFrozen && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/90 text-white text-[10px] font-bold shadow-md backdrop-blur-xs">
                <Pause className="h-3 w-3 fill-current" />
                <span>{t("freeze")}</span>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-1.5 pt-1">
        {/* Camera Selector */}
        {cameras.length > 1 && (
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="text-xs bg-muted border border-border rounded-lg px-2 py-1 max-w-[140px] truncate"
            title={t("switchCamera")}
          >
            {cameras.map((c, idx) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Rotate 90deg */}
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition active:scale-95"
            title={t("rotate")}
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          {/* Freeze / Live Toggle */}
          <button
            type="button"
            onClick={toggleFreeze}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95",
              isFrozen
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-muted hover:bg-muted/80 text-foreground",
            )}
            title={isFrozen ? t("unfreeze") : t("freeze")}
          >
            {isFrozen ? (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{t("unfreeze")}</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>{t("freeze")}</span>
              </>
            )}
          </button>

          {/* Add to Board Button */}
          <button
            type="button"
            onClick={handleInsertToBoard}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-xs active:scale-95"
            title={t("addToBoard")}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>{t("addToBoard")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
