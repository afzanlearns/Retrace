"use client";

import { useRef, useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

const INTRINSIC_WIDTH = 1280;
const INTRINSIC_HEIGHT = 800;

interface PreviewFrameProps {
  srcdoc: string | null | undefined;
  title: string;
  className?: string;
  error?: string | null;
  onRetry?: () => void;
}

export function PreviewFrame({ srcdoc, title, className, error, onRetry }: PreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
      const scaleX = width / INTRINSIC_WIDTH;
      const scaleY = height / INTRINSIC_HEIGHT;
      setScale(Math.min(scaleX, scaleY));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fallback = error ? (
    <div
      className="flex flex-col items-center justify-center gap-2 bg-surface-secondary/30 text-text-tertiary text-xs absolute top-0 left-0"
      style={{ width: containerSize.width, height: containerSize.height }}
    >
      <span>{error}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-surface hover:bg-surface-secondary transition-colors text-text-secondary text-xs"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  ) : (
    <div
      className="flex items-center justify-center bg-surface-secondary/30 text-text-tertiary text-xs absolute top-0 left-0"
      style={{ width: containerSize.width, height: containerSize.height }}
    >
      Live preview unavailable for this commit — requires a build step.
    </div>
  );

  return (
    <div ref={containerRef} className={`overflow-hidden relative ${className || ""}`}>
      {srcdoc ? (
        <iframe
          srcDoc={srcdoc}
          width={INTRINSIC_WIDTH}
          height={INTRINSIC_HEIGHT}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
          title={title}
          sandbox="allow-scripts"
        />
      ) : fallback}
    </div>
  );
}
