// ==UserScript==
// @name         SPD helper (Modified)
// @namespace    spdchat-helper
// @version      3.0.3
// @description  Worker panel: UI buttons, active tickets manager with cross button (no auto-send)
// @match        *://spdchat.ru/*
// @match        *://*.spdchat.ru/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  var PANEL_ID = "spd-worker-helper-panel";
  var DOCK_BTN_ID = "spd-worker-dock-btn";
  var DOCK_STATE_KEY = "spd_worker_panel_docked";

  var STORE_KEY = "spd_worker_name";
  var POS_KEY = "spd_worker_panel_pos_v1";

  // Настройка имён
  var WORKER_NAMES = ["Артём", "Вадим", "Вячеслав", "Павел"];

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

  var _workerNameMem = "";

  function getWorkerName() {
    for (var i = 0; i < WORKER_NAMES.length; i++) {
      if (WORKER_NAMES[i] === _workerNameMem) return _workerNameMem;
    }
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
    if (isDocked()) {
      panel.style.display = "none";
    } else {
      panel.style.display = "block";
    }
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

  function ensurePanelVisible() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    var r = panel.getBoundingClientRect();
    if (panel.style.display === "none") return;

    var l = r.left;
    var t = r.top;

    var maxL = window.innerWidth - r.width - 6;
    var maxT = window.innerHeight - r.height - 6;

    if (maxL < 6) maxL = 6;
    if (maxT < 6) maxT = 6;

    var newL = clamp(l, 6, maxL);
    var newT = clamp(t, 6, maxT);

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

  function getTimelineRoot() {
    return (
      document.querySelector(".mx_RoomView_messagePanel") ||
      document.querySelector(".mx_RoomView_timeline") ||
      document.querySelector(".mx_TimelinePanel") ||
      document.querySelector(".mx_RoomView") ||
      document.body
    );
  }

  function isSupportGreetingText(t) {
    t = norm(t).toLowerCase();
    if (!t) return false;
    if (t.indexOf("тех поддержка") === -1) return false;
    return true;
  }

  function parseTileTs(tile) {
    var timeEl =
      tile.querySelector("time[datetime]") ||
      tile.querySelector(".mx_MessageTimestamp time[datetime]") ||
      tile.querySelector(".mx_MessageTimestamp") ||
      null;

    if (timeEl) {
      var dt = "";
      try { dt = timeEl.getAttribute && timeEl.getAttribute("datetime") ? timeEl.getAttribute("datetime") : ""; } catch (e) { dt = ""; }
      if (dt) {
        var msIso = Date.parse(dt);
        if (msIso) return msIso;
      }
      var txt = norm(timeEl.textContent || "");
      var m = txt.match(/(\d{1,2}):(\d{2})/);
      if (m) {
        var d = new Date();
        d.setSeconds(0); d.setMilliseconds(0);
        d.setHours(parseInt(m[1], 10));
        d.setMinutes(parseInt(m[2], 10));
        return d.getTime();
      }
    }
    return 0;
  }

  function findExistingClaimInRoom(currentWorker) {
    var root = getTimelineRoot();
    if (!root) return null;

    var tiles = root.querySelectorAll(".mx_EventTile");
    if (!tiles || !tiles.length) return null;

    var nowMs = Date.now();
    var ttlMs = 15 * 60 * 1000;
    var limit = 120;

    for (var i = tiles.length - 1; i >= 0 && limit-- > 0; i--) {
      var tile = tiles[i];

      var body =
        tile.querySelector(".mx_EventTile_body") ||
        tile.querySelector(".mx_MTextBody") ||
        tile.querySelector(".mx_EventTile_line") ||
        null;

      var text = norm(body ? body.textContent : "");
      if (!isSupportGreetingText(text)) continue;

      var ts = parseTileTs(tile);
      if (!ts) continue;

      if (nowMs - ts > ttlMs) continue;

      var senderEl =
        tile.querySelector(".mx_DisambiguatedProfile_displayName") ||
        tile.querySelector(".mx_EventTile_sender") ||
        tile.querySelector(".mx_SenderProfile_displayName") ||
        null;

      var sender = norm(senderEl ? senderEl.textContent : "");
      if (!sender) continue;

      var matchedWorker = "";
      for (var w = 0; w < WORKER_NAMES.length; w++) {
        var wn = WORKER_NAMES[w];
        if (sender === wn || sender.indexOf(wn) !== -1) { matchedWorker = wn; break; }
      }
      if (!matchedWorker) continue;

      if (matchedWorker !== currentWorker) {
        return { worker: matchedWorker, text: text, ts: ts };
      }
      return null;
    }
    return null;
  }

  // ===== UI Mount =====
  function mountPanel() {
    if (document.getElementById(PANEL_ID) || !document.body) return true;

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

    var top = document.createElement("div");
    top.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;align-items:center";

    var drag = document.createElement("div");
    drag.textContent = "⠿";
    drag.title = "Перетащить";
    drag.style.cssText =
      "width:22px;height:28px;display:flex;align-items:center;justify-content:center;" +
      "border:1px solid rgba(255,255,255,.12);border-radius:10px;" +
      "background:#1f2330;color:#fff;font:800 16px system-ui;cursor:grab";

    var btnHello = makeBtn("👋 Приветствие", function () {
      if (!ensureWorkerPicked()) return;
      var worker = ensureWorkerName();
      var text = getGreeting() + ", " + worker + ", тех поддержка.";
      handleTakeTicketAction(worker, text);
    });

    var btnZayavka = makeBtn("🧩 Заявка", function () {
      if (!ensureWorkerPicked()) return;
      var worker = ensureWorkerName();
      var text = worker + ", тех поддержка.";
      handleTakeTicketAction(worker, text);
    });

    var btnArchive = makeBtn("🗂 Архив", function () {
      if (!ensureWorkerPicked()) return;
      var worker = ensureWorkerName();
      var text = worker + ", тех поддержка. Сейчас найду.";
      handleTakeTicketAction(worker, text);
    });

    var btnCloseTicket = makeBtn("✅ Закрыть", function () {
      var roomId = getCurrentRoomId();
      var ticket = getActiveTicket(roomId);
      if (!ticket) return;

      var ok = sendMessage("!закрыто");
      if (!ok) return;

      clearActiveTicket(roomId);
      updateCloseState();
      renderActiveList();
    });

    // Helper for "take ticket" logic shared among Hello, Zayavka, Archive
    function handleTakeTicketAction(worker, textToВSend) {
      var claim = findExistingClaimInRoom(worker);
      if (claim) {
        var leftSec = Math.max(0, Math.round((15 * 60 * 1000 - (Date.now() - (claim.ts || 0))) / 1000));
        var leftMin = Math.ceil(leftSec / 60);
        alert("Заявку уже взял в работу: " + claim.worker + "\nTTL: ~" + leftMin + " мин.");
        return;
      }

      var ok = sendMessage(textToВSend);
      if (!ok) return;

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
      }

      updateCloseState();
      renderActiveList();
      tickTimers();
    }

    // Append buttons in the new order
    top.appendChild(drag);
    top.appendChild(btnHello);
    top.appendChild(btnZayavka);
    top.appendChild(btnArchive);
    top.appendChild(btnCloseTicket);

    var listTitle = document.createElement("div");
    listTitle.style.cssText = "color:#fff;font:700 12px system-ui;opacity:.9;margin-top:6px";
    listTitle.textContent = "Активные заявки";

    var list = document.createElement("div");
    list.style.cssText =
      "display:flex;flex-direction:column;gap:6px;" +
      "border:1px solid rgba(255,255,255,.10);border-radius:12px;" +
      "padding:8px;background:rgba(31,35,48,.55);margin-top:8px";

    function updateActionButtonsState() {
      var ready = !!getWorkerName();
      setBtnDisabled(btnHello, !ready);
      setBtnDisabled(btnZayavka, !ready);
      setBtnDisabled(btnArchive, !ready);
    }

    function updateCloseState() {
      var roomId = getCurrentRoomId();
      var ticket = getActiveTicket(roomId);
      setBtnDisabled(btnCloseTicket, !ticket);
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

          // Кнопка-крестик: только удаляет тикет из панели
          var btnRemove = makeMiniBtn("✖", "Удалить из списка", function () {
            clearActiveTicket(ticket.room_id || "");
            updateCloseState();
            renderActiveList();
          });
          btnRemove.style.background = "#3a2b2b"; // Делаем её слегка красноватой

          right.appendChild(btnGo);
          right.appendChild(btnRemove);

          row.appendChild(left);
          row.appendChild(right);
          list.appendChild(row);
        })(items[i]);
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

          if (sec < 10 * 60) {
            el.style.color = "#7CFF9B";
          } else if (sec < 15 * 60) {
            el.style.color = "#FFD86B";
          } else {
            el.style.color = "#FF6B6B";
          }
        }
      }
    }

    panel.appendChild(top);
    panel.appendChild(listTitle);
    panel.appendChild(list);

    document.body.appendChild(panel);

    scheduleDockInit();
    applyDockState();
    makeDraggable(panel, drag);

    try { window.addEventListener("resize", ensurePanelVisible); } catch (eR) {}
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
