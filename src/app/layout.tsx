/**
 * 🏛️ PORTAL: Root Layout (The Agnostic Shell)
 * ──────────────────────────────────────────
 * AXIOMATIC_CONTRACT:
 * - MUST: Inyectar tokens CSS de satélite inline para prevenir FOUC.
 * - MUST: Proveer el contexto de Soberanía (SovereigntyOrchestrator) globalmente.
 * - NEVER: Contener lógica de negocio o de transformación de DNA.
 * 
 * ADR: Se opta por inyección inline de estilos de satélite para garantizar 
 * que la identidad visual sea soberana desde el primer frame de renderizado.
 * 
 * RELATIONSHIPS:
 * - Padre de todas las rutas del sistema.
 * - Inyecta SovereigntyOrchestrator como centinela omnipresente.
 */
import type { Metadata } from "next";
import "./globals.css";
import { AppProvider }    from "@/context/AppContext";
import { AuthProvider }   from "@/context/AuthContext";
import { Toaster }        from "sonner";
import { SovereigntyOrchestrator } from "@/components/agnostic/engine/SovereigntyOrchestrator";
import { AdminGear }               from "@/components/agnostic/admin/AdminGear";
import { getVaultData }   from "@/core/server/vault";
import { getSiloPath }    from "@/server/activeProject";
import fs   from "fs/promises";
import path from "path";
import { SYSTEM_NS } from "@/lib/agnostic/constants";

export const metadata: Metadata = {
  title:       "Agnostic System",
  description: "A professional, storage-based agnostic framework",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const siloPath     = getSiloPath();
  const vaultData    = await getVaultData([SYSTEM_NS.ROUTES, SYSTEM_NS.SCHEMAS, SYSTEM_NS.CONFIG, SYSTEM_NS.TOKENS]);

  // ── CAPA 1: Tokens CSS (inyectado inline — sin latencia de red) ──────────
  // El satélite overridea variables --sat-* en tokens.css.
  // Se inyecta como <style> en el <head> para evitar FOUC.
  let tokenStyles = "";
  try {
    const tokensPath = path.join(siloPath, "styles", "tokens.css");
    tokenStyles = await fs.readFile(tokensPath, "utf-8");
  } catch { /* El satélite aún no tiene tokens → usa defaults del Seed */ }

  // ── Manifest (DNA del satélite) ───────────────────────────────────────────
  let dna: Record<string, unknown> = {};
  try {
    const manifestPath    = path.join(siloPath, "manifest.json");
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    dna = JSON.parse(manifestContent.replace(/^﻿/, ""));
  } catch { /* Sin manifest → estrategia local por defecto */ }

  // ── Metadata dinámica desde DNA ───────────────────────────────────────────
  const sysConfig = (vaultData?.["system_config"]?.[0]?.data ?? {}) as Record<string, unknown>;
  const appName   = (sysConfig["app_name"] as string | undefined) ?? "Agnostic System";

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Tokens del satélite — inline para evitar FOUC */}
        {tokenStyles && (
          <style
            id="agnostic-tokens"
            dangerouslySetInnerHTML={{ __html: tokenStyles }}
          />
        )}

        {/*
          CAPA 2: CSS compilado del satélite — como <link> para beneficiarse
          del caché del navegador. El endpoint retorna 204 si no existe.
          Los módulos guest usan las clases definidas en este archivo.
        */}
        <link
          rel="stylesheet"
          href="/api/satellite-styles"
          precedence="satellite"
        />

        <title>{appName}</title>
      </head>
      <body className="antialiased">
        <AppProvider initialData={vaultData}>
          <AuthProvider>
            {children}
            <SovereigntyOrchestrator />
            <AdminGear />
            <Toaster position="bottom-left" expand={false} richColors />
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
