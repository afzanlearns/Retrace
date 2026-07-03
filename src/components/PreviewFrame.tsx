"use client";

import { useRef, useState, useEffect } from "react";

const INTRINSIC_WIDTH = 1280;
const INTRINSIC_HEIGHT = 800;

interface PreviewFrameProps {
  src: string | undefined;
  title: string;
  className?: string;
}

export function PreviewFrame({ src, title, className }: PreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: INTRINSIC_WIDTH, height: INTRINSIC_HEIGHT });

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

  const scaledHeight = INTRINSIC_HEIGHT * scale;

  return (
    <div ref={containerRef} className={`overflow-hidden relative ${className || ""}`}>
      {src ? (
        <iframe
          src={src}
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
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div
          className="flex items-center justify-center bg-surface-secondary/30 text-text-tertiary text-xs absolute top-0 left-0"
          style={{ width: containerSize.width, height: containerSize.height }}
        >
          Live preview unavailable for this commit — requires a build step.
        </div>
      )}
    </div>
  );
}
