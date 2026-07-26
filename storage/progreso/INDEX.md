# Progress Index

This index is the curated entry point for project progress.

Agents should keep this file short. Link only active or still-useful documents.

## Active Context

- [current_state.md](current_state.md): current state of the fork.
- [EXTENSION_POINTS_Y_ENFORCEMENT_2026-07-26.md](EXTENSION_POINTS_Y_ENFORCEMENT_2026-07-26.md): contrato de puntos de extensión para forks (identidad/SEO, theming, marketing, rutas, adapters) + enforcement de frontera (merge=ours, guardián pre-commit, pre-flight) + receta de sync con cero conflictos.

## Generated Snapshots

- `storage/docs/`: auto-regenerated architecture trees (`agno docs all`). Never hand-edit; not curated context.

## Active Plans

- [REFACTOR_MODULOS/00_LINEA_DE_TRABAJO.md](../fork_doc/REFACTOR_MODULOS/00_LINEA_DE_TRABAJO.md): línea de trabajo orquestada (WP-0 a WP-6) para purgar los bloques UI built-in y crear el catálogo de módulos compuestos instalables; incluye los prompts-arnés por WP.
- [PLAN_CERRADO_AL_100.md](../fork_doc/PLAN_CERRADO_AL_100.md): plan de cierre operativo para declarar el fork estable, sincronizable y publicable sin romper el contrato del engine ni el registro de adapters.
- [SESION_2026-07-02_HOME_SEO_EMBUDO/00_INDICE.md](../fork_doc/SESION_2026-07-02_HOME_SEO_EMBUDO/00_INDICE.md): carpeta de sesión temporal para reconstrucción del Home, embudo híbrido de leads y SEO técnico.
- [PLAN_IMPLEMENTACION_ERP.md](../fork_doc/PLAN_IMPLEMENTACION_ERP.md): plan y lista de chequeo de cambios pendientes.
- [ERGONOMIA_COGNITIVA_CANVAS.md](../fork_doc/ERGONOMIA_COGNITIVA_CANVAS.md): análisis de ergonomía cognitiva de las interfaces tipo canvas.
- [DISENO_DETALLE_MODULO_PRODUCCION.md](../fork_doc/DISENO_DETALLE_MODULO_PRODUCCION.md): diseño de detalle de la Ficha Técnica Tabulada para el Taller.
- [DISENO_DETALLE_CANVAS.md](../fork_doc/DISENO_DETALLE_CANVAS.md): diseño de detalle y planos del Tablero Canvas en formato de Filas.
- [MAPA_MODULOS_Y_AUXILIARES_ERP.md](../fork_doc/MAPA_MODULOS_Y_AUXILIARES_ERP.md): mapa y planos de integración de módulos auxiliares del ERP.
- [src/modules/INDEX.md](../../src/modules/INDEX.md): índice de módulos autocontenidos (inbox, payments, render).

## Hexagonal Architecture Documentation (2026-07-04)

**Model**: Fork > Subsistemas > Células > Transversal
**Entry Point**: [storage/fork_doc/README.md](../fork_doc/README.md)

**Master Docs**:
- [ARQUITECTURA_HEXAGONAL.md](../fork_doc/ARQUITECTURA_HEXAGONAL.md)
- [FLUJOS_TRANSVERSALES.md](../fork_doc/FLUJOS_TRANSVERSALES.md)
- [TEMPLATE_SUBSISTEMA.md](../fork_doc/TEMPLATE_SUBSISTEMA.md)
- [TEMPLATE_CELULA.md](../fork_doc/TEMPLATE_CELULA.md)

**Subsystems**:
- SUBSISTEMA_01_COMERCIAL_SALES
- SUBSISTEMA_02_PRODUCCION_MANUFACTURING
- SUBSISTEMA_03_FINANZAS_ACCOUNTING
- SUBSISTEMA_04_KRONOS_CALENDAR

## Active Audits

- [AUDITORIA_HOMEOSTASIS_ERP_2026-07-04.md](AUDITORIA_HOMEOSTASIS_ERP_2026-07-04.md): 5 critical homeostasis gaps.
- [REFACTORIZACION_HEXAGONAL_LOG.md](REFACTORIZACION_HEXAGONAL_LOG.md): execution log for hexagonal refactoring.
- [CRUCE_SCHEMAS_ZAPS_ENTROPIA.md](../fork_doc/CRUCE_SCHEMAS_ZAPS_ENTROPIA.md): auditoría de cruce axiomático de elementos interactivos.
- [AUDITORIA_RENDIMIENTO_CARGA.md](AUDITORIA_RENDIMIENTO_CARGA.md): hallazgos confirmados de rendimiento y pre-plan de fix.

## Archived Notes

None.
