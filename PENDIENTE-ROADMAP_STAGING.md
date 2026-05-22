PENDIETES URGENTES:
1. INCORPORAR ICNO DE ENGRANAJE DE ADMIN PARA QUE CUNADO EL USUARIO ES ADMIN, SIMEPRE APARESCA EN TODAS LAS PAGINAS ASI PEUDE DESPLEGAR PANEL DE CONFIGURACION DE RUTA, Y EDITAR VISUALIZACION EN TIEMPO REAL Y VER OCMO LA PAGINA CAMBIA PARAMETRICAMENTE.

2. IMPLEMENTAR UN SITEMA NATIVO DE ADMINSTRACION DE WHITELIST DE USAERS, UNA SECCION DONDE SE CREEN Y ADMINISTREN LSITAS DE USAURIOS FAICLMENTE, CREAR ELMIANR LSITA AÑADIR USAURIOS, ALADIR BLOUE DE USARIOS, OSEA MUY SIMPLE Y AGNOSTIO,CO, PEUNTUALENTE QUE SOLO VENGA DEFINIDA UNA WHITELIST DEFAULT INBORRABLE, LA WHITELIST DE ADMIN. QUE ES LA QUE SE CARGA AUTAOMTICMAENT CUNAOD EL UUASIRO INCIA SESION PRIMERA VEZ EN PORTAL... 

3. inCORPORAR AL OBEJTO "RUTA" CÓMO UN ELEMENTO QUE S EPEUDA LSITAR DE UNA COLECCION, ASI PODRIA CREAR NAV BARS PERSONALIZADOS, LA COLECCION SERPIA UNA LISTA DE RUTAS, CÓMO NATURALIZAMOS USAR EL OBJEOT RUTA DE MAENRA AGNOSTICA EN EL COMPOCITOR DE INTERFACES? 







Pendiente para el fin de semana (pasos manuales, sin código):
  1. Crear repo agnostic-portal en GitHub y hacer push del directorio local   
  2. Conectar a Vercel
  3. Registrar GitHub OAuth App (callback URL real)
  4. Crear Upstash Redis KV y copiar credenciales
  5. Setear las 6 env vars en Vercel

----
REOSLVER ESTO:
lsito, y unas preguntas finales, de proceso.. si queiro seguir creanod      
  webs usando el protocolo mcp, pero desde aqui, cual sería la forma 
  correcta? hay un end point donde me pueda conectar desde esta terminal o    
  cualquier terminal? y que ademas oajala en este mismo entorno al ir
   local y subir a git hub? osea hablo de un proceso hibrido, seguir            mejorando el generador parametrico de interfaces con codigo ts directo en     el seed, pero al mismo timepo probarlo consutriyendo UIs con el mcp, osea     la UI ya viviria en la nibe git hub y se conectaria la end point pero los     parches del seed os haria directametn en local y pushearia... me hago         entender?                                                                   
  
● Sí, te entiendes perfectamente. Es el proceso ideal — dogfooding del propio
  sistema.

  Lo que ya existe para hacer eso:

  El MCP bridge ya está en el repo:
  scripts/mcp-bridge.ts  →  npm run mcp:bridge

  Eso levanta un servidor MCP stdio que expone las 21 herramientas semánticas 
  (create_schema, write_script, create_record, etc.). Cualquier cliente MCP — 
  esta terminal, Cursor, Claude Desktop — puede conectarse ahí.

  El flujo híbrido que describes:

  Storage repo (GitHub)          Kernel local (tu máquina)
  ─────────────────────          ──────────────────────────
  db/schema_definitions.json     src/ — parches TypeScript
  db/page_routes.json        ←→  npm run dev  (Next.js)
  db/mis_datos.json              npm run mcp:bridge  (MCP server)
           ↑                              ↑
      MCP tools escriben aquí      tú parcheas el engine aquí
      desde cualquier cliente      y pusheas a Agnostic_System_Seed

  La pregunta clave antes del fin de semana:

  ¿El npm run mcp:bridge está configurado para apuntar al storage repo de     
  GitHub (GitHubStrategy) o todavía apunta a storage/ local? Eso determina si 
  ya funciona en la nube o necesita un ajuste de configuración.

  db/mis_datos.json              npm run mcp:bridge  (MCP server)
           ↑                              ↑
      MCP tools escriben aquí      tú parcheas el engine aquí
      desde cualquier cliente      y pusheas a Agnostic_System_Seed

  La pregunta clave antes del fin de semana:

  ¿El npm run mcp:bridge está configurado para apuntar al storage repo de     
  GitHub (GitHubStrategy) o todavía apunta a storage/ local? Eso determina si 
  ya funciona en la nube o necesita un ajuste de configuración.

  ¿Quieres que lo revise ahora?
  ----
  LUEGO PLAN REAL:


# ROADMAP B — Modo Seguro de Pruebas (Staging Branch)

**Prioridad:** 2 (requiere ROADMAP_LAUNCH Phase 1 completado)
**Implementador:** Gemini (o cualquier agente que lea este documento)
**Dependencia:** `GitHubStrategy` activa, `GITHUB_TOKEN` y `GITHUB_REPO` seteados en Vercel

---

## Objetivo

Permitir hacer cambios en schemas, rutas y datos de forma segura sin afectar la versión en producción, usando ramas de Git en el storage repo como entorno de staging. El kernel puede leer de cualquier rama del storage repo. Promover a producción = hacer merge de `staging` → `main` en el repo de storage.

---

## Por qué esto es elegante y agnostico

El staging NO es lógica del kernel. Es una propiedad del storage. El kernel ya tiene la infraestructura completa:

```typescript
// GitHubStrategy.ts — línea 38-45
private get branch(): string {
  try {
    const passport = readPassport();
    return passport.github_branch ?? process.env.GITHUB_BRANCH ?? 'main';
  } catch {
    return process.env.GITHUB_BRANCH ?? 'main';
  }
}
```

`GitHubStrategy` ya soporta ramas. Todo lo que falta es:
1. Un mecanismo para cambiar la rama en runtime (por request, no globalmente).
2. Un indicador visual de que estás en modo staging.
3. Guardia para que staging no filtre a producción.

---

## Arquitectura

```
Vercel Production (GITHUB_BRANCH=main)
    → lee/escribe en rama 'main' del storage repo
    → URL: empresa.kernel.com

Vercel Preview (GITHUB_BRANCH=staging)
    → lee/escribe en rama 'staging' del storage repo
    → URL: staging.empresa.kernel.com (Vercel Preview URL)

Flujo de promoción:
    1. Hacer cambios en Preview (escribe en rama 'staging' del storage)
    2. Verificar que todo está bien
    3. Abrir PR en el storage repo: 'staging' → 'main'
    4. Mergear el PR — producción se actualiza automáticamente
```

---

## Estado actual del sistema

| Componente | Estado |
|-----------|--------|
| `GitHubStrategy.branch` getter | Ya lee `passport.github_branch` o `GITHUB_BRANCH` env var |
| `SystemPassport.github_branch` | Ya existe el campo en el tipo |
| `readPassport()` cuando `GITHUB_REPO` está seteado | Ya devuelve `github_branch: process.env.GITHUB_BRANCH ?? 'main'` |
| Soporte de rama por request | NO existe — la rama es global por deployment |

---

## Phase 1 — Staging via Vercel Preview Deployments (cero código)

### Objetivo
Usar el sistema de Preview Deployments de Vercel para staging. Cada rama del kernel repo genera un preview con sus propias env vars.

### Por qué funciona sin cambios de código
`readPassport()` ya lee `GITHUB_BRANCH` de env vars. Si el Preview Deployment tiene `GITHUB_BRANCH=staging`, toda la instancia lee de la rama `staging` del storage repo.

### Paso 1.1 — Crear rama `staging` en el storage repo

```bash
# En el storage repo (no en el kernel)
git checkout -b staging
git push origin staging
```

La rama `staging` es una copia de `main` en este punto.

### Paso 1.2 — Configurar env vars en Vercel por entorno

En Vercel Dashboard → Settings → Environment Variables:

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `GITHUB_BRANCH` | `main` | `staging` | `main` |
| `GITHUB_TOKEN` | `ghp_xxx` | `ghp_xxx` | (opcional) |
| `GITHUB_REPO` | `owner/repo` | `owner/repo` | (opcional) |

Vercel distingue automáticamente entre Production y Preview deployments.

### Paso 1.3 — Flujo de trabajo

1. Abrir la URL del Preview Deployment de Vercel.
2. Hacer cambios (crear schemas, editar rutas, añadir datos).
3. Todos los writes van a la rama `staging` del storage repo.
4. Verificar que el Preview Deployment funciona correctamente.
5. En el storage repo, abrir PR: `staging` → `main`.
6. Mergear — el Production deployment lo recoge automáticamente.

### Vectores de entropía — Phase 1

**Vector 1: Divergencia de ramas en el storage repo**
Si `staging` y `main` divergen demasiado (schemas incompatibles, datos inconsistentes), el merge puede fallar o crear inconsistencias en producción.

MITIGACIÓN: Hacer merges frecuentes de `staging` en lugar de acumular cambios grandes. Cada feature de datos = un merge separado.

**Vector 2: Dos personas editando `staging` simultáneamente**
`GitHubStrategy.write()` hace read-modify-write. Dos writes simultáneos generan un 409 (SHA stale). El código ya tiene un retry automático (línea 99-104 de `GitHubStrategy.ts`), pero el retry puede fallar si la concurrencia es alta.

MITIGACIÓN: En proyectos pequeños (1-2 usuarios), este riesgo es mínimo. Documentar que staging es un entorno de trabajo secuencial, no colaborativo.

**Vector 3: Writes de producción que van accidentalmente a staging**
Si `GITHUB_BRANCH` no está seteada correctamente en el Production deployment, todos los writes van a `main` directamente, saltándose staging.

MITIGACIÓN: Verificar explícitamente en la primera sesión de cada deployment que `GITHUB_BRANCH` tiene el valor correcto. Añadir un endpoint de diagnóstico `/api/debug/config` (solo en desarrollo) que devuelva el passport activo.

---

## Phase 2 — Branch por Request (staging en-demanda)

### Objetivo
Sin cambiar el deployment, poder hacer preview de la rama `staging` añadiendo `?preview=1` a cualquier URL del production deployment.

Esto elimina la necesidad de gestionar dos deployments separados. La rama de lectura se determina por request, no por deployment.

### Prerequisito
Phase 1 funcional, o alternativamente, Phase 1 de ROADMAP_LAUNCH completada (GitHubStrategy activa).

### Paso 2.1 — Añadir `PREVIEW_BRANCH` a las env vars

| Variable | Valor |
|----------|-------|
| `PREVIEW_BRANCH` | `staging` |

### Paso 2.2 — Modificar `GitHubStrategy` para aceptar branch override

Actualmente `GitHubStrategy.branch` es un getter que siempre devuelve la rama global del passport. Añadir la posibilidad de override:

```typescript
// GitHubStrategy.ts — modificar la clase

export class GitHubStrategy implements AgnosticBridge {
  private readonly token = process.env.GITHUB_TOKEN;
  private readonly branchOverride?: string; // NUEVO

  constructor(
    private readonly owner: string,
    private readonly repo: string,
    private readonly customToken?: string,
    branchOverride?: string // NUEVO
  ) {
    this.branchOverride = branchOverride;
    if (!this.token && !customToken) {
      console.warn('[GitHubStrategy] WARNING: GITHUB_TOKEN not found in environment.');
    }
  }

  private get branch(): string {
    // Override tiene máxima prioridad
    if (this.branchOverride) return this.branchOverride;
    try {
      const passport = readPassport();
      return passport.github_branch ?? process.env.GITHUB_BRANCH ?? 'main';
    } catch {
      return process.env.GITHUB_BRANCH ?? 'main';
    }
  }
```

### Paso 2.3 — Modificar `getStrategy()` para aceptar branch override

```typescript
// getStrategy.ts
export function getStrategy(tenantKey?: string, branchOverride?: string): AgnosticBridge {
  const passport = tenantKey 
    ? readPassportForTenant(tenantKey) 
    : readPassport();

  if (passport.storage_strategy === 'GitHubStrategy') {
    const [owner, repo] = (passport.github_repo ?? passport.project_identity).split('/');
    const token = /* resolver token por tenant si aplica */ undefined;
    return new GitHubStrategy(owner, repo, token, branchOverride);
  }

  // ... resto igual
}
```

### Paso 2.4 — Leer el parámetro de preview en los API routes

En `src/app/api/vault/route.ts`, leer el query param `?preview=1`:

```typescript
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tenantKey = req.headers.get('x-tenant') ?? undefined;
  
  // Solo activar branch override si PREVIEW_BRANCH está configurado
  const previewParam = url.searchParams.get('preview');
  const previewBranch = process.env.PREVIEW_BRANCH;
  const branchOverride = (previewParam === '1' && previewBranch) ? previewBranch : undefined;

  const strategy: any = getStrategy(tenantKey, branchOverride);
  // ... resto igual
}
```

Aplicar el mismo cambio a `POST`:
```typescript
export async function POST(req: NextRequest) {
  const tenantKey = req.headers.get('x-tenant') ?? undefined;
  const body = await req.json();
  
  // Preview en writes también — staging escribe en la rama de staging
  const previewBranch = process.env.PREVIEW_BRANCH;
  const branchOverride = (body.preview === true && previewBranch) ? previewBranch : undefined;

  const strategy: any = getStrategy(tenantKey, branchOverride);
  // ... resto igual
}
```

### Paso 2.5 — Modificar el cliente para pasar el modo preview

El cliente (browser) necesita saber si está en modo preview para incluir el parámetro en sus requests.

**En `src/components/agnostic/engine/AgnosticShell.tsx`** (o donde se haga el fetch inicial):

Añadir soporte para leer un flag de preview del sessionStorage o de la URL:

```typescript
// Función helper — añadir en src/lib/agnostic/preview.ts (archivo nuevo, pequeño)

export function isPreviewMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.search.includes('preview=1') 
    || sessionStorage.getItem('agnostic_preview') === '1';
}

export function getVaultParams(): string {
  return isPreviewMode() ? '?preview=1' : '';
}
```

Usar en cualquier `fetch('/api/vault...')`:
```typescript
import { getVaultParams } from '@/lib/agnostic/preview';

const res = await fetch(`/api/vault?namespace=schema_definitions${getVaultParams()}`);
```

### Paso 2.6 — Indicador visual de modo staging

Cuando `isPreviewMode()` es true, mostrar un banner persistente para que el usuario siempre sepa que está viendo datos de staging.

**En `src/app/layout.tsx`** (o en `AgnosticShell`):

```tsx
{/* Solo en cliente */}
{typeof window !== 'undefined' && isPreviewMode() && (
  <div style={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#f59e0b',
    color: '#1c1917',
    textAlign: 'center',
    padding: '4px',
    fontSize: '12px',
    zIndex: 9999,
    fontWeight: 600,
  }}>
    MODO STAGING — los cambios van a la rama &apos;{process.env.NEXT_PUBLIC_PREVIEW_BRANCH ?? 'staging'}&apos;
  </div>
)}
```

Para que el nombre de la rama sea visible en el cliente, añadir a las env vars:
```
NEXT_PUBLIC_PREVIEW_BRANCH = staging
```

### Vectores de entropía — Phase 2

**Vector 1: `?preview=1` accesible públicamente en producción**
Cualquier usuario que conozca el parámetro puede leer datos de staging desde producción.

MITIGACIÓN FASE 2: Aceptable para entornos privados (acceso restringido por proyecto). Si el kernel va a ser público, añadir una verificación de un token de preview:
```typescript
const previewToken = url.searchParams.get('preview_token');
const validToken = process.env.PREVIEW_TOKEN;
const isValidPreview = validToken && previewToken === validToken;
const branchOverride = (isValidPreview && previewBranch) ? previewBranch : undefined;
```
Usar como `?preview_token=TOKEN_SECRETO`.

**Vector 2: Writes de staging en producción sin indicador visual**
Si `PREVIEW_BRANCH` no está seteado en el servidor pero el cliente envía `preview: true`, el `branchOverride` será `undefined` y el write irá a producción sin advertencia.

MITIGACIÓN: En el POST handler, si el body incluye `preview: true` pero `PREVIEW_BRANCH` no está seteado, devolver un error explícito:
```typescript
if (body.preview === true && !process.env.PREVIEW_BRANCH) {
  return NextResponse.json({ 
    success: false, 
    error: 'Preview mode requested but PREVIEW_BRANCH env var is not set' 
  }, { status: 400 });
}
```

**Vector 3: `sessionStorage` no disponible en SSR**
`isPreviewMode()` usa `sessionStorage` que no existe en el servidor. La guardia `typeof window === 'undefined'` ya está, pero cualquier uso de `isPreviewMode()` en código que corre tanto en servidor como cliente puede causar hydration mismatches.

MITIGACIÓN: `isPreviewMode()` solo debe usarse en:
- Componentes con `'use client'`
- Dentro de efectos (`useEffect`)
- Nunca en Server Components o en la función de rendering inicial

**Vector 4: Cache de Next.js `React.cache` sirve datos de `main` cuando se pide staging**
Si `React.cache` tiene cacheado un resultado de la rama `main` y el mismo request pide `?preview=1`, el cache puede devolver datos incorrectos.

MITIGACIÓN CRÍTICA: `React.cache` crea una cache POR render cycle (no persiste entre requests). En cada request HTTP nuevo, el cache se reinicia. Sin embargo, si `getVaultData()` en `src/core/server/vault.ts` usa `unstable_cache` (cache persistente entre requests), el `branchOverride` DEBE ser parte del cache key.

Verificar en `src/core/server/vault.ts`: si hay `unstable_cache`, el `branchOverride` debe incluirse en el array de tags/keys. Si solo hay `React.cache`, no hay problema.

---

## Phase 3 — Workflow de Promoción Automatizado

### Objetivo
Desde el designer del kernel, poder hacer "Promover a producción" con un clic, que automáticamente crea y mergea el PR `staging → main` en el storage repo vía GitHub API.

### Prerequisito
Phase 2 completa.

### Paso 3.1 — Endpoint de promoción

Crear `src/app/api/staging/promote/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN!;
  const repo = process.env.GITHUB_REPO!;
  const previewBranch = process.env.PREVIEW_BRANCH ?? 'staging';
  
  // 1. Crear PR
  const prRes = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      title: `[agnostic] promote ${previewBranch} → main (${new Date().toISOString()})`,
      head: previewBranch,
      base: 'main',
    }),
  });
  
  if (!prRes.ok) {
    const err = await prRes.json();
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
  
  const pr = await prRes.json() as { number: number; html_url: string };
  
  // 2. Mergear PR inmediatamente (auto-merge)
  const mergeRes = await fetch(`https://api.github.com/repos/${repo}/pulls/${pr.number}/merge`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ merge_method: 'squash' }),
  });
  
  if (!mergeRes.ok) {
    const err = await mergeRes.json();
    return NextResponse.json({ 
      success: false, 
      error: `PR created (#${pr.number}) but merge failed: ${err.message}`,
      pr_url: pr.html_url
    }, { status: 400 });
  }
  
  return NextResponse.json({ success: true, pr_url: pr.html_url });
}
```

### Paso 3.2 — Botón en el designer

En el designer (donde sea que esté el panel de admin), añadir un botón "Promover a producción" que llame a `POST /api/staging/promote`. Mostrar confirmación antes de ejecutar.

### Vectores de entropía — Phase 3

**Vector 1: Merge fallido por conflictos**
Si `main` tuvo cambios directos mientras `staging` también tenía cambios, el merge puede fallar con conflictos.

MITIGACIÓN: El endpoint devuelve el `pr_url` cuando el merge falla. El usuario debe resolver el conflicto manualmente en GitHub. No reintentar automáticamente.

**Vector 2: `staging` queda atrás de `main` después del merge**
Después de promover `staging → main`, la rama `staging` queda en el estado pre-merge. El próximo set de cambios en staging puede estar basado en un `staging` que falta los cambios de `main`.

MITIGACIÓN: Después del merge exitoso, sincronizar `staging` con `main`:
```typescript
// En el endpoint, después del merge exitoso:
// Actualizar la rama staging para que apunte a main
await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${previewBranch}`, {
  method: 'PATCH',
  headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  body: JSON.stringify({ sha: mergeResult.sha, force: false }),
});
```

---

## Referencia de archivos — qué tocar por phase

### Phase 1 (cero código)
| Acción | Destino |
|--------|---------|
| Crear rama `staging` | Storage repo en GitHub |
| Setear `GITHUB_BRANCH=staging` en Preview | Vercel Dashboard → Environment Variables |

### Phase 2 (cambios en código)
| Archivo | Cambio |
|---------|--------|
| `src/server/strategies/GitHubStrategy.ts` | MODIFICAR — añadir `branchOverride?: string` al constructor |
| `src/server/getStrategy.ts` | MODIFICAR — añadir `branchOverride?: string` al overload |
| `src/app/api/vault/route.ts` | MODIFICAR — leer `?preview=1` y pasar `branchOverride` |
| `src/lib/agnostic/preview.ts` | CREAR — helper `isPreviewMode()` y `getVaultParams()` |
| `src/app/layout.tsx` | MODIFICAR — añadir banner de staging condicional |
| Todos los `fetch('/api/vault...')` en cliente | MODIFICAR — usar `getVaultParams()` |

### Phase 3 (cambios en código)
| Archivo | Cambio |
|---------|--------|
| `src/app/api/staging/promote/route.ts` | CREAR — endpoint de promoción staging → main |
| Designer component (donde esté el admin panel) | MODIFICAR — añadir botón "Promover" |

---

## Reglas absolutas (no negociables)

1. **Staging nunca escribe en `main` directamente.** El único camino de staging a main es vía PR/merge en el storage repo.
2. **El kernel NO tiene estado de "estoy en modo staging" como global.** La rama es por request (Phase 2) o por deployment (Phase 1). Nunca en una variable global del proceso.
3. **`isPreviewMode()` nunca se llama en Server Components.** Solo en componentes `'use client'` o dentro de `useEffect`.
4. **El banner de staging es obligatorio.** Si no hay indicador visual, no hay modo staging seguro — la confusión entre staging y producción es el mayor vector de entropía del sistema.
5. **`PREVIEW_BRANCH` es una env var de servidor. `NEXT_PUBLIC_PREVIEW_BRANCH` es su equivalente para el cliente.** Son dos variables distintas que deben tener el mismo valor.
