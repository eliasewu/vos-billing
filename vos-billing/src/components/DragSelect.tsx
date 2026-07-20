"use client";

import { useState, useRef } from "react";
import { GripHorizontal } from "lucide-react";

export interface DragSelectOption {
  value: number | string;
  label: string;
}

interface DragSelectProps {
  options: DragSelectOption[];
  value: number | string;
  onChange: (value: number | string) => void;
  label?: string;
}

export default function DragSelect({ options, value, onChange, label }: DragSelectProps) {
  const [draggingValue, setDraggingValue] = useState<number | string | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);
  const availableOptions = options.filter(o => o.value !== value);

  const handleDragStart = (e: React.DragEvent, val: number | string) => {
    setDraggingValue(val);
    e.dataTransfer.setData("text/plain", String(val));
    e.dataTransfer.effectAllowed = "move";
    const el = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => {
      el.style.opacity = "0.4";
    });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingValue(null);
    setDropZoneActive(false);
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = "1";
  };

  const handleDropZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropZoneActive(true);
  };

  const handleDropZoneDragLeave = () => {
    setDropZoneActive(false);
  };

  const handleDropZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneActive(false);
    const val = e.dataTransfer.getData("text/plain");
    const parsed = isNaN(Number(val)) ? val : Number(val);
    onChange(parsed);
    setDraggingValue(null);
  };

  const handleClick = (val: number | string) => {
    onChange(val);
  };

  const cardBaseClasses =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium cursor-grab active:cursor-grabbing transition-all duration-150 bg-surface-800 border-surface-700/50 text-surface-300 hover:border-surface-600 hover:bg-surface-700/80";

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-xs font-medium text-surface-400">{label}</label>
      )}

      {/* Drop zone — where the selected value appears */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDropZoneDragOver}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={handleDropZoneDrop}
        className={`
          relative flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all duration-200 min-h-[52px]
          ${dropZoneActive
            ? "border-brand-400 bg-brand-500/10 scale-[1.02] shadow-lg shadow-brand-500/10"
            : selectedOption
              ? "border-surface-700 bg-surface-800/50"
              : "border-surface-700/30 bg-surface-800/30"
          }
        `}
      >
        {dropZoneActive ? (
          <div className="flex items-center gap-2 text-brand-400">
            <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center animate-pulse">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-medium">Drop to select</span>
          </div>
        ) : selectedOption ? (
          <>
            <GripHorizontal className="w-4 h-4 text-surface-500 flex-shrink-0" />
            <span className="text-sm font-medium text-surface-100">{selectedOption.label}</span>
          </>
        ) : (
          <span className="text-sm text-surface-500">Drag an option here or click below</span>
        )}
      </div>

      {/* Draggable option cards */}
      <div className="flex flex-wrap gap-2.5">
        {availableOptions.map(option => {
          const isDragging = draggingValue === option.value;
          return (
            <div
              key={option.value}
              draggable
              onDragStart={(e) => handleDragStart(e, option.value)}
              onDragEnd={handleDragEnd}
              onClick={() => handleClick(option.value)}
              className={`${cardBaseClasses} ${isDragging ? "opacity-40 scale-95" : "hover:scale-[1.03]"}`}
            >
              <GripHorizontal className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
              {option.label}
            </div>
          );
        })}

        {/* Show the selected option too — clicking it cycles to first available */}
        {selectedOption && availableOptions.length > 0 && (
          <div
            onClick={() => onChange(availableOptions[0].value)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-150 bg-brand-600/10 border-brand-500/30 text-brand-300 hover:bg-brand-600/20"
            title="Click to change"
          >
            {selectedOption.label}
            <span className="text-[10px] text-brand-400">✓</span>
          </div>
        )}
      </div>
    </div>
  );
}
