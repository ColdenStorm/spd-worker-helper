// ==UserScript==
// @name         SPD helper (admin)
// @namespace    spdchat-helper
// @version      2.7.2
// @description  Worker panel + Google Sheets + active tickets + show top unread doctor in 'Люди' (whitelist) + People timers
// @match        *://spdchat.ru/*
// @match        *://*.spdchat.ru/*
// @updateURL    https://raw.githubusercontent.com/ColdenStorm/spd-worker-helper/main/SPD%20helper%20(admin).js
// @downloadURL  https://raw.githubusercontent.com/ColdenStorm/spd-worker-helper/main/SPD%20helper%20(admin).js
// @run-at       document-idle
// @grant        none
// ==/UserScript==


(function () {
  "use strict";

  var PANEL_ID = "spd-worker-helper-panel";

  var DOCK_BTN_ID = "spd-worker-dock-btn";
  var DOCK_STATE_KEY = "spd_worker_panel_docked"; // "1" = docked (hidden), "0" = shown

  var STORE_KEY = "spd_worker_name";
  var POS_KEY = "spd_worker_panel_pos_v1";

  // Google Apps Script Web App
  var API_URL = "https://script.google.com/macros/s/AKfycbyI2-k8zFppXB0HYPIkuqD5WAxYTZutq5_T83mQCXlSyRnFnkSKgRwioJgDBk8_2BBdIg/exec";
  var API_TOKEN = "spd_demo_2026_secret";

  // Настройка имён
  var WORKER_NAMES = ["Артём", "Вадим", "Вячеслав", "Павел"];
  var TOPICS = ["", "1С", "VPN", "Другое"];

  function norm(s) {
    return (s || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  function yyyyMmDd(d) {
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function getGreeting() {
    var d = new Date();
    var m = d.getHours() * 60 + d.getMinutes();
    if (m >= 360 && m <= 660) return "Доброе утро";
    if (m >= 661 && m <= 1080) return "Добрый день";
    return "Добрый вечер";
  }

  // ===== Doctors whitelist (from admin script) =====

  var DOCTORS_LIST = [
    "Абакумов Дмитрий Викторович",
    "Абрамушкин Сергей Эдуардович",
    "Акопян Елена Михайловна",
    "Алешин Денис Александрович",
    "Ануфриева Татьяна Валерьевна",
    "Артемова Инна Александровна",
    "Бабинов Евгений Валерьевич",
    "Бобович Наталья Вячеславовна",
    "Будаева Анжелика Александровна",
    "Бушуев Иван Александрович",
    "Бушуева Дарья Борисовна",
    "Виноградская Галина Александровна",
    "Власова Татьяна Александровна",
    "Воронина Анна Александровна",
    "Гац Вадим Викторович",
    "Гавина Ирина Александровна",
    "Германова Дарья Николаевна",
    "Гермашева Наталья Николаевна",
    "Глазунова Маргарита Николаевна",
    "Груздева Наталья Николаевна",
    "Гурченко Татьяна Александровна",
    "Данилова Ольга Александровна",
    "Девидченко Людмила Парфирьевна",
    "Добрынина Инна Сергеевна",
    "Дубровский Иван Владимирович",
    "Егоров Виктор Алексеевич",
    "Ермоленко Дмитрий Сергеевич",
    "Зарипова Лилия Азатовна",
    "Заря Елена Владимировна",
    "Захаров Александр Олегович",
    "Зеленина Юлия Анатольевна",
    "Кабатов Вадим Юрьевич",
    "Кадиева Эльмира Адзикадиевна",
    "Канаева Татьяна Александровна",
    "Каргин Иван Андреевич",
    "Карпеева Ольга Павловна",
    "Киреенко Александра Александровна",
    "Кирсанов Владислав Александрович",
    "Кисилёва Юлия Сергеевна",
    "Ковалёв Евгений Игоревич",
    "Коваленко Владимир Сергеевич",
    "Колесников Алексей Николаевич",
    "Кондурова Ольга Александровна",
    "Кононенко Оксана Владимировна",
    "Кравцова Ольга Срегеевна",
    "Красников Евгений Евгеньевич",
    "Красовская Маргарита Сергеевна",
    "Кубачева Камила Кубачевна",
    "Купцов Леонид Аркадьевич",
    "Лебедкин Дмитрий Евгеньевич",
    "Лухта Елизавета Васильевна",
    "Луценко Людмила Евгеньевна",
    "Мандровская Ирина Геннадьевна",
    "Матвеева Ксения Александровна",
    "Мелентьева Ольга Николаевна",
    "Мельник Анастасия Юрьевна",
    "Меньшикова Ольга Владимировна",
    "Милякова Валентина Николаевна",
    "Минина Евдокия Михайловна",
    "Мирончук Мария Викторовна",
    "Михайличенко Иван Валерьевич",
    "Михайлова Анастасия Валерьевна",
    "Михайлова Ирина Владимировна",
    "Муравская Нина Владимировна",
    "Некрасова Н.А.",
    "Ненашева Ольга Вячеславовна",
    "Неретин Кирилл Юрьевич",
    "Остропольская Дарья Михайловна",
    "Паркаев Вячеслав Викторович",
    "Персаева Альбина Руслановна",
    "Пирогова Ирина Владимировна",
    "Полин Денис Сергеевич",
    "Пьянзина Марина Александровна",
    "Рачинская Ирина Валентиновна",
    "Росновская Лидия Альбертовна",
    "Рысев Павел Андреевич",
    "Савинова Екатерина Юьевна",
    "Сафонова Татьяна Дмитриевна",
    "Сбоев Олег Альбертович",
    "Сивцев Вадим Васильевич",
    "Сикорский Марат Александрович",
    "Смолицкая Анна Валентиновна",
    "Спасская Наталья Васильевна",
    "Стельмах Екатерина Николаевна",
    "Студенников Сергей Васильевич",
    "Сухоленцева Евгения Алексеевна",
    "Тимошенко Владимир Владимирович",
    "Тимошенко Владимир Олегович",
    "Титова Наталья Юьевна",
    "Тихановская Любовь Михайловна",
    "Томашов Кирилл Михайлович",
    "Тулина Екатерина Николаевна",
    "Фатеева Наталья Васильевна",
    "Филатов Юрий Леонтьевич",
    "Фролов Максим Станиславович",
    "Храмцова Екатерина Юьевна",
    "Храмченкова Виктория Михайловна",
    "Чекалина Анастасия Александровна",
    "Чудина Екатерина Александровна",
    "Шадирякова Елена Михайловна",
    "Шандер Дарья Борисовна",
    "Эркенов Расул Асланбиевич"
  ];

  function normName(s) {
    return (s || "")
      .replace(/ё/gi, "е")
      .replace(/[.,]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "")
      .toLowerCase();
  }

  var DOCTOR_MAP = {};
  (function buildDoctorMap() {
    for (var i = 0; i < DOCTORS_LIST.length; i++) {
      var line = DOCTORS_LIST[i];
      var full = normName(line);
      if (full) DOCTOR_MAP[full] = true;

      // добавляем "Фамилия Имя"
      var parts = line.replace(/[.,]/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").split(" ");
      if (parts.length >= 2) {
        var two = normName(parts[0] + " " + parts[1]);
        if (two) DOCTOR_MAP[two] = true;
      }
    }
  })();

  function isDoctorByName(name) {
    var n = normName(name);
    return !!DOCTOR_MAP[n];
  }

  function extractNameFromAriaLabel(raw) {
    var s = norm(raw);

    s = s.replace(/\s+Непрочитанные\s+сообщения\.?$/i, "");
    s = s.replace(/\s+Непрочит.*$/i, "");
    s = s.replace(/\s+Unread.*$/i, "");

    s = s.replace(/\s*[•·]\s*\d+\s*$/i, "");
    s = s.replace(/\s*\(\s*\d+\s*\)\s*$/i, "");
    s = s.replace(/\s+\d+\s*$/i, "");

    return norm(s);
  }

  function getAriaFromTile(tile) {
    if (!tile) return "";
    var raw = tile.getAttribute("aria-label");
    if (raw) return raw;

    var el = tile.querySelector("[aria-label]");
    if (el) return el.getAttribute("aria-label") || "";
    return "";
  }

  function tileHasUnread(tile, rawAria) {
    if (/Непрочит|Unread/i.test(rawAria || "")) return true;

    var badge =
      tile.querySelector(".mx_NotificationBadge_visible") ||
      tile.querySelector(".mx_NotificationBadge") ||
      tile.querySelector(".mx_NotificationBadge_count") ||
      tile.querySelector(".mx_NotificationBadge_indicator");

    if (badge) return true;

    var anyBadge = tile.querySelector('[class*="NotificationBadge"]');
    if (anyBadge) return true;

    return false;
  }

  function getPeopleTilesRoot() {
    var sublists = document.querySelectorAll(".mx_RoomSublist");
    for (var i = 0; i < sublists.length; i++) {
      var sub = sublists[i];
      var header = sub.querySelector(".mx_RoomSublist_headerContainer");
      var aria = header ? norm(header.getAttribute("aria-label")) : "";
      var text = header ? norm(header.textContent) : "";
      if (aria === "Люди" || text === "Люди") return sub.querySelector(".mx_RoomSublist_tiles");
    }
    return null;
  }

  function findTopUnreadDoctorInPeople() {
    var root = getPeopleTilesRoot();
    if (!root) return "";

    var tiles = root.querySelectorAll(".mx_RoomTile");
    for (var i = 0; i < tiles.length; i++) {
      var tile = tiles[i];

      var raw = getAriaFromTile(tile);
      if (!raw) continue;

      if (!tileHasUnread(tile, raw)) continue;

      var name = extractNameFromAriaLabel(raw);
      if (isDoctorByName(name)) return name;
    }
    return "";
  }

  // Worker name is stored only in-memory for this page load (asks again after reload)
  var _workerNameMem = "";

  function getWorkerName() {
    for (var i = 0; i < WORKER_NAMES.length; i++) if (WORKER_NAMES[i] === _workerNameMem) return _workerNameMem;
    return "";
  }

  function setWorkerName(name) {
    for (var i = 0; i < WORKER_NAMES.length; i++) {
      if (WORKER_NAMES[i] === name) {
        _workerNameMem = name;
        return;
      }
    }
  }

  function ensureWorkerName() {
    return getWorkerName();
  }

  function findComposer() {
    return (
      document.querySelector('[contenteditable="true"][role="textbox"]') ||
      document.querySelector('[contenteditable="true"]')
    );
  }

  function showWorkerModal() {
    if (document.getElementById("spd-worker-modal")) return;
    if (!document.body) return;

    var overlay = document.createElement("div");
    overlay.id = "spd-worker-modal";
    overlay.style.cssText =
      "position:fixed;left:50%;top:14px;transform:translateX(-50%);" +
      "z-index:2147483647;background:rgba(20,22,30,.96);" +
      "border:1px solid rgba(255,255,255,.14);border-radius:14px;" +
      "box-shadow:0 14px 40px rgba(0,0,0,.45);" +
      "padding:10px 12px;min-width:320px;max-width:520px;color:#fff;" +
      "font:12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;";

    var title = document.createElement("div");
    title.textContent = "Выбери имя сотрудника (после перезагрузки спросит снова):";
    title.style.cssText = "margin:0 0 8px 0;opacity:.95;font-weight:700;";

    var row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;align-items:center;";

    var sel = document.createElement("select");
    sel.style.cssText =
      "flex:1;min-width:160px;padding:7px 10px;border-radius:10px;" +
      "border:1px solid rgba(255,255,255,.18);background:#1f2330;color:#fff;outline:none;" +
      "font:600 13px system-ui;";

    for (var i = 0; i < WORKER_NAMES.length; i++) {
      var opt = document.createElement("option");
      opt.value = WORKER_NAMES[i];
      opt.textContent = WORKER_NAMES[i];
      sel.appendChild(opt);
    }

    var ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "OK";
    ok.style.cssText =
      "padding:7px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);" +
      "background:rgba(255,255,255,.12);color:#fff;cursor:pointer;font:800 13px system-ui;";

    ok.addEventListener("click", function () {
      setWorkerName(sel.value);
      try { overlay.parentNode && overlay.parentNode.removeChild(overlay); } catch (e) { overlay.style.display = "none"; }
      try {
        if (window.__SPD_PANEL_API__) {
          window.__SPD_PANEL_API__.updateActionButtonsState();
          window.__SPD_PANEL_API__.updateCloseState();
          window.__SPD_PANEL_API__.renderActiveList();
        }
      } catch (e2) {}
    });

    row.appendChild(sel);
    row.appendChild(ok);

    overlay.appendChild(title);
    overlay.appendChild(row);

    document.body.appendChild(overlay);
  }

  function ensureWorkerPicked() {
    if (getWorkerName()) { window.__SPD_WORKER_READY__ = true; return true; }
    window.__SPD_WORKER_READY__ = false;
    showWorkerModal();
    return false;
  }

  function clickSendButton() {
    var actions = document.querySelector(".mx_MessageComposer_actions");
    if (actions) {
      var btnA = actions.querySelector('div[role="button"].mx_MessageComposer_sendMessage');
      if (btnA && !btnA.getAttribute("aria-disabled")) {
        btnA.click();
        return true;
      }
    }

    var btn =
      document.querySelector('div.mx_AccessibleButton.mx_MessageComposer_sendMessage[role="button"]') ||
      document.querySelector('div[role="button"].mx_MessageComposer_sendMessage') ||
      document.querySelector('div[role="button"][aria-label*="Отправить"][class*="sendMessage"]');

    if (btn && !btn.getAttribute("aria-disabled")) {
      btn.click();
      return true;
    }

    return false;
  }

  function sendMessage(text) {
    var el = findComposer();
    if (!el) {
      alert("Кликни в поле ввода сообщения.");
      return false;
    }

    el.focus();

    try {
      document.execCommand("selectAll", false, null);
      document.execCommand("delete", false, null);
    } catch (e) {}

    var okInsert = false;
    try { okInsert = document.execCommand("insertText", false, text); } catch (e2) {}

    if (!okInsert) el.textContent = text;

    try {
      var ev = document.createEvent("Event");
      ev.initEvent("input", true, true);
      el.dispatchEvent(ev);
    } catch (e3) {}

    function trySend(attempt) {
      if (clickSendButton()) return true;
      if (attempt >= 3) return false;

      var delays = [0, 60, 140];
      setTimeout(function () { trySend(attempt + 1); }, delays[attempt]);
      return true;
    }

    setTimeout(function () { trySend(0); }, 0);
    return true;
  }

  function getCurrentRoomId() {
    var h = window.location.hash || "";
    var m = h.match(/#\/room\/([^/?]+)/);
    if (m && m[1]) return m[1];
    return "";
  }

  function getCurrentRoomTitle() {
    var el =
      document.querySelector(".mx_RoomHeader_name") ||
      document.querySelector(".mx_RoomHeader .mx_RoomHeader_name") ||
      document.querySelector(".mx_RoomHeader h1") ||
      document.querySelector(".mx_RoomHeader h2") ||
      document.querySelector(".mx_RoomHeader .mx_Heading_h1") ||
      document.querySelector(".mx_RoomHeader .mx_Heading_h2") ||
      document.querySelector(".mx_RoomHeader .mx_RoomHeader_heading") ||
      document.querySelector("[data-testid='room-header-title']") ||
      document.querySelector(".mx_RoomHeader");

    var t = norm(el ? el.textContent : "");
    if (t.indexOf("\n") !== -1) t = t.split("\n")[0];
    return norm(t);
  }

  // ===== Active tickets storage =====
  function loadActiveTickets() {
    return safeJsonParse(localStorage.getItem("spd_active_tickets_v1") || "{}") || {};
  }
  function saveActiveTickets(obj) {
    localStorage.setItem("spd_active_tickets_v1", JSON.stringify(obj || {}));
  }
  function setActiveTicket(roomId, data) {
    var all = loadActiveTickets();
    all[roomId || "__no_room__"] = data;
    saveActiveTickets(all);
  }
  function getActiveTicket(roomId) {
    var all = loadActiveTickets();
    return all[roomId || "__no_room__"] || null;
  }
  function clearActiveTicket(roomId) {
    var all = loadActiveTickets();
    delete all[roomId || "__no_room__"];
    saveActiveTickets(all);
  }

  // ===== Google Sheets logging (Image beacon GET) =====
  function postEvent(payload) {
    if (!API_URL) return;
    try {
      payload = payload || {};
      payload.token = API_TOKEN || "";

      var url = API_URL +
        "?token=" + encodeURIComponent(payload.token) +
        "&type=" + encodeURIComponent(payload.type || "") +
        "&data=" + encodeURIComponent(JSON.stringify(payload.data || {})) +
        "&_=" + Date.now();

      var img = new Image();
      img.src = url;
    } catch (e) {}
  }

  // ===== UI helpers =====
  function makeBtn(label, onClick) {
    var b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      "border:1px solid rgba(255,255,255,.12);" +
      "border-radius:10px;padding:7px 10px;" +
      "background:#2b2f3a;color:#fff;font:600 13px system-ui;cursor:pointer";
    b.onclick = onClick;
    return b;
  }

  function makeMiniBtn(label, title, onClick) {
    var b = document.createElement("button");
    b.textContent = label;
    b.title = title || "";
    b.style.cssText =
      "border:1px solid rgba(255,255,255,.12);" +
      "border-radius:8px;padding:4px 8px;" +
      "background:#1f2330;color:#fff;font:700 12px system-ui;cursor:pointer";
    b.onclick = onClick;
    return b;
  }

  function setBtnDisabled(btn, disabled) {
    btn.disabled = !!disabled;
    btn.style.opacity = disabled ? "0.45" : "1";
    btn.style.cursor = disabled ? "not-allowed" : "pointer";
  }

  function makeSelect(options, value, onChange, placeholder) {
    var s = document.createElement("select");
    s.style.cssText =
      "border:1px solid rgba(255,255,255,.12);" +
      "border-radius:10px;padding:7px 10px;" +
      "background:#1f2330;color:#fff;font:600 13px system-ui;cursor:pointer";

    for (var i = 0; i < options.length; i++) {
      var o = document.createElement("option");
      o.value = options[i];
      if (!options[i] && placeholder) o.textContent = placeholder;
      else o.textContent = options[i] || "—";
      s.appendChild(o);
    }

    s.value = value;
    s.onchange = function () { onChange(s.value); };
    return s;
  }

  function loadPos() {
    try { return JSON.parse(localStorage.getItem(POS_KEY) || "null"); } catch (e) { return null; }
  }
  function savePos(l, t) {
    localStorage.setItem(POS_KEY, JSON.stringify({ left: l, top: t }));
  }

  function getDockContainer() {
    return document.querySelector(".mx_AutoHideScrollbar.mx_SpaceTreeLevel");
  }

  function isDocked() {
    return localStorage.getItem(DOCK_STATE_KEY) === "1";
  }

  function setDocked(v) {
    localStorage.setItem(DOCK_STATE_KEY, v ? "1" : "0");
  }

  function ensureDockButton() {
    var host = getDockContainer();
    if (!host) return;

    if (document.getElementById(DOCK_BTN_ID)) return;

    var btn = document.createElement("button");
    btn.id = DOCK_BTN_ID;
    btn.type = "button";
    btn.title = "Панель SPDHelper";
    btn.textContent = "SPD";

    btn.style.cssText =
  "display:block;width:44px;height:44px;margin:10px auto 0 auto;" +
  "border-radius:14px;border:1px solid rgba(255,255,255,.18);" +
  "background:rgba(255,255,255,.08);color:#fff;cursor:pointer;" +
  "font:900 13px system-ui;line-height:44px;text-align:center;" +
  "box-shadow:0 12px 28px rgba(0,0,0,.35);" +
  "position:relative;left:8px;";

    btn.addEventListener("click", function () {
      setDocked(!isDocked());
      applyDockState();
    });

    try {
      var afterEl = host.querySelector('.mx_SpaceItem.mx_SpaceItem_new.collapsed');
      if (afterEl && afterEl.parentNode === host) {
        if (afterEl.nextSibling) {
          host.insertBefore(btn, afterEl.nextSibling);
        } else {
          host.appendChild(btn);
        }
      } else {
        host.appendChild(btn);
      }
    } catch (e) {
      host.appendChild(btn);
    }
  }

  function applyDockState() {
    ensureDockButton();
    var panel = document.getElementById(PANEL_ID);
    var btn = document.getElementById(DOCK_BTN_ID);

    if (btn) {
      btn.style.opacity = isDocked() ? "0.85" : "1";
      btn.style.outline = isDocked() ? "2px solid rgba(124,255,155,.35)" : "none";
    }

    if (!panel) return;

    panel.style.display = isDocked() ? "none" : "block";

    // if panel becomes visible and was outside viewport, bring it back
    if (!isDocked()) { try { setTimeout(ensurePanelVisible, 50); } catch (eV) {} }
  }

  function scheduleDockInit() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      ensureDockButton();
      if (document.getElementById(DOCK_BTN_ID)) {
        clearInterval(t);
        applyDockState();
      } else if (tries >= 200) {
        clearInterval(t);
      }
    }, 250);
  }

  function removePanel() {
    var p = document.getElementById(PANEL_ID);
    if (p && p.parentNode) p.parentNode.removeChild(p);
  }

  function makeDraggable(panel, handle) {
    var sx = 0, sy = 0, sl = 0, st = 0, drag = false;

    handle.onmousedown = function (e) {
      drag = true;
      var r = panel.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY;
      sl = r.left; st = r.top;
      document.body.style.userSelect = "none";
      e.preventDefault();
    };

    document.onmousemove = function (e) {
      if (!drag) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      var r = panel.getBoundingClientRect();
      var l = clamp(sl + dx, 6, window.innerWidth - r.width - 6);
      var t = clamp(st + dy, 6, window.innerHeight - r.height - 6);
      panel.style.left = l + "px";
      panel.style.top = t + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    };

    document.onmouseup = function () {
      if (!drag) return;
      drag = false;
      document.body.style.userSelect = "";
      var r = panel.getBoundingClientRect();
      savePos(r.left, r.top);
    };
  }

  // ===== Keep panel visible on window resize =====
  function ensurePanelVisible() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    var r = panel.getBoundingClientRect();

    // If panel is hidden by docking, skip adjustments
    if (panel.style.display === "none") return;

    var l = r.left;
    var t = r.top;

    // If panel uses right/bottom anchoring (no left/top), do nothing
    // but in our script we usually set left/top when dragging.
    // We'll still correct if it is out of view.
    var maxL = window.innerWidth - r.width - 6;
    var maxT = window.innerHeight - r.height - 6;

    // If viewport is smaller than panel, keep at (6,6)
    if (maxL < 6) maxL = 6;
    if (maxT < 6) maxT = 6;

    var newL = clamp(l, 6, maxL);
    var newT = clamp(t, 6, maxT);

    // Only move if needed
    if (Math.abs(newL - l) > 0.5 || Math.abs(newT - t) > 0.5) {
      panel.style.left = newL + "px";
      panel.style.top = newT + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      try { savePos(newL, newT); } catch (e) {}
    }
  }

  function formatDuration(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    if (h > 0) return h + ":" + pad(m) + ":" + pad(s);
    return m + ":" + pad(s);
  }

  // ===== Top unread doctor updater (works without opening DM) =====
  var _docScheduled = false;
  var _doctorPreviewEl = null;

  function requestDoctorPreviewUpdate() {
    if (_docScheduled) return;
    _docScheduled = true;

    var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
    raf(function () {
      _docScheduled = false;
      var doc = findTopUnreadDoctorInPeople();
      if (_doctorPreviewEl) _doctorPreviewEl.textContent = doc ? ("Непрочитанный врач: " + doc) : "Непрочитанный врач: —";
    });
  }

  var _leftObs = null;
  var _leftNode = null;

  function getLeftNode() {
    return (
      document.querySelector(".mx_LeftPanel_roomListWrapper") ||
      document.querySelector(".mx_LeftPanel") ||
      null
    );
  }

  function attachLeftObserver() {
    var current = getLeftNode();
    if (!current) return false;

    if (current !== _leftNode) {
      if (_leftObs) _leftObs.disconnect();
      _leftNode = current;

      _leftObs = new MutationObserver(function () { requestDoctorPreviewUpdate(); });
      _leftObs.observe(_leftNode, { subtree: true, childList: true, attributes: true });

      _leftNode.addEventListener("click", function () {
        setTimeout(requestDoctorPreviewUpdate, 80);
      }, true);

      requestDoctorPreviewUpdate();
    }
    return true;
  }

  var _bodyObs = null;
  function attachBodyObserver() {
    if (_bodyObs) return;
    _bodyObs = new MutationObserver(function () {
      attachLeftObserver();
    });
    _bodyObs.observe(document.body, { subtree: true, childList: true });
  }

  // ===== UI Mount =====
  function mountPanel() {
    if (document.getElementById(PANEL_ID) || !document.body) return true;

    // style for labels under People names
    if (!document.getElementById("spd-people-label-style")) {
      var st = document.createElement("style");
      st.id = "spd-people-label-style";
      st.textContent = ".spd-people-inwork{font-size:11px;font-weight:700;color:#fff;margin-top:2px;white-space:nowrap;opacity:.92;}";
      document.head.appendChild(st);
    }

    var panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText =
      "position:fixed;right:14px;bottom:14px;z-index:2147483647;" +
      "background:rgba(20,22,28,.96);border:1px solid rgba(255,255,255,.10);" +
      "border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px;" +
      "box-shadow:0 14px 40px rgba(0,0,0,.45);min-width:420px;max-width:560px";

    var pos = loadPos();
    if (pos) {
      panel.style.left = pos.left + "px";
      panel.style.top = pos.top + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    }

    // top row
    var top = document.createElement("div");
    top.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;align-items:center";

    var drag = document.createElement("div");
    drag.textContent = "⠿";
    drag.title = "Перетащить";
    drag.style.cssText =
      "width:22px;height:28px;display:flex;align-items:center;justify-content:center;" +
      "border:1px solid rgba(255,255,255,.12);border-radius:10px;" +
      "background:#1f2330;color:#fff;font:800 16px system-ui;cursor:grab";

    var topicSelect = makeSelect(TOPICS, "", function () {
      // ⚠ Важно: выбор темы НЕ берёт заявку в работу.
      // Заявка берётся в работу ТОЛЬКО по кнопкам "👋 Приветствие" и "🗂 Архив".
      if (!ensureWorkerPicked()) return;
      updateCloseState();
    }, "Тема заявки…");

    // Hidden option for Archive (so the Archive button can set it without showing in the dropdown)
    try {
      var oArch = document.createElement("option");
      oArch.value = "Архив";
      oArch.textContent = "Архив";
      oArch.hidden = true;
      topicSelect.appendChild(oArch);
    } catch (e) {}

    var btnHello = makeBtn("👋 Приветствие", function () {
      if (!ensureWorkerPicked()) return;
      var worker = ensureWorkerName();
      var text = getGreeting() + ", " + worker + ", тех поддержка.";

      var ok = sendMessage(text);
      if (!ok) return;

      var roomId = getCurrentRoomId();
      var doctor = getCurrentRoomTitle();

      var startedAt = new Date();
      var ticket = {
        date: yyyyMmDd(startedAt),
        taken_at: startedAt.toISOString(),
        worker_name: worker,
        doctor_fio: doctor,
        room_id: roomId
      };

      setActiveTicket(roomId, ticket);
      postEvent({ type: "ticket_taken", data: ticket });
      updateCloseState();
      renderActiveList();
    });

    var btnArchive = makeBtn("🗂 Архив", function () {
      if (!ensureWorkerPicked()) return;

      try {
        var optA = topicSelect.querySelector('option[value="Архив"]');
        if (!optA) {
          optA = document.createElement("option");
          optA.value = "Архив";
          optA.textContent = "Архив";
          optA.hidden = true;
          topicSelect.appendChild(optA);
        }
        topicSelect.value = "Архив";
        try { topicSelect.dispatchEvent(new Event("change", { bubbles: true })); } catch (eE) {}
      } catch (e0) {}

      var worker = ensureWorkerName();
      if (!worker) return;

      var roomId = getCurrentRoomId();
      var doctor = getCurrentRoomTitle();

      var existing = getActiveTicket(roomId);
      if (!existing) {
        var startedAt = new Date();
        var ticket = {
          date: yyyyMmDd(startedAt),
          taken_at: startedAt.toISOString(),
          worker_name: worker,
          doctor_fio: doctor,
          room_id: roomId
        };

        setActiveTicket(roomId, ticket);
        postEvent({ type: "ticket_taken", data: ticket });
      }

      updateCloseState();
      renderActiveList();
      tickTimers();

      try { sendMessage("Сейчас поищу, ожидайте."); } catch (e1) {}
    });

    var btnCloseTicket = makeBtn("✅ Закрыть", function () {
      var roomId = getCurrentRoomId();
      var ticket = getActiveTicket(roomId);
      if (!ticket) return;

      var topic = topicSelect.value || "";
      if (!topic) return;

      var closedAt = new Date();
      var takenMs = Date.parse(ticket.taken_at);
      var durationSec = takenMs ? Math.max(0, Math.round((closedAt.getTime() - takenMs) / 1000)) : 0;

      var record = {
        date: ticket.date,
        taken_at: ticket.taken_at,
        worker_name: ticket.worker_name,
        doctor_fio: ticket.doctor_fio,
        duration_sec: durationSec,
        topic: topic,
        closed_at: closedAt.toISOString(),
        room_id: ticket.room_id
      };

      postEvent({ type: "ticket_closed", data: record });

      clearActiveTicket(roomId);
      topicSelect.value = "";

      updateCloseState();
      renderActiveList();
    });

    top.appendChild(drag);
    top.appendChild(topicSelect);
    top.appendChild(btnHello);
    top.appendChild(btnArchive);
    top.appendChild(btnCloseTicket);

    var doctorPreview = document.createElement("div");
    doctorPreview.style.cssText =
      "border:1px solid rgba(255,255,255,.10);border-radius:12px;" +
      "background:rgba(31,35,48,.55);color:#fff;" +
      "padding:7px 10px;font:800 12px system-ui;min-width:320px";
    doctorPreview.textContent = "Непрочитанный врач: —";
    _doctorPreviewEl = doctorPreview;

    try { attachBodyObserver(); } catch (eO) {}
    var _triesDoc = 0;
    var _timerDoc = setInterval(function () {
      var ok = attachLeftObserver();
      if (ok || ++_triesDoc > 80) clearInterval(_timerDoc);
    }, 250);
    requestDoctorPreviewUpdate();

    var listTitle = document.createElement("div");
    listTitle.style.cssText = "color:#fff;font:700 12px system-ui;opacity:.9;margin-top:6px";
    listTitle.textContent = "Активные заявки";

    var list = document.createElement("div");
    list.style.cssText =
      "display:flex;flex-direction:column;gap:6px;" +
      "border:1px solid rgba(255,255,255,.10);border-radius:12px;" +
      "padding:8px;background:rgba(31,35,48,.55)" + ";margin-top:8px";

    function updateActionButtonsState() {
      var ready = !!getWorkerName();
      setBtnDisabled(btnHello, !ready);
      setBtnDisabled(btnArchive, !ready);
      try { topicSelect.disabled = !ready; } catch (e) {}
    }

    function updateCloseState() {
      var roomId = getCurrentRoomId();
      var ticket = getActiveTicket(roomId);
      var topic = topicSelect.value || "";
      setBtnDisabled(btnCloseTicket, !(ticket && topic));
    }

    window.__SPD_PANEL_API__ = {
      renderActiveList: renderActiveList,
      updateCloseState: updateCloseState,
      updateActionButtonsState: updateActionButtonsState
    };

    function navigateToRoom(roomId) {
      if (!roomId) return;
      window.location.hash = "#/room/" + roomId;
    }

    function renderActiveList() {
      while (list.firstChild) list.removeChild(list.firstChild);

      var worker = ensureWorkerName();
      var all = loadActiveTickets();
      var items = [];

      for (var rid in all) {
        if (!all.hasOwnProperty(rid)) continue;
        var t = all[rid];
        if (!t) continue;
        if (String(t.worker_name || "") !== String(worker)) continue;
        items.push(t);
      }

      items.sort(function (a, b) {
        var ta = Date.parse(a.taken_at || "") || 0;
        var tb = Date.parse(b.taken_at || "") || 0;
        return ta - tb;
      });

      if (!items.length) {
        var empty = document.createElement("div");
        empty.style.cssText = "color:rgba(255,255,255,.75);font:600 12px system-ui";
        empty.textContent = "Нет активных заявок";
        list.appendChild(empty);
        return;
      }

      for (var i = 0; i < items.length; i++) {
        (function (ticket) {
          var row = document.createElement("div");
          row.style.cssText =
            "display:flex;gap:8px;align-items:center;justify-content:space-between;" +
            "border:1px solid rgba(255,255,255,.10);border-radius:10px;" +
            "padding:8px;background:rgba(20,22,28,.55)";

          var left = document.createElement("div");
          left.style.cssText = "display:flex;flex-direction:column;gap:2px;min-width:0";

          var fio = document.createElement("div");
          fio.style.cssText = "color:#fff;font:800 12px system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px";
          fio.textContent = "В работе: " + (ticket.doctor_fio || "—");

          var timer = document.createElement("div");
          timer.style.cssText = "color:rgba(255,255,255,.85);font:700 12px system-ui";
          timer.setAttribute("data-taken-at", ticket.taken_at || "");
          timer.textContent = "⏱ 0:00";

          left.appendChild(fio);
          left.appendChild(timer);

          var right = document.createElement("div");
          right.style.cssText = "display:flex;gap:6px;align-items:center;flex-shrink:0";

          var btnGo = makeMiniBtn("↗", "Перейти в чат", function () {
            navigateToRoom(ticket.room_id || "");
          });

          right.appendChild(btnGo);

          row.appendChild(left);
          row.appendChild(right);

          list.appendChild(row);
        })(items[i]);
      }
    }

    function updatePeopleLabelsFromTickets(nowMs) {
      var root = getPeopleTilesRoot();
      if (!root) return;

      var all = loadActiveTickets() || {};
      var map = {};
      for (var rid in all) {
        if (!all.hasOwnProperty(rid)) continue;
        var t = all[rid];
        if (!t || !t.doctor_fio || !t.taken_at) continue;
        var ms = Date.parse(t.taken_at);
        if (!ms) continue;
        var sec = Math.max(0, Math.floor(((nowMs || Date.now()) - ms) / 1000));
        map[normName(t.doctor_fio)] = { worker: t.worker_name || "", sec: sec };
      }

      var tiles = root.querySelectorAll(".mx_RoomTile");
      for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];

        var old = tile.querySelector(".spd-people-inwork");
        if (old) old.remove();

        var raw = getAriaFromTile(tile);
        var cleanName = extractNameFromAriaLabel(raw);
        var key = normName(cleanName);

        var data = map[key];
        if (!data) continue;

        var emoji = (data.sec >= 15 * 60) ? "🆘" : (data.sec >= 10 * 60) ? "⚠" : "👍";
        var title = tile.querySelector(".mx_RoomTile_titleContainer") || tile.querySelector(".mx_RoomTile_title") || tile;
        if (!title) continue;

        var div = document.createElement("div");
        div.className = "spd-people-inwork";
        div.textContent = formatDuration(data.sec) + " " + emoji + " В работе у: " + data.worker;

        title.appendChild(div);
      }
    }

    function tickTimers() {
      var timers = list.querySelectorAll("[data-taken-at]");
      var now = Date.now();
      for (var i = 0; i < timers.length; i++) {
        var el = timers[i];
        var takenAt = el.getAttribute("data-taken-at") || "";
        var ms = Date.parse(takenAt);
        if (!ms) {
          el.textContent = "⏱ —";
          el.style.color = "rgba(255,255,255,.85)";
        } else {
          var sec = Math.max(0, Math.floor((now - ms) / 1000));
          el.textContent = "⏱ " + formatDuration(sec);

          if (sec < 10 * 60) el.style.color = "#7CFF9B";
          else if (sec < 15 * 60) el.style.color = "#FFD86B";
          else el.style.color = "#FF6B6B";
        }
      }

      // ✅ синхронно обновляем подписи в "Люди"
      updatePeopleLabelsFromTickets(now);
    }

    panel.appendChild(top);
    panel.appendChild(doctorPreview);
    panel.appendChild(listTitle);
    panel.appendChild(list);

    document.body.appendChild(panel);

    scheduleDockInit();
    applyDockState();
    makeDraggable(panel, drag);
    // keep panel inside viewport on resize
    try { window.addEventListener("resize", ensurePanelVisible); } catch (eR) {}
    // and also run once right now
    setTimeout(ensurePanelVisible, 50);

    ensureWorkerPicked();
    updateActionButtonsState();
    updateCloseState();
    renderActiveList();
    tickTimers();

    setInterval(tickTimers, 1000);

    window.addEventListener("hashchange", function () {
      setTimeout(function () {
        ensureWorkerPicked();
        updateActionButtonsState();
        updateCloseState();
      }, 150);
    });

    window.addEventListener("storage", function (e) {
      if (e && e.key === "spd_active_tickets_v1") renderActiveList();
    });

    return true;
  }

  removePanel();

  var tries = 0;
  var timer = setInterval(function () {
    if (mountPanel() || ++tries > 40) clearInterval(timer);
  }, 200);


})();





