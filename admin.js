const ADMIN_PASSWORD = "latia2026";
const ORDER_STORAGE_KEY = "cenaduriaLaTiaOrdersDemo";
const ORDER_STATUSES = ["Nuevo", "Aceptado", "Preparando", "Listo", "Entregado", "Cancelado"];

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const loginSection = document.querySelector("#admin-login");
const panelSection = document.querySelector("#admin-panel");
const loginForm = document.querySelector("#admin-login-form");
const loginError = document.querySelector("#admin-login-error");
const ordersList = document.querySelector("#orders-list");
const adminEmpty = document.querySelector("#admin-empty");
const refreshOrders = document.querySelector("#refresh-orders");

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (document.querySelector("#admin-password").value === ADMIN_PASSWORD) {
    loginSection.hidden = true;
    panelSection.hidden = false;
    loadOrders();
    return;
  }

  loginError.hidden = false;
});

refreshOrders?.addEventListener("click", loadOrders);

ordersList?.addEventListener("click", (event) => {
  const statusButton = event.target.closest("[data-status]");
  const printButton = event.target.closest("[data-print]");

  if (statusButton) {
    updateOrderStatus(statusButton.dataset.folio, statusButton.dataset.status);
  }

  if (printButton) {
    printOrder(printButton.dataset.print);
  }
});

function loadOrders() {
  // TODO: Replace this demo loader with a real data source:
  // - Google Apps Script endpoint that reads Google Sheets rows.
  // - Firebase / Supabase select.
  // - Backend API endpoint for the restaurant panel.
  const orders = readDemoOrders();
  renderOrders(orders);
  return orders;
}

function updateOrderStatus(folio, status) {
  // TODO: Replace this demo update with a backend status update.
  const orders = readDemoOrders();
  const order = orders.find((item) => item.folio === folio);

  if (order) {
    order.status = status;
    writeDemoOrders(orders);
  }

  renderOrders(orders);
}

function printOrder(folio) {
  const order = readDemoOrders().find((item) => item.folio === folio);

  if (!order) {
    return;
  }

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Pedido ${escapeHtml(order.folio)}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1f1f1f; padding: 24px; }
        h1, h2 { margin: 0 0 12px; }
        .row { display: flex; justify-content: space-between; gap: 20px; margin: 8px 0; }
        .box { border: 1px solid #ddd; padding: 12px; margin: 12px 0; }
        .warning { font-weight: 700; color: #8f151d; }
      </style>
    </head>
    <body>
      ${renderPrintableOrder(order)}
      <script>window.print(); window.close();<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function readDemoOrders() {
  try {
    return JSON.parse(window.localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeDemoOrders(orders) {
  try {
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Demo-only storage may be unavailable in locked-down browsers.
  }
}

function renderOrders(orders) {
  ordersList.innerHTML = "";
  adminEmpty.hidden = orders.length > 0;

  orders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "admin-order-card order-panel";
    card.innerHTML = renderOrderCard(order);
    ordersList.appendChild(card);
  });
}

function renderOrderCard(order) {
  const itemsHtml = order.items
    .map((item) => `<li>${item.quantity} x ${escapeHtml(item.name)} - ${currencyFormatter.format(item.subtotal)}</li>`)
    .join("");
  const statusButtons = ORDER_STATUSES.map(
    (status) => `
      <button class="status-btn ${order.status === status ? "active" : ""}" type="button" data-folio="${escapeHtml(order.folio)}" data-status="${status}">
        ${status}
      </button>
    `
  ).join("");

  return `
    <div class="admin-order-top">
      <div>
        <p class="eyebrow">${escapeHtml(order.status || "Nuevo")}</p>
        <h2>${escapeHtml(order.folio)}</h2>
        <p>${formatDate(order.createdAt)}</p>
      </div>
      <button class="btn btn-secondary" type="button" data-print="${escapeHtml(order.folio)}">Imprimir pedido</button>
    </div>
    <div class="admin-order-grid">
      <div><span>Nombre</span><strong>${escapeHtml(order.customerName)}</strong></div>
      <div><span>Empresa</span><strong>${escapeHtml(order.company)}</strong></div>
      <div><span>Área</span><strong>${escapeHtml(order.area)}</strong></div>
      <div><span>Tipo de entrega</span><strong>${escapeHtml(order.deliveryType)}</strong></div>
      <div><span>Hora deseada</span><strong>${escapeHtml(order.desiredTime)}</strong></div>
      <div><span>Método de pago</span><strong>${escapeHtml(order.paymentMethod)}</strong></div>
      <div><span>Ubicación</span><strong>${escapeHtml(order.location)}</strong></div>
      <div><span>Contacto</span><strong>${escapeHtml(formatContact(order))}</strong></div>
    </div>
    <div class="admin-order-summary">
      <h3>Resumen del pedido</h3>
      <ul>${itemsHtml}</ul>
      <div class="row"><span>Subtotal</span><strong>${currencyFormatter.format(order.subtotal)}</strong></div>
      ${
        order.ccsiDiscountApplied
          ? `<div class="row"><span>Descuento CCSI</span><strong>-${currencyFormatter.format(order.discountAmount)}</strong></div>`
          : ""
      }
      <div class="row total-row"><span>Total final</span><strong>${currencyFormatter.format(order.total)}</strong></div>
      ${order.notes ? `<p><strong>Notas:</strong> ${escapeHtml(order.notes)}</p>` : ""}
      ${
        order.ccsiDiscountApplied
          ? `<p class="ccsi-warning">Validar gafete CCSI al momento de pagar.</p>`
          : ""
      }
    </div>
    <div class="status-actions">${statusButtons}</div>
  `;
}

function renderPrintableOrder(order) {
  const itemsHtml = order.items
    .map(
      (item) => `
        <div class="row">
          <span>${item.quantity} x ${escapeHtml(item.name)} (${currencyFormatter.format(item.unitPrice)} c/u)</span>
          <strong>${currencyFormatter.format(item.subtotal)}</strong>
        </div>
      `
    )
    .join("");

  return `
    <h1>Cenaduría La Tía</h1>
    <h2>Pedido ${escapeHtml(order.folio)}</h2>
    <div class="box">
      <p><strong>Estado:</strong> ${escapeHtml(order.status)}</p>
      <p><strong>Fecha:</strong> ${formatDate(order.createdAt)}</p>
      <p><strong>Nombre:</strong> ${escapeHtml(order.customerName)}</p>
      <p><strong>Empresa:</strong> ${escapeHtml(order.company)}</p>
      <p><strong>Área:</strong> ${escapeHtml(order.area)}</p>
      <p><strong>Entrega:</strong> ${escapeHtml(order.deliveryType)}</p>
      <p><strong>Ubicación:</strong> ${escapeHtml(order.location)}</p>
      <p><strong>Hora deseada:</strong> ${escapeHtml(order.desiredTime)}</p>
      <p><strong>Pago:</strong> ${escapeHtml(order.paymentMethod)}</p>
    </div>
    <div class="box">
      <h2>Resumen</h2>
      ${itemsHtml}
      <div class="row"><span>Subtotal</span><strong>${currencyFormatter.format(order.subtotal)}</strong></div>
      ${
        order.ccsiDiscountApplied
          ? `<div class="row"><span>Descuento CCSI 15%</span><strong>-${currencyFormatter.format(order.discountAmount)}</strong></div>`
          : ""
      }
      <div class="row"><span>Total final</span><strong>${currencyFormatter.format(order.total)}</strong></div>
    </div>
    ${order.notes ? `<p><strong>Notas:</strong> ${escapeHtml(order.notes)}</p>` : ""}
    ${order.ccsiDiscountApplied ? `<p class="warning">Validar gafete CCSI al momento de pagar.</p>` : ""}
  `;
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatContact(order) {
  const contact = [order.phone, order.email].filter(Boolean);
  return contact.length > 0 ? contact.join(" / ") : "No especificado";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.loadOrders = loadOrders;
window.updateOrderStatus = updateOrderStatus;
window.printOrder = printOrder;
