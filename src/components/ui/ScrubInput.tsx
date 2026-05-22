'use client';
import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ScrubInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export function ScrubInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = '0',
  className,
  icon: Icon,
}: ScrubInputProps) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const drag = useRef({ moved: false, startX: 0, startVal: 0 });

  const clamp = useCallback(
    (v: number) => {
      let n = v;
      if (min !== undefined) n = Math.max(min, n);
      if (max !== undefined) n = Math.min(max, n);
      return n;
    },
    [min, max],
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editing) return;
    e.preventDefault();
    drag.current = { moved: false, startX: e.clientX, startVal: value ?? 0 };

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - drag.current.startX;
      if (Math.abs(delta) > 2) drag.current.moved = true;
      if (!drag.current.moved) return;
      const raw = drag.current.startVal + delta * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(parseFloat(snapped.toFixed(10))));
    };

    const onUp = () => {
      if (!drag.current.moved) {
        setEditing(true);
        setEditVal(value !== undefined ? String(value) : '');
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const commit = () => {
    if (editVal === '') onChange(undefined);
    else {
      const n = parseFloat(editVal);
      if (!isNaN(n)) onChange(clamp(n));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        autoFocus
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        step={step}
        min={min}
        max={max}
        className={cn(
          'h-7 w-full text-center text-[11px] font-mono bg-background border border-primary/40 rounded outline-none px-1',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          className,
        )}
      />
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'h-7 flex items-center justify-center gap-1 px-2 rounded border border-border/20 bg-muted/20',
        'text-[11px] font-mono cursor-ew-resize select-none hover:bg-muted/40 hover:border-border/40 transition-colors',
        className,
      )}
    >
      {Icon && <Icon size={9} className="text-muted-foreground/40 shrink-0" />}
      {value !== undefined ? (
        <span>{Number.isInteger(value) ? value : parseFloat(value.toFixed(4))}</span>
      ) : (
        <span className="text-muted-foreground/30">{placeholder}</span>
      )}
    </div>
  );
}
