const ALERT_EMAILS = [
  "yovani.lopez@uabc.edu.mx",
  "carloscaballro548@gmail.com",
];

const HEADERS = [
  "Folio",
  "Fecha y hora",
  "Nombre",
  "Empresa",
  "Tipo de entrega",
  "Lugar de recogida",
  "Referencia o lugar de entrega",
  "Hora deseada",
  "Método de pago",
  "Teléfono",
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

    const normalizedOrder = normalizeOrder(order);
    sheet.appendRow([
      normalizedOrder.folio,
      normalizedOrder.fechaHora,
      normalizedOrder.nombre,
      normalizedOrder.empresa,
      normalizedOrder.tipoEntrega,
      normalizedOrder.lugarRecogida,
      normalizedOrder.referenciaEntrega,
      normalizedOrder.horaDeseada,
      normalizedOrder.metodoPago,
      normalizedOrder.telefono,
      normalizedOrder.notas,
      normalizedOrder.pedidoCompleto,
      normalizedOrder.subtotal,
      normalizedOrder.descuentoCcsiAplicado,
      normalizedOrder.montoDescuentoCcsi,
      normalizedOrder.totalFinal,
      normalizedOrder.avisoGafete,
      normalizedOrder.estado,
    ]);

    let emailAlertSent = true;
    try {
      sendOrderEmailAlert(normalizedOrder);
    } catch (emailError) {
      emailAlertSent = false;
      Logger.log("Error enviando alerta por correo: " + emailError.message);
    }

    return jsonResponse({
      success: true,
      ok: true,
      saved: true,
      emailAlertSent: emailAlertSent,
      folio: normalizedOrder.folio,
    });
  } catch (error) {
    Logger.log("Error guardando pedido: " + error.message);
    return jsonResponse({
      success: false,
      ok: false,
      saved: false,
      emailAlertSent: false,
      message: error.message,
    });
  }
}

function doGet() {
  return jsonResponse({
    success: true,
    ok: true,
    message: "Cenaduría La Tía pedidos endpoint activo.",
  });
}

function normalizeOrder(order) {
  return {
    folio: order.folio || "",
    fechaHora: order.fechaHora || order.createdAt || new Date().toISOString(),
    nombre: order.nombre || order.customerName || "",
    empresa: order.empresa || order.company || "",
    tipoEntrega: order.tipoEntrega || order.deliveryType || "",
    lugarRecogida: order.lugarRecogida || order.pickupPlace || "",
    referenciaEntrega: order.referenciaEntrega || order.deliveryReference || order.location || "",
    horaDeseada: order.horaDeseada || order.desiredTime || "",
    metodoPago: order.metodoPago || order.paymentMethod || "",
    telefono: order.telefono || order.phone || "",
    notas: order.notas || order.notes || "",
    pedidoCompleto: order.pedidoCompleto || order.itemsSummary || buildItemsSummary(order.items || []),
    subtotal: order.subtotal || 0,
    descuentoCcsiAplicado:
      order.descuentoCcsiAplicadoTexto ||
      order.ccsiDiscountAppliedText ||
      (order.descuentoCcsiAplicado || order.ccsiDiscountApplied ? "Sí" : "No"),
    montoDescuentoCcsi: order.montoDescuentoCcsi || order.discountAmount || 0,
    totalFinal: order.totalFinal || order.total || 0,
    avisoGafete: order.avisoGafete || order.badgeWarning || "",
    estado: order.estado || order.status || "Nuevo",
  };
}

function sendOrderEmailAlert(order) {
  const subject = "Nuevo pedido web " + order.folio + " - Cenaduría La Tía";
  const ccsiWarning =
    order.descuentoCcsiAplicado === "Sí"
      ? "\nIMPORTANTE: Validar gafete CCSI al momento de pagar. Si no presenta gafete, se cobra precio normal.\n"
      : "";
  const body = [
    "Nuevo pedido web recibido.",
    "",
    "Folio: " + order.folio,
    "Fecha y hora: " + order.fechaHora,
    "Nombre del cliente: " + order.nombre,
    "Empresa o lugar de trabajo: " + order.empresa,
    "Tipo de entrega: " + order.tipoEntrega,
    order.lugarRecogida ? "Lugar de recogida: " + order.lugarRecogida : "",
    order.referenciaEntrega ? "Referencia o lugar de entrega: " + order.referenciaEntrega : "",
    "Hora deseada: " + order.horaDeseada,
    "Método de pago: " + order.metodoPago,
    order.telefono ? "Teléfono: " + order.telefono : "",
    order.notas ? "Notas adicionales: " + order.notas : "",
    "",
    "Pedido completo:",
    order.pedidoCompleto,
    "",
    "Subtotal: $" + order.subtotal,
    "Descuento CCSI aplicado: " + order.descuentoCcsiAplicado,
    "Monto descuento CCSI: $" + order.montoDescuentoCcsi,
    "Total final: $" + order.totalFinal,
    ccsiWarning,
  ]
    .filter(function (line) {
      return line !== "";
    })
    .join("\n");

  MailApp.sendEmail({
    to: ALERT_EMAILS.join(","),
    subject: subject,
    body: body,
  });
}

function ensureHeaders(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), HEADERS.length);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const hasHeaders = currentHeaders.some(Boolean);
  const headersMatch =
    currentHeaders.length === HEADERS.length &&
    HEADERS.every(function (header, index) {
      return currentHeaders[index] === header;
    });

  if (!hasHeaders || !headersMatch) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    if (lastColumn > HEADERS.length) {
      sheet.getRange(1, HEADERS.length + 1, 1, lastColumn - HEADERS.length).clearContent();
    }
  }

  sheet.setFrozenRows(1);
}

function buildItemsSummary(items) {
  return items
    .map(function (item) {
      return item.quantity + " x " + item.name + " ($" + item.unitPrice + " c/u) = $" + item.subtotal;
    })
    .join("\n");
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
