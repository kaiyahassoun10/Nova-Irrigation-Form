(function () {
  // Legacy local-only client catalog is disabled; Supabase-based flow below is the source of truth.
  return;
  function byId(id) {
    return document.getElementById(id);
  }
  function qs(s, r) {
    return (r || document).querySelector(s);
  }
  function qsa(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }
  var KEY = "nova.clientCatalog.v1";

  function getCatalog() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {}
    return [];
  }
  function saveCatalog(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list || []));
    } catch (e) {}
  }

  // Read the Client Catalog form (IDs per your file)
  function readCCForm() {
    var map = {
      jobName: "cc_jobName",
      jobNumber: "cc_controller", // your form uses cc_controller for Controller #
      clientName: "cc_clientName",
      clientPhone: "cc_clientPhone",
      clientEmail: "cc_clientEmail",
      address: "cc_address",
      cityStateZip: "cc_cityStateZip",
      technician: "cc_technician",
      notes: "cc_notes",
    };
    var obj = {};
    for (var k in map) {
      var el = byId(map[k]);
      if (el) obj[k] = el.value || "";
    }
    return obj;
  }

  // Insert or update by Job Name (the key)
  function upsertByJobName(item) {
    if (!item) return;
    var jn = (item.jobName || "").toString().trim();
    if (!jn) return;
    var list = getCatalog();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      var it = list[i] || {};
      var j = (it.jobName || it.JobName || "").toString().trim();
      if (j && j === jn) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], item);
    } else {
      list.push(item);
    }
    saveCatalog(list);
    renderTable(list);
    populateClientPreset(list);
  }

  // Render the saved clients table, including Email column
  function renderTable(list) {
    var tbl = byId("cc_table");
    if (!tbl) return;
    var tbody = qs("tbody", tbl);
    if (!tbody) return;
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    for (var i = 0; i < list.length; i++) {
      var it = list[i] || {};
      var tr = document.createElement("tr");
      function td(txt) {
        var c = document.createElement("td");
        c.appendChild(document.createTextNode(txt || ""));
        return c;
      }
      tr.appendChild(td(it.jobName || it.JobName || ""));
      tr.appendChild(td(it.jobNumber || it.JobNumber || ""));
      tr.appendChild(td(it.clientName || it.ClientName || ""));
      tr.appendChild(td(it.clientPhone || it.ClientPhone || ""));
      tr.appendChild(td(it.clientEmail || it.ClientEmail || "")); // show per-client Email
      var act = document.createElement("td");
      // optional edit/fill button
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Load to Client Info";
      btn.addEventListener(
        "click",
        (function (rec) {
          return function () {
            populateClientInfo(rec);
          };
        })(it)
      );
      act.appendChild(btn);
      tr.appendChild(act);
      tbody.appendChild(tr);
    }
  }

  // Populate the Client Info tab fields from a record
  function populateClientInfo(rec) {
    if (!rec) return;
    var map = {
      jobName: "jobName",
      jobNumber: "jobNumber",
      clientName: "clientName",
      clientPhone: "clientPhone",
      clientEmail: "clientEmail",
      address: "address",
      cityStateZip: "cityStateZip",
      technician: "technician",
      notes: "notes",
      statusOfController: "statusOfController",
      statusOfBackflow: "statusOfBackflow",
    };
    for (var k in map) {
      var el = byId(map[k]);
      if (!el) continue;
      var val =
        rec[k] != null
          ? rec[k]
          : rec[k && k[0].toUpperCase() + k.slice(1)] || "";
      if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT"
      ) {
        el.value = val || "";
      } else {
        el.textContent = val || "";
      }
    }
  }

  // Find by Job Name (primary) or Client Name (fallback) from a selection value
  function findBySelection(sel) {
    var list = getCatalog();
    var v = (sel || "").trim();
    if (!v) return null;
    for (var i = 0; i < list.length; i++) {
      var it = list[i] || {},
        j = (it.jobName || it.JobName || "").toString().trim();
      if (j && j === v) return it;
    }
    for (var k = 0; k < list.length; k++) {
      var it2 = list[k] || {},
        c = (it2.clientName || it2.ClientName || "").toString().trim();
      if (c && c === v) return it2;
    }
    return null;
  }

  function populateClientPreset(list) {
    var sel = byId("clientPreset");
    if (!sel) return;
    var remember = sel.value;
    // rebuild options: first default
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "-- Select saved client --";
    sel.appendChild(opt0);
    for (var i = 0; i < list.length; i++) {
      var it = list[i] || {};
      var j = (it.jobName || "").toString();
      var c = (it.clientName || "").toString();
      var label = j || c || "Client #" + (i + 1);
      var o = document.createElement("option");
      o.value = j || c;
      o.textContent = label;
      sel.appendChild(o);
    }
    // restore selection if possible
    if (remember) {
      sel.value = remember;
      if (sel.value !== remember) {
        sel.selectedIndex = 0;
      }
    }
  }

  function wire() {
    var cat = byId("tab-clientCatalog");
    if (cat && !cat.__emailPatch) {
      cat.__emailPatch = true;
      // Wire catalog buttons
      var addBtn = byId("cc_addOrUpdate");
      if (addBtn) {
        addBtn.addEventListener(
          "click",
          function () {
            var item = readCCForm();
            if (item.jobName) {
              upsertByJobName(item);
            }
          },
          true
        );
      }
      var quickSave = byId("saveToClientCatalog");
      if (quickSave) {
        quickSave.addEventListener(
          "click",
          function () {
            // Pull from Client Info tab fields directly
            var rec = {
              jobName: (byId("jobName") || {}).value || "",
              jobNumber: (byId("jobNumber") || {}).value || "",
              clientName: (byId("clientName") || {}).value || "",
              clientPhone: (byId("clientPhone") || {}).value || "",
              clientEmail: (byId("clientEmail") || {}).value || "",
              address: (byId("address") || {}).value || "",
              cityStateZip: (byId("cityStateZip") || {}).value || "",
              technician: (byId("technician") || {}).value || "",
              notes: (byId("notes") || {}).value || "",
            };
            if (rec.jobName) {
              upsertByJobName(rec);
            }
          },
          true
        );
      }
    }

    // Client preset behavior → load matching record into Client Info (incl Email)
    var preset = byId("clientPreset");
    if (preset && !preset.__emailPatch) {
      preset.__emailPatch = true;
      preset.addEventListener("change", function () {
        var rec = findBySelection(preset.value);
        if (rec) populateClientInfo(rec);
      });
    }

    // Initial render + dropdown populate
    var list = getCatalog();
    renderTable(list);
    populateClientPreset(list);
  }

  document.addEventListener(
    "click",
    function (e) {
      // If user switches tabs, re-wire safely
      var a =
        e.target && e.target.closest ? e.target.closest("[data-tab]") : null;
      if (a) {
        setTimeout(wire, 0);
      }
    },
    true
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire, { once: true });
  } else {
    wire();
  }
})();


  // Embedded Nova logo
  const BASE64_LOGO =
    "data:image/png;base64,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";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  // Downscale images to keep storage small
  function resizeImageFile(file, maxSize = 900, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read-error"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("img-error"));
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxSize || h > maxSize) {
            const scale = Math.min(maxSize / w, maxSize / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          try {
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(new Error("read-error"));
      fr.readAsDataURL(file);
    });
  }
  const isIOS = /iP(hone|od|ad)/i.test(navigator.userAgent || "");

  const IDB_DB = "nova-irrigation";
  const IDB_STORE = "photos";
  let idbReady = null;
  const idbCache = new Map();

  function openIdb() {
    if (idbReady) return idbReady;
    idbReady = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("idb-open-failed"));
    });
    return idbReady;
  }

  async function idbPut(id, value) {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(value, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("idb-put-failed"));
    });
  }

  async function idbGet(id) {
    if (idbCache.has(id)) return idbCache.get(id);
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        idbCache.set(id, req.result || null);
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error || new Error("idb-get-failed"));
    });
  }

  async function idbDelete(id) {
    idbCache.delete(id);
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("idb-del-failed"));
    });
  }
  async function idbClearAll() {
    idbCache.clear();
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("idb-clear-failed"));
    });
  }
  const compressToLimit = async (file, maxBytes) => {
    const attempts = [
      { size: 900, quality: 0.7 },
      { size: 700, quality: 0.6 },
      { size: 600, quality: 0.5 },
    ];
    let dataUrl = null;
    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      dataUrl = await resizeImageFile(file, a.size, a.quality);
      if (dataUrl && dataUrl.length <= maxBytes) break;
    }
    return dataUrl;
  };

  async function storePhotoData(dataUrl) {
    const id = "p_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    await idbPut(id, dataUrl);
    idbCache.set(id, dataUrl);
    return "idb:" + id;
  }

  async function processImageFile(file) {
    if (!file) return null;
    try {
      // Keep prints reliable on iOS by downscaling when possible; fall back to raw.
      if (isIOS) {
        try {
          const dataUrl = await compressToLimit(file, 1_800_000);
          return dataUrl ? await storePhotoData(dataUrl) : null;
        } catch (_) {
          const dataUrl = await readAsDataURL(file);
          return dataUrl ? await storePhotoData(dataUrl) : null;
        }
      }
      const dataUrl = await resizeImageFile(file);
      return dataUrl ? await storePhotoData(dataUrl) : null;
    } catch (_) {
      try {
        const dataUrl = await readAsDataURL(file);
        return dataUrl ? await storePhotoData(dataUrl) : null;
      } catch (_) {
        return null;
      }
    }
  }

  // Tabs
  const tabs = $$(".tab");
  const views = {
    client: $("#tab-client"),
    stations: $("#tab-stations"),
    catalog: $("#tab-catalog"),
    clientCatalog: $("#tab-clientCatalog"),
    export: $("#tab-export"),
  };
  const PIN_CODE = "5336";
  const protectedTabs = ["catalog", "clientCatalog"];

  // Reset PIN locks on each page load
  try {
    if (typeof sessionStorage !== "undefined") {
      protectedTabs.forEach((tab) =>
        sessionStorage.removeItem("nova_pin_" + tab)
      );
    }
  } catch (_) {}

  const isPinUnlocked = (tab) =>
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("nova_pin_" + tab) === "1";

  const requirePin = (tab) => {
    if (!protectedTabs.includes(tab)) return true;
    if (isPinUnlocked(tab)) return true;
    const entered = window.prompt("Enter PIN to access this section:");
    if (entered === null) return false;
    if (entered.trim() === PIN_CODE) {
      try {
        sessionStorage.setItem("nova_pin_" + tab, "1");
      } catch (_) {}
      return true;
    }
    window.alert("Incorrect PIN.");
    return false;
  };

  tabs.forEach((btn) =>
    btn.addEventListener("click", () => {
      const v = btn.dataset.tab;
      if (!requirePin(v)) return;
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      Object.values(views).forEach((el) => el.classList.add("hidden"));
      views[v].classList.remove("hidden");
    })
  );

  // Logo
  $("#logo").src = BASE64_LOGO;

  // State
  const DEFAULT_CATALOG = [
    { id: "broken-head", label: "Broken head", defaultPrice: 0 },
    { id: "leaking-head", label: "Leaking head", defaultPrice: 0 },
    { id: "clogged-nozzle", label: "Clogged nozzle", defaultPrice: 0 },
    { id: "broken-lateral", label: "Broken lateral", defaultPrice: 0 },
    { id: "mainline-leak", label: "Mainline leak", defaultPrice: 0 },
    { id: "valve-issue", label: "Valve issue", defaultPrice: 0 },
    { id: "controller-issue", label: "Controller issue", defaultPrice: 0 },
    { id: "drip-repair", label: "Drip Repair", defaultPrice: 0 },
    { id: "valve-rebuild", label: "Valve Rebuild", defaultPrice: 0 },
    { id: "valve-replacement", label: "Valve Replacement", defaultPrice: 0 },
  ];
  const KEY = "nova_irrigation_form_v2";

  // =====================
// Supabase (Repair Catalog sync)
// Use ONLY the anon key (never service_role) in browser code.
// =====================
const SUPABASE_URL = "https://drllwckdzhnmpgxmalom.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybGx3Y2tkemhubXBneG1hbG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTM0NDYsImV4cCI6MjA4MzM4OTQ0Nn0.XzwFMSP2p2G6SKFXddFL-35z9OB_8oO9o3VaqKX7eoQ";
const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

const SUPA_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function supaFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.status === 204 ? null : res.json();
}

// ---- Repair Catalog API (matches your table columns) ----
async function supaGetRepairRows() {
  return await supaFetch(
    `/repair_catalog?select=id,description,price,active&active=eq.true&order=description.asc`,
    { method: "GET" }
  );
}

async function supaInsertRepairRow({ description, price, active = true }) {
  return await supaFetch(`/repair_catalog`, {
    method: "POST",
    body: JSON.stringify([{ description, price, active }]),
  });
}

async function supaUpdateRepairRow(id, patch) {
  return await supaFetch(`/repair_catalog?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

  let state = loadState();
  if (!state) {
    state = {
      client: {
        jobName: "",
        jobNumber: "",
        clientName: "",
        clientPhone: "",
        address: "",
        cityStateZip: "",
        technician: "",
        date: new Date().toISOString().slice(0, 10),
        statusOfController: "",
        statusOfBackflow: "",
        notes: "",
      },
      stations: [],
      catalog: [],
    };
  } else {
    state.stations = normalizeStations(state.stations);
  }
  // 🔄 Load repair catalog from Supabase
loadCatalog().then((catalog) => {
  state.catalog = catalog;
  saveAll();        // persist locally
  renderCatalog();  // refresh UI
});

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        parsed.stations = normalizeStations(parsed.stations);
      }
      return parsed;
    } catch (_) {
      return null;
    }
  }
async function loadCatalog() {
  try {
    const res = await fetch(
  `${SUPABASE_URL}/rest/v1/repair_catalog?select=id,description,price,active&active=eq.true&order=id.asc`,
  { headers: SUPABASE_HEADERS }
);

    if (!res.ok) throw new Error("Failed to load catalog");

    const rows = await res.json();

    // ✅ MAP Supabase → UI shape
    return rows.map((r) => ({
      id: r.id,                          // Supabase ID (needed for update/delete)
      label: r.description || "",        // UI uses "label"
      defaultPrice: Number(r.price) || 0 // UI uses "defaultPrice"
    }));
  } catch (err) {
    console.error("loadCatalog failed, using defaults", err);
    return DEFAULT_CATALOG.map((x) => ({ ...x }));
  }
}

async function updateRepairItemInSupabase(item) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/repair_catalog?id=eq.${item.id}`,
    {
      method: "PATCH",
      headers: SUPABASE_HEADERS,
      body: JSON.stringify({
        description: item.label || "",
        price: Number(item.defaultPrice) || 0,
        active: true,
      }),
    }
  );

  if (!res.ok) throw new Error(await res.text());
}

async function addRepairItemInSupabase({ label, defaultPrice }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/repair_catalog`, {
    method: "POST",
    headers: SUPABASE_HEADERS,
    body: JSON.stringify({
      description: label || "New Item",
      price: Number(defaultPrice) || 0,
      active: true,
    }),
  });

  if (!res.ok) throw new Error(await res.text());

  return true;
}

async function softDeleteRepairItemInSupabase(id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/repair_catalog?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        ...SUPABASE_HEADERS,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ active: false }),
    }
  );

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Soft delete failed");

  // If Prefer return=representation is respected, Supabase returns the updated row(s)
  let updated = [];
  try {
    updated = text ? JSON.parse(text) : [];
  } catch (_) {}

  return updated; // array (possibly empty)
}

let _catalogHydrated = false;
let _catalogSyncTimer = null;
let _suppressCatalogSync = false;

async function hydrateCatalogFromSupabaseOnce() {
  if (_catalogHydrated) return;
  _catalogHydrated = true;

  try {
    const rows = await supaGetRepairRows();

    // If Supabase has rows, use them (shared across devices)
    if (Array.isArray(rows) && rows.length) {
      state.catalog = rows.map((r) => ({
        // keep your existing shape, but remember the db id
        id: "db-" + r.id,
        dbId: r.id,
        label: r.description,
        defaultPrice: Number(r.price || 0),
        active: !!r.active,
      }));

      _suppressCatalogSync = true;
      localStorage.setItem(KEY + "_catalog", JSON.stringify(state.catalog));
      _suppressCatalogSync = false;
      return;
    }

    // If table is empty (first-time setup), seed it from DEFAULT_CATALOG
    for (const item of DEFAULT_CATALOG) {
      await supaInsertRepairRow({
        description: item.label,
        price: Number(item.defaultPrice || 0),
        active: true,
      });
    }

    const seeded = await supaGetRepairRows();
    state.catalog = (seeded || []).map((r) => ({
      id: "db-" + r.id,
      dbId: r.id,
      label: r.description,
      defaultPrice: Number(r.price || 0),
      active: !!r.active,
    }));

    _suppressCatalogSync = true;
    localStorage.setItem(KEY + "_catalog", JSON.stringify(state.catalog));
    _suppressCatalogSync = false;
  } catch (e) {
    console.error("Supabase hydrate failed, using local catalog:", e);
  }
}

function scheduleCatalogSync() {
  clearTimeout(_catalogSyncTimer);
  _catalogSyncTimer = setTimeout(syncCatalogToSupabase, 700);
}

async function syncCatalogToSupabase() {
  if (_suppressCatalogSync) return;

  try {
    const rows = await supaGetRepairRows();
    const byDesc = new Map((rows || []).map((r) => [String(r.description), r]));

    for (const item of state.catalog || []) {
      const desc = String(item.label || "").trim();
      if (!desc) continue;

      const price = Number(item.defaultPrice || 0);
      const existing = byDesc.get(desc);

      if (existing) {
        item.dbId = existing.id;

        // update price if changed
        if (Number(existing.price || 0) !== price) {
          await supaUpdateRepairRow(existing.id, { price });
        }
      } else {
        const inserted = await supaInsertRepairRow({
          description: desc,
          price,
          active: true,
        });
        const row = inserted?.[0];
        if (row?.id) item.dbId = row.id;
      }
    }
  } catch (e) {
    console.error("Supabase sync failed:", e);
  }
}
  let saveWarningShown = false;
  function saveAll() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      localStorage.setItem(KEY + "_catalog", JSON.stringify(state.catalog));
      return true;
    } catch (err) {
      if (!saveWarningShown) {
        saveWarningShown = true;
        window.alert(
          "Save failed (likely storage limit). Try removing/reducing photos so notes and data persist."
        );
      }
      return false;
    }
  }
  function clearStationsOnLoad() {
    state.stations = [];
    saveAll();
    idbClearAll().catch(() => {});
  }
  // Reset System Status selects on each page load.
  if (state && state.client) {
    state.client.statusOfController = "";
    state.client.statusOfBackflow = "";
    saveAll();
  }
  function normalizeStations(list) {
    return (list || []).map((s, idx) => {
      const photos = Array.isArray(s.photos)
        ? s.photos.filter(Boolean)
        : s.photo
        ? [s.photo]
        : [];
      return Object.assign(
        {
          number: idx + 1,
          notes: "",
          problems: [],
          photos: [],
        },
        s,
        { photos, photo: undefined, number: s.number || idx + 1 }
      );
    });
  }

  async function migratePhotosToIdb() {
    let changed = false;
    for (let i = 0; i < (state.stations || []).length; i++) {
      const st = state.stations[i];
      if (!st || !Array.isArray(st.photos)) continue;
      for (let j = 0; j < st.photos.length; j++) {
        const ref = String(st.photos[j] || "");
        if (ref.startsWith("idb:")) continue;
        if (ref.startsWith("data:")) {
          try {
            const idRef = await storePhotoData(ref);
            st.photos[j] = idRef;
            changed = true;
          } catch (_) {}
        }
      }
    }
    if (changed) {
      saveAll();
      renderStations();
    }
  }

  // Bind client inputs
  function formatDateForPrint(raw) {
    if (!raw) return "";
    const parts = raw.split("-");
    if (parts.length !== 3) return raw;
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(m) || isNaN(d)) return raw;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const mm = months[m - 1] || "";
    return mm ? `${mm} ${d}, ${y}` : raw;
  }

  [
    "jobName",
    "jobNumber",
    "clientName",
    "clientPhone",
    "address",
    "cityStateZip",
    "technician",
    "date",
    "notes",
    "statusOfController",
    "statusOfBackflow",
  ].forEach((id) => {
    const el = $("#" + id);
    if (el) {
      el.value = state.client[id] || "";
      const syncPrintDate = () => {
        if (id !== "date") return;
        const span = $("#datePrintValue");
        if (span) span.textContent = formatDateForPrint(el.value || "");
      };
      syncPrintDate();
      el.addEventListener("input", () => {
        state.client[id] = el.value;
        saveAll();
        syncPrintDate();
      });
      el.addEventListener("change", () => {
        state.client[id] = el.value;
        saveAll();
        syncPrintDate();
      });
    }
  });

  // Ensure date text is up-to-date right before print (helps mobile)
  const syncPrintDateOnce = () => {
    const span = $("#datePrintValue");
    if (span && state.client) {
      span.textContent = formatDateForPrint(state.client.date || "");
    }
  };
  try {
    window.addEventListener("beforeprint", syncPrintDateOnce);
    const mq = window.matchMedia && window.matchMedia("print");
    if (mq && mq.addListener) {
      mq.addListener((e) => {
        if (e.matches) syncPrintDateOnce();
      });
    }
  } catch (_) {}

  // Catalog UI
  const catalogList = $("#catalogList");
  function renderCatalog() {
    // Always enforce Supabase ID order
state.catalog.sort((a, b) => {
  const ai = Number(a.id);
  const bi = Number(b.id);

  if (Number.isNaN(ai) && Number.isNaN(bi)) return 0;
  if (Number.isNaN(ai)) return 1;
  if (Number.isNaN(bi)) return -1;

  return ai - bi;
});
    catalogList.innerHTML = "";
    state.catalog.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "grid-3";
      row.style.alignItems = "end";
      row.style.marginBottom = "8px";
      row.innerHTML = `
        <div><label>Problem</label><input type="text" value="${escapeHtml(
          item.label
        )}" data-k="label"></div>
        <div><label>Default Price ($)</label><input type="number" min="0" step="0.01" value="${
          Number(item.defaultPrice) || 0
        }" data-k="defaultPrice"></div>
        <div class="row"><button type="button" class="btn ghost" data-act="remove">Remove</button></div>`;
     row.querySelector('[data-k="label"]').addEventListener("change", async (e) => {
  item.label = e.target.value;
  saveAll();
  renderStations();

  try {
    await updateRepairItemInSupabase(item);
  } catch (err) {
    console.error("Failed to update problem name in Supabase", err);
  }
});
     row
  .querySelector('[data-k="defaultPrice"]')
  .addEventListener("change", async (e) => {
    item.defaultPrice = parseFloat(e.target.value || "0") || 0;
    saveAll();
    renderStations();

    try {
      await updateRepairItemInSupabase(item);
    } catch (err) {
      console.error("Failed to update price in Supabase", err);
    }
  });
      row.querySelector('[data-act="remove"]').addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  try {
    // 0) If this device has a stale/local item id, refresh catalog first
    const numericId = Number(item.id);
    if (!Number.isFinite(numericId)) {
      const fresh = await loadCatalog();
      state.catalog = Array.isArray(fresh) ? fresh : [];
      saveAll();
      renderCatalog();
      renderStations();
      alert("Catalog was out of sync on this device. Try Remove again.");
      return;
    }

    // 1) Soft delete in Supabase and verify it actually updated something
    const updated = await softDeleteRepairItemInSupabase(numericId);
    if (!updated || updated.length === 0) {
      // Nothing updated -> this device is out of sync OR bad id
      const fresh = await loadCatalog();
      state.catalog = Array.isArray(fresh) ? fresh : [];
      saveAll();
      renderCatalog();
      renderStations();
      alert("This item wasn’t synced on this device yet. Try Remove again.");
      return;
    }

    // 2) Reload from Supabase (source of truth)
    const fresh = await loadCatalog();
    state.catalog = Array.isArray(fresh) ? fresh : [];

    // 3) Persist + re-render
    saveAll();
    renderCatalog();
    renderStations();
  } catch (err) {
    console.error("Remove failed:", err);
    alert("Remove failed. Check console for details.");
  }
});
      catalogList.appendChild(row);
    });
  }
$("#addCatalogItem").addEventListener("click", async () => {
  try {
    // 1) Insert into Supabase (single source of truth)
    await addRepairItemInSupabase({
      label: "New Item",
      defaultPrice: 0,
    });

    // 2) Reload catalog from Supabase (keeps order + IDs correct)
    const fresh = await loadCatalog();
    state.catalog = Array.isArray(fresh) ? fresh : [];

    // 3) Persist + re-render
    saveAll();
    renderCatalog();
    renderStations();
  } catch (err) {
    console.error("Add Item failed:", err);
    alert("Add Item failed. Check console for details.");
  }
});

  // Stations UI
  const stationsList = $("#stationsList");
  $("#addStationBtn").addEventListener("click", () => {
    const nextNum =
      (state.stations || []).reduce(
        (max, s) => Math.max(max, Number(s && s.number) || 0),
        0
      ) + 1;
    state.stations.push({
      number: nextNum,
      notes: "",
      photos: [],
      problems: [],
    });
    saveAll();
    renderStations();
  });

  function stationSubtotal(st) {
    return (st.problems || []).reduce(
      (s, p) => s + (Number(p.qty) || 0) * (Number(p.price) || 0),
      0
    );
  }
  function grandTotal() {
    return (state.stations || []).reduce((t, st) => t + stationSubtotal(st), 0);
  }

  function updateTotalsUI() {
    const gt = fmt.format(grandTotal());
    const gtMain = document.getElementById("grandTotal");
    const gtTop = document.getElementById("grandTotalTop");
    const gtClient = document.getElementById("grandTotalClientPrint");
    const gtPrintTop = document.getElementById("grandTotalPrintTop");
    const totalStationsPrint = document.getElementById("totalStationsPrint");
    if (gtMain) gtMain.textContent = "Grand Total: " + gt;
    if (gtTop) gtTop.textContent = "Grand Total: " + gt;
    if (gtClient) gtClient.textContent = "Grand Total: " + gt;
    if (gtPrintTop) gtPrintTop.textContent = "Grand Total: " + gt;
    if (totalStationsPrint) {
      const count = (state.stations || []).length;
      totalStationsPrint.textContent = "TOTAL STATIONS: " + count;
    }
  }
  function renderStations() {
    stationsList.innerHTML = "";
    state.stations.forEach((st, si) => {
      st.photos = Array.isArray(st.photos)
        ? st.photos.filter(Boolean)
        : st.photo
        ? [st.photo]
        : [];
      st.photo = undefined;
      const wrap = document.createElement("div");
      wrap.className = "station";
      const total = fmt.format(stationSubtotal(st));
      const stationNum = Math.max(1, parseInt(st.number || si + 1, 10) || si + 1);
      st.number = stationNum;
      wrap.innerHTML = `
        <div class="flex-between">
          <div class="section-title station-title">
            <span>Station</span>
            <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              class="station-number-input no-print"
              data-k="stationNumber"
              value="${stationNum}"
              aria-label="Station number"
              style="display:inline-block;width:40px;max-width:40px;min-width:40px;padding:2px 4px;border-radius:9999px;border:1px solid #94a3b8;background:#ffffff;color:#111827;-webkit-text-fill-color:#111827;text-align:center;font-weight:700;line-height:1;flex:0 0 auto;"
            />
            <span class="print-only">${stationNum}</span>
          </div>
          <div class="subtotal">${total}</div>
        </div>

        <div class="station-body">
          <div class="station-main">
            <div id="problems-${si}"></div>
            <div class="row no-print" style="margin:8px 0">
              ${
                st.problems.length < 2
                  ? '<button class="btn" data-act="addProblem">Add Problem</button>'
                  : ""
              }
              <button class="btn ghost" data-act="removeStation">Remove Station</button>
            </div>
          </div>
          <div class="station-side">
            <label>Photos</label>
            <div class="photo-list">
              ${
                st.photos.length
                  ? st.photos
                      .map(
                        (p, pi) => `
                  <div class="photo-item">
                    <img class="photo" data-photo="${p}" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
                    <button class="btn ghost" data-act="removePhoto" data-photo-idx="${pi}">Remove</button>
                  </div>`
                      )
                      .join("")
                  : '<div class="photo-box">No photos</div>'
              }
            </div>
            <div class="row no-print" style="margin:6px 0; gap:6px; flex-wrap:wrap;">
              <button class="btn" data-act="photoLibrary">Add Photo</button>
              ${isIOS ? '<button class="btn ghost" data-act="photoCamera">Use Camera</button>' : ""}
            </div>
            <input type="file" accept="image/*" data-act="photoInput" multiple style="display:none" />
            <div style="margin-top:8px">
              <label>Notes</label>
              <textarea data-k="notes">${escapeHtml(st.notes || "")}</textarea>
            </div>
          </div>
        </div>
      `;
      const subtotalEl = wrap.querySelector(".subtotal");
      const updateStationTotals = () => {
        if (subtotalEl) subtotalEl.textContent = fmt.format(stationSubtotal(st));
        updateTotalsUI();
      };
      // Wire station actions
      const probsHost = wrap.querySelector("#problems-" + si);
      function renderProblems() {
        probsHost.innerHTML = "";
        (st.problems || []).forEach((p, pi) => {
          const row = document.createElement("div");
          row.className = "grid-3";
          row.style.margin = "8px 0";
          row.innerHTML = `
            <div>
              <label>Problem ${pi + 1}</label>
              <select data-k="label">
                <option value="">-- Select --</option>
                ${state.catalog
                  .map(
                    (c) =>
                      `<option ${
                        p.label === c.label ? "selected" : ""
                      }>${escapeHtml(c.label)}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div><label>Qty</label><input type="number" min="1" value="${
              Number(p.qty) || 1
            }" data-k="qty"></div>
            <div>
              <label>Price ($)</label>
              <div class="row no-print" style="gap:6px; align-items:center;">
                <input type="number" min="0" step="0.01" value="${
                  Number(p.price) || 0
                }" data-k="price" style="flex:1">
                <button class="btn ghost" data-act="removeProblem" data-problem-idx="${pi}">Remove</button>
              </div>
            </div>
          `;
          // Events
          const priceInput = row.querySelector('[data-k="price"]');
          row
            .querySelector('[data-k="label"]')
            .addEventListener("change", (e) => {
              p.label = e.target.value;
              const def =
                state.catalog.find((c) => c.label === p.label)?.defaultPrice ||
                0;
              p.price = def;
              if (priceInput) priceInput.value = def;
              saveAll();
              updateStationTotals();
            });
          row.querySelector('[data-k="qty"]').addEventListener("input", (e) => {
            p.qty = Math.max(1, parseInt(e.target.value || "1", 10));
            saveAll();
            updateStationTotals();
          });
          row
            .querySelector('[data-k="price"]')
            .addEventListener("input", (e) => {
              p.price = Math.max(0, parseFloat(e.target.value || "0"));
              saveAll();
              updateStationTotals();
            });
          row
            .querySelector('[data-act="removeProblem"]')
            .addEventListener("click", (e) => {
              e.preventDefault();
              st.problems.splice(pi, 1);
              if (!st.problems.length) {
                st.problems.push({ label: "", qty: 1, price: 0 });
              }
              saveAll();
              renderStations();
            });
          probsHost.appendChild(row);
        });
      }
      renderProblems();

      // Buttons
      const addProblemBtn = wrap.querySelector('[data-act="addProblem"]');
      if (addProblemBtn)
        addProblemBtn.addEventListener("click", () => {
          st.problems.push({ label: "", qty: 1, price: 0 });
          saveAll();
          renderStations();
        });
      wrap
        .querySelector('[data-act="removeStation"]')
        .addEventListener("click", () => {
          state.stations.splice(si, 1);
          saveAll();
          renderStations();
        });
      const stationNumberInput = wrap.querySelector('[data-k="stationNumber"]');
      if (stationNumberInput) {
        const commitStationNumber = () => {
          const next = Math.max(
            1,
            parseInt(stationNumberInput.value || String(st.number || 1), 10) || 1
          );
          st.number = next;
          stationNumberInput.value = String(next);
          saveAll();
        };
        stationNumberInput.addEventListener("change", commitStationNumber);
        stationNumberInput.addEventListener("blur", commitStationNumber);
      }
      const photoInput = wrap.querySelector('[data-act="photoInput"]');
      const photoLibraryBtn = wrap.querySelector('[data-act="photoLibrary"]');
      const photoCameraBtn = wrap.querySelector('[data-act="photoCamera"]');
      if (photoInput) {
        const triggerPicker = (mode) => {
          try {
            if (mode === "camera") {
              photoInput.setAttribute("capture", "environment");
            } else {
              photoInput.removeAttribute("capture");
            }
            photoInput.click();
          } catch (_) {}
        };
        if (photoLibraryBtn)
          photoLibraryBtn.addEventListener("click", (e) => {
            e.preventDefault();
            triggerPicker("library");
          });
        if (photoCameraBtn)
          photoCameraBtn.addEventListener("click", (e) => {
            e.preventDefault();
            triggerPicker("camera");
          });
        photoInput.addEventListener("change", (e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          Promise.all(files.map((f) => processImageFile(f)))
            .then((imgs) => {
              imgs.filter(Boolean).forEach((data) => st.photos.push(data));
              saveAll();
              renderStations();
            })
            .catch(() => {
              // keep state as-is on failure
            })
            .finally(() => {
              // allow picking the same file again on iOS and reset to neutral
              e.target.value = "";
              photoInput.removeAttribute("capture");
            });
        });
      }
      wrap.querySelectorAll('[data-act="removePhoto"]').forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.photoIdx);
          if (!Number.isNaN(idx)) {
            const removed = st.photos.splice(idx, 1)[0];
            if (removed && String(removed).startsWith("idb:")) {
              idbDelete(String(removed).slice(4)).catch(() => {});
            }
            saveAll();
            renderStations();
          }
        });
      });
      wrap.querySelector('[data-k="notes"]').addEventListener("input", (e) => {
        st.notes = e.target.value;
        saveAll();
      });

      stationsList.appendChild(wrap);
      hydratePhotos(wrap).catch(() => {});
    });
    updateTotalsUI();
  }

  async function hydratePhotos(root) {
    const imgs = Array.from(
      root.querySelectorAll("img.photo[data-photo]")
    );
    await Promise.all(
      imgs.map(async (img) => {
        const ref = img.getAttribute("data-photo") || "";
        if (ref.startsWith("idb:")) {
          const dataUrl = await idbGet(ref.slice(4));
          if (dataUrl) img.src = dataUrl;
        } else {
          img.src = ref;
        }
      })
    );
  }
  clearStationsOnLoad();
  renderCatalog();
  renderStations();
  migratePhotosToIdb();

  // Export / Backup
  $("#saveJson").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nova_irrigation_form_backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("#loadJson").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result || "{}"));
        if (next && typeof next === "object") {
          state = Object.assign(
            { client: state.client, stations: [], catalog: state.catalog },
            next
          );
          state.stations = normalizeStations(state.stations);
          // rebind client inputs
          [
            "jobName",
            "jobNumber",
            "clientName",
            "clientPhone",
            "address",
            "cityStateZip",
            "technician",
            "date",
            "notes",
            "statusOfController",
            "statusOfBackflow",
          ].forEach((id) => {
            const el = $("#" + id);
            if (el && next.client && id in next.client) {
              el.value = next.client[id] || "";
            }
          });
          saveAll();
          renderCatalog();
          renderStations();
        }
      } catch (err) {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(f);
  });

  function escapeHtml(s) {
    return String(s || "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }



// ===========================
// CLIENT CATALOG (Supabase + localStorage, cross-device)
// ===========================

// Local fallback cache (per-device)
const CC_KEY = "clientCatalog_v1";

// In-memory source used by dropdown + (optional) table
let clientRows = [];

function normalizeClientKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getClientRowKey(row) {
  const jobKey = normalizeClientKey(row && row.jobName);
  if (jobKey) return jobKey;
  const nameKey = normalizeClientKey(row && row.clientName);
  return nameKey;
}

function pickNewerClientRow(a, b) {
  const aTime = Date.parse(a && a.createdAt);
  const bTime = Date.parse(b && b.createdAt);
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
    return aTime > bTime ? a : b;
  }
  const aId = Number(a && a.id);
  const bId = Number(b && b.id);
  if (!Number.isNaN(aId) && !Number.isNaN(bId) && aId !== bId) {
    return aId > bId ? a : b;
  }
  if ((a && a.id) != null && (b && b.id) != null && a.id !== b.id) {
    return String(a.id) > String(b.id) ? a : b;
  }
  return a;
}

function dedupeClientRows(rows) {
  const map = new Map();
  const list = Array.isArray(rows) ? rows : [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i] || {};
    const key = getClientRowKey(row);
    if (!key) {
      map.set("idx:" + i, row);
      continue;
    }
    const prev = map.get(key);
    map.set(key, prev ? pickNewerClientRow(prev, row) : row);
  }
  return Array.from(map.values());
}

async function cleanupDuplicateClientRows(rows) {
  const seen = new Map();
  const list = Array.isArray(rows) ? rows : [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i] || {};
    const key = getClientRowKey(row);
    if (!key) continue;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, row);
      continue;
    }
    const keep = pickNewerClientRow(prev, row);
    const drop = keep === prev ? row : prev;
    seen.set(key, keep);
    const keepTime = Date.parse(keep && keep.createdAt);
    const dropTime = Date.parse(drop && drop.createdAt);
    if (
      drop &&
      drop.id != null &&
      !Number.isNaN(keepTime) &&
      !Number.isNaN(dropTime) &&
      dropTime !== keepTime
    ) {
      try {
        await softDeleteClientInSupabase(drop.id);
      } catch (err) {
        console.error("Failed to soft-delete duplicate client row:", err);
      }
    }
  }
}

// ----- localStorage helpers -----
function loadClientCatalog() {
  try {
    return JSON.parse(localStorage.getItem(CC_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveClientCatalog(list) {
  localStorage.setItem(CC_KEY, JSON.stringify(list || []));
}

// ----- Supabase helpers (client_catalog table) -----
// NOTE: relies on SUPABASE_URL + SUPA_HEADERS + supaFetch defined above in this file.

async function loadClientCatalogFromSupabase() {
  const rows = await supaFetch(
  "/client_catalog?select=id,job_name,controller_number,client_name,phone,email,address,city_state_zip,technician,active,created_at&active=eq.true&order=created_at.asc",
  { method: "GET" }
);

  return (rows || []).map((r) => ({
  id: r.id,
  jobName: r.job_name ?? "",
  controller: r.controller_number ?? "",
  clientName: r.client_name ?? "",
  clientPhone: r.phone ?? "",
  clientEmail: r.email ?? "",
  address: r.address ?? "",
  cityStateZip: r.city_state_zip ?? "",
  technician: r.technician ?? "",
  active: r.active ?? true,
  createdAt: r.created_at ?? "",
}));
}

async function upsertClientInSupabase(client) {
  const payload = {
  job_name: client.jobName || "",
  controller_number: client.controller || "",
  client_name: client.clientName || "",
  phone: client.clientPhone || "",
  email: client.clientEmail || "",
  address: client.address || "",
  city_state_zip: client.cityStateZip || "",
  technician: client.technician || "",
  active: client.active ?? true,
};

  if (client.id) {
    // PATCH existing
    await supaFetch(`/client_catalog?id=eq.${client.id}`, {
      method: "PATCH",
      headers: SUPA_HEADERS,
      body: JSON.stringify(payload),
    });
    return client.id;
  }

  // POST new
  const inserted = await supaFetch("/client_catalog", {
    method: "POST",
    headers: SUPA_HEADERS,
    body: JSON.stringify(payload),
  });

  // Supabase REST returns inserted rows when Prefer: return=representation
  return Array.isArray(inserted) && inserted[0] ? inserted[0].id : null;
}

async function softDeleteClientInSupabase(id) {
  if (!id) return;
  await supaFetch(`/client_catalog?id=eq.${id}`, {
    method: "PATCH",
    headers: SUPA_HEADERS,
    body: JSON.stringify({ active: false }),
  });
}

// ----- UI wiring -----
function populateClientPresetFromRows(rows) {
  const sel = document.getElementById("clientPreset");
  if (!sel) return;

  sel.innerHTML = '<option value="">— Select saved client —</option>';

  (rows || []).forEach((r) => {
    const opt = document.createElement("option");
    opt.value = String(r.id);
    // Show something friendly; include clientName only if present
    opt.textContent = r.clientName
      ? `${r.jobName || "(no job name)"} — ${r.clientName}`
      : `${r.jobName || "(no job name)"}`;
    sel.appendChild(opt);
  });
}

function fillClientInfoFromRow(it) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  };

  set("jobName", it.jobName);
  set("jobNumber", it.controller);
  set("clientName", it.clientName);
  set("clientPhone", it.clientPhone);
  set("clientEmail", it.clientEmail);
  set("address", it.address);
  set("cityStateZip", it.cityStateZip);
  set("technician", it.technician);
  set("notes", it.notes);
}

function clearClientInfoForm() {
  const ids = [
    "jobName",
    "jobNumber",
    "technician",
    "date",
    "clientName",
    "clientPhone",
    "clientEmail",
    "address",
    "cityStateZip",
    "notes",
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const sel = document.getElementById("clientPreset");
  if (sel) sel.value = "";
}

function initClientPresetControls() {
  const sel = document.getElementById("clientPreset");
  if (sel) {
    sel.addEventListener("change", () => {
    sel.addEventListener("change", () => {
  if (!sel.value) {
    clearClientInfoForm();
    return;
  }

  // existing code that fills the form...
});
      const id = Number(sel.value);
      if (!sel.value) return;

      const it = clientRows.find((r) => Number(r.id) === id);
      if (!it) return;

      fillClientInfoFromRow(it);
    });
  }

  const btnSave = document.getElementById("saveToClientCatalog");
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const get = (id) => document.getElementById(id);

      const item = {
        jobName: (get("jobName")?.value || "").trim(),
        controller: (get("jobNumber")?.value || "").trim(),
        clientName: (get("clientName")?.value || "").trim(),
        clientPhone: (get("clientPhone")?.value || "").trim(),
        clientEmail: (get("clientEmail")?.value || "").trim(),
        address: (get("address")?.value || "").trim(),
        cityStateZip: (get("cityStateZip")?.value || "").trim(),
        technician: (get("technician")?.value || "").trim(),
        notes: (get("notes")?.value || "").trim(),
        active: true,
      };

      if (!item.jobName) {
        alert("Please enter a Job Name before saving.");
        return;
      }

      try {
        // If a row with the same job name exists, update it
        const existing = clientRows.find(
          (r) => (r.jobName || "").toLowerCase() === item.jobName.toLowerCase()
        );
        if (existing) item.id = existing.id;

        await upsertClientInSupabase(item);
        await refreshClientCatalogUI(); // refresh dropdown/table + local cache
        alert("Saved to Client Catalog.");
      } catch (err) {
        console.error("Save to Supabase failed:", err);
        alert("Save failed. Check console for details.");
      }
    });
  }
}

// Optional: keep your Client Catalog tab table working
function renderClientCatalog() {
  const list = loadClientCatalog();
  const tbody = document.querySelector("#cc_table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  list.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.jobName || ""}</td>
      <td>${item.controller || ""}</td>
      <td>${item.clientName || ""}</td>
      <td>${item.clientPhone || ""}</td>
      <td>${item.clientEmail || ""}</td>
      <td class="num">
        <button class="btn" data-edit="${idx}">Edit</button>
        <button class="btn" data-del="${idx}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Edit: load row into Client Catalog form inputs (cc_* fields)
  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-edit"), 10);
      const it = loadClientCatalog()[i];
      if (!it) return;

      const map = {
        jobName: "cc_jobName",
        controller: "cc_controller",
        clientName: "cc_clientName",
        clientPhone: "cc_clientPhone",
        clientEmail: "cc_clientEmail",
        address: "cc_address",
        cityStateZip: "cc_cityStateZip",
        technician: "cc_technician",
        notes: "cc_notes",
      };

      Object.entries(map).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (el) el.value = it[k] || "";
      });

      const addBtn = document.getElementById("cc_addOrUpdate");
      if (addBtn) addBtn.setAttribute("data-index", String(i));
    });
  });

  // Delete: soft delete in Supabase (if we have id) + remove from local cache
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const i = parseInt(btn.getAttribute("data-del"), 10);
      const arr = loadClientCatalog();
      const it = arr[i];
      if (!it) return;

      // Best effort: if we can match by jobName to a Supabase row, soft-delete it too
      const supaRow = clientRows.find(
        (r) => (r.jobName || "").toLowerCase() === (it.jobName || "").toLowerCase()
      );
      if (supaRow?.id) {
        try {
          await softDeleteClientInSupabase(supaRow.id);
        } catch (e) {
          console.error("Soft delete failed:", e);
        }
      }

      arr.splice(i, 1);
      saveClientCatalog(arr);
      await refreshClientCatalogUI();
    });
  });
}

function initClientCatalogUI() {
  const get = (id) => document.getElementById(id);

  const fields = [
    "jobName",
    "controller",
    "clientName",
    "clientPhone",
    "clientEmail",
    "address",
    "cityStateZip",
    "technician",
    "notes",
  ];

  const btnAdd = get("cc_addOrUpdate");
  if (btnAdd) {
    btnAdd.addEventListener("click", async () => {
      const item = {};
      fields.forEach((f) => (item[f] = (get("cc_" + f)?.value || "").trim()));
      item.active = true;

      if (!item.jobName) {
        alert("Job Name is required.");
        return;
      }

      // If editing an existing local row, carry over its Supabase id if present
      const arr = loadClientCatalog();
      const idxAttr = btnAdd.getAttribute("data-index");
      if (idxAttr) {
        const i = parseInt(idxAttr, 10);
        const prev = arr[i];
        if (prev && prev.id) item.id = prev.id;
      } else {
        // Otherwise try to match by jobName in current Supabase cache
        const existing = clientRows.find(
          (r) => (r.jobName || "").toLowerCase() === item.jobName.toLowerCase()
        );
        if (existing) item.id = existing.id;
      }

      try {
        const newId = await upsertClientInSupabase(item);
        if (newId) item.id = newId;

        // Update local cache
        const arr2 = loadClientCatalog();
        const idx2 = arr2.findIndex(
          (x) => (x.jobName || "").toLowerCase() === item.jobName.toLowerCase()
        );
        if (idx2 >= 0) arr2[idx2] = item;
        else arr2.push(item);

        saveClientCatalog(arr2);

        // Reset edit mode
        btnAdd.removeAttribute("data-index");
        fields.forEach((f) => {
          const el = get("cc_" + f);
          if (el) el.value = "";
        });

        await refreshClientCatalogUI();
      } catch (err) {
        console.error("Client catalog save failed:", err);
        alert("Save failed. Check console for details.");
      }
    });
  }

  const btnNew = get("cc_new");
  if (btnNew) {
    btnNew.addEventListener("click", () => {
      fields.forEach((f) => {
        const el = get("cc_" + f);
        if (el) el.value = "";
      });
      btnAdd?.removeAttribute("data-index");
    });
  }

  const btnClr = get("cc_clearAll");
  if (btnClr) {
    btnClr.addEventListener("click", async () => {
      if (confirm("Clear all saved clients on this device?")) {
        saveClientCatalog([]);
        await refreshClientCatalogUI();
      }
    });
  }

  renderClientCatalog();
}

async function refreshClientCatalogUI() {
  try {
    const freshRows = await loadClientCatalogFromSupabase();
    await cleanupDuplicateClientRows(freshRows);
    clientRows = dedupeClientRows(freshRows);
  } catch (err) {
    console.error("Failed to load client catalog from Supabase", err);
    // fall back to local cache only if we have nothing in memory
    if (!clientRows || clientRows.length === 0) {
      clientRows = dedupeClientRows(loadClientCatalog());
    }
  }

  // Cache locally for offline + table UI
  saveClientCatalog(clientRows);

  renderClientCatalog();
  populateClientPresetFromRows(clientRows);
}

// Bootstrap
document.addEventListener("DOMContentLoaded", async () => {
  initClientCatalogUI();
  initClientPresetControls();

  // Load from Supabase immediately so dropdown works without unlocking any tab
  await refreshClientCatalogUI();

  clearClientInfoForm();
});
