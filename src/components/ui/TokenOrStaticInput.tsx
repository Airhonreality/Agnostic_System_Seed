'use client';
import React, { useState } from 'react';
import { Sparkles, Type } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DesignToken {
  id: string;
  name: string;
  category: string;
  value: string;
}

interface TokenOrStaticInputProps {
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  category: 'spacing' | 'color' | 'typography' | 'radius' | 'shadow' | 'custom';
  tokens: DesignToken[];
  placeholder?: string;
  label?: string;
  className?: string;
}

export function TokenOrStaticInput({
  value,
  onChange,
  category,
  tokens,
  placeholder = '0',
  label,
  className,
}: TokenOrStaticInputProps) {
  const isTokenMode = typeof value === 'string' && value.startsWith('var(');
  const [mode, setMode] = useState<'static' | 'token'>(isTokenMode ? 'token' : 'static');

  const matchingTokens = tokens.filter(t => t.category === category);

  const toggleMode = () => {
    const next = mode === 'static' ? 'token' : 'static';
    setMode(next);
    if (next === 'static') {
      onChange(0);
    } else if (matchingTokens.length > 0) {
      onChange(`var(--${matchingTokens[0].name})`);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 shrink-0 w-16">
          {label}
        </span>
      )}

      {/* Mode toggle */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleMode}
        className={cn(
          'w-6 h-6 rounded-md shrink-0 transition-colors',
          mode === 'token'
            ? 'bg-primary/10 text-primary hover:bg-primary/20'
            : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50'
        )}
        title={mode === 'token' ? 'Usando token de variable' : 'Usando valor estático'}
      >
        {mode === 'token' ? <Sparkles size={10} /> : <Type size={10} />}
      </Button>

      {/* Input area */}
      {mode === 'static' ? (
        <Input
          type="text"
          value={typeof value === 'number' ? String(value) : (value ?? '')}
          onChange={e => {
            const raw = e.target.value;
            // spacing/radius: parsear como número si es posible
            if (category !== 'color' && category !== 'typography' && category !== 'custom') {
              const num = parseFloat(raw);
              onChange(!isNaN(num) && raw.trim() !== '' ? num : raw);
            } else {
              onChange(raw);
            }
          }}
          placeholder={
            category === 'color'      ? '220 90% 56%'  :
            category === 'radius'     ? '0.5'           :
            category === 'typography' ? '1rem'          :
            category === 'shadow'     ? '0 4px 6px ...' :
            placeholder
          }
          className="h-7 text-xs font-mono flex-1 min-w-0"
        />
      ) : (
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={val => onChange(val)}
        >
          <SelectTrigger className="h-7 text-[10px] font-mono flex-1 min-w-0 bg-primary/5 border-primary/20">
            <SelectValue placeholder="— seleccionar token —" />
          </SelectTrigger>
          <SelectContent>
            {matchingTokens.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-muted-foreground">
                Sin tokens de tipo {category}
              </div>
            ) : (
              matchingTokens.map(token => (
                <SelectItem key={token.id} value={`var(--${token.name})`} className="text-[10px] font-mono">
                  <span className="text-primary">--{token.name}</span>
                  <span className="text-muted-foreground ml-2">({token.value})</span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
