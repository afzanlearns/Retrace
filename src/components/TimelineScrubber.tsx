"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ZoomIn,
  Maximize2,
  Repeat,
  Repeat1,
} from "lucide-react";
import { Button } from "./Button";
import { formatRelativeTime } from "@/lib/utils";

interface TimelineCommit {
  sha: string;
  message: string;
  timestamp: number;
}

interface TimelineScrubberProps {
  commits: TimelineCommit[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
  autoplay: boolean;
  onAutoplayChange: (autoplay: boolean) => void;
}

export function TimelineScrubber({
  commits,
  currentIndex,
  onSelect,
  isPlaying,
  onPlayPause,
  speed,
  onSpeedChange,
  loop,
  onLoopChange,
  autoplay,
  onAutoplayChange,
}: TimelineScrubberProps) {
  const [zoom, setZoom] = useState(1);
  const speeds = [1, 2, 4];

  if (!commits?.length) return null;

  const maxThumbnails = Math.min(commits.length, Math.floor(12 * zoom));
  const step = Math.max(1, Math.floor(commits.length / maxThumbnails));
  const thumbnails = commits.filter((_, i) => i % step === 0 || i === currentIndex);
  if (!thumbnails.find((t) => t.sha === commits[currentIndex].sha)) {
    thumbnails.push(commits[currentIndex]);
  }
  thumbnails.sort((a, b) => commits.indexOf(a) - commits.indexOf(b));

  return (
    <div className="border-t border-border bg-surface">
      <div className="flex items-center gap-3 px-4 py-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant="icon"
            onClick={() => onSelect(0)}
            aria-label="Skip to start"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="icon"
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="icon"
            onClick={() => onSelect(commits.length - 1)}
            aria-label="Skip to end"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
          <button
            onClick={() => onSpeedChange(speeds[(speeds.indexOf(speed) + 1) % speeds.length])}
            className="ml-1 px-2 py-1 text-xs font-mono text-text-secondary bg-surface-secondary border border-border rounded-md hover:bg-border transition-colors"
            aria-label={`Speed: ${speed}x`}
          >
            {speed}x
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <button
            onClick={() => onAutoplayChange(!autoplay)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              autoplay ? "text-accent" : "hover:text-text-secondary"
            }`}
          >
            <Play className="w-3 h-3" />
            Auto-play
          </button>
          <button
            onClick={() => onLoopChange(!loop)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              loop ? "text-accent" : "hover:text-text-secondary"
            }`}
          >
            {loop ? (
              <Repeat1 className="w-3 h-3" />
            ) : (
              <Repeat className="w-3 h-3" />
            )}
            Loop
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button
            variant="icon"
            onClick={() => setZoom(Math.min(3, zoom + 0.5))}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="icon"
            onClick={() => setZoom(1)}
            aria-label="Fit to screen"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-4 pb-3 overflow-x-auto">
        {thumbnails.map((commit) => {
          const isSelected = commit.sha === commits[currentIndex].sha;
          return (
            <button
              key={commit.sha}
              onClick={() => onSelect(commits.findIndex((c) => c.sha === commit.sha))}
              className={`flex-shrink-0 w-24 rounded-md border-2 transition-all duration-150 overflow-hidden ${
                isSelected
                  ? "border-accent shadow-sm"
                  : "border-border hover:border-text-tertiary"
              }`}
            >
              <div className="h-12 bg-surface-secondary flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-border" />
              </div>
              <div className="px-1.5 py-1 bg-surface">
                <p className="text-[10px] text-text-primary truncate leading-tight">
                  {commit.message}
                </p>
                <p className="text-[9px] text-text-tertiary leading-tight">
                  {formatRelativeTime(commit.timestamp)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
