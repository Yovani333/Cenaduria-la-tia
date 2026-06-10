const HEADERS = [
  "Folio",
  "Fecha y hora",
  "Nombre",
  "Empresa",
  "Área",
  "Tipo de entrega",
  "Lugar de recogida",
  "Dirección de entrega",
  "Referencia",
  "Hora deseada",
  "Método de pago",
  "Teléfono",
  "Correo",
  "Notas",
  "Pedido completo",
  "Subtotal",
  "Descuento CCSI aplicado",
  "Monto descuento",
  "Total final",
  "Aviso gafete",
  "Estado",
];

function doPost(e) {
  try {
    const order = JSON.parse(e.postData.contents || "{}");
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    ensureHeaders(sheet);

    sheet.appendRow([
      order.folio || "",
      order.createdAt || new Date().toISOString(),
      order.customerName || "",
      order.company || "",
      order.area || "",
      order.deliveryType || "",
      order.pickupPlace || "",
      order.deliveryAddress || "",
      order.deliveryReference || "",
      order.desiredTime || "",
      order.paymentMethod || "",
      order.phone || "",
      order.email || "",
      order.notes || "",
      order.itemsSummary || buildItemsSummary(order.items || []),
      order.subtotal || 0,
      order.ccsiDiscountAppliedText || (order.ccsiDiscountApplied ? "Sí" : "No"),
      order.discountAmount || 0,
      order.total || 0,
      order.badgeWarning || "",
      order.status || "Nuevo",
    ]);

    return jsonResponse({
      ok: true,
      folio: order.folio,
      status: order.status || "Nuevo",
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error.message,
    });
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    message: "Cenaduría La Tía pedidos endpoint activo.",
  });
}

function ensureHeaders(sheet) {
  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = currentHeaders.some(Boolean);

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function buildItemsSummary(items) {
  return items
    .map(function (item) {
      return item.quantity + " x " + item.name + " ($" + item.unitPrice + " c/u) = $" + item.subtotal;
    })
    .join("\n");
}

function jsonResponse(payload) {
  // Apps Script Web Apps accept simple POST requests from the site.
  // The frontend sends text/plain to avoid a CORS preflight request.
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
