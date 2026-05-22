'use client';

import React from 'react';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ── TYPES & INTERFACES ────────────────────────────────────────────────────────

// ── 1. TEXT ──────────────────────────────────────────────────────────────────
const TEXT_VARIANTS: Record<string, string> = {
  h1:      'text-5xl font-black tracking-tighter',
  h2:      'text-3xl font-bold tracking-tight',
  h3:      'text-xl font-bold',
  body:    'text-base text-muted-foreground leading-relaxed',
  caption: 'text-xs font-bold uppercase tracking-widest text-muted-foreground',
  label:   'text-sm font-semibold',
  quote:   'text-xl italic border-l-4 border-primary pl-4 text-muted-foreground',
};

function renderText(v: Record<string, unknown>) {
  const props = v as { content?: string; variant?: string; align?: string; className?: string };
  const content = props.content || '';
  const variant = props.variant || 'body';
  const align   = props.align   || 'left';
  return (
    <p className={cn(
      TEXT_VARIANTS[variant] || TEXT_VARIANTS.body,
      align === 'center' && 'text-center',
      align === 'right'  && 'text-right',
      props.className
    )}>
      {content}
    </p>
  );
}

// ── 2. DIVIDER ───────────────────────────────────────────────────────────────
function renderDivider(v: Record<string, unknown>) {
  const props = v as { variant?: string; spacing?: number };
  const variant = props.variant || 'line';
  const spacing = props.spacing ?? 4;
  if (variant === 'space') return <div style={{ height: `${spacing * 0.25}rem` }} />;
  if (variant === 'dots') return (
    <div className="flex justify-center gap-2 py-4">
      {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />)}
    </div>
  );
  return <hr className="border-border my-4" />;
}

// ── 3. SPACER ────────────────────────────────────────────────────────────────
const SPACER_SIZES: Record<string, string> = {
  xs: '1rem', sm: '2rem', md: '4rem', lg: '8rem', xl: '12rem'
};

function renderSpacer(v: Record<string, unknown>) {
  const props = v as { size?: string; custom?: string };
  const height = props.custom || SPACER_SIZES[props.size || 'md'] || '4rem';
  return <div style={{ height }} aria-hidden="true" />;
}

// ── 4. CARD STATIC ───────────────────────────────────────────────────────────
function renderCardStatic(v: Record<string, unknown>) {
  const props = v as { icon?: string; title?: string; body?: string; variant?: string };
  const { icon, title, body, variant = 'bordered' } = props;
  const IconComp = icon && icon in Icons ? (Icons as any)[icon] : null;
  return (
    <Card className={cn('h-full', variant === 'ghost' && 'border-none shadow-none bg-transparent')}>
      <CardContent className="p-6 space-y-3">
        {IconComp && <IconComp className="w-8 h-8 text-primary" />}
        {title && <h3 className="font-bold text-base tracking-tight">{title}</h3>}
        {body  && <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>}
      </CardContent>
    </Card>
  );
}

// ── 5. STATS GRID ────────────────────────────────────────────────────────────
const STATS_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
};

function renderStatsGrid(v: Record<string, unknown>) {
  const props = v as { items?: Array<{ value: string; label: string; icon?: string; description?: string }>; cols?: string | number };
  const items = props.items || [];
  const cols  = Number(props.cols) || items.length || 3;
  return (
    <div className={`grid ${STATS_COLS[cols] || STATS_COLS[3]} gap-8`}>
      {items.map((item, i) => {
        const IconComp = item.icon && item.icon in Icons ? (Icons as any)[item.icon] : null;
        return (
          <div key={i} className="text-center space-y-1">
            {IconComp && <IconComp className="w-6 h-6 mx-auto text-primary/60 mb-2" />}
            <div className="text-4xl font-black tracking-tighter text-foreground">{item.value}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{item.label}</div>
            {item.description && <p className="text-xs text-muted-foreground/60">{item.description}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ── 6. TESTIMONIAL ───────────────────────────────────────────────────────────
function renderTestimonial(v: Record<string, unknown>) {
  const props = v as { quote?: string; author?: string; role?: string; avatar?: string; variant?: string };
  const { quote = '', author = '', role = '', avatar, variant = 'card' } = props;
  const initials = avatar || author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  if (variant === 'minimal') {
    return (
      <blockquote className="border-l-4 border-primary pl-6 space-y-3">
        <p className="text-lg italic text-muted-foreground leading-relaxed">"{quote}"</p>
        <footer className="text-sm font-bold uppercase tracking-wider">
          {author}{role && <span className="font-normal opacity-60 ml-2">— {role}</span>}
        </footer>
      </blockquote>
    );
  }

  return (
    <div className="bg-muted/20 border border-border/50 rounded-2xl p-8 space-y-4">
      <p className="text-base leading-relaxed text-foreground/80 italic">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div>
          <div className="text-sm font-bold">{author}</div>
          {role && <div className="text-xs text-muted-foreground">{role}</div>}
        </div>
      </div>
    </div>
  );
}

// ── 7. IMAGE ─────────────────────────────────────────────────────────────────
const IMG_ASPECT: Record<string, string> = {
  video:    'aspect-video',
  square:   'aspect-square',
  portrait: 'aspect-[3/4]',
  auto:     '',
};

const IMG_FIT: Record<string, string> = {
  cover:   'object-cover',
  contain: 'object-contain',
  fill:    'object-fill',
};

function renderImage(v: Record<string, unknown>) {
  const props = v as { src?: string; alt?: string; caption?: string; fit?: string; aspect?: string; rounded?: boolean; className?: string };
  const { src, alt = '', caption, fit = 'cover', aspect = 'video', rounded = false, className } = props;

  if (!src) return (
    <div className="w-full aspect-video bg-muted/20 rounded-xl flex items-center justify-center text-muted-foreground/30 text-xs font-bold uppercase tracking-widest">
      Sin imagen configurada
    </div>
  );

  return (
    <figure className="w-full space-y-2">
      <div className={cn("w-full overflow-hidden", IMG_ASPECT[aspect], rounded && "rounded-xl")}>
        <img
          src={src}
          alt={alt}
          className={cn("w-full h-full", IMG_FIT[fit] || 'object-cover', className)}
          loading="lazy"
        />
      </div>
      {caption && (
        <figcaption className="text-center text-xs text-muted-foreground/60 font-medium italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ── 8. HERO ──────────────────────────────────────────────────────────────────
function renderHero(v: Record<string, unknown>) {
  const props = v as {
    title?: string;
    subtitle?: string;
    align?: string;
    className?: string;
    cta?: { label: string; path: string };
    cta_label?: string;
    cta_path?: string;
    cta_secondary?: { label: string; path: string };
    cta_secondary_label?: string;
    cta_secondary_path?: string;
  };
  const { title, subtitle, align = 'center', className } = props;
  const cta = props.cta || (props.cta_label ? { label: props.cta_label, path: props.cta_path || '#' } : undefined);
  const cta_secondary = props.cta_secondary || (props.cta_secondary_label ? { label: props.cta_secondary_label, path: props.cta_secondary_path || '#' } : undefined);

  return (
    <section className={cn(
      "py-24 px-6 w-full",
      align === 'center' && 'text-center flex flex-col items-center',
      className
    )}>
      {title && (
        <h1 className="text-6xl font-black tracking-tighter max-w-3xl mb-4">{title}</h1>
      )}
      {subtitle && (
        <p className="text-lg text-muted-foreground max-w-xl mb-10">{subtitle}</p>
      )}
      {(cta || cta_secondary) && (
        <div className="flex gap-4 flex-wrap justify-center">
          {cta && (
            <Button asChild size="lg" className="font-bold uppercase tracking-wider">
              <Link href={cta.path}>{cta.label}</Link>
            </Button>
          )}
          {cta_secondary && (
            <Button asChild size="lg" variant="outline" className="font-bold uppercase tracking-wider">
              <Link href={cta_secondary.path}>{cta_secondary.label}</Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

// ── 9. CTA BANNER ────────────────────────────────────────────────────────────
function renderCtaBanner(v: Record<string, unknown>) {
  const props = v as { headline?: string; sub?: string; cta_label?: string; cta_href?: string; variant?: string };
  const { headline, sub, cta_label, cta_href = '#', variant = 'primary' } = props;

  return (
    <section className={cn(
      "w-full rounded-2xl p-12 text-center flex flex-col items-center gap-6",
      variant === 'primary' ? "bg-primary text-primary-foreground" : "bg-muted/30 border border-border"
    )}>
      {headline && <h2 className="text-3xl font-black tracking-tight max-w-2xl">{headline}</h2>}
      {sub && <p className={cn("text-sm max-w-md", variant === 'primary' ? "opacity-80" : "text-muted-foreground")}>{sub}</p>}
      {cta_label && (
        <Button
          asChild
          size="lg"
          variant={variant === 'primary' ? 'secondary' : 'default'}
          className="font-bold uppercase tracking-wider"
        >
          <Link href={cta_href}>{cta_label}</Link>
        </Button>
      )}
    </section>
  );
}

// ── DISPATCHER MAP ───────────────────────────────────────────────────────────

const RENDERERS: Record<string, (v: Record<string, unknown>) => React.ReactElement | null> = {
  text:        renderText,
  divider:     renderDivider,
  spacer:      renderSpacer,
  card_static: renderCardStatic,
  stats_grid:  renderStatsGrid,
  testimonial: renderTestimonial,
  image:       renderImage,
  hero:        renderHero,
  cta_banner:  renderCtaBanner,
};

// ── MASTER RENDERER COMPONENT ────────────────────────────────────────────────

export function AgnosticVisual(props: Record<string, unknown>) {
  const type = props.type as string;
  return RENDERERS[type]?.(props) ?? null;
}
