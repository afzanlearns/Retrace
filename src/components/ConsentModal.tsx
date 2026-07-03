"use client";

import { Shield, FolderOpen, Lock, X, Eye } from "lucide-react";

interface ConsentModalProps {
  open: boolean;
  onGrant: () => void;
  onCancel: () => void;
}

export function ConsentModal({ open, onGrant, onCancel }: ConsentModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Top gradient stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-accent via-purple-500 to-indigo-500" />

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center mb-5">
            <FolderOpen className="w-7 h-7 text-accent" />
          </div>

          <h2
            id="consent-title"
            className="text-lg font-bold text-text-primary mb-2"
          >
            Open local repository
          </h2>
          <p className="text-sm text-text-secondary mb-6 leading-relaxed">
            Retrace needs&nbsp;
            <strong className="text-text-primary">read-only</strong>&nbsp;access
            to a folder on your device so it can parse your Git history locally.
          </p>

          {/* Trust pills */}
          <ul className="space-y-3 mb-6">
            {[
              {
                icon: Shield,
                title: "100% local",
                desc: "Your code never leaves your machine.",
              },
              {
                icon: Eye,
                title: "Read-only",
                desc: "Retrace cannot modify, write, or delete any files.",
              },
              {
                icon: Lock,
                title: "No network",
                desc: "Zero uploads, zero analytics, no tracking.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{title}</p>
                  <p className="text-xs text-text-tertiary">{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              id="consent-cancel"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-md border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              id="consent-grant"
              onClick={onGrant}
              className="flex-1 px-4 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Choose folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
