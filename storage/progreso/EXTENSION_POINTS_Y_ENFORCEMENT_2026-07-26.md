# Puntos de extensión + enforcement de frontera (sesión 2026-07-26)

Trabajo de engine para que **los forks comerciales customicen sin tocar archivos de
engine** y el upstream seed→fork dé **cero conflictos**. `empresa_muebles` fue el
caso de prueba (rama `sync/seed-engine-2026-07`, verificado 0 conflictos + build OK).

## Contrato para forks: NUNCA editar engine — usar la capa de dato/config

| Necesidad del fork | Dónde va (fork-owned) | Archivo de engine que lee |
|---|---|---|
| Nombre, título, descripción, favicon, GA | `configuracion_comercial` (objeto plano o key/value `{llave,valor}`) | `src/lib/seo/siteConfig.ts` + `layout.tsx` (`generateMetadata`) |
| Open Graph / Twitter cards | mismos datos (`og_image`, `twitter_handle`, `site_url`) | `layout.tsx` |
| robots.txt / sitemap.xml | `site_url` en config; o robots/sitemap propios (merge=ours) | `app/robots.ts`, `app/sitemap.ts` (data-driven) |
| Marketing: pixels, GTM, meta de verificación, JSON-LD, widgets | `storage/site-injections.json` (elementos reales; scripts ejecutan) | `src/lib/seo/siteInjections.tsx` |
| Colores / radios / fuentes (variables) | `design_tokens` → `storage/styles/tokens.css` (`POST /api/tokens/sync`) | inyectado en `layout.tsx` |
| @font-face / clases de tema / CSS libre | `storage/styles/custom.css` (gana por cascada tras tokens) | `layout.tsx` |
| Rutas protegidas / públicas | `agnostic.routing.ts` (módulo edge-safe, versionado) + fallback env `AGNOSTIC_*_PATHS` | `src/middleware.ts` |
| Adapters | `agnostic.config.ts` (zona `agno:adapters`) | resueltos por convención en `src/lib/integrations/adapters.server.ts` |
| Bloques custom | `agnostic.config.ts` + `src/components/specialized/` | renderer |
| Páginas públicas bespoke | archivos de ruta explícitos `src/app/<ruta>/page.tsx` (ganan sobre `[...slug]`) | — |

**Importante:** `storage/styles/` debe estar des-ignorado en el `.gitignore` del fork
para que `tokens.css` + `custom.css` se deployen (ya en el `.gitignore` del seed).

## Enforcement de la frontera (convención → regla)

1. **`.gitattributes` con `merge=ours`** sobre capas fork-owned (storage, generated,
   specialized, `agnostic.config.ts`, `agnostic.routing.ts`, entry-points de ruta con
   brackets **escapados** `[[]...slug[]]`, `.env.example`, `.gitignore`). Requiere
   `git config merge.ours.driver true` (lo hace `sync-workspaces.ps1`).
2. **Guardián pre-commit** `scripts/guard-engine-edits.mjs`: en forks, avisa (o bloquea
   con `AGNOSTIC_GUARD_STRICT=1`) si un commit toca engine. No-op en el seed; salta merges.
3. **Pre-flight de drift** `scripts/sync-preflight.mjs`: antes de cada sync lista los
   archivos que van a conflictuar (tocados por ambos lados, sin merge=ours).

## Receta de sync con cero conflictos

```bash
git fetch seed feature/agile-rendering-engine
git config merge.ours.driver true
git merge --no-ff -Xno-renames seed/feature/agile-rendering-engine   # -> 0 conflictos
```
`-Xno-renames` evita falsos conflictos rename/delete cuando el engine borra un dir que
el fork también tiene. Ya está en `scripts/admin/sync-workspaces.ps1`.

## Robustez de deploy

`layout.tsx` degrada (no 500) si `getVaultData`/`getIronSession` fallan por
`AGNOSTIC_STORAGE_STRATEGY` inválida o `SESSION_SECRET` corto/ausente. **Aun así hay que
configurar bien el deploy:** `AGNOSTIC_STORAGE_STRATEGY` ∈ {local, github, postgres,
supabase} (Neon = `postgres`), y `SESSION_SECRET` (32+ chars) en Production.

## Lección de verificación

Correr los tests con `AGNOSTIC_STORAGE_STRATEGY=local` **enmascaró** un bug real de
deploy. Regla: la validación debe ejercitar la condición de producción, no el atajo cómodo.

## Archivos clave (engine)

`src/lib/seo/siteConfig.ts`, `siteInjections.tsx` · `src/app/{layout.tsx,robots.ts,sitemap.ts}`
· `src/middleware.ts` + `agnostic.routing.ts` · `scripts/{guard-engine-edits,sync-preflight}.mjs`
· `scripts/admin/sync-workspaces.ps1` · `.gitattributes` (por fork).
