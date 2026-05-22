ROADMAP — AdminGear + Whitelist Management
Principio rector: cero código nuevo en src/ que no sea infraestructura ciega. El negocio vive en storage/. src/ solo gana dos primitivos de UI nuevos y dos guardas de datos.

FEATURE 1 — Admin Gear Panel
Decisión arquitectónica
El SystemStore ya tiene isEditMode, setEditMode, user, y currentPath. El DNAStore ya tiene routes + setRoutes. El RecursiveBlockComposer ya proyecta bloques editables. El AgnosticDesigner completo ya existe en /schema.

No hay que inventar nada. Hay que componer lo que existe.

El AdminGear es un Sheet flotante que lee el route del currentPath, expone sus bloques a través del RecursiveBlockComposer, y guarda via /api/vault. El preview en tiempo real ya funciona porque AgnosticRenderer es reactivo al DNAStore.

Archivos a crear/modificar
CREAR: src/hooks/useAdminGate.ts
Responsabilidad única: decir si el usuario activo es admin.


// Lee de useSystemStore().user — nunca de AuthContext directamente.
// AuthContext ya sincroniza user al SystemStore en cada cambio.
// useSystemStore es el SSOT de runtime — AuthContext es el SSOT de sesión.

export function useAdminGate(): boolean {
  const user = useSystemStore((s) => s.user);
  return user?.role === 'admin';
}
Trampa de entropía a evitar: Copilot NO debe duplicar esta lógica con useAuth().user?.role === 'admin' en otros lugares. La regla es: un hook, una fuente. Importar solo useAdminGate.

CREAR: src/components/agnostic/admin/AdminGear.tsx
Responsabilidades:

Mostrar el botón flotante (gear icon) solo cuando useAdminGate() === true
Abrir un Sheet lateral al hacer click
Leer el route actual: useDNAStore().routes.find(r => r.data.path === currentPath)
Renderizar RecursiveBlockComposer con los bloques de ese route
Guardar cambios: POST /api/vault con { action: 'WRITE', namespace: SYSTEM_NS.ROUTES, record: updatedRoute }
Actualizar store optimísticamente: useDNAStore().setRoutes(updatedRoutes) ANTES de la llamada HTTP → el canvas refleja el cambio en tiempo real
Contrato de props: ninguno. Lee todo del store. Es un componente "autónomo" igual que SovereigntyOrchestrator.

Estructura interna del Sheet:


<Sheet>
  <SheetTrigger>   ← botón gear, fixed bottom-right, z-index alto
  <SheetContent>
    <header>       ← título de la ruta actual + path
    <ScrollArea>
      <RecursiveBlockComposer
        blocks={currentRouteBlocks}
        onUpdate={handleBlockUpdate}  ← optimistic + debounced save
      />
    </ScrollArea>
    <footer>       ← enlace a /schema para edición avanzada
  </SheetContent>
</Sheet>
Trampa crítica de entropía: NO leer window.location.pathname para resolver la ruta actual. Usar siempre useSystemStore((s) => s.currentPath). Esta variable la gestiona AgnosticShell en cada navegación. window.location rompe la consistencia SSR/hydration.

Trampa de entropía 2: El onUpdate del RecursiveBlockComposer recibe un bloque parcialmente modificado. Antes de escribir al vault, hay que deep-merge el bloque modificado dentro de route.data.blocks y WRITE el route completo. Nunca intentar WRITE un bloque aislado — los bloques son sub-objetos del route record, no records propios.

Trampa de entropía 3: No crear un estado local para los bloques editados. Usar directamente el store como fuente + setRoutes para mutarlo. Si existe estado local, hay dos fuentes de verdad y el canvas no se actualiza.

MODIFICAR: src/app/layout.tsx
Agregar exactamente dos líneas:


// Importar al tope:
import { AdminGear } from "@/components/agnostic/admin/AdminGear";

// En el JSX, dentro de <AuthProvider>, después de <SovereigntyOrchestrator />:
<AdminGear />
Por qué después de SovereigntyOrchestrator y no antes: SovereigntyOrchestrator gestiona el estado de navegación (setNavigation). AdminGear lee currentPath del store. Si AdminGear se monta antes de que SovereigntyOrchestrator actualice el path, hay una condición de carrera en el primer render. El orden importa.

Nada más se toca en layout.tsx.

Secuencia de implementación — Feature 1

1. useAdminGate.ts                  ← sin dependencias externas nuevas
2. AdminGear.tsx (solo el botón)    ← verificar que aparece/desaparece con rol
3. AdminGear.tsx (Sheet vacío)      ← verificar que abre/cierra
4. Leer currentPath + route         ← verificar que encuentra el route correcto
5. Conectar RecursiveBlockComposer  ← verificar que proyecta los bloques
6. Conectar save + optimistic       ← verificar que el canvas cambia en tiempo real
7. Agregar a layout.tsx             ← verificar que aparece en TODAS las páginas
FEATURE 2 — Whitelist User Management
Decisión arquitectónica
Una whitelist es exactamente un DataItem[] en un contexto agnostico. No existe concepto de "whitelist" en src/. Solo existen dos schemas y sus records en storage/.

La inmutabilidad de la admin whitelist vive en una sola guardia en el vault. El campo is_permanent: true es la señal. No hay lógica especial en UI — el vault simplemente rechaza el REMOVE con 403.

La integración con auth es tres líneas en AuthContext.login().

Archivos a crear/modificar
CREAR: storage/empresa-2/db/user_lists.json

[
  {
    "id": "whitelist-admin-default",
    "context": "user_lists",
    "data": {
      "name": "Admin Whitelist",
      "description": "Lista de administradores del sistema. Inborrable.",
      "is_permanent": true
    },
    "created_at": "<ISO timestamp>"
  }
]
El id whitelist-admin-default es fijo y legible. No usar UUID aquí — este record tiene identidad semántica, no solo unicidad.

CREAR: storage/empresa-2/db/user_list_members.json

[
  {
    "id": "<crypto.randomUUID()>",
    "context": "user_list_members",
    "data": {
      "list_id": "whitelist-admin-default",
      "user_email": "<email del admin>",
      "role": "admin",
      "name": "<nombre del admin>"
    },
    "created_at": "<ISO timestamp>"
  }
]
MODIFICAR: storage/empresa-2/db/schema_definitions.json
Agregar al array existente dos schemas:

Schema user_lists:


{
  "id": "<uuid>",
  "context": "schema_definitions",
  "data": {
    "name": "user_lists",
    "slug": "user_lists",
    "label": "Listas de Usuarios",
    "fields": [
      { "key": "name", "label": "Nombre de la lista", "type": "text", "required": true },
      { "key": "description", "label": "Descripción", "type": "textarea" },
      { "key": "is_permanent", "label": "Lista permanente", "type": "boolean", "readOnly": true }
    ]
  }
}
Schema user_list_members:


{
  "id": "<uuid>",
  "context": "schema_definitions",
  "data": {
    "name": "user_list_members",
    "slug": "user_list_members",
    "label": "Miembros de Lista",
    "fields": [
      { "key": "list_id", "label": "Lista", "type": "relation", "config": { "relation": { "entity": "user_lists", "display_field": "name" } }, "required": true },
      { "key": "user_email", "label": "Email del usuario", "type": "text", "required": true },
      { "key": "name", "label": "Nombre", "type": "text" },
      { "key": "role", "label": "Rol", "type": "select", "options": [
        { "label": "Admin", "value": "admin" },
        { "label": "Editor", "value": "editor" },
        { "label": "Viewer", "value": "viewer" }
      ], "required": true }
    ]
  }
}
Por qué agregar schemas: el vault GET ?namespace=all descubre contextos leyendo schema_definitions. Si hay schema, hay contexto. Si hay contexto, se carga automáticamente en el MateriaStore en la hidratación client-side. Sin schema → los datos existen en disco pero nunca llegan al store → AuthContext no los ve en data['user_list_members'].

MODIFICAR: storage/empresa-2/db/page_routes.json
Agregar la ruta admin:


{
  "id": "<uuid>",
  "context": "page_routes",
  "data": {
    "path": "/admin/users",
    "title": "Gestión de Acceso",
    "isPrivate": true,
    "layout_mode": "canvas",
    "blocks": [
      {
        "id": "<uuid>",
        "type": "collection",
        "context": "user_lists",
        "schema_id": "<id del schema user_lists>",
        "intent": "list",
        "config": { "title": "Listas de Usuarios" }
      },
      {
        "id": "<uuid>",
        "type": "collection",
        "context": "user_list_members",
        "schema_id": "<id del schema user_list_members>",
        "intent": "list",
        "config": { "title": "Miembros" }
      }
    ]
  }
}
Trampa: los schema_id en los bloques deben coincidir EXACTAMENTE con los id de los schemas recién creados en schema_definitions.json. Este es el invariante central del sistema: block.context === schema.data.name === data_file_name. Verificar los tres antes de guardar.

MODIFICAR: src/app/api/vault/route.ts
Agregar la guardia de inmutabilidad en el handler POST, en la rama REMOVE:


// ANTES de strategy.remove():
if (parsed.action === 'REMOVE') {
  const records = await strategy.read(parsed.namespace);
  const target = records.find((r: any) => r.id === parsed.id);
  if (target?.data?.is_permanent === true) {
    return NextResponse.json(
      { success: false, error: 'Este registro es permanente y no puede eliminarse.' },
      { status: 403 }
    );
  }
  // continuar con strategy.remove() ...
}
Esta es la única guardia. No agregar verificaciones en UI ("deshabilitar botón si is_permanent") como sustituto — el botón deshabilitado es conveniente pero la guardia del servidor es obligatoria. Ambas coexisten, pero solo la del servidor es la que protege.

Trampa de entropía: No agregar esta lógica en el adaptador (LocalStrategy, SupabaseStrategy, etc.). La guardia es de dominio de negocio, no de infraestructura. El vault route es el lugar correcto.

MODIFICAR: src/context/AuthContext.tsx
Extender el método login() para derivar el rol desde user_list_members:


const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
  const users = data?.['users'] || [];
  const found = users.find(u => u.data.email === email && u.data.password === pass);
  if (!found) return false;

  // Derivar rol desde membresía (fuente de verdad de autorización)
  const members = data?.['user_list_members'] || [];
  const membership = members.find((m: any) => m.data.user_email === email);
  const role = (membership?.data?.role as string) ?? (found.data.role as string) ?? 'viewer';

  const userData: User = {
    id: found.id,
    email: found.data.email as string,
    name: found.data.name as string,
    role,
    metadata: found.data.metadata as Record<string, any>
  };
  setUserState(userData);
  localStorage.setItem('agnostic_session', JSON.stringify(userData));
  return true;
}, [data]);
Lógica de fallback explícita:

Si el user tiene membresía en alguna lista → tomar ese rol
Si no tiene membresía pero tiene role en su record de users → tomar ese
Si ninguno → 'viewer' como default seguro
Trampa crítica: data['user_list_members'] solo existe en el store si los schemas fueron correctamente registrados y la hidratación client-side los cargó. Si en login el store aún no tiene user_list_members (race condition en primer render), el fallback al found.data.role mantiene la sesión funcional. No es un bug — es el comportamiento correcto del fallback.

Segunda trampa: La sesión se guarda en localStorage con el role derivado. Si un admin modifica el rol de otro usuario en user_list_members, ese cambio NO se refleja hasta que el usuario afectado vuelva a hacer login. Esto es correcto y esperado — las sesiones son snapshots. No intentar hacer el rol reactivo al store post-login.

Secuencia de implementación — Feature 2

1. Crear user_lists.json con el admin whitelist seed
2. Crear user_list_members.json con el primer admin
3. Agregar ambos schemas a schema_definitions.json
4. Verificar invariante: name === slug === filename (sin .json)
5. Agregar guardia is_permanent en vault route.ts
6. Agregar ruta /admin/users en page_routes.json
7. Extender AuthContext.login() con derivación de rol
8. Verificar: crear lista nueva, crear miembro, intentar borrar admin whitelist → 403
Secuencia global (cuál primero)
Feature 2 primero — no depende de Feature 1. Es puramente storage + dos modificaciones quirúrgicas en src/. Sin riesgos de regresión visual.

Feature 1 segundo — depende de que el auth esté correcto para que useAdminGate() funcione con el rol real del usuario.

Checklist de validación final
 Botón gear aparece en / si user.role === 'admin', desaparece si es viewer
 Botón gear persiste en todas las rutas sin recargar
 Editar el título de un bloque en el panel → el canvas lo refleja inmediatamente sin guardar
 Guardar desde el panel → recarga del tab muestra los cambios persisitidos
 Crear una lista nueva en /admin/users → aparece en la colección
 Intentar borrar "Admin Whitelist" → error 403, lista sigue existiendo
 Agregar un email a admin whitelist, login con ese email → role === 'admin'
 Invariante del sistema intacto: block.context === schema.data.name === filename