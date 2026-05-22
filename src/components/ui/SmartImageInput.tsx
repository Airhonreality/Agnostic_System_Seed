'use client';
import React, { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SmartImageInputProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  placeholder?: string;
}

export function SmartImageInput({ value, onChange, className, placeholder }: SmartImageInputProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const image = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (image) {
      e.preventDefault();
      const file = image.getAsFile();
      if (file) upload(file);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  const hasValue = !!value?.trim();

  return (
    <div className={cn('space-y-1.5', className)}>
      {hasValue && (
        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted/20 border border-border/20">
          <img src={value} alt="" className="w-full h-full object-cover" loading="lazy" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
          >
            <X size={10} />
          </button>
        </div>
      )}
      <div className="flex gap-1">
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder || 'https://... o pega imagen (Ctrl+V)'}
          className="h-8 text-[11px] font-mono flex-1 min-w-0"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Explorador de archivos"
          className="h-8 w-8 shrink-0 rounded-md border border-border/20 bg-muted/20 flex items-center justify-center hover:bg-muted/40 disabled:opacity-40 transition-colors"
        >
          {uploading
            ? <Loader2 size={12} className="animate-spin text-muted-foreground" />
            : <Upload size={12} className="text-muted-foreground" />}
        </button>
      </div>
      {error && <p className="text-[10px] text-destructive leading-tight">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
