const activeRecord = payload.record;
if (!activeRecord || !activeRecord.id) {
  api.notify.error("No hay ninguna cotización activa seleccionada para exportar.");
  return;
}

api.notify.success("Generando Layout Premium para Veta de Oro...");

const cotizaciones = await api.query("cotizaciones");
const activeCotizacion = cotizaciones.find(c => c.id === activeRecord.id);

if (!activeCotizacion) {
  api.notify.error("No se encontró el registro de la cotización activa.");
  return;
}

const clientes = await api.query("clientes");
const client = clientes.find(c => c.id === activeCotizacion.cliente_id);

const espacioVariantes = await api.query("espacio_variantes");
const itemsVariante = await api.query("items_variante");
const productosCatalogo = await api.query("productos_catalogo");
const imagenesEspacio = await api.query("imagenes_espacio");

// 🏛️ READ LABOR DAILY RATES STRICTLY FROM THE CATALOG MASTER SKUS
const devService = productosCatalogo.find(p => p.sku === "SERV-DEV");
const assemblyService = productosCatalogo.find(p => p.sku === "SERV-ASSEMBLY");
const installService = productosCatalogo.find(p => p.sku === "SERV-INSTALL");

if (!devService || !assemblyService || !installService) {
  api.notify.error("Error estructural: No se encontraron las tarifas de Mano de Obra (SERV-DEV, SERV-ASSEMBLY, SERV-INSTALL) en el catálogo.");
  return;
}

const RATE_DEV = Number(devService.precio_publico);
const RATE_ASSEMBLY = Number(assemblyService.precio_publico);
const RATE_INSTALL = Number(installService.precio_publico);

// 1. Group items by variants and spaces
const cotizacionId = activeCotizacion.id;
const mySpaces = espacioVariantes.filter(ev => ev.cotizacion_id === cotizacionId);

// Resolve all variant names present in this quote (e.g. "Inicial", etc.)
const variantNames = Array.from(new Set(mySpaces.map(ev => ev.nombre_variante).filter(Boolean)));

const variantTotals = {};
const variantSpacesBreakdown = {};

// Calculate totals for each variant option
for (const vName of variantNames) {
  let subtotalMaterials = 0;
  let subtotalLabor = 0;
  const spacesList = [];

  const spacesInVariant = mySpaces.filter(ev => ev.nombre_variante === vName);

  for (const sv of spacesInVariant) {
    const items = itemsVariante.filter(item => item.variante_id === sv.id);
    let spaceMaterialsSum = 0;

    const itemsDetail = items.map(item => {
      const prod = productosCatalogo.find(p => p.id === item.catalogo_id);
      const desc = prod ? prod.descripcion : (item.nombre_personalizado || "Insumo");
      const unit = prod ? prod.unidad_medida : (item.unidad_medida || "ud");
      const qty = Number(item.cantidad || 0);
      const price = Number(item.precio_unitario || 0);
      const lineTotal = qty * price;

      spaceMaterialsSum += lineTotal;
      return {
        desc,
        unit,
        qty,
        price,
        lineTotal,
        catalogo_id: item.catalogo_id,
        sku: prod ? (prod.sku || "") : "",
        imagen_url: prod ? (prod.imagen_url || "") : ""
      };
    });

    const images = imagenesEspacio
      .filter(img => img.espacio_variante_id === sv.id)
      .map(img => ({
        id: img.id,
        imagen_url: img.imagen_url || "",
        descripcion: img.descripcion || "",
        orden: Number(img.orden || 0)
      }))
      .sort((a, b) => a.orden - b.orden);

    const daysDev = Number(sv.jornadas_desarrollo_tecnico || 0);
    const daysAssembly = Number(sv.jornadas_ensamblaje_taller || 0);
    const daysInstall = Number(sv.jornadas_instalacion_obra || 0);

    const spaceLaborSum = (daysDev * RATE_DEV) + (daysAssembly * RATE_ASSEMBLY) + (daysInstall * RATE_INSTALL);
    const spaceTotal = spaceMaterialsSum + spaceLaborSum;

    subtotalMaterials += spaceMaterialsSum;
    subtotalLabor += spaceLaborSum;

    spacesList.push({
      id: sv.id,
      name: sv.nombre_espacio || "Espacio sin nombre",
      items: itemsDetail,
      images,
      materialsSum: spaceMaterialsSum,
      laborSum: spaceLaborSum,
      days: { dev: daysDev, assembly: daysAssembly, install: daysInstall },
      total: spaceTotal,
      isActive: !!sv.activa
    });
  }

  const baseSubtotal = subtotalMaterials + subtotalLabor;
  const opCosts = Number(activeCotizacion.costos_operativos || 0);
  const imprevistos = Number(activeCotizacion.imprevistos_instalacion || 0);
  const discount = Number(activeCotizacion.descuento_comercial || 0);
  const adjustment = Number(activeCotizacion.ajuste_arbitrario || 0);

  const grandTotal = baseSubtotal + opCosts + imprevistos - discount + adjustment;

  variantTotals[vName] = {
    materials: subtotalMaterials,
    labor: subtotalLabor,
    subtotal: baseSubtotal,
    grandTotal: grandTotal
  };
  variantSpacesBreakdown[vName] = spacesList;
}

// 2. Identify the active/selected variant
const activeSpacesList = [];
const activeSpace = mySpaces.find(ev => ev.activa);
let activeVariantName = activeSpace ? (activeSpace.nombre_variante || "Inicial") : (variantNames[0] || "Inicial");

activeSpacesList.push(...(variantSpacesBreakdown[activeVariantName] || []));
const activeTotals = variantTotals[activeVariantName] || { materials: 0, labor: 0, subtotal: 0, grandTotal: 0 };

// 3. Compile dynamic pdfTitle using project name + client name
const projectName = activeCotizacion.nombre_proyecto || "";
const clientName = client ? (client.nombre || "") : "";
const pdfTitle = [projectName, clientName].filter(Boolean).join(" - ").trim() || "Propuesta Comercial";

// 4. Compile executive options delta
const baselineName = variantNames[0] || "Inicial";
const optionsHtml = Object.entries(variantTotals).map(([vName, totals]) => {
  const isSelected = vName === activeVariantName;
  const diff = totals.grandTotal - (variantTotals[baselineName] ? variantTotals[baselineName].grandTotal : totals.grandTotal);
  const diffFormatted = diff === 0 
    ? "Línea Base" 
    : (diff > 0 ? "+ $" + diff.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "- $" + Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2 }));

  return `
    <div class="option-card ${isSelected ? 'selected' : ''}">
      <div class="option-header">
        <span class="option-title">${vName.toUpperCase()}</span>
        ${isSelected && variantNames.length > 1 ? '<span class="selected-badge">SELECCIONADA</span>' : ''}
      </div>
      <div class="option-price">$ ${totals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="option-diff">Ajuste sobre ${baselineName}: <strong>${diffFormatted}</strong></div>
    </div>
  `;
}).join("");

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
  <rect width="320" height="200" fill="#F5F1E8"/>
  <rect x="8" y="8" width="304" height="184" fill="none" stroke="#D8C9A6" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="160" y="105" font-family="Inter, Arial, sans-serif" font-size="14" fill="#A3916A" text-anchor="middle">SIN IMAGEN</text>
</svg>`;
const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

// 5. Compile detailed spaces breakdown HTML
let spacesHtml = activeSpacesList.map((space, sIdx) => {
  const itemsRows = space.items.map(item => `
    <tr>
      <td>${item.desc}</td>
      <td class="center">${item.qty} ${item.unit}</td>
      <td class="right">$ ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td class="right">$ ${item.lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join("");

  const imagesToRender = space.images && space.images.length > 0
    ? space.images
    : [{
        id: 'placeholder',
        imagen_url: PLACEHOLDER_IMAGE,
        descripcion: 'Sin imagen'
      }];

  const imagesHtml = `
    <div class="space-images" style="display:flex;flex-wrap:wrap;gap:10px;margin:12px 0 16px;">
      ${imagesToRender.map(img => `
        <figure style="margin:0;text-align:center;">
          <img src="${img.imagen_url}" alt="${img.descripcion || space.name}"
            style="max-width:200px;max-height:150px;border-radius:6px;object-fit:cover;border:1px solid #e0d9cc;" />
          ${img.descripcion
            ? `<figcaption style="font-size:10px;color:#888;margin-top:3px;">${img.descripcion}</figcaption>`
            : ''}
        </figure>`).join("")}
    </div>`;

  return `
    <div class="space-section">
      <h3 class="space-title">Espacio: ${space.name}</h3>
      ${imagesHtml}
      <table class="items-table">
        <thead>
          <tr>
            <th>Ítem / Componente</th>
            <th class="center" style="width: 100px;">Cantidad</th>
            <th class="right" style="width: 150px;">Precio Unit.</th>
            <th class="right" style="width: 150px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows.length > 0 ? itemsRows : '<tr><td colspan="4" class="empty-row">No hay insumos cargados en este espacio.</td></tr>'}
        </tbody>
      </table>

      <div class="labor-bar-collapsed">
        <span class="labor-summary-title">Mano de Obra Estimada:</span>
        <span class="labor-summary-days">
          $ ${space.laborSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div class="space-totals">
        <div class="space-total-line">Subtotal Materiales: <span>$ ${space.materialsSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
        <div class="space-total-line">Subtotal Mano de Obra: <span>$ ${space.laborSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
        <div class="space-total-line space-grand">Subtotal Espacio: <span>$ ${space.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>
  `;
}).join("");

const _tpls = await api.query('templates');
const _tpl = _tpls.find(t => t.name === 'pdf_template');
if (!_tpl || !_tpl.html) { api.notify.error('Template pdf_template no encontrado.'); return; }
let template = _tpl.html;

const discountVal = Number(activeCotizacion.descuento_comercial || 0);
const descuentoRow = discountVal > 0 
  ? `
  <div class="final-line discount">
    <span>Descuento Comercial:</span>
    <span>- $ ${discountVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
  </div>
  ` : '';

const adjustmentVal = Number(activeCotizacion.ajuste_arbitrario || 0);
const ajusteRow = adjustmentVal !== 0 
  ? `
  <div class="final-line">
    <span>Ajuste Técnico:</span>
    <span>$ ${adjustmentVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
  </div>
  ` : '';

// 6. Append dynamic financial summary card right post list of spaces
const consolidatedCardHtml = `
  <div class="final-totals-container" style="margin-top: 40px;">
    <div class="final-totals-card">
      <div class="final-totals-header">Resumen Financiero (${activeVariantName.toUpperCase()})</div>
      <div class="totals-grid-layout">
        <div class="totals-details-col">
          <div class="final-line">
            <span>Subtotal Materiales:</span>
            <span>$ ${activeTotals.materials.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="final-line">
            <span>Subtotal Mano de Obra:</span>
            <span>$ ${activeTotals.labor.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="final-line">
            <span>Costos Operativos Globales:</span>
            <span>$ ${Number(activeCotizacion.costos_operativos || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="final-line">
            <span>Imprevistos de Instalación:</span>
            <span>$ ${Number(activeCotizacion.imprevistos_instalacion || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div class="totals-grand-col">
          ${descuentoRow}
          ${ajusteRow}
          <div class="final-line grand-total">
            <span>Total Neto Propuesta:</span>
            <span>$ ${activeTotals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

spacesHtml += consolidatedCardHtml;

// 7. Compile dynamic client and obra columns (removing blank fields completely)
let clientHtml = "";
const clientDoc = client ? (client.documento || "") : "";
const clientTel = client ? (client.telefono || "") : "";
const clientMail = client ? (client.email || "") : "";

if (clientName || clientDoc || clientTel || clientMail) {
  clientHtml = `
    <div class="info-block">
      <h4>Información del Cliente</h4>
      ${clientName ? `<p><strong>Cliente:</strong> ${clientName}</p>` : ''}
      ${clientDoc ? `<p><strong>Documento:</strong> ${clientDoc}</p>` : ''}
      ${clientTel ? `<p><strong>Teléfono:</strong> ${clientTel}</p>` : ''}
      ${clientMail ? `<p><strong>Correo:</strong> ${clientMail}</p>` : ''}
    </div>
  `;
}

let obraHtml = "";
const obraAddress = activeCotizacion.direccion_obra || "";
const obraDays = activeCotizacion.dias_entrega_estimados ? activeCotizacion.dias_entrega_estimados + " días hábiles" : "";
const obraGarantia = activeCotizacion.garantia_anios ? activeCotizacion.garantia_anios + " años" : "";

if (projectName || obraAddress || obraDays || obraGarantia) {
  obraHtml = `
    <div class="info-block">
      <h4>Condiciones de la Obra</h4>
      ${projectName ? `<p><strong>Proyecto:</strong> ${projectName}</p>` : ''}
      ${obraAddress ? `<p><strong>Dirección:</strong> ${obraAddress}</p>` : ''}
      ${obraDays ? `<p><strong>Días de Entrega:</strong> ${obraDays}</p>` : ''}
      ${obraGarantia ? `<p><strong>Garantía Estructura:</strong> ${obraGarantia}</p>` : ''}
    </div>
  `;
}

let infoGridHtml = "";
if (clientHtml && obraHtml) {
  infoGridHtml = clientHtml + obraHtml;
} else if (clientHtml || obraHtml) {
  infoGridHtml = (clientHtml || obraHtml).replace('class="info-block"', 'class="info-block full-width"');
}

const fullHtml = template
  .replace('{{pdfTitle}}', pdfTitle)
  .replace('{{proposalNumber}}', '2026-A' + activeCotizacion.id.substring(0, 4).toUpperCase())
  .replace('{{proposalDate}}', new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }))
  .replace('{{infoGridHtml}}', infoGridHtml)
  .replace('{{optionsHtml}}', optionsHtml)
  .replace('{{activeVariantName}}', activeVariantName.toUpperCase())
  .replace('{{activeVariantName}}', activeVariantName.toUpperCase())
  .replace('{{spacesHtml}}', spacesHtml);

const snapshot = {
  cotizacion_id: activeCotizacion.id,
  fecha_exportacion: new Date().toISOString(),
  variant_name: activeVariantName,
  totals: activeTotals,
  tarifas: {
    dev: RATE_DEV,
    assembly: RATE_ASSEMBLY,
    install: RATE_INSTALL
  },
  costos: {
    costos_operativos: Number(activeCotizacion.costos_operativos || 0),
    imprevistos_instalacion: Number(activeCotizacion.imprevistos_instalacion || 0),
    descuento_comercial: Number(activeCotizacion.descuento_comercial || 0),
    ajuste_arbitrario: Number(activeCotizacion.ajuste_arbitrario || 0)
  },
  cliente: client ? {
    id: client.id,
    nombre: client.nombre || "",
    documento: client.documento || "",
    telefono: client.telefono || "",
    email: client.email || ""
  } : {},
  proyecto: {
    nombre_proyecto: projectName,
    direccion_obra: obraAddress,
    dias_entrega_estimados: activeCotizacion.dias_entrega_estimados || "",
    garantia_anios: activeCotizacion.garantia_anios || ""
  },
  espacios: activeSpacesList
};

await api.saveItem('cotizaciones_snapshot', {
  data: {
    cotizacion_id: activeCotizacion.id,
    fecha_exportacion: snapshot.fecha_exportacion,
    variant_name: activeVariantName,
    total_neto: activeTotals.grandTotal,
    detalle_json: JSON.stringify(snapshot),
    html_pdf: fullHtml
  }
});

api.dispatchEvent("print_pdf", { html: fullHtml });
api.notify.success("¡Propuesta Comercial exportada exitosamente a PDF!");