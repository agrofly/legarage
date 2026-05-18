const STORAGE_KEY = "salesLandingDataV1";
const CATALOG_FILE = "catalogo.json";
const ADMIN_PASSWORD = "5841";
const ADMIN_SESSION_KEY = "legarageAdminAuth";
const GITHUB_REPO_KEY = "githubRepo";
const GITHUB_REPO_DEFAULT = "agrofly/legarage";

const defaultData = window.SALES_DATA;

const ACTION_KEYS = ["consultar", "reservar", "quiero", "comprar"];

// Defaults para labels de acciones (editables desde admin)
const DEFAULT_ACTION_LABELS = {
  consultar: "Consultar",
  reservar: "Reservar",
  quiero: "Ofertar",
  comprar: "Comprar",
};

// Defaults para plantillas WA. Soportan {producto} y {precio}.
const DEFAULT_WA_MESSAGES = {
  consultar: "Hola! Quiero consultar por {producto} a {precio}.",
  reservar: "Hola! Quiero reservar {producto} por {precio}.",
  quiero: "Hola! Lo quiero: {producto} por {precio}.",
  comprar: "Hola! Quiero comprar {producto} por {precio}.",
};

// Paleta de colores por defecto
const DEFAULT_THEME = {
  bg: "#f5f2e9",
  ink: "#121212",
  accent: "#ff6b2c",
  accentDark: "#d54f14",
  deep: "#1f3b38",
  card: "#fffdfa",
  line: "#d8d2c6",
  ok: "#1f9d74",
};

// Textos del hero/secciones
const DEFAULT_TEXTS = {
  tag: "ENVIO RAPIDO | PAGO SEGURO",
  heroTitle: "Ofertas que se agotan en horas",
  ctaText: "Ver catalogo",
  sectionTitle: "Destacados",
  sectionSubtitle: "Precios claros, detalles completos y compra directa por WhatsApp.",
};

// Labels de tarjetas y UI editables
const DEFAULT_LABELS = {
  before: "Antes",
  waSuffix: "por WhatsApp",
  active: "Oferta activa",
  sold: "Vendido",
  out: "Agotado",
  noImage: "Sin imagen",
  updatedPrefix: "Catalogo actualizado:",
  waFloat: "WhatsApp",
};

const DEFAULT_META_DESCRIPTION =
  "Promociones con stock limitado. Consulta detalles, precios y compra por WhatsApp en minutos.";

// Elementos del DOM
const heroTextEl = document.getElementById("heroText");
const updatedAtEl = document.getElementById("updatedAt");
const catalogTabsEl = document.getElementById("catalogTabs");
const productsGridEl = document.getElementById("productsGrid");
const mainCtaEl = document.getElementById("mainCta");
const footerTextEl = document.getElementById("footerText");
const waFloatEl = document.getElementById("waFloat");
const managerEl = document.getElementById("gestor");
const tagTextEl = document.getElementById("tagText");
const heroTitleEl = document.getElementById("heroTitle");
const sectionTitleEl = document.getElementById("sectionTitle");
const sectionSubtitleEl = document.getElementById("sectionSubtitle");
const adminLoginEl = document.getElementById("adminLogin");
const metaDescriptionEl = document.getElementById("metaDescription");

const isAdminView = new URLSearchParams(window.location.search).get("admin") === "1";

if (!isAdminView && managerEl) {
  managerEl.remove();
}

let state = normalizeData(structuredClone(defaultData));

// Imágenes del producto que se está editando (lista en memoria)
let currentProductImages = [];

// ============================================================
//  LOGIN ADMIN
// ============================================================
function isAdminAuthenticated() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "ok";
}

function showAdminLogin() {
  if (!adminLoginEl) return;
  adminLoginEl.hidden = false;
  document.body.classList.add("admin-locked");
  const input = document.getElementById("adminPassword");
  if (input) setTimeout(() => input.focus(), 50);
}

function hideAdminLogin() {
  if (!adminLoginEl) return;
  adminLoginEl.hidden = true;
  document.body.classList.remove("admin-locked");
}

function bindAdminLogin() {
  const form = document.getElementById("adminLoginForm");
  const input = document.getElementById("adminPassword");
  const error = document.getElementById("adminLoginError");
  if (!form || !input || !error) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "ok");
      error.textContent = "";
      hideAdminLogin();
      bindAdminEvents();
      render();
    } else {
      error.textContent = "Contraseña incorrecta.";
      input.value = "";
      input.focus();
    }
  });
}

// ============================================================
//  UTILIDADES
// ============================================================
function createCurrencyFormatters(currencyConfig = {}) {
  const locale = currencyConfig.locale || "es-AR";
  const code = currencyConfig.code || "ARS";
  const decimals = Number.isInteger(currencyConfig.decimals) ? currencyConfig.decimals : 0;

  return {
    currencyFormatter: new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }),
    numberFormatter: new Intl.NumberFormat(locale, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }),
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normalizeActionKey(action) {
  const safe = typeof action === "string" ? action.toLowerCase() : "";
  return ACTION_KEYS.includes(safe) ? safe : "consultar";
}

function getActionLabel(action) {
  const key = normalizeActionKey(action);
  return state.actionLabels?.[key] || DEFAULT_ACTION_LABELS[key];
}

function normalizeCatalog(catalog, fallbackId, fallbackName) {
  const id = slugify(catalog?.id || fallbackId || "catalogo") || "catalogo";
  const name = String(catalog?.name || fallbackName || "Catalogo").trim();
  const products = Array.isArray(catalog?.products)
    ? catalog.products.map(normalizeProduct)
    : [];
  return { id, name, products };
}

function normalizeProduct(product) {
  const p = { ...product };
  // Migración: si no tiene enabledActions, habilitar las 4 por compatibilidad
  if (!Array.isArray(p.enabledActions) || p.enabledActions.length === 0) {
    p.enabledActions = [...ACTION_KEYS];
  } else {
    p.enabledActions = p.enabledActions.filter((k) => ACTION_KEYS.includes(k));
    if (p.enabledActions.length === 0) p.enabledActions = [...ACTION_KEYS];
  }
  // actionLabels custom por producto (opcional)
  p.customActionLabels = p.customActionLabels && typeof p.customActionLabels === "object"
    ? p.customActionLabels
    : {};
  return p;
}

function normalizeTheme(raw) {
  const theme = { ...DEFAULT_THEME };
  if (raw && typeof raw === "object") {
    for (const key of Object.keys(DEFAULT_THEME)) {
      if (typeof raw[key] === "string" && /^#[0-9a-fA-F]{6}$/.test(raw[key])) {
        theme[key] = raw[key];
      }
    }
  }
  return theme;
}

function normalizeStringMap(raw, defaults) {
  const out = { ...defaults };
  if (raw && typeof raw === "object") {
    for (const key of Object.keys(defaults)) {
      if (typeof raw[key] === "string" && raw[key].length > 0) {
        out[key] = raw[key];
      }
    }
  }
  return out;
}

function normalizeData(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("El JSON debe ser un objeto.");
  }

  const normalized = {
    brand: raw.brand || "Tienda",
    currency: raw.currency || { locale: "es-AR", code: "ARS", decimals: 0, symbol: "$" },
    heroText: raw.heroText || "",
    texts: normalizeStringMap(raw.texts, DEFAULT_TEXTS),
    labels: normalizeStringMap(raw.labels, DEFAULT_LABELS),
    actionLabels: normalizeStringMap(raw.actionLabels, DEFAULT_ACTION_LABELS),
    waMessages: normalizeStringMap(raw.waMessages, DEFAULT_WA_MESSAGES),
    metaDescription: typeof raw.metaDescription === "string" && raw.metaDescription
      ? raw.metaDescription
      : DEFAULT_META_DESCRIPTION,
    theme: normalizeTheme(raw.theme),
    contact: {
      whatsapp: raw.contact?.whatsapp || "",
      footerMessage: raw.contact?.footerMessage || "",
    },
    catalogs: [],
    activeCatalogId: "",
  };

  if (Array.isArray(raw.catalogs) && raw.catalogs.length > 0) {
    normalized.catalogs = raw.catalogs.map((catalog, index) =>
      normalizeCatalog(catalog, `catalogo-${index + 1}`, `Catalogo ${index + 1}`)
    );
  } else if (Array.isArray(raw.products)) {
    normalized.catalogs = [
      normalizeCatalog({ id: "general", name: "General", products: raw.products }, "general", "General"),
    ];
  }

  if (normalized.catalogs.length === 0) {
    normalized.catalogs = [{ id: "general", name: "General", products: [] }];
  }

  const dedup = new Set();
  normalized.catalogs = normalized.catalogs.map((catalog) => {
    let id = catalog.id;
    let suffix = 2;
    while (dedup.has(id)) {
      id = `${catalog.id}-${suffix}`;
      suffix += 1;
    }
    dedup.add(id);
    return { ...catalog, id };
  });

  const requestedActiveId = raw.activeCatalogId;
  const activeExists = normalized.catalogs.some((c) => c.id === requestedActiveId);
  normalized.activeCatalogId = activeExists ? requestedActiveId : normalized.catalogs[0].id;

  return normalized;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function syncStateFromStorage(event) {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    state = normalizeData(JSON.parse(event.newValue));
    render();
  } catch (error) {
    console.warn("No se pudo sincronizar cambios:", error);
  }
}

function loadData(baseData) {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return normalizeData(structuredClone(baseData));
  try {
    return normalizeData(JSON.parse(saved));
  } catch (error) {
    console.error("No se pudo cargar:", error);
    return normalizeData(structuredClone(baseData));
  }
}

async function loadRemoteCatalog() {
  if (window.location.protocol === "file:") return null;
  try {
    const url = `${CATALOG_FILE}?v=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return normalizeData(await response.json());
  } catch (error) {
    console.warn("No se pudo cargar catalogo.json, usando fallback:", error);
    return null;
  }
}

function formatMoney(amount) {
  const value = Number(amount);
  const safeAmount = Number.isFinite(value) ? value : 0;
  const { currencyFormatter, numberFormatter } = createCurrencyFormatters(state.currency);
  if (state.currency?.symbol) {
    return `${state.currency.symbol}${numberFormatter.format(safeAmount)}`;
  }
  return currencyFormatter.format(safeAmount);
}

function getActiveCatalog() {
  return state.catalogs.find((c) => c.id === state.activeCatalogId) || state.catalogs[0];
}

function setActiveCatalog(catalogId) {
  if (state.catalogs.some((c) => c.id === catalogId)) {
    state.activeCatalogId = catalogId;
  }
}

function getProductActionLabel(product, action) {
  const key = normalizeActionKey(action);
  const custom = product?.customActionLabels?.[key];
  if (custom && custom.trim().length > 0) return custom;
  return getActionLabel(key);
}

function buildWhatsAppMessage(product, action) {
  const key = normalizeActionKey(action);
  const priceText = formatMoney(product.price);
  const template = state.waMessages?.[key] || DEFAULT_WA_MESSAGES[key];
  return template
    .replaceAll("{producto}", product.name)
    .replaceAll("{precio}", priceText);
}

function buildWhatsAppLink(product, action) {
  const message = encodeURIComponent(buildWhatsAppMessage(product, action));
  return `https://wa.me/${state.contact.whatsapp}?text=${message}`;
}

function createProductCard(product, index) {
  const details = (Array.isArray(product.details) ? product.details : [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const images = typeof product.image === "string" && product.image.trim().length > 0
    ? product.image.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const noImageLabel = state.labels?.noImage || DEFAULT_LABELS.noImage;
  const imageMarkup = images.length === 0
    ? `<div class="media-placeholder">${escapeHtml(noImageLabel)}</div>`
    : images.length === 1
      ? `<img class="product-image" src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name)}" loading="lazy" />`
      : `<div class="carousel" data-current="0">
          ${images.map((src, i) => `<img class="product-image carousel-slide${i === 0 ? " active" : ""}" src="${escapeHtml(src)}" alt="${escapeHtml(product.name)} ${i + 1}" loading="lazy" />`).join("")}
          <button class="carousel-btn carousel-prev" type="button" aria-label="Anterior">&#8249;</button>
          <button class="carousel-btn carousel-next" type="button" aria-label="Siguiente">&#8250;</button>
          <div class="carousel-dots">${images.map((_, i) => `<span class="carousel-dot${i === 0 ? " active" : ""}"></span>`).join("")}</div>
        </div>`;

  // Acciones habilitadas
  const enabled = (Array.isArray(product.enabledActions) && product.enabledActions.length > 0)
    ? product.enabledActions.filter((k) => ACTION_KEYS.includes(k))
    : [...ACTION_KEYS];

  let defaultAction = normalizeActionKey(product.defaultAction);
  if (!enabled.includes(defaultAction)) {
    defaultAction = enabled[0] || "consultar";
  }

  const actionChecks = enabled
    .map(
      (key) => `
      <label class="action-chip">
        <input
          type="radio"
          class="action-input"
          name="action-${index}"
          value="${key}"
          ${key === defaultAction ? "checked" : ""}
        />
        <span>${escapeHtml(getProductActionLabel(product, key))}</span>
      </label>
    `
    )
    .join("");

  const beforeLabel = state.labels?.before || DEFAULT_LABELS.before;
  const oldPrice =
    typeof product.oldPrice === "number"
      ? `<p class="old-price">${escapeHtml(beforeLabel)} ${formatMoney(product.oldPrice)}</p>`
      : "";

  const status = product.productStatus || (product.soldOut ? "vendido" : "activo");
  const isUnavailable = status === "vendido" || status === "agotado";

  const PILL_CONFIG = {
    activo: { text: state.labels?.active || DEFAULT_LABELS.active, css: "pill" },
    vendido: { text: state.labels?.sold || DEFAULT_LABELS.sold, css: "pill pill--sold" },
    agotado: { text: state.labels?.out || DEFAULT_LABELS.out, css: "pill pill--out" },
  };
  const pillCfg = PILL_CONFIG[status] || PILL_CONFIG.activo;
  const pill = `<p class="${pillCfg.css}">${escapeHtml(pillCfg.text)}</p>`;

  const waSuffix = state.labels?.waSuffix || DEFAULT_LABELS.waSuffix;
  const showActions = enabled.length > 0;

  const ctaMarkup = isUnavailable
    ? `<span class="card-cta card-cta--sold">${escapeHtml(pillCfg.text)}</span>`
    : showActions
      ? `<a class="card-cta" target="_blank" rel="noopener noreferrer" href="${buildWhatsAppLink(product, defaultAction)}">
          ${escapeHtml(getProductActionLabel(product, defaultAction))} ${escapeHtml(waSuffix)}
        </a>`
      : "";

  const actionsBlock = showActions
    ? `<div class="action-checks${isUnavailable ? " action-checks--disabled" : ""}" aria-label="Tipo de consulta">${actionChecks}</div>`
    : "";

  return `
    <article class="product-card${isUnavailable ? " product-card--sold" : ""}" data-product-index="${index}">
      <div class="product-media">${imageMarkup}</div>
      ${pill}
      <h3>${escapeHtml(product.name)}</h3>
      ${oldPrice}
      <p class="price">${formatMoney(product.price)}</p>
      <ul>${details}</ul>
      ${actionsBlock}
      ${ctaMarkup}
    </article>
  `;
}

function renderCatalogTabs() {
  const tabs = state.catalogs
    .map((catalog) => {
      const activeClass = catalog.id === state.activeCatalogId ? "catalog-tab active" : "catalog-tab";
      return `<button type="button" class="${activeClass}" data-catalog-id="${escapeHtml(catalog.id)}">${escapeHtml(catalog.name)}</button>`;
    })
    .join("");
  catalogTabsEl.innerHTML = tabs;
}

function renderCatalogSelect() {
  const el = document.getElementById("catalogSelect");
  if (!el) return;
  el.innerHTML = state.catalogs
    .map(
      (c) =>
        `<option value="${escapeHtml(c.id)}" ${c.id === state.activeCatalogId ? "selected" : ""}>${escapeHtml(c.name)}</option>`
    )
    .join("");
}

function renderAdminProductTools() {
  const editEl = document.getElementById("editProductSelect");
  const moveEl = document.getElementById("moveCatalogSelect");
  if (!editEl || !moveEl) return;

  const activeCatalog = getActiveCatalog();
  editEl.innerHTML = activeCatalog.products
    .map((p, i) => `<option value="${i}">${i + 1}. ${escapeHtml(p.name)}</option>`)
    .join("");
  if (activeCatalog.products.length === 0) {
    editEl.innerHTML = '<option value="">Sin productos</option>';
  }

  moveEl.innerHTML = state.catalogs
    .map(
      (c) =>
        `<option value="${escapeHtml(c.id)}" ${c.id === state.activeCatalogId ? "selected" : ""}>${escapeHtml(c.name)}</option>`
    )
    .join("");
}

// ============================================================
//  Render del config de acciones (checkboxes + rename) en el form
// ============================================================
function renderProductActionsConfig(product) {
  const wrap = document.getElementById("productActionsConfig");
  if (!wrap) return;

  const enabled = product?.enabledActions && product.enabledActions.length
    ? product.enabledActions
    : [...ACTION_KEYS];
  const customLabels = product?.customActionLabels || {};

  wrap.innerHTML = ACTION_KEYS.map((key) => {
    const isOn = enabled.includes(key);
    const defaultLabel = getActionLabel(key);
    const customLabel = customLabels[key] || "";
    return `
      <div class="action-config-item">
        <input type="checkbox" data-action-key="${key}" ${isOn ? "checked" : ""} />
        <span class="action-config-label">${escapeHtml(defaultLabel)}</span>
        <input type="text" data-action-rename="${key}" placeholder="(usar default)" value="${escapeHtml(customLabel)}" />
      </div>
    `;
  }).join("");

  // Refrescar el select de "Accion por defecto" mostrando los nombres actuales
  const defSel = document.getElementById("defaultAction");
  if (defSel) {
    const current = defSel.value || product?.defaultAction || "consultar";
    defSel.innerHTML = ACTION_KEYS.map((key) => {
      return `<option value="${key}" ${key === current ? "selected" : ""}>${escapeHtml(getActionLabel(key))}</option>`;
    }).join("");
  }
}

// ============================================================
//  Imágenes del producto (lista en memoria + render)
// ============================================================
function renderProductImagesList() {
  const wrap = document.getElementById("productImagesList");
  const imageInput = document.getElementById("image");
  if (!wrap) return;

  wrap.innerHTML = currentProductImages
    .map((item, i) => {
      const stateClass = item.status === "uploading" ? "is-uploading"
        : item.status === "error" ? "is-error" : "";
      // src: si tenemos blobUrl mostrar local, si no la url remota
      const src = item.blobUrl || item.path || "";
      return `
        <div class="product-image-item ${stateClass}" data-i="${i}">
          <img src="${escapeHtml(src)}" alt="imagen ${i + 1}" />
          <button type="button" class="remove-img" data-remove="${i}" aria-label="Quitar imagen">✕</button>
        </div>
      `;
    })
    .join("");

  // Sincronizar el input "URL(s) de imagen" con las rutas confirmadas
  const paths = currentProductImages
    .filter((it) => it.status === "done" && it.path)
    .map((it) => it.path);
  if (imageInput) {
    imageInput.value = paths.join(", ");
  }
}

function setProductImagesFromString(imageString) {
  const list = typeof imageString === "string" && imageString.trim().length > 0
    ? imageString.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  currentProductImages = list.map((path) => ({ path, status: "done" }));
  renderProductImagesList();
}

// ============================================================
//  Form de producto: recolectar y rellenar
// ============================================================
function collectProductFromForm() {
  const name = document.getElementById("name").value.trim();
  const price = Number(document.getElementById("price").value);
  const oldPriceValue = document.getElementById("oldPrice").value;
  const detailsRaw = document.getElementById("details").value.trim();
  const image = document.getElementById("image").value.trim();
  const defaultAction = normalizeActionKey(document.getElementById("defaultAction").value);
  const productStatus = document.getElementById("productStatus").value || "activo";

  if (!name || !detailsRaw || Number.isNaN(price)) {
    throw new Error("Completa nombre, precio y detalles.");
  }

  // Acciones habilitadas y renames
  const wrap = document.getElementById("productActionsConfig");
  const enabledActions = [];
  const customActionLabels = {};
  if (wrap) {
    wrap.querySelectorAll('input[type="checkbox"][data-action-key]').forEach((cb) => {
      const key = cb.dataset.actionKey;
      if (cb.checked) enabledActions.push(key);
    });
    wrap.querySelectorAll('input[type="text"][data-action-rename]').forEach((tx) => {
      const key = tx.dataset.actionRename;
      const v = tx.value.trim();
      if (v) customActionLabels[key] = v;
    });
  }

  if (enabledActions.length === 0) {
    throw new Error("Debes habilitar al menos un boton de accion.");
  }

  const details = detailsRaw.split("\n").map((s) => s.trim()).filter(Boolean);

  const finalDefault = enabledActions.includes(defaultAction)
    ? defaultAction
    : enabledActions[0];

  const product = {
    name,
    price,
    details,
    defaultAction: finalDefault,
    productStatus,
    enabledActions,
    customActionLabels,
  };

  if (oldPriceValue) product.oldPrice = Number(oldPriceValue);
  if (image) product.image = image;

  return product;
}

function fillFormWithProduct(product) {
  document.getElementById("name").value = product.name || "";
  document.getElementById("price").value = Number(product.price) || 0;
  document.getElementById("oldPrice").value =
    typeof product.oldPrice === "number" ? product.oldPrice : "";
  document.getElementById("details").value = Array.isArray(product.details)
    ? product.details.join("\n")
    : "";
  document.getElementById("image").value = product.image || "";
  document.getElementById("defaultAction").value = normalizeActionKey(product.defaultAction);
  document.getElementById("productStatus").value =
    product.productStatus || (product.soldOut ? "vendido" : "activo");

  renderProductActionsConfig(product);
  setProductImagesFromString(product.image || "");
}

function resetProductForm() {
  document.getElementById("addProductForm").reset();
  currentProductImages = [];
  renderProductImagesList();
  renderProductActionsConfig({ enabledActions: [...ACTION_KEYS] });
  const statusEl = document.getElementById("productImagesStatus");
  if (statusEl) statusEl.textContent = "";
}

// ============================================================
//  Apariencia: aplicar tema y textos al DOM
// ============================================================
function applyTheme() {
  const theme = normalizeTheme(state.theme);
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--ink", theme.ink);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-dark", theme.accentDark);
  root.style.setProperty("--deep", theme.deep);
  root.style.setProperty("--card", theme.card);
  root.style.setProperty("--line", theme.line);
  root.style.setProperty("--ok", theme.ok);
}

function applyTexts() {
  const texts = state.texts || DEFAULT_TEXTS;
  const labels = state.labels || DEFAULT_LABELS;
  if (tagTextEl) tagTextEl.textContent = texts.tag;
  if (heroTitleEl) heroTitleEl.textContent = texts.heroTitle;
  if (mainCtaEl) mainCtaEl.textContent = texts.ctaText;
  if (sectionTitleEl) sectionTitleEl.textContent = texts.sectionTitle;
  if (sectionSubtitleEl) sectionSubtitleEl.textContent = texts.sectionSubtitle;
  if (waFloatEl) waFloatEl.textContent = labels.waFloat;
  if (metaDescriptionEl) metaDescriptionEl.setAttribute("content", state.metaDescription || DEFAULT_META_DESCRIPTION);
}

function fillAppearancePanel() {
  if (!isAdminView || !isAdminAuthenticated()) return;
  const texts = state.texts || DEFAULT_TEXTS;
  const labels = state.labels || DEFAULT_LABELS;
  const actionLabels = state.actionLabels || DEFAULT_ACTION_LABELS;
  const waMessages = state.waMessages || DEFAULT_WA_MESSAGES;
  const theme = state.theme || DEFAULT_THEME;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  };

  // Encabezado
  setVal("brandInput", state.brand || "");
  setVal("tagInput", texts.tag);
  setVal("heroTitleInput", texts.heroTitle);
  setVal("ctaTextInput", texts.ctaText);
  setVal("heroTextInput", state.heroText || "");
  setVal("sectionTitleInput", texts.sectionTitle);
  setVal("sectionSubtitleInput", texts.sectionSubtitle);

  // Labels tarjetas
  setVal("labelBeforeInput", labels.before);
  setVal("labelWaSuffixInput", labels.waSuffix);
  setVal("labelActiveInput", labels.active);
  setVal("labelSoldInput", labels.sold);
  setVal("labelOutInput", labels.out);
  setVal("labelNoImageInput", labels.noImage);
  setVal("labelUpdatedPrefixInput", labels.updatedPrefix);
  setVal("labelWaFloatInput", labels.waFloat);

  // Actions
  setVal("actionConsultarInput", actionLabels.consultar);
  setVal("actionReservarInput", actionLabels.reservar);
  setVal("actionQuieroInput", actionLabels.quiero);
  setVal("actionComprarInput", actionLabels.comprar);

  // WA messages
  setVal("msgConsultarInput", waMessages.consultar);
  setVal("msgReservarInput", waMessages.reservar);
  setVal("msgQuieroInput", waMessages.quiero);
  setVal("msgComprarInput", waMessages.comprar);

  // Contacto / SEO
  setVal("whatsappInput", state.contact?.whatsapp || "");
  setVal("footerMessageInput", state.contact?.footerMessage || "");
  setVal("metaDescriptionInput", state.metaDescription || DEFAULT_META_DESCRIPTION);

  // Colores
  setVal("colorBg", theme.bg);
  setVal("colorInk", theme.ink);
  setVal("colorAccent", theme.accent);
  setVal("colorAccentDark", theme.accentDark);
  setVal("colorDeep", theme.deep);
  setVal("colorCard", theme.card);
  setVal("colorLine", theme.line);
  setVal("colorOk", theme.ok);
}

function render() {
  const activeCatalog = getActiveCatalog();
  document.title = `Ofertas Activas | ${state.brand}`;

  applyTheme();
  applyTexts();

  heroTextEl.textContent = state.heroText || "";
  footerTextEl.textContent = state.contact?.footerMessage || "";

  mainCtaEl.href = "#productos";
  waFloatEl.href = `https://wa.me/${state.contact.whatsapp}`;

  renderCatalogTabs();
  productsGridEl.innerHTML = activeCatalog.products
    .map((p, i) => createProductCard(p, i))
    .join("");

  if (isAdminView && isAdminAuthenticated()) {
    renderCatalogSelect();
    renderAdminProductTools();
    fillAppearancePanel();
    // Solo refrescar la config de acciones si el form está "vacío" (sin producto cargado)
    const nameEl = document.getElementById("name");
    if (nameEl && !nameEl.value) {
      renderProductActionsConfig({ enabledActions: [...ACTION_KEYS] });
    }
    const jsonInputEl = document.getElementById("jsonInput");
    if (jsonInputEl) jsonInputEl.value = JSON.stringify(state, null, 2);
  }

  const now = new Date();
  const updatedPrefix = state.labels?.updatedPrefix || DEFAULT_LABELS.updatedPrefix;
  updatedAtEl.textContent = `${updatedPrefix} ${now.toLocaleDateString("es-AR")} ${now.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function showMessage(text) {
  updatedAtEl.textContent = text;
}

function bindCommonEvents() {
  catalogTabsEl.addEventListener("click", (event) => {
    const button = event.target.closest(".catalog-tab");
    if (!(button instanceof HTMLButtonElement)) return;
    const catalogId = button.dataset.catalogId;
    if (!catalogId) return;
    setActiveCatalog(catalogId);
    render();
  });

  productsGridEl.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (!input.classList.contains("action-input")) return;
    const card = input.closest(".product-card");
    if (!card) return;
    const cardIndex = Number(card.dataset.productIndex);
    const product = getActiveCatalog().products[cardIndex];
    if (!product) return;
    const action = normalizeActionKey(input.value);
    const cta = card.querySelector(".card-cta");
    if (!(cta instanceof HTMLAnchorElement)) return;
    cta.href = buildWhatsAppLink(product, action);
    const waSuffix = state.labels?.waSuffix || DEFAULT_LABELS.waSuffix;
    cta.textContent = `${getProductActionLabel(product, action)} ${waSuffix}`;
  });

  productsGridEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".carousel-btn");
    if (!btn) return;
    const carousel = btn.closest(".carousel");
    if (!carousel) return;
    const slides = carousel.querySelectorAll(".carousel-slide");
    const dots = carousel.querySelectorAll(".carousel-dot");
    let current = Number(carousel.dataset.current) || 0;
    slides[current].classList.remove("active");
    dots[current].classList.remove("active");
    if (btn.classList.contains("carousel-next")) {
      current = (current + 1) % slides.length;
    } else {
      current = (current - 1 + slides.length) % slides.length;
    }
    slides[current].classList.add("active");
    dots[current].classList.add("active");
    carousel.dataset.current = current;
  });
}

// ============================================================
//  COMPRESIÓN Y SUBIDA DE IMÁGENES A GITHUB
// ============================================================
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_JPEG_QUALITY = 0.82;

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo decodificar la imagen."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  const img = await loadImageFromFile(file);
  let { width, height } = img;
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round(height * (MAX_IMAGE_DIMENSION / width));
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round(width * (MAX_IMAGE_DIMENSION / height));
      height = MAX_IMAGE_DIMENSION;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const mime = canvas.toDataURL("image/webp", 0.6).startsWith("data:image/webp")
    ? "image/webp"
    : "image/jpeg";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("No se pudo comprimir la imagen."));
        resolve({ blob, mime });
      },
      mime,
      IMAGE_JPEG_QUALITY
    );
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("No se pudo convertir a base64."));
    reader.readAsDataURL(blob);
  });
}

function buildImageFileName(originalName, mime) {
  const ext = mime === "image/webp" ? "webp" : "jpg";
  const base = slugify(originalName.replace(/\.[^.]+$/, "")) || "img";
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  return `${base}-${stamp}.${ext}`;
}

function getGithubRepo() {
  return (
    document.getElementById("githubRepo")?.value.trim() ||
    localStorage.getItem(GITHUB_REPO_KEY) ||
    GITHUB_REPO_DEFAULT
  );
}

async function uploadFileToGithub({ path, contentBase64, token, repo, message }) {
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

  let sha;
  try {
    const getRes = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" },
    });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }
  } catch (e) {
    /* ignorar */
  }

  const body = { message, content: contentBase64 };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${putRes.status}`);
  }
  return putRes.json();
}

// ============================================================
//  Subida de imágenes integrada al formulario de producto
// ============================================================
function bindProductImages() {
  const picker = document.getElementById("productImagePicker");
  const list = document.getElementById("productImagesList");
  const clearBtn = document.getElementById("clearProductImagesBtn");
  const statusEl = document.getElementById("productImagesStatus");
  if (!picker || !list) return;

  // Quitar imagen individual (delegación)
  list.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-remove]");
    if (!btn) return;
    const i = Number(btn.dataset.remove);
    if (Number.isNaN(i)) return;
    const item = currentProductImages[i];
    if (item?.blobUrl) URL.revokeObjectURL(item.blobUrl);
    currentProductImages.splice(i, 1);
    renderProductImagesList();
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      currentProductImages.forEach((it) => {
        if (it.blobUrl) URL.revokeObjectURL(it.blobUrl);
      });
      currentProductImages = [];
      renderProductImagesList();
      if (statusEl) statusEl.textContent = "";
    });
  }

  picker.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";  // permitir reseleccionar el mismo archivo
    if (!files.length) return;

    const token = localStorage.getItem("githubToken");
    const repo = getGithubRepo();
    if (!token) {
      if (statusEl) statusEl.textContent = "Guarda primero el token de GitHub (panel 3).";
      return;
    }

    // Preview inmediato como "uploading"
    const startIndex = currentProductImages.length;
    files.forEach((file) => {
      currentProductImages.push({
        blobUrl: URL.createObjectURL(file),
        status: "uploading",
        file,
      });
    });
    renderProductImagesList();
    if (statusEl) statusEl.textContent = `Subiendo ${files.length} imagen(es)...`;

    // Subir una por una
    for (let i = 0; i < files.length; i++) {
      const itemIdx = startIndex + i;
      const file = files[i];
      try {
        const { blob, mime } = await compressImage(file);
        const filename = buildImageFileName(file.name, mime);
        const path = `assets/images/${filename}`;
        const base64 = await blobToBase64(blob);

        await uploadFileToGithub({
          path,
          contentBase64: base64,
          token,
          repo,
          message: `subo ${filename} desde admin`,
        });

        const item = currentProductImages[itemIdx];
        if (item) {
          if (item.blobUrl) URL.revokeObjectURL(item.blobUrl);
          item.blobUrl = null;
          item.path = path;
          item.status = "done";
        }
        if (statusEl) {
          const kb = Math.round(blob.size / 1024);
          statusEl.textContent = `Subida ${i + 1}/${files.length} (${kb} KB) — ${filename}`;
        }
      } catch (error) {
        const item = currentProductImages[itemIdx];
        if (item) item.status = "error";
        if (statusEl) statusEl.textContent = `Error: ${error.message}`;
      }
      renderProductImagesList();
    }

    if (statusEl) statusEl.textContent = "Listo. Imagenes adjuntas al producto.";
  });
}

// ============================================================
//  Panel de apariencia (textos + colores)
// ============================================================
function bindAppearancePanel() {
  const applyBtn = document.getElementById("applyAppearanceBtn");
  const resetBtn = document.getElementById("resetAppearanceBtn");
  if (!applyBtn || !resetBtn) return;

  // Live preview colores
  const colorMap = {
    colorBg: "bg",
    colorInk: "ink",
    colorAccent: "accent",
    colorAccentDark: "accentDark",
    colorDeep: "deep",
    colorCard: "card",
    colorLine: "line",
    colorOk: "ok",
  };
  for (const [inputId, themeKey] of Object.entries(colorMap)) {
    const el = document.getElementById(inputId);
    if (!el) continue;
    el.addEventListener("input", () => {
      if (!state.theme) state.theme = { ...DEFAULT_THEME };
      state.theme[themeKey] = el.value;
      applyTheme();
    });
  }

  applyBtn.addEventListener("click", () => {
    const getVal = (id) => document.getElementById(id)?.value.trim() || "";
    const getValRaw = (id) => document.getElementById(id)?.value || "";

    state.brand = getVal("brandInput") || "Tienda";
    state.heroText = getValRaw("heroTextInput").trim();
    state.contact = state.contact || {};
    state.contact.whatsapp = getVal("whatsappInput");
    state.contact.footerMessage = getVal("footerMessageInput");
    state.metaDescription = getVal("metaDescriptionInput") || DEFAULT_META_DESCRIPTION;

    state.texts = {
      tag: getVal("tagInput") || DEFAULT_TEXTS.tag,
      heroTitle: getVal("heroTitleInput") || DEFAULT_TEXTS.heroTitle,
      ctaText: getVal("ctaTextInput") || DEFAULT_TEXTS.ctaText,
      sectionTitle: getVal("sectionTitleInput") || DEFAULT_TEXTS.sectionTitle,
      sectionSubtitle: getVal("sectionSubtitleInput") || DEFAULT_TEXTS.sectionSubtitle,
    };

    state.labels = {
      before: getVal("labelBeforeInput") || DEFAULT_LABELS.before,
      waSuffix: getVal("labelWaSuffixInput") || DEFAULT_LABELS.waSuffix,
      active: getVal("labelActiveInput") || DEFAULT_LABELS.active,
      sold: getVal("labelSoldInput") || DEFAULT_LABELS.sold,
      out: getVal("labelOutInput") || DEFAULT_LABELS.out,
      noImage: getVal("labelNoImageInput") || DEFAULT_LABELS.noImage,
      updatedPrefix: getVal("labelUpdatedPrefixInput") || DEFAULT_LABELS.updatedPrefix,
      waFloat: getVal("labelWaFloatInput") || DEFAULT_LABELS.waFloat,
    };

    state.actionLabels = {
      consultar: getVal("actionConsultarInput") || DEFAULT_ACTION_LABELS.consultar,
      reservar: getVal("actionReservarInput") || DEFAULT_ACTION_LABELS.reservar,
      quiero: getVal("actionQuieroInput") || DEFAULT_ACTION_LABELS.quiero,
      comprar: getVal("actionComprarInput") || DEFAULT_ACTION_LABELS.comprar,
    };

    state.waMessages = {
      consultar: getVal("msgConsultarInput") || DEFAULT_WA_MESSAGES.consultar,
      reservar: getVal("msgReservarInput") || DEFAULT_WA_MESSAGES.reservar,
      quiero: getVal("msgQuieroInput") || DEFAULT_WA_MESSAGES.quiero,
      comprar: getVal("msgComprarInput") || DEFAULT_WA_MESSAGES.comprar,
    };

    state.theme = {
      bg: getVal("colorBg") || DEFAULT_THEME.bg,
      ink: getVal("colorInk") || DEFAULT_THEME.ink,
      accent: getVal("colorAccent") || DEFAULT_THEME.accent,
      accentDark: getVal("colorAccentDark") || DEFAULT_THEME.accentDark,
      deep: getVal("colorDeep") || DEFAULT_THEME.deep,
      card: getVal("colorCard") || DEFAULT_THEME.card,
      line: getVal("colorLine") || DEFAULT_THEME.line,
      ok: getVal("colorOk") || DEFAULT_THEME.ok,
    };

    saveData();
    render();
    showMessage("Apariencia aplicada. No olvides publicar para que los demas la vean.");
  });

  resetBtn.addEventListener("click", () => {
    state.theme = { ...DEFAULT_THEME };
    state.texts = { ...DEFAULT_TEXTS };
    state.labels = { ...DEFAULT_LABELS };
    state.actionLabels = { ...DEFAULT_ACTION_LABELS };
    state.waMessages = { ...DEFAULT_WA_MESSAGES };
    state.metaDescription = DEFAULT_META_DESCRIPTION;
    saveData();
    render();
    showMessage("Apariencia restablecida por defecto.");
  });
}

// ============================================================
//  BIND EVENTS ADMIN
// ============================================================
function bindAdminEvents() {
  const jsonInputEl = document.getElementById("jsonInput");
  const applyJsonBtn = document.getElementById("applyJsonBtn");
  const downloadJsonBtn = document.getElementById("downloadJsonBtn");
  const importJsonBtn = document.getElementById("importJsonBtn");
  const importJsonFile = document.getElementById("importJsonFile");
  const resetBtn = document.getElementById("resetBtn");
  const githubTokenEl = document.getElementById("githubToken");
  const githubRepoEl = document.getElementById("githubRepo");
  const saveHookBtn = document.getElementById("saveHookBtn");
  const publishBtn = document.getElementById("publishBtn");
  const publishStatus = document.getElementById("publishStatus");
  const addProductForm = document.getElementById("addProductForm");
  const catalogSelectEl = document.getElementById("catalogSelect");
  const newCatalogNameEl = document.getElementById("newCatalogName");
  const createCatalogBtn = document.getElementById("createCatalogBtn");
  const renameCatalogBtn = document.getElementById("renameCatalogBtn");
  const deleteCatalogBtn = document.getElementById("deleteCatalogBtn");
  const moveCatalogUpBtn = document.getElementById("moveCatalogUpBtn");
  const moveCatalogDownBtn = document.getElementById("moveCatalogDownBtn");
  const editProductSelectEl = document.getElementById("editProductSelect");
  const moveCatalogSelectEl = document.getElementById("moveCatalogSelect");
  const loadProductBtn = document.getElementById("loadProductBtn");
  const saveProductBtn = document.getElementById("saveProductBtn");
  const deleteProductBtn = document.getElementById("deleteProductBtn");
  const moveProductBtn = document.getElementById("moveProductBtn");
  const moveProductUpBtn = document.getElementById("moveProductUpBtn");
  const moveProductDownBtn = document.getElementById("moveProductDownBtn");

  if (!jsonInputEl || !addProductForm) return;

  // Sub-modules
  bindAppearancePanel();
  bindProductImages();

  // Inicializar config de acciones del producto vacío
  renderProductActionsConfig({ enabledActions: [...ACTION_KEYS] });

  // GitHub publish
  const savedToken = localStorage.getItem("githubToken");
  const savedRepo = localStorage.getItem(GITHUB_REPO_KEY);
  if (savedToken && githubTokenEl) githubTokenEl.value = savedToken;
  if (githubRepoEl) githubRepoEl.value = savedRepo || GITHUB_REPO_DEFAULT;

  if (saveHookBtn) {
    saveHookBtn.addEventListener("click", () => {
      const token = githubTokenEl?.value.trim();
      const repo = githubRepoEl?.value.trim();
      if (!token) { showMessage("Pega el token primero."); return; }
      localStorage.setItem("githubToken", token);
      if (repo) localStorage.setItem(GITHUB_REPO_KEY, repo);
      showMessage("Token y repo guardados.");
    });
  }

  if (publishBtn) {
    publishBtn.addEventListener("click", async () => {
      const token = localStorage.getItem("githubToken");
      const repo = getGithubRepo();
      if (!token) { publishStatus.textContent = "Guardá el token primero."; return; }

      publishStatus.textContent = "Publicando...";
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(state, null, 2))));
      const apiUrl = `https://api.github.com/repos/${repo}/contents/catalogo.json`;

      try {
        const getRes = await fetch(apiUrl, {
          headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json" },
        });
        const fileData = await getRes.json();
        const sha = fileData.sha;

        const putRes = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: "actualizo catalogo desde admin", content, sha }),
        });

        if (putRes.ok) {
          publishStatus.textContent = "¡Listo! El sitio se actualiza en ~1 minuto.";
        } else {
          const err = await putRes.json();
          publishStatus.textContent = `Error: ${err.message}`;
        }
      } catch (e) {
        publishStatus.textContent = `Error de red: ${e.message}`;
      }
    });
  }

  applyJsonBtn.addEventListener("click", () => {
    try {
      state = normalizeData(JSON.parse(jsonInputEl.value));
      saveData();
      render();
      showMessage("Cambios aplicados correctamente.");
    } catch (error) {
      showMessage(`Error de JSON: ${error.message}`);
    }
  });

  downloadJsonBtn.addEventListener("click", () => {
    const file = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = CATALOG_FILE;
    link.click();
    URL.revokeObjectURL(link.href);
    showMessage("JSON descargado.");
  });

  importJsonBtn.addEventListener("click", () => importJsonFile.click());

  importJsonFile.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      state = normalizeData(JSON.parse(await file.text()));
      saveData();
      render();
      showMessage("Catalogo importado correctamente.");
    } catch (error) {
      showMessage(`No se pudo importar: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  });

  resetBtn.addEventListener("click", () => {
    state = normalizeData(structuredClone(defaultData));
    saveData();
    render();
    showMessage("Se restablecio la version demo.");
  });

  catalogSelectEl.addEventListener("change", () => {
    setActiveCatalog(catalogSelectEl.value);
    saveData();
    render();
  });

  createCatalogBtn.addEventListener("click", () => {
    const newName = newCatalogNameEl.value.trim();
    if (!newName) { showMessage("Escribe un nombre para el catalogo."); return; }
    const baseId = slugify(newName) || "catalogo";
    let nextId = baseId;
    let suffix = 2;
    while (state.catalogs.some((c) => c.id === nextId)) {
      nextId = `${baseId}-${suffix}`;
      suffix += 1;
    }
    state.catalogs.push({ id: nextId, name: newName, products: [] });
    state.activeCatalogId = nextId;
    newCatalogNameEl.value = "";
    saveData();
    render();
    showMessage(`Catalogo ${newName} creado.`);
  });

  renameCatalogBtn.addEventListener("click", () => {
    const newName = newCatalogNameEl.value.trim();
    if (!newName) { showMessage("Escribe el nuevo nombre."); return; }
    getActiveCatalog().name = newName;
    newCatalogNameEl.value = "";
    saveData();
    render();
    showMessage("Catalogo renombrado.");
  });

  deleteCatalogBtn.addEventListener("click", () => {
    if (state.catalogs.length <= 1) { showMessage("Debe existir al menos un catalogo."); return; }
    state.catalogs = state.catalogs.filter((c) => c.id !== state.activeCatalogId);
    state.activeCatalogId = state.catalogs[0].id;
    saveData();
    render();
    showMessage("Catalogo eliminado.");
  });

  addProductForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const newProduct = collectProductFromForm();
      getActiveCatalog().products.unshift(newProduct);
      saveData();
      render();
      resetProductForm();
      showMessage("Producto agregado al catalogo activo.");
    } catch (error) {
      showMessage(error.message);
    }
  });

  loadProductBtn.addEventListener("click", () => {
    const selected = Number(editProductSelectEl.value);
    if (Number.isNaN(selected)) { showMessage("No hay producto para cargar."); return; }
    const product = getActiveCatalog().products[selected];
    if (!product) { showMessage("Producto no encontrado."); return; }
    fillFormWithProduct(product);
    showMessage("Producto cargado en el formulario.");
  });

  saveProductBtn.addEventListener("click", () => {
    const selected = Number(editProductSelectEl.value);
    if (Number.isNaN(selected)) { showMessage("Selecciona un producto."); return; }
    const activeCatalog = getActiveCatalog();
    if (!activeCatalog.products[selected]) { showMessage("Producto no encontrado."); return; }
    try {
      activeCatalog.products[selected] = collectProductFromForm();
      saveData();
      render();
      showMessage("Producto actualizado.");
    } catch (error) {
      showMessage(error.message);
    }
  });

  deleteProductBtn.addEventListener("click", () => {
    const selected = Number(editProductSelectEl.value);
    if (Number.isNaN(selected)) { showMessage("Selecciona un producto."); return; }
    const activeCatalog = getActiveCatalog();
    if (!activeCatalog.products[selected]) { showMessage("Producto no encontrado."); return; }
    activeCatalog.products.splice(selected, 1);
    saveData();
    render();
    showMessage("Producto eliminado.");
  });

  moveProductBtn.addEventListener("click", () => {
    const selected = Number(editProductSelectEl.value);
    const targetId = moveCatalogSelectEl.value;
    if (Number.isNaN(selected)) { showMessage("Selecciona un producto."); return; }
    const source = getActiveCatalog();
    const target = state.catalogs.find((c) => c.id === targetId);
    if (!source.products[selected] || !target) { showMessage("No se pudo mover."); return; }
    const [product] = source.products.splice(selected, 1);
    target.products.unshift(product);
    saveData();
    render();
    showMessage(`Producto movido a ${target.name}.`);
  });

  // ============================================================
  //  Reordenar CATEGORIAS (↑ / ↓)
  // ============================================================
  function moveCatalog(direction) {
    const activeId = state.activeCatalogId;
    const idx = state.catalogs.findIndex((c) => c.id === activeId);
    if (idx < 0) return;

    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= state.catalogs.length) {
      showMessage(direction < 0
        ? "El catalogo ya esta al inicio."
        : "El catalogo ya esta al final.");
      return;
    }

    const [moved] = state.catalogs.splice(idx, 1);
    state.catalogs.splice(newIdx, 0, moved);
    saveData();
    render();
    showMessage(`Catalogo "${moved.name}" movido ${direction < 0 ? "arriba" : "abajo"}.`);
  }

  if (moveCatalogUpBtn) moveCatalogUpBtn.addEventListener("click", () => moveCatalog(-1));
  if (moveCatalogDownBtn) moveCatalogDownBtn.addEventListener("click", () => moveCatalog(1));

  // ============================================================
  //  Reordenar PRODUCTOS dentro del catalogo activo (↑ / ↓)
  // ============================================================
  function moveProduct(direction) {
    const selected = Number(editProductSelectEl.value);
    if (Number.isNaN(selected)) {
      showMessage("Selecciona un producto.");
      return;
    }

    const activeCatalog = getActiveCatalog();
    const products = activeCatalog.products;
    const newIdx = selected + direction;

    if (newIdx < 0 || newIdx >= products.length) {
      showMessage(direction < 0
        ? "El producto ya esta al inicio."
        : "El producto ya esta al final.");
      return;
    }

    const [moved] = products.splice(selected, 1);
    products.splice(newIdx, 0, moved);
    saveData();
    render();

    // Mantener seleccionado el producto en su nueva posicion
    if (editProductSelectEl) editProductSelectEl.value = String(newIdx);

    showMessage(`Producto "${moved.name}" movido ${direction < 0 ? "arriba" : "abajo"}.`);
  }

  if (moveProductUpBtn) moveProductUpBtn.addEventListener("click", () => moveProduct(-1));
  if (moveProductDownBtn) moveProductDownBtn.addEventListener("click", () => moveProduct(1));
}

// ============================================================
//  INIT
// ============================================================
async function init() {
  const remoteCatalog = await loadRemoteCatalog();
  if (remoteCatalog) {
    state = remoteCatalog;
    saveData();
  } else {
    state = loadData(defaultData);
  }
  bindCommonEvents();
  window.addEventListener("storage", syncStateFromStorage);

  if (isAdminView) {
    bindAdminLogin();
    if (isAdminAuthenticated()) {
      bindAdminEvents();
    } else {
      showAdminLogin();
    }
  }
  render();
}

init();
