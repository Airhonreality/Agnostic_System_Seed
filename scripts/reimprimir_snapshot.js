const snap = payload.record;
if (!snap || !snap.id) {
  api.notify.error("Selecciona un snapshot de la tabla primero.");
  return;
}

const snapshots = await api.query("cotizaciones_snapshot");
const s = snapshots.find(x => x.id === snap.id);

if (!s || !s.html_pdf) {
  api.notify.error("Este snapshot no tiene HTML guardado.");
  return;
}

api.dispatchEvent("print_pdf", { html: s.html_pdf });
api.notify.success("Re-imprimiendo propuesta archivada...");
