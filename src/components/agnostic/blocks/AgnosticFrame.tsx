'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { resolveValue, resolveColor } from '@/lib/agnostic/resolveToken';

const AgnosticRenderer = dynamic(
  () => import('../engine/AgnosticRenderer').then(m => m.AgnosticRenderer),
  { ssr: false }
);

interface FrameProps {
  blocks?:          any[];
  direction?:       'horizontal' | 'vertical' | 'wrap';
  align_items?:     'start' | 'center' | 'end' | 'stretch';
  justify?:         'start' | 'center' | 'end' | 'space-between' | 'space-around';
  gap?:             number | string;
  padding_top?:     number | string;
  padding_right?:   number | string;
  padding_bottom?:  number | string;
  padding_left?:    number | string;
  sizing?:          'fill' | 'hug' | 'fixed';
  min_height?:      number | string;
  text_color?:      string;
  border_radius?:   number | string;
  opacity?:         number;
  clip?:            boolean;
  record?:          any;
  // Fill system (flat props from block.config)
  fill_type?:       'none' | 'color' | 'image' | 'gradient';
  fill_color?:      string;
  fill_src?:        string;
  fill_fit?:        string;
  fill_position?:   string;
  fill_gradient?:   string;
  fill_opacity?:    number;
  // Legacy
  background_color?: string;
}

export function AgnosticFrame({
  blocks = [],
  direction = 'vertical',
  align_items,
  justify,
  gap,
  padding_top,
  padding_right,
  padding_bottom,
  padding_left,
  sizing,
  min_height,
  text_color,
  border_radius,
  opacity,
  clip,
  record,
  fill_type,
  fill_color,
  fill_src,
  fill_fit,
  fill_position,
  fill_gradient,
  fill_opacity,
  background_color,
}: FrameProps) {
  const sides = [padding_top, padding_right, padding_bottom, padding_left];
  const hasPadding = sides.some(v => v !== undefined && v !== 0 && v !== '');
  const paddingCss = hasPadding
    ? sides.map(v => resolveValue(v) ?? '0').join(' ')
    : undefined;

  // Background layer style — computed separately so opacity only affects the fill, not children
  const { bgStyle, hasFill } = React.useMemo(() => {
    // Legacy: background_color with no fill_type → implicit color fill
    if (!fill_type && background_color) {
      return { bgStyle: { backgroundColor: resolveColor(background_color) }, hasFill: true };
    }
    if (!fill_type || fill_type === 'none') {
      return { bgStyle: {}, hasFill: false };
    }
    if (fill_type === 'color') {
      return {
        bgStyle: { backgroundColor: resolveColor(fill_color) },
        hasFill: !!fill_color,
      };
    }
    if (fill_type === 'image') {
      const s: React.CSSProperties = { backgroundRepeat: 'no-repeat' };
      if (fill_src) s.backgroundImage = `url(${fill_src})`;
      s.backgroundSize = fill_fit || 'cover';
      s.backgroundPosition = fill_position || 'center';
      return { bgStyle: s, hasFill: !!fill_src };
    }
    if (fill_type === 'gradient') {
      return {
        bgStyle: fill_gradient ? { background: fill_gradient } : {},
        hasFill: !!fill_gradient,
      };
    }
    return { bgStyle: {}, hasFill: false };
  }, [fill_type, fill_color, fill_src, fill_fit, fill_position, fill_gradient, background_color]);

  const radius = resolveValue(border_radius);

  return (
    <div
      className={cn(
        'relative flex',
        direction === 'horizontal' ? 'flex-row' : direction === 'wrap' ? 'flex-row flex-wrap' : 'flex-col',
        sizing === 'hug' ? 'w-auto' : 'w-full',
      )}
      style={{
        gap:            resolveValue(gap),
        padding:        paddingCss,
        alignItems:     align_items,
        justifyContent: justify,
        minHeight:      resolveValue(min_height),
        color:          resolveColor(text_color),
        borderRadius:   radius,
        opacity:        opacity !== undefined ? opacity / 100 : undefined,
        overflow:       clip ? 'hidden' : undefined,
      }}
    >
      {hasFill && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            ...bgStyle,
            borderRadius: radius,
            opacity: fill_opacity !== undefined ? fill_opacity / 100 : 1,
          }}
        />
      )}
      {blocks.map((block, i) => (
        <AgnosticRenderer key={block.id || i} block={block} record={record} />
      ))}
    </div>
  );
}
