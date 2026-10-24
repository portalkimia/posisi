/**
 * TKA 2026 - Central Laptop Assignment Controller
 * Optimistic UI, HTML5 Drag-and-Drop, Real-time GAS Sync & Offline Fallback
 */

(function () {
  'use strict';

  // --- STATE DEFINITIONS ---
  const STORAGE_KEY_ASSIGNMENTS = "TKA_ASSIGNMENTS_2026";
  const STORAGE_KEY_POOL = "TKA_LAPTOP_POOL_2026";
  const STORAGE_KEY_GAS_URL = "TKA_GAS_URL_2026";
  const STORAGE_KEY_ACTIVE_ROOM = "TKA_ACTIVE_ROOM_2026";
  const STORAGE_KEY_QUEUE = "TKA_OFFLINE_QUEUE_2026";

  let activeRoom = localStorage.getItem(STORAGE_KEY_ACTIVE_ROOM) || "Ruang 1";
  let activeSession = "Sesi 1";
  let gasUrl = localStorage.getItem(STORAGE_KEY_GAS_URL) || "";
  let currentFilter = "all";
  let searchQuery = "";
  let isSyncing = false;
  let pollInterval = null;

  // Active desk for quick inspection modal
  let selectedDeskForModal = null;

  // In-memory assignment map: assignments[roomName][deskNo] = assignmentObject
  let assignments = {};

  // In-memory laptop inventory pool
  let laptopPool = [];

  // Offline retry queue
  let offlineQueue = [];

  // --- INITIALIZATION ---
  window.addEventListener("DOMContentLoaded", () => {
    loadLocalState();
    setupEventListeners();
    renderRoomSelector();
    renderActiveRoom();
    renderLaptopPool();
    updateSyncPill();
    startAutoPolling();
    refreshIcons();
  });

  // --- STATE STORAGE & SEEDING ---
  function loadLocalState() {
    // 1. Load Assignments
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
      assignments = stored ? JSON.parse(stored) : {};
    } catch (e) {
      assignments = {};
    }

    // Ensure all rooms exist in assignment map
    Object.keys(ROOMS_DATA).forEach((roomName) => {
      if (!assignments[roomName]) {
        assignments[roomName] = {};
      }
    });

    // 2. Load Offline Queue
    try {
      const storedQueue = localStorage.getItem(STORAGE_KEY_QUEUE);
      offlineQueue = storedQueue ? JSON.parse(storedQueue) : [];
    } catch (e) {
      offlineQueue = [];
    }

    // 3. Load or Seed Laptop Pool
    try {
      const storedPool = localStorage.getItem(STORAGE_KEY_POOL);
      if (storedPool && JSON.parse(storedPool).length > 0) {
        laptopPool = JSON.parse(storedPool);
      } else {
        laptopPool = generateDefaultLaptopPool();
        saveLaptopPool();
      }
    } catch (e) {
      laptopPool = generateDefaultLaptopPool();
      saveLaptopPool();
    }

    // Sync input field in modal if gasUrl exists
    const inputGasUrl = document.getElementById("input-gas-url");
    if (inputGasUrl && gasUrl) {
      inputGasUrl.value = gasUrl;
    }
  }

  function saveAssignments() {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
  }

  function saveLaptopPool() {
    localStorage.setItem(STORAGE_KEY_POOL, JSON.stringify(laptopPool));
  }

  function saveOfflineQueue() {
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(offlineQueue));
  }

  /**
   * Seed realistic pool of laptops for school TKA preparation
   */
  function generateDefaultLaptopPool() {
    const brands = [
      "Asus Vivobook 14 (Core i5, 8GB)",
      "Lenovo ThinkPad L14 (Core i5, 8GB)",
      "Acer Aspire 5 (Ryzen 5, 8GB)",
      "HP ProBook 440 G8 (Core i5, 16GB)",
      "Dell Latitude 3420 (Core i3, 8GB)",
      "Axioo MyBook Pro F5 (Core i5, 8GB)",
      "Lenovo IdeaPad Slim 3 (Ryzen 3, 8GB)",
      "Asus ExpertBook B1 (Core i3, 8GB)"
    ];

    const owners = [
      "Lab Komputer Utama",
      "Lab Komputer 2",
      "Inventaris Sekolah",
      "Unit Multimedia",
      "Pinjaman Guru Mandiri"
    ];

    const list = [];
    for (let i = 1; i <= 40; i++) {
      const id = "LP-" + String(i).padStart(3, "0");
      const brand = brands[i % brands.length];
      const owner = owners[i % owners.length];
      list.push({
        idLaptop: id,
        labelLaptop: brand,
        pemilikLaptop: owner,
        isReady: true,
        hasCharger: true,
        catatan: "",
        assignedRoom: null,
        assignedDesk: null
      });
    }
    return list;
  }

  // --- RENDERING VIEWS ---
  function renderRoomSelector() {
    const select = document.getElementById("select-room");
    if (!select) return;

    select.innerHTML = "";
    Object.keys(ROOMS_DATA).forEach((roomName) => {
      const opt = document.createElement("option");
      opt.value = roomName;
      opt.textContent = `${roomName} (${ROOMS_DATA[roomName].totalDesks} Meja)`;
      if (roomName === activeRoom) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function renderActiveRoom() {
    const roomConf = ROOMS_DATA[activeRoom];
    if (!roomConf) return;

    // Save active room preference
    localStorage.setItem(STORAGE_KEY_ACTIVE_ROOM, activeRoom);

    // Update Header labels
    document.getElementById("current-room-title").textContent = roomConf.name;
    document.getElementById("current-session-label").textContent = `Menampilkan Peserta: ${activeSession}`;

    // Handle Sesi 3 visibility (Only Ruang 1, 2, 3 have Sesi 3)
    const pillSesi3 = document.getElementById("pill-sesi3");
    const hasSesi3 = roomConf.sessions.includes("Sesi 3");
    if (pillSesi3) {
      if (hasSesi3) {
        pillSesi3.classList.remove("hidden");
      } else {
        pillSesi3.classList.add("hidden");
        if (activeSession === "Sesi 3") {
          activeSession = "Sesi 1";
          updateSessionPills();
        }
      }
    }

    // Render Grid
    renderDeskGrid(roomConf);
    updateRoomMetrics();
    refreshIcons();
  }

  function renderDeskGrid(roomConf) {
    const container = document.getElementById("desk-grid-container");
    if (!container) return;

    container.innerHTML = "";

    const grid = roomConf.grid;
    const numCols = grid[0].length;

    // Grid wrapper with responsive min-width to preserve serpentine geometry
    const gridEl = document.createElement("div");
    gridEl.className = "grid gap-3.5 mx-auto justify-center";
    gridEl.style.gridTemplateColumns = `repeat(${numCols}, minmax(130px, 1fr))`;
    gridEl.style.maxWidth = `${numCols * 170}px`;

    grid.forEach((row, rowIndex) => {
      row.forEach((deskNo, colIndex) => {
        if (deskNo === null) {
          // Empty spacer cell for staggered layout (e.g. Ruang 8 or bottom row of Ruang 1 & 2)
          const spacer = document.createElement("div");
          spacer.className = "hidden sm:block pointer-events-none opacity-0";
          gridEl.appendChild(spacer);
          return;
        }

        const deskCard = createDeskCard(roomConf.name, deskNo);
        gridEl.appendChild(deskCard);
      });
    });

    container.appendChild(gridEl);
  }

  function createDeskCard(roomName, deskNo) {
    const card = document.createElement("div");
    card.className = "desk-card group relative bg-white border-2 rounded-2xl p-3 flex flex-col justify-between gap-2 shadow-xs cursor-pointer select-none transition-all";
    card.dataset.room = roomName;
    card.dataset.desk = deskNo;

    const assignment = (assignments[roomName] && assignments[roomName][deskNo]) || null;
    const studentName = getStudentName(roomName, deskNo, activeSession);

    // Apply color accents based on status
    if (assignment && assignment.idLaptop) {
      if (assignment.isReady && assignment.hasCharger) {
        card.classList.add("border-emerald-200", "bg-emerald-50/20", "hover:border-emerald-400");
      } else {
        card.classList.add("border-amber-200", "bg-amber-50/20", "hover:border-amber-400");
      }
    } else {
      card.classList.add("border-dashed", "border-slate-300", "hover:border-indigo-400", "hover:bg-indigo-50/30");
    }

    // Top: Desk Number & Action Badges
    const topRow = document.createElement("div");
    topRow.className = "flex items-center justify-between gap-1";

    const deskBadge = document.createElement("span");
    deskBadge.className = "px-2 py-0.5 rounded-lg text-xs font-black tracking-tight " + 
      (assignment && assignment.idLaptop ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700");
    deskBadge.textContent = `Meja ${deskNo}`;

    topRow.appendChild(deskBadge);

    if (assignment && assignment.idLaptop) {
      const badgesContainer = document.createElement("div");
      badgesContainer.className = "flex items-center gap-1";

      // Ready icon
      const readyDot = document.createElement("span");
      readyDot.className = `w-2.5 h-2.5 rounded-full ${assignment.isReady ? "bg-emerald-500" : "bg-rose-500"}`;
      readyDot.title = assignment.isReady ? "Siap TKA" : "Belum Siap TKA";
      badgesContainer.appendChild(readyDot);

      // Charger icon
      const chargerIcon = document.createElement("span");
      chargerIcon.className = `text-[11px] ${assignment.hasCharger ? "text-amber-600" : "text-slate-300"}`;
      chargerIcon.textContent = assignment.hasCharger ? "⚡" : "✕";
      chargerIcon.title = assignment.hasCharger ? "Ada Charger" : "Tanpa Charger";
      badgesContainer.appendChild(chargerIcon);

      topRow.appendChild(badgesContainer);
    }

    card.appendChild(topRow);

    // Middle: Student Name for Active Session
    const studentRow = document.createElement("div");
    studentRow.className = "flex flex-col gap-0.5 my-0.5";
    
    const studentLabel = document.createElement("span");
    studentLabel.className = "text-[10px] uppercase font-bold text-slate-600 flex items-center justify-between";
    studentLabel.innerHTML = `<span>${activeSession}</span>`;
    studentRow.appendChild(studentLabel);

    const studentNameEl = document.createElement("div");
    studentNameEl.className = "text-xs font-semibold text-slate-800 line-clamp-2 leading-tight";
    studentNameEl.textContent = studentName || "(Kosong / Tidak Ada)";
    if (!studentName) studentNameEl.classList.add("text-slate-500", "italic");
    studentRow.appendChild(studentNameEl);

    card.appendChild(studentRow);

    // Bottom: Laptop Info / Drop Target
    const bottomRow = document.createElement("div");
    bottomRow.className = "mt-auto pt-2 border-t border-slate-100 flex flex-col gap-1";

    if (assignment && assignment.idLaptop) {
      const laptopRow = document.createElement("div");
      laptopRow.className = "flex items-center justify-between gap-1";

      const laptopDetails = document.createElement("div");
      laptopDetails.className = "flex flex-col truncate";

      const laptopId = document.createElement("span");
      laptopId.className = "text-xs font-black text-indigo-700 truncate";
      laptopId.textContent = assignment.idLaptop;

      const laptopModel = document.createElement("span");
      laptopModel.className = "text-[10px] text-slate-500 truncate";
      laptopModel.textContent = assignment.labelLaptop || assignment.pemilikLaptop || "-";

      laptopDetails.appendChild(laptopId);
      laptopDetails.appendChild(laptopModel);
      laptopRow.appendChild(laptopDetails);

      // Quick unassign / remove button
      const unassignBtn = document.createElement("button");
      unassignBtn.className = "p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition";
      unassignBtn.title = "Lepas laptop dari meja ini";
      unassignBtn.innerHTML = '<i data-lucide="x" class="w-3.5 h-3.5"></i>';
      unassignBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        unassignLaptopFromDesk(roomName, deskNo);
      });
      laptopRow.appendChild(unassignBtn);

      bottomRow.appendChild(laptopRow);

      if (assignment.catatan) {
        const noteRow = document.createElement("div");
        noteRow.className = "text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 truncate";
        noteRow.textContent = `📝 ${assignment.catatan}`;
        bottomRow.appendChild(noteRow);
      }

    } else {
      const emptyDropzone = document.createElement("div");
      emptyDropzone.className = "py-1.5 px-2 rounded-lg bg-slate-50 text-[11px] font-medium text-slate-600 text-center flex items-center justify-center gap-1 group-hover:text-indigo-600 group-hover:bg-indigo-50/50 transition";
      emptyDropzone.innerHTML = '<i data-lucide="plus-circle" class="w-3 h-3 text-slate-400 group-hover:text-indigo-500"></i><span>Tarik Laptop</span>';
      bottomRow.appendChild(emptyDropzone);
    }

    card.appendChild(bottomRow);

    // --- HTML5 DRAG & DROP EVENTS ---
    // Make card draggable if it has a laptop assigned (to move desk to desk)
    if (assignment && assignment.idLaptop) {
      card.setAttribute("draggable", "true");
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({
          source: "desk",
          fromRoom: roomName,
          fromDesk: deskNo,
          idLaptop: assignment.idLaptop
        }));
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
      });
    }

    // Dropzone handlers on desk
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      card.classList.add("drag-over");
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });

    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");

      try {
        const raw = e.dataTransfer.getData("text/plain");
        if (!raw) return;
        const dragData = JSON.parse(raw);

        if (dragData.source === "pool") {
          // Assigned from laptop pool
          assignLaptopToDesk(roomName, deskNo, dragData.idLaptop);
        } else if (dragData.source === "desk") {
          // Moved from another desk
          moveLaptopBetweenDesks(dragData.fromRoom, dragData.fromDesk, roomName, deskNo);
        }
      } catch (err) {
        console.error("Drop handling error:", err);
      }
    });

    // Click handler to open inspection modal
    card.addEventListener("click", () => {
      openDeskInspectionModal(roomName, deskNo);
    });

    return card;
  }

  function renderLaptopPool() {
    const listContainer = document.getElementById("laptop-pool-list");
    const countBadge = document.getElementById("pool-count-badge");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    // Filter laptops that are unassigned
    let unassigned = laptopPool.filter((l) => !l.assignedRoom || !l.assignedDesk);

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      unassigned = unassigned.filter((l) => 
        l.idLaptop.toLowerCase().includes(q) ||
        (l.labelLaptop && l.labelLaptop.toLowerCase().includes(q)) ||
        (l.pemilikLaptop && l.pemilikLaptop.toLowerCase().includes(q))
      );
    }

    // Apply status chips
    if (currentFilter === "ready") {
      unassigned = unassigned.filter((l) => l.isReady);
    } else if (currentFilter === "charger") {
      unassigned = unassigned.filter((l) => l.hasCharger);
    }

    if (countBadge) countBadge.textContent = unassigned.length;

    if (unassigned.length === 0) {
      listContainer.innerHTML = `
        <div class="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <i data-lucide="check-check" class="w-6 h-6 text-emerald-500"></i>
          <span>Semua laptop telah terpasang atau tidak cocok dengan filter.</span>
        </div>
      `;
      refreshIcons();
      return;
    }

    unassigned.forEach((laptop) => {
      const item = document.createElement("div");
      item.className = "group bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs hover:shadow-sm cursor-grab active:cursor-grabbing transition select-none";
      item.setAttribute("draggable", "true");
      item.dataset.idLaptop = laptop.idLaptop;

      // HTML5 Dragstart
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({
          source: "pool",
          idLaptop: laptop.idLaptop
        }));
        item.classList.add("dragging");
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
      });

      // Left info: ID, Model, Owner
      const left = document.createElement("div");
      left.className = "flex flex-col truncate";

      const top = document.createElement("div");
      top.className = "flex items-center gap-1.5";

      const idSpan = document.createElement("span");
      idSpan.className = "text-xs font-bold text-slate-900";
      idSpan.textContent = laptop.idLaptop;
      top.appendChild(idSpan);

      // Status badges
      const readySpan = document.createElement("span");
      readySpan.className = `w-2 h-2 rounded-full ${laptop.isReady ? "bg-emerald-500" : "bg-rose-500"}`;
      readySpan.title = laptop.isReady ? "Siap TKA" : "Belum Siap";
      top.appendChild(readySpan);

      if (laptop.hasCharger) {
        const chgSpan = document.createElement("span");
        chgSpan.className = "text-[10px] text-amber-500 font-bold";
        chgSpan.textContent = "⚡";
        chgSpan.title = "Ada Charger";
        top.appendChild(chgSpan);
      }

      left.appendChild(top);

      const labelSpan = document.createElement("span");
      labelSpan.className = "text-[11px] text-slate-600 truncate";
      labelSpan.textContent = laptop.labelLaptop || laptop.pemilikLaptop || "Laptop Mandiri";
      left.appendChild(labelSpan);

      item.appendChild(left);

      // Right: Quick Assign Button (helpful for touch / mobile)
      const assignBtn = document.createElement("button");
      assignBtn.className = "opacity-80 group-hover:opacity-100 p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition text-[11px] font-semibold flex items-center gap-1";
      assignBtn.title = "Pasang ke meja aktif";
      assignBtn.innerHTML = '<i data-lucide="corner-up-left" class="w-3.5 h-3.5"></i>';
      assignBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        quickAssignToFirstAvailableDesk(laptop.idLaptop);
      });
      item.appendChild(assignBtn);

      listContainer.appendChild(item);
    });

    refreshIcons();
  }

  function updateRoomMetrics() {
    const roomConf = ROOMS_DATA[activeRoom];
    if (!roomConf) return;

    const total = roomConf.totalDesks;
    let assignedCount = 0;
    let readyCount = 0;
    let chargerCount = 0;

    const roomAssignments = assignments[activeRoom] || {};
    Object.values(roomAssignments).forEach((a) => {
      if (a && a.idLaptop) {
        assignedCount++;
        if (a.isReady) readyCount++;
        if (a.hasCharger) chargerCount++;
      }
    });

    const metricAssigned = document.getElementById("metric-assigned");
    const metricReady = document.getElementById("metric-ready");
    const metricCharger = document.getElementById("metric-charger");

    if (metricAssigned) metricAssigned.textContent = `${assignedCount}/${total}`;
    if (metricReady) metricReady.textContent = readyCount;
    if (metricCharger) metricCharger.textContent = chargerCount;
  }

  function renderRekapOverview() {
    const container = document.getElementById("rooms-overview-cards");
    if (!container) return;

    container.innerHTML = "";

    let totalAllDesks = 0;
    let totalAllAssigned = 0;
    let totalAllReady = 0;
    let totalAllChargers = 0;

    Object.keys(ROOMS_DATA).forEach((roomName) => {
      const conf = ROOMS_DATA[roomName];
      const totalDesks = conf.totalDesks;
      totalAllDesks += totalDesks;

      const roomAssignments = assignments[roomName] || {};
      let assigned = 0;
      let ready = 0;
      let chargers = 0;

      Object.values(roomAssignments).forEach((a) => {
        if (a && a.idLaptop) {
          assigned++;
          if (a.isReady) ready++;
          if (a.hasCharger) chargers++;
        }
      });

      totalAllAssigned += assigned;
      totalAllReady += ready;
      totalAllChargers += chargers;

      const pct = Math.round((assigned / totalDesks) * 100);

      // Card
      const card = document.createElement("div");
      card.className = "bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs transition";

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-xs shadow-2xs">
              ${roomName.replace("Ruang ", "R")}
            </span>
            <div>
              <h3 class="font-bold text-sm text-slate-900">${roomName}</h3>
              <p class="text-[11px] text-slate-500">${conf.sessions.join(", ")}</p>
            </div>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${pct === 100 ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"}">
            ${pct}%
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between text-xs text-slate-600">
            <span>Terisi: <strong>${assigned}/${totalDesks}</strong> Meja</span>
            <span>Siap: <strong class="text-emerald-600">${ready}</strong></span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div class="bg-indigo-600 h-2 rounded-full transition-all" style="width: ${pct}%"></div>
          </div>
        </div>

        <!-- Quick Jump Button -->
        <div class="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
          <span class="text-amber-600 font-semibold flex items-center gap-1">
            <span>⚡</span> ${chargers} Charger
          </span>
          <button class="btn-jump-room text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1" data-room="${roomName}">
            <span>Buka Ruang</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    // Update Totals
    document.getElementById("rekap-total-desks").textContent = totalAllDesks;
    document.getElementById("rekap-total-assigned").textContent = totalAllAssigned;
    document.getElementById("rekap-total-ready").textContent = totalAllReady;
    document.getElementById("rekap-total-charger").textContent = totalAllChargers;

    // Attach click listeners to jump buttons
    container.querySelectorAll(".btn-jump-room").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetRoom = btn.dataset.room;
        if (targetRoom) {
          activeRoom = targetRoom;
          document.getElementById("select-room").value = targetRoom;
          switchTab("denah");
          renderActiveRoom();
        }
      });
    });

    refreshIcons();
  }

  // --- BUSINESS LOGIC: ASSIGNMENTS & OPTIMISTIC UPDATES ---
  function assignLaptopToDesk(roomName, deskNo, idLaptop, customDetails = null) {
    const laptop = laptopPool.find((l) => l.idLaptop === idLaptop);
    if (!laptop) return;

    // If laptop was assigned elsewhere, clear it first
    if (laptop.assignedRoom && laptop.assignedDesk) {
      if (assignments[laptop.assignedRoom]) {
        delete assignments[laptop.assignedRoom][laptop.assignedDesk];
      }
    }

    // Set new assignment
    if (!assignments[roomName]) assignments[roomName] = {};

    const isReady = customDetails ? customDetails.isReady : laptop.isReady;
    const hasCharger = customDetails ? customDetails.hasCharger : laptop.hasCharger;
    const catatan = customDetails ? customDetails.catatan : (laptop.catatan || "");

    assignments[roomName][deskNo] = {
      idLaptop: laptop.idLaptop,
      labelLaptop: laptop.labelLaptop,
      pemilikLaptop: laptop.pemilikLaptop,
      isReady: isReady,
      hasCharger: hasCharger,
      catatan: catatan,
      lastUpdated: new Date().toISOString()
    };

    // Update pool state
    laptop.assignedRoom = roomName;
    laptop.assignedDesk = deskNo;
    laptop.isReady = isReady;
    laptop.hasCharger = hasCharger;
    laptop.catatan = catatan;

    // Optimistic Save
    saveAssignments();
    saveLaptopPool();
    renderActiveRoom();
    renderLaptopPool();

    // Trigger GAS sync
    syncAssignmentToGAS(roomName, deskNo);
    showToast(`Laptop ${idLaptop} dipasang ke ${roomName} Meja ${deskNo}`, "success");
  }

  function unassignLaptopFromDesk(roomName, deskNo) {
    if (!assignments[roomName] || !assignments[roomName][deskNo]) return;

    const assignment = assignments[roomName][deskNo];
    const idLaptop = assignment.idLaptop;

    // Remove from room assignments
    delete assignments[roomName][deskNo];

    // Return to pool
    const laptop = laptopPool.find((l) => l.idLaptop === idLaptop);
    if (laptop) {
      laptop.assignedRoom = null;
      laptop.assignedDesk = null;
    }

    // Optimistic Save
    saveAssignments();
    saveLaptopPool();
    renderActiveRoom();
    renderLaptopPool();

    // Trigger GAS sync (unassign: send empty idLaptop)
    syncAssignmentToGAS(roomName, deskNo, true);
    showToast(`Laptop ${idLaptop} dilepas dari Meja ${deskNo}`, "info");
  }

  function moveLaptopBetweenDesks(fromRoom, fromDesk, toRoom, toDesk) {
    if (fromRoom === toRoom && fromDesk === toDesk) return;

    const fromAssignment = assignments[fromRoom] && assignments[fromRoom][fromDesk];
    if (!fromAssignment) return;

    const idLaptop = fromAssignment.idLaptop;
    const existingTarget = assignments[toRoom] && assignments[toRoom][toDesk];

    // Swap if target already has a laptop, or simply move
    if (existingTarget && existingTarget.idLaptop) {
      const targetLaptopId = existingTarget.idLaptop;
      // Assign target laptop to fromDesk
      assignLaptopToDesk(fromRoom, fromDesk, targetLaptopId);
    } else {
      unassignLaptopFromDesk(fromRoom, fromDesk);
    }

    assignLaptopToDesk(toRoom, toDesk, idLaptop, {
      isReady: fromAssignment.isReady,
      hasCharger: fromAssignment.hasCharger,
      catatan: fromAssignment.catatan
    });
  }

  function quickAssignToFirstAvailableDesk(idLaptop) {
    const roomConf = ROOMS_DATA[activeRoom];
    if (!roomConf) return;

    const roomAssignments = assignments[activeRoom] || {};
    let targetDesk = null;

    for (let d = 1; d <= roomConf.totalDesks; d++) {
      if (!roomAssignments[d] || !roomAssignments[d].idLaptop) {
        targetDesk = d;
        break;
      }
    }

    if (!targetDesk) {
      showToast(`Semua meja di ${activeRoom} sudah terisi!`, "warning");
      return;
    }

    assignLaptopToDesk(activeRoom, targetDesk, idLaptop);
  }

  // --- SYNC PIPELINE & GAS BACKEND INTEGRATION ---
  function syncAssignmentToGAS(roomName, deskNo, isUnassign = false) {
    const roomConf = ROOMS_DATA[roomName];
    const roster = roomConf ? roomConf.roster[deskNo] || {} : {};
    const assignment = (assignments[roomName] && assignments[roomName][deskNo]) || {};

    const payload = {
      action: "updateAssignment",
      room: roomName,
      deskNo: deskNo,
      sesi1: roster.sesi1 || "",
      sesi2: roster.sesi2 || "",
      sesi3: roster.sesi3 || "",
      idLaptop: isUnassign ? "" : (assignment.idLaptop || ""),
      labelLaptop: isUnassign ? "" : (assignment.labelLaptop || ""),
      pemilikLaptop: isUnassign ? "" : (assignment.pemilikLaptop || ""),
      isReady: isUnassign ? false : Boolean(assignment.isReady),
      hasCharger: isUnassign ? false : Boolean(assignment.hasCharger),
      catatan: isUnassign ? "" : (assignment.catatan || "")
    };

    // Push to offline queue
    offlineQueue.push(payload);
    saveOfflineQueue();

    // Trigger queue sync
    flushOfflineQueue();
  }

  async function flushOfflineQueue() {
    if (!gasUrl) {
      updateSyncPill("local");
      return;
    }

    if (offlineQueue.length === 0) {
      updateSyncPill("synced");
      return;
    }

    if (isSyncing) return;
    isSyncing = true;
    updateSyncPill("syncing");

    try {
      while (offlineQueue.length > 0) {
        const item = offlineQueue[0];
        
        // POST with text/plain body to prevent CORS preflight in Apps Script
        const response = await fetch(gasUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(item)
        });

        // If fetch succeeds (or follows redirect to 200/JSON)
        offlineQueue.shift();
        saveOfflineQueue();
      }

      updateSyncPill("synced");
    } catch (err) {
      console.warn("GAS Sync warning (queued for retry):", err);
      updateSyncPill("offline");
    } finally {
      isSyncing = false;
    }
  }

  function startAutoPolling() {
    if (pollInterval) clearInterval(pollInterval);
    // Poll every 20 seconds
    pollInterval = setInterval(() => {
      if (gasUrl && !isSyncing) {
        pollRoomStateFromGAS();
      }
    }, 20000);
  }

  async function pollRoomStateFromGAS() {
    if (!gasUrl) return;
    try {
      const url = `${gasUrl}?action=getRoom&room=${encodeURIComponent(activeRoom)}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json && json.success && Array.isArray(json.data)) {
        let changed = false;
        json.data.forEach((row) => {
          const deskNo = Number(row.NoMeja);
          if (!deskNo) return;

          const remoteLaptopId = String(row.IdLaptop || "").trim();
          const localAssignment = assignments[activeRoom] && assignments[activeRoom][deskNo];

          if (remoteLaptopId) {
            const isReady = String(row.IsReady).toUpperCase() === "TRUE";
            const hasCharger = String(row.HasCharger).toUpperCase() === "TRUE";

            if (!localAssignment || localAssignment.idLaptop !== remoteLaptopId) {
              if (!assignments[activeRoom]) assignments[activeRoom] = {};
              assignments[activeRoom][deskNo] = {
                idLaptop: remoteLaptopId,
                labelLaptop: row.LabelLaptop || "",
                pemilikLaptop: row.PemilikLaptop || "",
                isReady: isReady,
                hasCharger: hasCharger,
                catatan: row.Catatan || "",
                lastUpdated: row.LastUpdated || new Date().toISOString()
              };

              // Update pool pointer
              let pItem = laptopPool.find((l) => l.idLaptop === remoteLaptopId);
              if (pItem) {
                pItem.assignedRoom = activeRoom;
                pItem.assignedDesk = deskNo;
                pItem.isReady = isReady;
                pItem.hasCharger = hasCharger;
              }
              changed = true;
            }
          } else if (localAssignment && localAssignment.idLaptop) {
            // Desk was cleared remotely
            delete assignments[activeRoom][deskNo];
            changed = true;
          }
        });

        if (changed) {
          saveAssignments();
          saveLaptopPool();
          renderActiveRoom();
          renderLaptopPool();
          showToast(`Pembaruan data ${activeRoom} dari panitia lain disinkronkan`, "info");
        }
      }
    } catch (err) {
      // Quiet background polling failure
    }
  }

  function updateSyncPill(state = null) {
    const pill = document.getElementById("sync-pill");
    const dot = document.getElementById("sync-dot");
    const text = document.getElementById("sync-text");
    if (!pill || !dot || !text) return;

    if (!gasUrl) {
      pill.className = "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300";
      dot.className = "w-2 h-2 rounded-full bg-slate-400";
      text.textContent = "Mode Standalone (Lokal)";
      return;
    }

    if (state === "syncing") {
      pill.className = "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200";
      dot.className = "w-2 h-2 rounded-full bg-amber-500 animate-spin";
      text.textContent = "Menyimpan ke Sheets...";
    } else if (state === "offline") {
      pill.className = "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200";
      dot.className = "w-2 h-2 rounded-full bg-rose-500 animate-pulse";
      text.textContent = `Offline (${offlineQueue.length} Tertunda)`;
    } else {
      pill.className = "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200";
      dot.className = "w-2 h-2 rounded-full bg-emerald-500";
      text.textContent = "Tersinkron (Realtime)";
    }
  }

  // --- MODALS & QUICK INSPECTION ---
  function openDeskInspectionModal(roomName, deskNo) {
    selectedDeskForModal = { room: roomName, desk: deskNo };
    const modal = document.getElementById("modal-desk");
    const assignment = (assignments[roomName] && assignments[roomName][deskNo]) || null;
    const roomConf = ROOMS_DATA[roomName];
    const roster = roomConf ? roomConf.roster[deskNo] || {} : {};

    // Populate Headers & Student Roster
    document.getElementById("modal-desk-room").textContent = roomName;
    document.getElementById("modal-desk-title").textContent = `Inspeksi Meja ${deskNo}`;
    document.getElementById("modal-student-s1").textContent = roster.sesi1 || "(Kosong)";
    document.getElementById("modal-student-s2").textContent = roster.sesi2 || "(Kosong)";
    document.getElementById("modal-student-s3").textContent = roster.sesi3 || "(Kosong)";

    // Populate Laptop Dropdown (unassigned laptops + current laptop)
    const select = document.getElementById("modal-laptop-select");
    select.innerHTML = '<option value="">-- Pilih Laptop dari Pool --</option>';

    laptopPool.forEach((laptop) => {
      // Show if unassigned OR currently on this desk
      if (!laptop.assignedRoom || (laptop.assignedRoom === roomName && laptop.assignedDesk === deskNo)) {
        const opt = document.createElement("option");
        opt.value = laptop.idLaptop;
        opt.textContent = `${laptop.idLaptop} - ${laptop.labelLaptop || laptop.pemilikLaptop || "Laptop"} ${laptop.isReady ? "✓" : "!"}`;
        if (assignment && assignment.idLaptop === laptop.idLaptop) opt.selected = true;
        select.appendChild(opt);
      }
    });

    // Populate Toggles & Notes
    document.getElementById("modal-ready-toggle").checked = assignment ? assignment.isReady : true;
    document.getElementById("modal-charger-toggle").checked = assignment ? assignment.hasCharger : true;
    document.getElementById("modal-notes-input").value = assignment ? (assignment.catatan || "") : "";

    modal.classList.remove("hidden");
    refreshIcons();
  }

  function closeDeskInspectionModal() {
    const modal = document.getElementById("modal-desk");
    modal.classList.add("hidden");
    selectedDeskForModal = null;
  }

  // --- CSV EXPORT GENERATOR ---
  function exportMasterCSV() {
    const rows = [
      ["Ruang", "No Meja", "Sesi 1", "Sesi 2", "Sesi 3", "ID Laptop", "Label / Tipe Laptop", "Pemilik Laptop", "Siap TKA", "Ada Charger", "Catatan Teknisi", "Waktu Update"]
    ];

    Object.keys(ROOMS_DATA).forEach((roomName) => {
      const conf = ROOMS_DATA[roomName];
      for (let d = 1; d <= conf.totalDesks; d++) {
        const roster = conf.roster[d] || {};
        const assignment = (assignments[roomName] && assignments[roomName][d]) || {};

        rows.push([
          roomName,
          d,
          roster.sesi1 || "",
          roster.sesi2 || "",
          roster.sesi3 || "",
          assignment.idLaptop || "",
          assignment.labelLaptop || "",
          assignment.pemilikLaptop || "",
          assignment.idLaptop ? (assignment.isReady ? "SIAP" : "BELUM SIAP") : "",
          assignment.idLaptop ? (assignment.hasCharger ? "ADA" : "TIDAK") : "",
          assignment.catatan || "",
          assignment.lastUpdated || ""
        ]);
      }
    });

    // Generate CSV string with quotes & escape
    const csvContent = "\uFEFF" + rows.map((e) => 
      e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
    ).join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Alokasi_Laptop_TKA_2026_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("File CSV Rekap Pengawas berhasil diunduh!", "success");
  }

  // --- HELPERS & EVENT LISTENERS ---
  function setupEventListeners() {
    // Room Selector change
    document.getElementById("select-room").addEventListener("change", (e) => {
      activeRoom = e.target.value;
      renderActiveRoom();
    });

    // Session Pills
    document.querySelectorAll(".session-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSession = btn.dataset.session;
        updateSessionPills();
        renderActiveRoom();
      });
    });

    // View Tabs: Denah vs Rekap
    document.getElementById("tab-denah").addEventListener("click", () => switchTab("denah"));
    document.getElementById("tab-rekap").addEventListener("click", () => switchTab("rekap"));

    // Laptop Pool Search & Filter
    document.getElementById("pool-search").addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderLaptopPool();
    });

    document.querySelectorAll(".filter-pool-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-pool-btn").forEach((b) => {
          b.className = "filter-pool-btn px-2 py-0.5 rounded-md text-slate-500 hover:bg-slate-100";
        });
        btn.className = "filter-pool-btn px-2 py-0.5 rounded-md font-semibold bg-slate-200 text-slate-800";
        currentFilter = btn.dataset.filter;
        renderLaptopPool();
      });
    });

    // Pool Dropzone to Unassign
    const poolDropzone = document.getElementById("pool-dropzone");
    poolDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      poolDropzone.classList.add("border-amber-500", "bg-amber-100/50");
    });
    poolDropzone.addEventListener("dragleave", () => {
      poolDropzone.classList.remove("border-amber-500", "bg-amber-100/50");
    });
    poolDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      poolDropzone.classList.remove("border-amber-500", "bg-amber-100/50");
      try {
        const raw = e.dataTransfer.getData("text/plain");
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.source === "desk") {
          unassignLaptopFromDesk(data.fromRoom, data.fromDesk);
        }
      } catch (err) {}
    });

    // Modal Desk Inspection Events
    document.getElementById("modal-desk-close").addEventListener("click", closeDeskInspectionModal);
    document.getElementById("modal-desk-cancel").addEventListener("click", closeDeskInspectionModal);
    
    document.getElementById("btn-unassign-modal").addEventListener("click", () => {
      if (selectedDeskForModal) {
        unassignLaptopFromDesk(selectedDeskForModal.room, selectedDeskForModal.desk);
        closeDeskInspectionModal();
      }
    });

    document.getElementById("form-desk-edit").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!selectedDeskForModal) return;

      const chosenLaptop = document.getElementById("modal-laptop-select").value;
      const isReady = document.getElementById("modal-ready-toggle").checked;
      const hasCharger = document.getElementById("modal-charger-toggle").checked;
      const catatan = document.getElementById("modal-notes-input").value.trim();

      if (chosenLaptop) {
        assignLaptopToDesk(selectedDeskForModal.room, selectedDeskForModal.desk, chosenLaptop, {
          isReady,
          hasCharger,
          catatan
        });
      } else {
        // If empty selection, unassign
        unassignLaptopFromDesk(selectedDeskForModal.room, selectedDeskForModal.desk);
      }

      closeDeskInspectionModal();
    });

    // Add Laptop Modal Events
    const modalAdd = document.getElementById("modal-add-laptop");
    document.getElementById("btn-add-laptop").addEventListener("click", () => modalAdd.classList.remove("hidden"));
    document.getElementById("modal-add-close").addEventListener("click", () => modalAdd.classList.add("hidden"));
    document.getElementById("modal-add-cancel").addEventListener("click", () => modalAdd.classList.add("hidden"));

    document.getElementById("form-add-laptop").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("add-laptop-id").value.trim();
      const label = document.getElementById("add-laptop-label").value.trim();
      const pemilik = document.getElementById("add-laptop-pemilik").value.trim();
      const isReady = document.getElementById("add-laptop-ready").checked;
      const hasCharger = document.getElementById("add-laptop-charger").checked;
      const notes = document.getElementById("add-laptop-notes").value.trim();

      if (laptopPool.some((l) => l.idLaptop.toLowerCase() === id.toLowerCase())) {
        showToast(`ID Laptop ${id} sudah terdaftar!`, "error");
        return;
      }

      const newLaptop = {
        idLaptop: id,
        labelLaptop: label,
        pemilikLaptop: pemilik,
        isReady: isReady,
        hasCharger: hasCharger,
        catatan: notes,
        assignedRoom: null,
        assignedDesk: null
      };

      laptopPool.unshift(newLaptop);
      saveLaptopPool();
      renderLaptopPool();
      modalAdd.classList.add("hidden");
      document.getElementById("form-add-laptop").reset();
      showToast(`Laptop ${id} berhasil ditambahkan ke inventaris`, "success");

      // Sync laptop record to GAS if configured
      if (gasUrl) {
        fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "upsertLaptop", ...newLaptop })
        }).catch(() => {});
      }
    });

    // Settings Modal Events
    const modalSettings = document.getElementById("modal-settings");
    document.getElementById("btn-settings").addEventListener("click", () => modalSettings.classList.remove("hidden"));
    document.getElementById("modal-settings-close").addEventListener("click", () => modalSettings.classList.add("hidden"));

    document.getElementById("btn-save-settings").addEventListener("click", () => {
      const val = document.getElementById("input-gas-url").value.trim();
      gasUrl = val;
      localStorage.setItem(STORAGE_KEY_GAS_URL, gasUrl);
      modalSettings.classList.add("hidden");
      updateSyncPill();
      showToast("Pengaturan URL Apps Script disimpan!", "success");
      flushOfflineQueue();
    });

    document.getElementById("btn-test-connection").addEventListener("click", async () => {
      const val = document.getElementById("input-gas-url").value.trim();
      const resBox = document.getElementById("settings-ping-result");
      if (!val) {
        resBox.className = "p-3 rounded-xl border border-rose-200 bg-rose-50 text-[11px] text-rose-700 flex items-center gap-2";
        resBox.innerHTML = '<i data-lucide="alert-circle" class="w-4 h-4 text-rose-500"></i><span>Harap masukkan URL Web App terlebih dahulu!</span>';
        refreshIcons();
        return;
      }

      resBox.className = "p-3 rounded-xl border border-indigo-200 bg-indigo-50 text-[11px] text-indigo-700 flex items-center gap-2";
      resBox.innerHTML = '<i data-lucide="loader" class="w-4 h-4 text-indigo-500 animate-spin"></i><span>Menghubungi Google Apps Script...</span>';
      refreshIcons();

      try {
        const pingUrl = `${val}?action=ping`;
        const res = await fetch(pingUrl);
        const data = await res.json();
        if (data && data.success) {
          resBox.className = "p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700 flex items-center gap-2";
          resBox.innerHTML = '<i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i><span>Koneksi Berhasil! Google Apps Script siap digunakan.</span>';
        } else {
          throw new Error("Respon tidak valid");
        }
      } catch (err) {
        resBox.className = "p-3 rounded-xl border border-rose-200 bg-rose-50 text-[11px] text-rose-700 flex items-center gap-2";
        resBox.innerHTML = `<i data-lucide="x-circle" class="w-4 h-4 text-rose-500"></i><span>Gagal terhubung (${err.message}). Pastikan Web App disetel 'Anyone'.</span>`;
      }
      refreshIcons();
    });

    // CSV Export buttons
    document.getElementById("btn-export-csv").addEventListener("click", exportMasterCSV);
    document.getElementById("btn-rekap-export").addEventListener("click", exportMasterCSV);

    // Online event handler to auto-flush offline changes
    window.addEventListener("online", () => {
      showToast("Koneksi internet kembali aktif. Menyinkronkan...", "info");
      flushOfflineQueue();
    });
  }

  function updateSessionPills() {
    document.querySelectorAll(".session-btn").forEach((b) => {
      if (b.dataset.session === activeSession) {
        b.className = "session-btn px-3 py-1 rounded-lg bg-indigo-600 text-white shadow-sm font-semibold";
      } else {
        b.className = "session-btn px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900";
      }
    });
  }

  function switchTab(tab) {
    const viewDenah = document.getElementById("view-denah");
    const viewRekap = document.getElementById("view-rekap");
    const tabDenah = document.getElementById("tab-denah");
    const tabRekap = document.getElementById("tab-rekap");

    if (tab === "denah") {
      viewDenah.classList.remove("hidden");
      viewRekap.classList.add("hidden");
      tabDenah.className = "tab-btn px-3 py-1.5 rounded-lg font-semibold bg-white text-indigo-700 shadow-sm transition-all flex items-center gap-1.5";
      tabRekap.className = "tab-btn px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5";
      renderActiveRoom();
    } else {
      viewDenah.classList.add("hidden");
      viewRekap.classList.remove("hidden");
      tabRekap.className = "tab-btn px-3 py-1.5 rounded-lg font-semibold bg-white text-indigo-700 shadow-sm transition-all flex items-center gap-1.5";
      tabDenah.className = "tab-btn px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5";
      renderRekapOverview();
    }
    refreshIcons();
  }

  function getStudentName(roomName, deskNo, session) {
    const conf = ROOMS_DATA[roomName];
    if (!conf || !conf.roster || !conf.roster[deskNo]) return "";
    const roster = conf.roster[deskNo];
    if (session === "Sesi 1") return roster.sesi1 || "";
    if (session === "Sesi 2") return roster.sesi2 || "";
    if (session === "Sesi 3") return roster.sesi3 || "";
    return "";
  }

  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    const bgColors = {
      success: "bg-slate-900 text-emerald-400 border-emerald-500/30",
      info: "bg-slate-900 text-indigo-300 border-indigo-500/30",
      warning: "bg-slate-900 text-amber-300 border-amber-500/30",
      error: "bg-slate-900 text-rose-300 border-rose-500/30"
    };

    toast.className = `pointer-events-auto px-4 py-2.5 rounded-xl border shadow-xl text-xs font-semibold flex items-center gap-2 transform transition-all duration-200 translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
    toast.textContent = message;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-2", "opacity-0");
    });

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function refreshIcons() {
    if (typeof lucide !== "undefined" && lucide.createIcons) {
      lucide.createIcons();
    }
  }

})();
