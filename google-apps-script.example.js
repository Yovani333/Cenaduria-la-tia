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

const STATUS_OPTIONS = ["Nuevo", "Pendiente", "Completado", "Cancelado"];
const STATUS_COLUMN = HEADERS.indexOf("Estado") + 1;
const SUMMARY_START_COLUMN = HEADERS.length + 2;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Pedidos")
    .addItem("Ordenar y formatear hoja", "setupOrdersSheetManual")
    .addItem("Marcar pedido seleccionado como completado", "markSelectedOrderCompleted")
    .addToUi();
}

function onEdit(e) {
  if (!e || !e.range) {
    return;
  }

  const sheet = e.range.getSheet();
  const editedColumn = e.range.getColumn();

  if (editedColumn === STATUS_COLUMN) {
    updateOrderSummary(sheet);
  }
}

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

    setupOrdersSheet(sheet);

    let emailAlertSent = true;
    let emailAlertError = "";
    try {
      sendOrderEmailAlert(normalizedOrder);
    } catch (emailError) {
      emailAlertSent = false;
      emailAlertError = emailError.message;
      Logger.log("Error enviando alerta por correo: " + emailAlertError);
    }

    return jsonResponse({
      success: true,
      ok: true,
      saved: true,
      emailAlertSent: emailAlertSent,
      emailAlertError: emailAlertError,
      folio: normalizedOrder.folio,
    });
  } catch (error) {
    Logger.log("Error guardando pedido: " + error.message);
    return jsonResponse({
      success: false,
      ok: false,
      saved: false,
      emailAlertSent: false,
      emailAlertError: "",
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

function testOrderEmailAlert() {
  MailApp.sendEmail({
    to: ALERT_EMAILS.join(","),
    subject: "Prueba de alerta - Cenaduría La Tía",
    body: [
      "Esta es una prueba manual de alerta por correo.",
      "",
      "Si recibes este correo, MailApp ya tiene permisos para enviar alertas.",
      "Después de confirmar esto, haz un pedido web de prueba.",
    ].join("\n"),
  });
}

function setupOrdersSheetManual() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  ensureHeaders(sheet);
  setupOrdersSheet(sheet);
}

function markSelectedOrderCompleted() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveRange().getRow();

  if (row <= 1) {
    SpreadsheetApp.getUi().alert("Selecciona una fila de pedido, no el encabezado.");
    return;
  }

  sheet.getRange(row, STATUS_COLUMN).setValue("Completado");
  setupOrdersSheet(sheet);
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

function setupOrdersSheet(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const dataRange = sheet.getRange(1, 1, lastRow, HEADERS.length);
  const statusRange = sheet.getRange(2, STATUS_COLUMN, Math.max(sheet.getMaxRows() - 1, 1), 1);
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground("#8f151d")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  dataRange
    .setBorder(true, true, true, true, true, true, "#d8c3a5", SpreadsheetApp.BorderStyle.SOLID)
    .setVerticalAlignment("middle")
    .setWrap(true);

  sheet.getRange(2, 1, Math.max(lastRow - 1, 1), HEADERS.length)
    .setFontFamily("Arial")
    .setFontSize(10);

  statusRange.setDataValidation(statusRule);
  sheet.getRange(2, STATUS_COLUMN, Math.max(lastRow - 1, 1), 1)
    .setBackground("#fff2cc")
    .setFontWeight("bold");

  sheet.getRange(2, 13, Math.max(lastRow - 1, 1), 1).setNumberFormat("$#,##0");
  sheet.getRange(2, 15, Math.max(lastRow - 1, 1), 1).setNumberFormat("$#,##0");
  sheet.getRange(2, 16, Math.max(lastRow - 1, 1), 1).setNumberFormat("$#,##0");

  sheet.setColumnWidth(1, 90);
  sheet.setColumnWidth(2, 170);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 170);
  sheet.setColumnWidth(6, 150);
  sheet.setColumnWidth(7, 220);
  sheet.setColumnWidth(8, 110);
  sheet.setColumnWidth(9, 130);
  sheet.setColumnWidth(10, 120);
  sheet.setColumnWidth(11, 170);
  sheet.setColumnWidth(12, 320);
  sheet.setColumnWidth(13, 90);
  sheet.setColumnWidth(14, 170);
  sheet.setColumnWidth(15, 120);
  sheet.setColumnWidth(16, 100);
  sheet.setColumnWidth(17, 260);
  sheet.setColumnWidth(18, 120);

  sheet.setRowHeight(1, 34);
  if (lastRow > 1) {
    sheet.setRowHeights(2, lastRow - 1, 48);
  }

  if (!sheet.getFilter()) {
    dataRange.createFilter();
  }

  applyStatusConditionalFormatting(sheet);
  updateOrderSummary(sheet);
}

function applyStatusConditionalFormatting(sheet) {
  const maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  const fullRowsRange = sheet.getRange(2, 1, maxRows, HEADERS.length);
  const statusRange = sheet.getRange(2, STATUS_COLUMN, maxRows, 1);
  const statusColumnLetter = columnToLetter(STATUS_COLUMN);
  const existingRules = sheet.getConditionalFormatRules().filter(function (rule) {
    return !rule.getRanges().some(function (range) {
      return range.getColumn() === 1 && range.getNumColumns() === HEADERS.length;
    });
  });

  const completedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied("=$" + statusColumnLetter + '2="Completado"')
    .setBackground("#d9ead3")
    .setFontColor("#274e13")
    .setRanges([fullRowsRange])
    .build();

  const cancelledRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied("=$" + statusColumnLetter + '2="Cancelado"')
    .setBackground("#f4cccc")
    .setFontColor("#660000")
    .setRanges([fullRowsRange])
    .build();

  const pendingStatusRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Pendiente")
    .setBackground("#fce5cd")
    .setFontColor("#7f3f00")
    .setRanges([statusRange])
    .build();

  const newStatusRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Nuevo")
    .setBackground("#fff2cc")
    .setFontColor("#7f6000")
    .setRanges([statusRange])
    .build();

  sheet.setConditionalFormatRules(existingRules.concat([
    completedRule,
    cancelledRule,
    pendingStatusRule,
    newStatusRule,
  ]));
}

function columnToLetter(column) {
  let letter = "";
  let temp = column;

  while (temp > 0) {
    const remainder = (temp - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    temp = Math.floor((temp - remainder) / 26);
  }

  return letter;
}

function updateOrderSummary(sheet) {
  const startColumn = SUMMARY_START_COLUMN;
  const titleRange = sheet.getRange(1, startColumn, 1, 2);
  const summaryRange = sheet.getRange(2, startColumn, 3, 2);
  const counts = getOrderStatusCounts(sheet);

  titleRange.breakApart();
  titleRange
    .merge()
    .setValue("Resumen")
    .setBackground("#146b36")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sheet.getRange(2, startColumn).setValue("Pendientes");
  sheet.getRange(2, startColumn + 1).setValue(counts.pendientes);
  sheet.getRange(3, startColumn).setValue("Completados");
  sheet.getRange(3, startColumn + 1).setValue(counts.completados);
  sheet.getRange(4, startColumn).setValue("Cancelados");
  sheet.getRange(4, startColumn + 1).setValue(counts.cancelados);

  summaryRange
    .setBorder(true, true, true, true, true, true, "#d8c3a5", SpreadsheetApp.BorderStyle.SOLID)
    .setBackground("#fff6e6")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sheet.setColumnWidth(startColumn, 140);
  sheet.setColumnWidth(startColumn + 1, 120);
}

function getOrderStatusCounts(sheet) {
  const lastRow = sheet.getLastRow();
  const counts = {
    pendientes: 0,
    completados: 0,
    cancelados: 0,
  };

  if (lastRow <= 1) {
    return counts;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, STATUS_COLUMN).getValues();

  rows.forEach(function (row) {
    const folio = row[0];
    const status = row[STATUS_COLUMN - 1];

    if (!folio) {
      return;
    }

    if (status === "Completado") {
      counts.completados += 1;
      return;
    }

    if (status === "Cancelado") {
      counts.cancelados += 1;
      return;
    }

    counts.pendientes += 1;
  });

  return counts;
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
