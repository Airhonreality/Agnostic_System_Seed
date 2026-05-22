'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { useMateriaStore } from '@/lib/agnostic/store';
import { useAppDispatch } from '@/context/AppContext';
import { SYSTEM_NS } from '@/lib/agnostic/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function UserManager() {
  const { data: materia } = useMateriaStore();
  const { saveItem, deleteItem } = useAppDispatch();

  const users     = useMemo(() => materia[SYSTEM_NS.USERS]      ?? [], [materia]);
  const userLists = useMemo(() => materia[SYSTEM_NS.USER_LISTS] ?? [], [materia]);

  const [activeFilter,    setActiveFilter]    = useState<string>('all');
  const [showCreateUser,  setShowCreateUser]  = useState(false);
  const [showCreateList,  setShowCreateList]  = useState(false);
  const [pendingDelete,   setPendingDelete]   = useState<{ type: 'user' | 'list'; id: string } | null>(null);

  const [newEmail,    setNewEmail]    = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newType,     setNewType]     = useState<string[]>([]);
  const [newListName, setNewListName] = useState('');

  const filteredUsers = useMemo(() => {
    if (activeFilter === 'all') return users;
    return users.filter((u: any) => ((u.data?.type as string[]) ?? []).includes(activeFilter));
  }, [users, activeFilter]);

  const handleCreateUser = async () => {
    if (!newEmail.trim()) return;
    await saveItem(SYSTEM_NS.USERS, {
      id: crypto.randomUUID(),
      data: { email: newEmail.trim(), password: newPassword, type: newType }
    });
    setNewEmail(''); setNewPassword(''); setNewType([]);
    setShowCreateUser(false);
    toast.success('Usuario creado');
  };

  const handleCreateList = async () => {
    const name = newListName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) return;
    await saveItem(SYSTEM_NS.USER_LISTS, {
      id: crypto.randomUUID(),
      data: { name, is_permanent: false }
    });
    setNewListName('');
    setShowCreateList(false);
    toast.success(`Lista "${name}" creada`);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    setPendingDelete(null);
    if (type === 'user') {
      await deleteItem(SYSTEM_NS.USERS, id);
      toast.success('Usuario eliminado');
    } else {
      const list = userLists.find((l: any) => l.id === id);
      if (list?.data?.is_permanent) {
        toast.error('Esta lista es permanente.');
        return;
      }
      await deleteItem(SYSTEM_NS.USER_LISTS, id);
      toast.success('Lista eliminada');
    }
  };

  const toggleUserList = async (user: any, listName: string) => {
    const current: string[] = (user.data?.type as string[]) ?? [];
    const updated = current.includes(listName)
      ? current.filter((t: string) => t !== listName)
      : [...current, listName];
    await saveItem(SYSTEM_NS.USERS, { ...user, data: { ...user.data, type: updated } });
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar: listas ─────────────────────────────────────────── */}
      <aside className="w-48 border-r flex flex-col bg-muted/10 shrink-0">
        <div className="px-3 py-3 border-b">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Listas</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              'w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors',
              activeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            Todos ({users.length})
          </button>

          {userLists.map((list: any) => {
            const name  = list.data?.name as string;
            const count = users.filter((u: any) => ((u.data?.type as string[]) ?? []).includes(name)).length;
            return (
              <div key={list.id} className="flex items-center group">
                <button
                  onClick={() => setActiveFilter(name)}
                  className={cn(
                    'flex-1 text-left px-2 py-1.5 rounded text-xs font-medium transition-colors',
                    activeFilter === name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >
                  {name} ({count})
                </button>
                {!list.data?.is_permanent && (
                  <button
                    onClick={() => setPendingDelete({ type: 'list', id: list.id })}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full text-[10px] h-7 gap-1" onClick={() => setShowCreateList(true)}>
            <Plus size={10} /> Nueva lista
          </Button>
        </div>
      </aside>

      {/* ── Main: tabla de usuarios ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">Gestión de Acceso</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">{filteredUsers.length} usuarios</p>
          </div>
          <Button size="sm" className="text-xs h-8 gap-1" onClick={() => setShowCreateUser(true)}>
            <Plus size={12} /> Nuevo usuario
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Users size={28} className="opacity-20" />
              <p className="text-xs">Sin usuarios en esta lista</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20 sticky top-0">
                  <th className="text-left px-6 py-2 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-2 font-black text-[9px] uppercase tracking-widest text-muted-foreground">Listas</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: any) => (
                  <tr key={user.id} className="border-b hover:bg-muted/10 group transition-colors">
                    <td className="px-6 py-3 font-medium">{user.data?.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {userLists.map((list: any) => {
                          const name   = list.data?.name as string;
                          const active = ((user.data?.type as string[]) ?? []).includes(name);
                          return (
                            <button
                              key={list.id}
                              onClick={() => toggleUserList(user, name)}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide transition-all',
                                active
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/60'
                              )}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3">
                      <button
                        onClick={() => setPendingDelete({ type: 'user', id: user.id })}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase tracking-widest">Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="email@ejemplo.com" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)} className="text-xs" />
            <Input type="password" placeholder="Contraseña inicial" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} className="text-xs" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Asignar a listas</p>
              <div className="flex flex-wrap gap-1">
                {userLists.map((list: any) => {
                  const name   = list.data?.name as string;
                  const active = newType.includes(name);
                  return (
                    <button key={list.id}
                      onClick={() => setNewType(prev => active ? prev.filter(t => t !== name) : [...prev, name])}
                      className={cn('px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
                    >{name}</button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" size="sm" className="text-xs">Cancelar</Button></DialogClose>
            <Button size="sm" className="text-xs" onClick={handleCreateUser}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase tracking-widest">Nueva Lista</DialogTitle>
          </DialogHeader>
          <Input placeholder="premium, suscriptores..." value={newListName}
            onChange={(e) => setNewListName(e.target.value)} className="text-xs my-2" />
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" size="sm" className="text-xs">Cancelar</Button></DialogClose>
            <Button size="sm" className="text-xs" onClick={handleCreateList}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase tracking-widest">Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground py-2">Esta acción es irreversible.</p>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" size="sm" className="text-xs">Cancelar</Button></DialogClose>
            <Button variant="destructive" size="sm" className="text-xs" onClick={handleDeleteConfirm}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
