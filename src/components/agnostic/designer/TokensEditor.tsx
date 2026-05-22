'use client';
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'spacing',    label: 'Espaciado' },
  { value: 'color',      label: 'Color' },
  { value: 'typography', label: 'Tipografía' },
  { value: 'radius',     label: 'Radio de Borde' },
  { value: 'shadow',     label: 'Sombra' },
  { value: 'custom',     label: 'Custom' },
] as const;

interface Token {
  id: string;
  data: { name: string; category: string; value: string; description?: string };
}

interface TokensEditorProps {
  tokens: Token[];
  onSave:   (id: string, data: Token['data']) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAdd:    (data: Token['data']) => Promise<void>;
}

export function TokensEditor({ tokens, onSave, onRemove, onAdd }: TokensEditorProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newToken, setNewToken] = useState({ name: '', category: 'spacing', value: '', description: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({ value: '', description: '' });

  const syncTokensCss = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/tokens/sync', { method: 'POST' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success(`tokens.css actualizado — ${json.count} variables`);
    } catch (e: any) {
      toast.error(`Error al sincronizar CSS: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdd = async () => {
    if (!newToken.name.trim() || !newToken.value.trim()) {
      toast.error('Nombre y valor son requeridos');
      return;
    }
    // Sanitize name: slug lowercase sin espacios
    const safeName = newToken.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // E3: reserved names validation
    const RESERVED_NAMES = ['primary','secondary','background','foreground','card','popover',
      'border','input','ring','radius','muted','accent','destructive'];
    if (RESERVED_NAMES.some(r => safeName === r || safeName.startsWith(r + '-'))) {
      toast.error(`"${safeName}" colisiona con tokens de shadcn/ui. Usa un prefijo: ej. "brand-primary"`);
      return;
    }

    await onAdd({ ...newToken, name: safeName });
    await syncTokensCss();
    setNewToken({ name: '', category: 'spacing', value: '', description: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const token = tokens.find(t => t.id === editingId);
    if (!token) return;
    await onSave(editingId, { ...token.data, value: editingData.value.trim(), description: editingData.description.trim() });
    await syncTokensCss();
    setEditingId(null);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('¿Eliminar esta variable de diseño?')) return;
    await onRemove(id);
    await syncTokensCss();
  };

  const filtered = useMemo(() =>
    filterCategory === 'all' ? tokens : tokens.filter(t => t.data?.category === filterCategory),
    [tokens, filterCategory]
  );

  const grouped = useMemo(() => {
    const map: Record<string, Token[]> = {};
    for (const t of filtered) {
      const cat = t.data?.category || 'custom';
      if (!map[cat]) map[cat] = [];
      map[cat].push(t);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-8 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-base font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <Sparkles size={16} /> Design Tokens
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
            Variables CSS globales — afectan a todos los frames del proyecto
          </p>
        </div>
        <Button
          onClick={syncTokensCss}
          disabled={isSyncing}
          size="sm"
          variant="outline"
          className="text-[10px] font-black uppercase tracking-widest h-9 gap-2"
        >
          <Sparkles size={12} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar CSS'}
        </Button>
      </div>

      {/* Nuevo token */}
      <div className="bg-background border rounded-2xl p-5 space-y-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Nuevo Token
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Nombre (slug)</label>
            <Input
              value={newToken.name}
              onChange={e => setNewToken(p => ({ ...p, name: e.target.value }))}
              placeholder="gap-forms"
              className="font-mono text-xs h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Categoría</label>
            <Select value={newToken.category} onValueChange={v => setNewToken(p => ({ ...p, category: v }))}>
              <SelectTrigger className="h-9 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Valor CSS {newToken.category === 'color' ? '(HSL sin hsl(): "220 90% 56%")' : ''}
            </label>
            <Input
              value={newToken.value}
              onChange={e => setNewToken(p => ({ ...p, value: e.target.value }))}
              placeholder={newToken.category === 'color' ? '220 90% 56%' : '0.9375rem'}
              className="font-mono text-xs h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Descripción (opcional)</label>
            <Input
              value={newToken.description}
              onChange={e => setNewToken(p => ({ ...p, description: e.target.value }))}
              placeholder="Para qué se usa este token"
              className="text-xs h-9"
            />
          </div>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2 text-[10px] font-black uppercase tracking-widest">
          <Plus size={12} /> Agregar Token
        </Button>
      </div>

      {/* Filtro de categoría */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...CATEGORIES.map(c => c.value)].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
              filterCategory === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {cat === 'all' ? 'Todos' : CATEGORIES.find(c => c.value === cat)?.label ?? cat}
          </button>
        ))}
      </div>

      {/* Lista de tokens agrupados */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b pb-2">
              {CATEGORIES.find(c => c.value === category)?.label ?? category}
            </h3>
            <div className="space-y-2">
              {items.map(token => (
                <div
                  key={token.id}
                  onClick={() => {
                    if (editingId !== token.id) {
                      setEditingId(token.id);
                      setEditingData({ value: token.data?.value || '', description: token.data?.description || '' });
                    }
                  }}
                  className="flex flex-col gap-2 bg-background border rounded-xl px-4 py-3 hover:border-primary/20 cursor-pointer transition-all group shadow-sm"
                >
                  {/* Fila principal */}
                  <div className="flex items-center gap-3">
                    {token.data?.category === 'color' && (
                      <div className="w-5 h-5 rounded-md border border-border shrink-0" style={{ backgroundColor: `hsl(${token.data.value})` }} />
                    )}
                    <code className="text-[11px] font-mono text-primary font-bold shrink-0">--{token.data?.name}</code>
                    <span className="text-[11px] font-mono text-muted-foreground flex-1 truncate">{token.data?.value}</span>
                    {token.data?.description && (
                      <span className="text-[10px] text-muted-foreground/50 truncate max-w-[180px] hidden sm:block">{token.data.description}</span>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      onClick={(e) => { e.stopPropagation(); handleRemove(token.id); }}
                      className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 text-destructive/40 hover:text-destructive hover:bg-destructive/5 shrink-0 transition-all"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>

                  {/* Panel de edición inline */}
                  {editingId === token.id && (
                    <div className="flex items-end gap-2 pt-2 border-t border-border/50" onClick={e => e.stopPropagation()}>
                      <div className="space-y-1 flex-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Valor{token.data?.category === 'color' ? ' (HSL: "220 90% 56%")' : ''}
                        </label>
                        <Input
                          value={editingData.value}
                          onChange={e => setEditingData(p => ({ ...p, value: e.target.value }))}
                          placeholder={token.data?.category === 'color' ? '220 90% 56%' : '1.5rem'}
                          className="font-mono text-xs h-8"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1 flex-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Descripción</label>
                        <Input
                          value={editingData.description}
                          onChange={e => setEditingData(p => ({ ...p, description: e.target.value }))}
                          placeholder="Para qué se usa"
                          className="text-xs h-8"
                        />
                      </div>
                      <Button size="sm" onClick={handleSaveEdit}
                        className="h-8 text-[10px] font-black uppercase tracking-widest gap-1 shrink-0">
                        <Check size={11} /> Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                        className="h-8 text-[10px] font-black uppercase tracking-widest shrink-0">
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {tokens.length === 0 && (
        <div className="text-center py-12 text-xs font-semibold text-muted-foreground border border-dashed rounded-2xl bg-muted/5">
          Sin tokens definidos. Añade tu primera variable para empezar.
        </div>
      )}
    </div>
  );
}
