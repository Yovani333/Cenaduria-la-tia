const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const tabButtons = document.querySelectorAll(".tab-button");
const menuLists = document.querySelectorAll(".menu-list");
const year = document.querySelector("#year");

const cart = new Map();
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxARWe2hxE4IiIVE_-75gMilPj6TdAQ0773_7-WnOVgE00yQbnj2g0kj1WqJFCwAtRj/exec";
const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const cartEmpty = document.querySelector("#cart-empty");
const cartItems = document.querySelector("#cart-items");
const cartTotals = document.querySelector("#cart-totals");
const cartSubtotal = document.querySelector("#cart-subtotal");
const cartDiscountRow = document.querySelector("#cart-discount-row");
const cartDiscount = document.querySelector("#cart-discount");
const cartTotal = document.querySelector("#cart-total");
const orderForm = document.querySelector("#order-form");
const orderError = document.querySelector("#order-error");
const deliveryType = document.querySelector("#delivery-type");
const pickupFields = document.querySelector("#pickup-fields");
const deliveryFields = document.querySelector("#delivery-fields");
const pickupPlace = document.querySelector("#pickup-place");
const deliveryAddress = document.querySelector("#delivery-address");
const deliveryReference = document.querySelector("#delivery-reference");
const ccsiDiscount = document.querySelector("#ccsi-discount");
const orderConfirmation = document.querySelector("#order-confirmation");
let folioCounterFallback = 0;

function isCcsiActive() {
  return Boolean(ccsiDiscount?.checked);
}

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.category;

    tabButtons.forEach((item) => item.classList.remove("active"));
    menuLists.forEach((list) => {
      list.classList.toggle("active", list.dataset.menu === category);
    });

    button.classList.add("active");
  });
});

function getProductFromCard(card) {
  const name = card.querySelector("h3")?.textContent?.trim();
  const priceText = card.querySelector(".menu-card-content strong")?.textContent || "";
  const price = Number(priceText.replace(/[^0-9.]/g, ""));
  const category = card.querySelector(".menu-category")?.textContent?.trim() || "Menu";

  if (!name || Number.isNaN(price)) {
    return null;
  }

  return {
    id: `${category}-${name}`.toLowerCase().replace(/\s+/g, "-"),
    name,
    price,
    category,
  };
}

function setupMenuOrderButtons() {
  document.querySelectorAll("#menu .menu-card").forEach((card) => {
    const content = card.querySelector(".menu-card-content");
    const product = getProductFromCard(card);

    if (!content || !product || content.querySelector(".menu-add-btn")) {
      return;
    }

    const button = document.createElement("button");
    button.className = "btn btn-primary menu-add-btn";
    button.type = "button";
    button.textContent = "Agregar al pedido";
    button.addEventListener("click", () => addToCart(product));
    content.appendChild(button);
  });
}

function addToCart(product) {
  const current = cart.get(product.id);

  if (current) {
    current.quantity += 1;
  } else {
    cart.set(product.id, { ...product, quantity: 1 });
  }

  renderCart();
  document.querySelector("#pedido-web")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function changeQuantity(id, change) {
  const item = cart.get(id);

  if (!item) {
    return;
  }

  item.quantity += change;

  if (item.quantity <= 0) {
    cart.delete(id);
  }

  renderCart();
}

function removeItem(id) {
  cart.delete(id);
  renderCart();
}

function getTotals() {
  const subtotal = Array.from(cart.values()).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = ccsiDiscount?.checked ? subtotal * 0.15 : 0;
  const total = subtotal - discount;

  return { subtotal, discount, total };
}

function renderCart() {
  if (!cartItems || !cartEmpty || !cartTotals) {
    return;
  }

  cartItems.innerHTML = "";
  const items = Array.from(cart.values());
  const hasItems = items.length > 0;

  cartEmpty.hidden = hasItems;
  cartTotals.hidden = !hasItems;

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item-main">
        <div>
          <div class="cart-item-title">${escapeHtml(item.name)}</div>
          <div class="cart-item-price">${currency.format(item.price)} c/u</div>
        </div>
        <strong>${currency.format(item.price * item.quantity)}</strong>
      </div>
      <div class="cart-controls">
        <div class="qty-controls" aria-label="Cantidad de ${escapeHtml(item.name)}">
          <button class="qty-btn" type="button" data-action="decrease" data-id="${escapeHtml(item.id)}">-</button>
          <strong>${item.quantity}</strong>
          <button class="qty-btn" type="button" data-action="increase" data-id="${escapeHtml(item.id)}">+</button>
        </div>
        <button class="remove-item" type="button" data-action="remove" data-id="${escapeHtml(item.id)}">Eliminar</button>
      </div>
    `;
    cartItems.appendChild(row);
  });

  const { subtotal, discount, total } = getTotals();
  cartSubtotal.textContent = currency.format(subtotal);
  cartDiscount.textContent = `-${currency.format(discount)}`;
  cartTotal.textContent = currency.format(total);
  cartDiscountRow.hidden = discount <= 0;
}

cartItems?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "increase") {
    changeQuantity(id, 1);
  }

  if (action === "decrease") {
    changeQuantity(id, -1);
  }

  if (action === "remove") {
    removeItem(id);
  }
});

function updateDeliveryFields() {
  const type = deliveryType?.value;
  const isPickup = type === "Voy a recoger";
  const isDelivery = type === "Quiero recibir mi pedido";
  const ccsiActive = isCcsiActive();
  const customerCompany = document.querySelector("#customer-company");
  const customerArea = document.querySelector("#customer-area");

  if (pickupFields) {
    pickupFields.hidden = !isPickup;
  }

  if (deliveryFields) {
    deliveryFields.hidden = !isDelivery;
  }

  if (pickupPlace) {
    pickupPlace.required = isPickup && !ccsiActive;
    if (!isPickup) pickupPlace.value = "";
  }

  if (deliveryAddress && deliveryReference) {
    deliveryAddress.required = isDelivery && !ccsiActive;
    deliveryReference.required = isDelivery && !ccsiActive;
    if (!isDelivery) {
      deliveryAddress.value = "";
      deliveryReference.value = "";
    }
  }

  if (customerCompany && customerArea) {
    customerCompany.required = !ccsiActive;
    customerArea.required = !ccsiActive;
  }
}

deliveryType?.addEventListener("change", updateDeliveryFields);
ccsiDiscount?.addEventListener("change", () => {
  updateDeliveryFields();
  renderCart();
});

function validateOrder() {
  const errors = [];
  const requiredFields = [
    ["#customer-name", "Nombre completo"],
    ["#delivery-type", "Tipo de entrega"],
    ["#desired-time", "Hora deseada"],
    ["#payment-method", "Método de pago"],
  ];
  const ccsiActive = isCcsiActive();

  if (!ccsiActive) {
    requiredFields.push(
      ["#customer-company", "Empresa o lugar de trabajo"],
      ["#customer-area", "Área o departamento"]
    );
  }

  if (cart.size === 0) {
    errors.push("Agrega al menos un producto al carrito.");
  }

  requiredFields.forEach(([selector, label]) => {
    const field = document.querySelector(selector);
    if (!field?.value.trim()) {
      errors.push(`Completa: ${label}.`);
    }
  });

  if (!ccsiActive && deliveryType?.value === "Voy a recoger" && !pickupPlace?.value.trim()) {
    errors.push("Completa: Lugar donde piensa recoger.");
  }

  if (!ccsiActive && deliveryType?.value === "Quiero recibir mi pedido") {
    if (!deliveryAddress?.value.trim()) {
      errors.push("Completa: Dirección o ubicación de entrega.");
    }
    if (!deliveryReference?.value.trim()) {
      errors.push("Completa: Referencia de entrega.");
    }
  }

  return errors;
}

function showError(errors) {
  if (!orderError) {
    return;
  }

  orderError.innerHTML = errors.map((error) => `<div>${escapeHtml(error)}</div>`).join("");
  orderError.hidden = false;
}

function clearError() {
  if (orderError) {
    orderError.hidden = true;
    orderError.innerHTML = "";
  }
}

function getNextFolio() {
  const key = "cenaduriaLaTiaFolio";
  let current = folioCounterFallback + 1;

  try {
    const storage = window.localStorage;
    current = Number(storage.getItem(key) || "0") + 1;
    storage.setItem(key, String(current));
  } catch {
    folioCounterFallback = current;
  }

  return `LT-${String(current).padStart(4, "0")}`;
}

function getFormData() {
  const type = deliveryType.value;
  const deliveryLocationParts = [deliveryAddress.value.trim(), deliveryReference.value.trim()]
    .filter(Boolean)
    .map((value, index) => (index === 1 ? `Referencia: ${value}` : value));
  const location = type === "Voy a recoger" ? pickupPlace.value.trim() : deliveryLocationParts.join(" / ");

  return {
    name: document.querySelector("#customer-name").value.trim(),
    company: document.querySelector("#customer-company").value.trim() || "No especificado",
    area: document.querySelector("#customer-area").value.trim() || "No especificado",
    deliveryType: type,
    location: location.trim() || "No especificado",
    deliveryAddress: deliveryAddress.value.trim(),
    deliveryReference: deliveryReference.value.trim(),
    pickupPlace: pickupPlace.value.trim(),
    desiredTime: document.querySelector("#desired-time").value,
    paymentMethod: document.querySelector("#payment-method").value,
    phone: document.querySelector("#customer-phone").value.trim(),
    email: document.querySelector("#customer-email").value.trim(),
    notes: document.querySelector("#order-notes").value.trim(),
  };
}

function buildOrderData(folio, formData) {
  const { subtotal, discount, total } = getTotals();
  const items = Array.from(cart.values()).map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.price,
    subtotal: item.price * item.quantity,
  }));

  return {
    folio,
    createdAt: new Date().toISOString(),
    status: "Nuevo",
    customerName: formData.name,
    company: formData.company,
    area: formData.area,
    deliveryType: formData.deliveryType,
    location: formData.location,
    pickupPlace: formData.pickupPlace,
    deliveryAddress: formData.deliveryAddress,
    deliveryReference: formData.deliveryReference,
    desiredTime: formData.desiredTime,
    paymentMethod: formData.paymentMethod,
    phone: formData.phone,
    email: formData.email,
    notes: formData.notes,
    items,
    itemsSummary: items
      .map((item) => `${item.quantity} x ${item.name} (${currency.format(item.unitPrice)} c/u) = ${currency.format(item.subtotal)}`)
      .join("\n"),
    subtotal,
    ccsiDiscountApplied: discount > 0,
    ccsiDiscountAppliedText: discount > 0 ? "Sí" : "No",
    discountAmount: discount,
    total,
    badgeWarning:
      discount > 0
        ? "Validar gafete CCSI al momento de pagar."
        : "",
  };
}

async function sendOrderToGoogleSheets(orderData) {
  if (!isGoogleScriptConfigured()) {
    return { ok: false, mode: "demo-local", skipped: true };
  }

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(orderData),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "Google Apps Script no confirmó el pedido.");
  }

  return data;
}

async function submitOrder(orderData) {
  // TODO: For production, keep GOOGLE_SCRIPT_URL pointed to a Google Apps Script
  // Web App or replace sendOrderToGoogleSheets with Firebase, Supabase, or a
  // private backend endpoint owned by the restaurant.
  if (isGoogleScriptConfigured()) {
    const result = await sendOrderToGoogleSheets(orderData);
    saveOrderDemoBackup(orderData);
    return result;
  }

  saveOrderDemoBackup(orderData);
  return Promise.resolve({ ok: true, mode: "demo-local" });
}

function isGoogleScriptConfigured() {
  return GOOGLE_SCRIPT_URL && !GOOGLE_SCRIPT_URL.includes("PEGAR_AQUI_URL");
}

function saveOrderDemoBackup(orderData) {
  const key = "cenaduriaLaTiaOrdersDemo";
  try {
    const orders = JSON.parse(window.localStorage.getItem(key) || "[]");
    orders.unshift(orderData);
    window.localStorage.setItem(key, JSON.stringify(orders));
  } catch {
    console.warn("Pedido generado, pero no se pudo guardar en la cola demo local.");
  }
}

function renderConfirmation(orderData) {
  if (!orderConfirmation) {
    return;
  }

  const discountApplied = orderData.ccsiDiscountApplied;
  const itemsHtml = orderData.items
    .map(
      (item) => `
        <div class="confirmation-item">
          <span>${item.quantity} x ${escapeHtml(item.name)} (${currency.format(item.unitPrice)} c/u)</span>
          <strong>${currency.format(item.subtotal)}</strong>
        </div>
      `
    )
    .join("");

  orderConfirmation.innerHTML = `
    <div class="print-only"><h1>Cenaduría La Tía</h1></div>
    <h2>Pedido recibido correctamente</h2>
    <p class="confirmation-note">Guarda este folio para recoger o recibir tu pedido.</p>
    <div class="confirmation-grid">
      <div class="confirmation-field"><span>Folio del pedido</span><strong>${orderData.folio}</strong></div>
      <div class="confirmation-field"><span>Nombre del cliente</span><strong>${escapeHtml(orderData.customerName)}</strong></div>
      <div class="confirmation-field"><span>Empresa o lugar de trabajo</span><strong>${escapeHtml(orderData.company)}</strong></div>
      <div class="confirmation-field"><span>Área o departamento</span><strong>${escapeHtml(orderData.area)}</strong></div>
      <div class="confirmation-field"><span>Tipo de entrega</span><strong>${escapeHtml(orderData.deliveryType)}</strong></div>
      <div class="confirmation-field"><span>Hora deseada</span><strong>${escapeHtml(orderData.desiredTime)}</strong></div>
      <div class="confirmation-field"><span>Método de pago</span><strong>${escapeHtml(orderData.paymentMethod)}</strong></div>
      <div class="confirmation-field"><span>Lugar de recogida o dirección de entrega</span><strong>${escapeHtml(orderData.location)}</strong></div>
    </div>
    <h3>Resumen del pedido</h3>
    <div class="confirmation-items">${itemsHtml}</div>
    <div class="confirmation-total">
      <div><span>Subtotal</span><strong>${currency.format(orderData.subtotal)}</strong></div>
      ${
        discountApplied
          ? `<div><span>Descuento CCSI 15%</span><strong>-${currency.format(orderData.discountAmount)}</strong></div>`
          : ""
      }
      <div class="total-row"><span>Total final</span><strong>${currency.format(orderData.total)}</strong></div>
    </div>
    ${
      discountApplied
        ? `<p class="ccsi-warning">Descuento CCSI aplicado: 15%. Recuerda presentar tu gafete CCSI al momento de pagar para hacerlo válido.</p>`
        : ""
    }
    ${
      orderData.notes
        ? `<div class="confirmation-field"><span>Notas adicionales</span><strong>${escapeHtml(orderData.notes)}</strong></div>`
        : ""
    }
    <div class="confirmation-actions">
      <button class="btn btn-primary" type="button" id="print-order">Imprimir comprobante</button>
      <button class="btn btn-secondary" type="button" id="new-order">Hacer nuevo pedido</button>
    </div>
  `;

  orderConfirmation.hidden = false;
  orderConfirmation.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetOrder() {
  cart.clear();
  orderForm?.reset();
  updateDeliveryFields();
  clearError();
  renderCart();
  if (orderConfirmation) {
    orderConfirmation.hidden = true;
    orderConfirmation.innerHTML = "";
  }
}

orderForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  updateDeliveryFields();

  const errors = validateOrder();
  if (errors.length > 0) {
    showError(errors);
    return;
  }

  const folio = getNextFolio();
  const formData = getFormData();
  const orderData = buildOrderData(folio, formData);
  try {
    await submitOrder(orderData);
    renderConfirmation(orderData);
  } catch {
    showError(["No se pudo enviar el pedido al sistema. Intenta nuevamente o avisa al restaurante."]);
  }
});

orderConfirmation?.addEventListener("click", (event) => {
  if (event.target.closest("#print-order")) {
    window.print();
  }

  if (event.target.closest("#new-order")) {
    resetOrder();
    document.querySelector("#pedido-web")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

setupMenuOrderButtons();
updateDeliveryFields();
renderCart();

window.submitOrder = submitOrder;
window.sendOrderToGoogleSheets = sendOrderToGoogleSheets;
