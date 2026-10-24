/**
 * TKA 2026 - Central Laptop Assignment & Multi-Day Multi-Session Controller
 * Features: 4 Days (26-29 Okt), Auto-Copy Inheritance, Room Backups & Ruang Guru
 */

(function () {
  'use strict';

  // --- STORAGE KEYS ---
  const STORAGE_KEY_ASSIGNMENTS = "TKA_ASSIGNMENTS_MULTI_2026";
  const STORAGE_KEY_BACKUPS = "TKA_ROOM_BACKUPS_2026";
  const STORAGE_KEY_REKAP_BY_DATE = "TKA_REKAP_BY_DATE_2026";
  const STORAGE_KEY_POOL = "TKA_LAPTOP_POOL_2026";
  const STORAGE_KEY_GAS_URL = "TKA_GAS_URL_2026";
  const STORAGE_KEY_ACTIVE_ROOM = "TKA_ACTIVE_ROOM_2026";
  const STORAGE_KEY_ACTIVE_DATE = "TKA_ACTIVE_DATE_2026";
  const STORAGE_KEY_QUEUE = "TKA_OFFLINE_QUEUE_2026";

  // --- STATE ---
  let activeDate = localStorage.getItem(STORAGE_KEY_ACTIVE_DATE) || "2026-10-26";
  let activeRoom = localStorage.getItem(STORAGE_KEY_ACTIVE_ROOM) || "Ruang 1";
  let activeSession = "Sesi 1";
  let gasUrl = localStorage.getItem(STORAGE_KEY_GAS_URL) || "";
  let currentFilter = "all";
  let searchQuery = "";
  let isSyncing = false;
  let pollInterval = null;
  let currentTab = "denah";

  // Rekap Table State
  let rekapActiveDate = "2026-10-26";
  let rekapSearch = "";
  let rekapFilterRuangLaptop = "ALL";
  let rekapFilterRuangKelas = "ALL";
  let rekapOnlyCross = false;
  let rekapOnlyIssues = false;

  // Selected desk for inspection modal
  let selectedDeskForModal = null;

  // Multi-dimensional assignment map: assignments[date][session][room][deskNo]
  let assignments = {};

  // Room Backups: roomBackups[date][session][room] = array of backup laptops
  let roomBackups = {};

  // Rekap Laptops per date: rekapLaptopsByDate[date] = array of student records
  let rekapLaptopsByDate = {};

  // Global pool of unassigned / registered laptops
  let laptopPool = [];

  // Offline queue
  let offlineQueue = [];

  // --- INITIALIZATION ---
  window.addEventListener("DOMContentLoaded", () => {
    loadLocalState();
    setupEventListeners();
    renderDatePills();
    renderRoomSelector();
    renderActiveRoom();
    renderLaptopPool();
    renderRekapLaptopTable();
    updateSyncPill();
    startAutoPolling();
    refreshIcons();
  });

  // --- LOCAL STATE LOADING & AUTO SEEDING ---
  function loadLocalState() {
    // 1. Load Multi-Day Assignments
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
      assignments = stored ? JSON.parse(stored) : {};
    } catch (e) {
      assignments = {};
    }

    // 2. Load Room Backups
    try {
      const storedBackups = localStorage.getItem(STORAGE_KEY_BACKUPS);
      roomBackups = storedBackups ? JSON.parse(storedBackups) : {};
    } catch (e) {
      roomBackups = {};
    }

    // 3. Load Rekap Laptops by Date
    try {
      const storedRekap = localStorage.getItem(STORAGE_KEY_REKAP_BY_DATE);
      rekapLaptopsByDate = storedRekap ? JSON.parse(storedRekap) : {};
    } catch (e) {
      rekapLaptopsByDate = {};
    }

    // Seed initial rekap for all 4 dates if empty
    TKA_DATES.forEach((d) => {
      if (!rekapLaptopsByDate[d.id] || rekapLaptopsByDate[d.id].length === 0) {
        rekapLaptopsByDate[d.id] = typeof generateMasterRekapList === "function" ? generateMasterRekapList() : [];
      }
    });
    saveRekapLaptopsByDate();

    // 4. Load Laptop Pool
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

    // 5. Load Offline Queue
    try {
      const storedQueue = localStorage.getItem(STORAGE_KEY_QUEUE);
      offlineQueue = storedQueue ? JSON.parse(storedQueue) : [];
    } catch (e) {
      offlineQueue = [];
    }

    // Fill settings input
    const inputGasUrl = document.getElementById("input-gas-url");
    if (inputGasUrl && gasUrl) {
      inputGasUrl.value = gasUrl;
    }
  }

  function saveAssignments() {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
  }

  function saveRoomBackups() {
    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(roomBackups));
  }

  function saveRekapLaptopsByDate() {
    localStorage.setItem(STORAGE_KEY_REKAP_BY_DATE, JSON.stringify(rekapLaptopsByDate));
  }

  function saveLaptopPool() {
    localStorage.setItem(STORAGE_KEY_POOL, JSON.stringify(laptopPool));
  }

  function saveOfflineQueue() {
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(offlineQueue));
  }

  function generateDefaultLaptopPool() {
    const list = [];
    if (typeof KNOWN_STUDENTS_META !== "undefined") {
      let idx = 1;
      Object.keys(KNOWN_STUDENTS_META).forEach((nama) => {
        const meta = KNOWN_STUDENTS_META[nama];
        list.push({
          idLaptop: `LP-${String(idx).padStart(3, "0")}`,
          labelLaptop: `Laptop Mandiri (${meta.kelas})`,
          pemilikLaptop: nama,
          isReady: meta.laptop === "AMAN",
          hasCharger: meta.charger === "ADA",
          catatan: meta.keterangan || "",
          assignedRoom: null,
          assignedDesk: null
        });
        idx++;
      });
    }

    const brands = [
      "Asus Vivobook 14 (Core i5, 8GB)",
      "Lenovo ThinkPad L14 (Core i5, 8GB)",
      "Acer Aspire 5 (Ryzen 5, 8GB)",
      "HP ProBook 440 G8 (Core i5, 16GB)",
      "Dell Latitude 3420 (Core i3, 8GB)"
    ];

    for (let i = list.length + 1; i <= list.length + 30; i++) {
      list.push({
        idLaptop: `LP-${String(i).padStart(3, "0")}`,
        labelLaptop: brands[i % brands.length],
        pemilikLaptop: "Inventaris Lab Komputer",
        isReady: true,
        hasCharger: true,
        catatan: "",
        assignedRoom: null,
        assignedDesk: null
      });
    }

    return list;
  }

  // --- CASCADING AUTO-COPY & INHERITANCE ENGINE ---
  /**
   * Resolves desk assignments for (date, session, room)
   * If current session is empty, auto-copies from previous session or previous day!
   */
  function getEffectiveRoomAssignments(date, session, room) {
    if (!assignments[date]) assignments[date] = {};
    if (!assignments[date][session]) assignments[date][session] = {};

    // 1. If explicit data exists for this session, return it
    if (assignments[date][session][room] && Object.keys(assignments[date][session][room]).length > 0) {
      return assignments[date][session][room];
    }

    // 2. Otherwise, find predecessor state to inherit/auto-copy
    let predecessorState = null;

    if (session === "Sesi 2") {
      predecessorState = assignments[date]["Sesi 1"] && assignments[date]["Sesi 1"][room];
    } else if (session === "Sesi 3") {
      predecessorState = (assignments[date]["Sesi 2"] && assignments[date]["Sesi 2"][room]) ||
                         (assignments[date]["Sesi 1"] && assignments[date]["Sesi 1"][room]);
    } else if (session === "Sesi 1") {
      // Find previous date
      const dateIdx = TKA_DATES.findIndex((d) => d.id === date);
      if (dateIdx > 0) {
        const prevDate = TKA_DATES[dateIdx - 1].id;
        if (assignments[prevDate]) {
          predecessorState = (assignments[prevDate]["Sesi 3"] && assignments[prevDate]["Sesi 3"][room]) ||
                             (assignments[prevDate]["Sesi 2"] && assignments[prevDate]["Sesi 2"][room]) ||
                             (assignments[prevDate]["Sesi 1"] && assignments[prevDate]["Sesi 1"][room]);
        }
      }
    }

    // 3. If predecessor found, clone it into current session!
    if (predecessorState && Object.keys(predecessorState).length > 0) {
      assignments[date][session][room] = JSON.parse(JSON.stringify(predecessorState));
      saveAssignments();
      return assignments[date][session][room];
    }

    // 4. Default empty state
    if (!assignments[date][session][room]) {
      assignments[date][session][room] = {};
    }
    return assignments[date][session][room];
  }

  /**
   * Resolves Room Backup Laptops for (date, session, room)
   */
  function getEffectiveRoomBackups(date, session, room) {
    if (!roomBackups[date]) roomBackups[date] = {};
    if (!roomBackups[date][session]) roomBackups[date][session] = {};

    if (roomBackups[date][session][room] && roomBackups[date][session][room].length > 0) {
      return roomBackups[date][session][room];
    }

    // Try inherit from earlier session or seed default
    let predecessor = null;
    if (session === "Sesi 2") {
      predecessor = roomBackups[date]["Sesi 1"] && roomBackups[date]["Sesi 1"][room];
    } else if (session === "Sesi 3") {
      predecessor = (roomBackups[date]["Sesi 2"] && roomBackups[date]["Sesi 2"][room]) ||
                    (roomBackups[date]["Sesi 1"] && roomBackups[date]["Sesi 1"][room]);
    }

    if (predecessor && predecessor.length > 0) {
      roomBackups[date][session][room] = JSON.parse(JSON.stringify(predecessor));
      saveRoomBackups();
      return roomBackups[date][session][room];
    }

    // Seed from default generator
    const defaults = typeof generateDefaultRoomBackups === "function" ? generateDefaultRoomBackups() : {};
    roomBackups[date][session][room] = defaults[room] ? JSON.parse(JSON.stringify(defaults[room])) : [];
    saveRoomBackups();
    return roomBackups[date][session][room];
  }

  // --- RENDERING VIEWS ---
  function renderDatePills() {
    const container = document.getElementById("date-pills");
    if (!container) return;

    container.innerHTML = "";
    TKA_DATES.forEach((d) => {
      const btn = document.createElement("button");
      btn.dataset.date = d.id;
      const isActive = d.id === activeDate;
      btn.className = `date-btn px-2.5 py-1 rounded-lg font-semibold text-xs transition ${
        isActive ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`;
      btn.textContent = `${d.label}`;
      btn.title = d.dayName;
      btn.addEventListener("click", () => {
        activeDate = d.id;
        localStorage.setItem(STORAGE_KEY_ACTIVE_DATE, activeDate);
        renderDatePills();
        renderActiveRoom();
        if (currentTab === "tabel-laptop") {
          rekapActiveDate = activeDate;
          renderRekapLaptopTable();
        }
      });
      container.appendChild(btn);
    });
  }

  function renderRoomSelector() {
    const select = document.getElementById("select-room");
    if (!select) return;

    select.innerHTML = "";
    Object.keys(ROOMS_DATA).forEach((roomName) => {
      const opt = document.createElement("option");
      opt.value = roomName;
      const isGuru = roomName === "Ruang Guru";
      opt.textContent = isGuru ? "⭐ Ruang Guru (Pusat Cadangan)" : `${roomName} (${ROOMS_DATA[roomName].totalDesks} Meja)`;
      if (roomName === activeRoom) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function renderActiveRoom() {
    const roomConf = ROOMS_DATA[activeRoom];
    if (!roomConf) return;

    localStorage.setItem(STORAGE_KEY_ACTIVE_ROOM, activeRoom);

    // Update labels
    document.getElementById("current-room-title").textContent = roomConf.name;
    const curDateConf = TKA_DATES.find((d) => d.id === activeDate) || TKA_DATES[0];
    document.getElementById("current-date-label").textContent = `${curDateConf.label} (${curDateConf.dayName.split(" ")[0]})`;
    document.getElementById("current-session-label").textContent = activeSession;

    // Check Sesi 3 visibility
    const pillSesi3 = document.getElementById("pill-sesi3");
    const hasSesi3 = roomConf.sessions && roomConf.sessions.includes("Sesi 3");
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

    // Meja Pengawas Banner (hide if Ruang Guru)
    const pengawasBanner = document.getElementById("meja-pengawas-banner");
    if (pengawasBanner) {
      pengawasBanner.style.display = roomConf.isBackupCenter ? "none" : "flex";
    }

    // Render Grid & Room Backups
    if (roomConf.isBackupCenter) {
      renderRuangGuruWorkspace();
    } else {
      renderDeskGrid(roomConf);
      renderRoomBackups(activeRoom);
    }

    updateRoomMetrics();
    refreshIcons();
  }

  function renderDeskGrid(roomConf) {
    const container = document.getElementById("desk-grid-container");
    if (!container) return;

    container.innerHTML = "";

    const grid = roomConf.grid;
    const numCols = grid[0] ? grid[0].length : 5;

    const gridEl = document.createElement("div");
    gridEl.className = "grid gap-3.5 mx-auto justify-center";
    gridEl.style.gridTemplateColumns = `repeat(${numCols}, minmax(130px, 1fr))`;
    gridEl.style.maxWidth = `${numCols * 170}px`;

    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, roomConf.name);

    grid.forEach((row) => {
      row.forEach((deskNo) => {
        if (deskNo === null) {
          const spacer = document.createElement("div");
          spacer.className = "hidden sm:block pointer-events-none opacity-0";
          gridEl.appendChild(spacer);
          return;
        }

        const deskCard = createDeskCard(roomConf.name, deskNo, roomAssignments);
        gridEl.appendChild(deskCard);
      });
    });

    container.appendChild(gridEl);
  }

  function createDeskCard(roomName, deskNo, roomAssignments) {
    const card = document.createElement("div");
    card.className = "desk-card group relative bg-white border-2 rounded-2xl p-3 flex flex-col justify-between gap-2 shadow-xs cursor-pointer select-none transition-all";
    card.dataset.room = roomName;
    card.dataset.desk = deskNo;

    const assignment = (roomAssignments && roomAssignments[deskNo]) || null;
    const studentName = getStudentName(roomName, deskNo, activeSession);

    if (assignment && assignment.idLaptop) {
      if (assignment.isReady && assignment.hasCharger) {
        card.classList.add("border-emerald-200", "bg-emerald-50/20", "hover:border-emerald-400");
      } else {
        card.classList.add("border-amber-200", "bg-amber-50/20", "hover:border-amber-400");
      }
    } else {
      card.classList.add("border-dashed", "border-slate-300", "hover:border-indigo-400", "hover:bg-indigo-50/30");
    }

    // Top: Desk Number & Badges
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

      const readyDot = document.createElement("span");
      readyDot.className = `w-2.5 h-2.5 rounded-full ${assignment.isReady ? "bg-emerald-500" : "bg-rose-500"}`;
      readyDot.title = assignment.isReady ? "Aman" : "Tidak Aman";
      badgesContainer.appendChild(readyDot);

      const chargerIcon = document.createElement("span");
      chargerIcon.className = `text-[11px] font-bold ${assignment.hasCharger ? "text-amber-600" : "text-rose-500"}`;
      chargerIcon.textContent = assignment.hasCharger ? "⚡" : "✕";
      chargerIcon.title = assignment.hasCharger ? "Ada Charger" : "Tanpa Charger";
      badgesContainer.appendChild(chargerIcon);

      topRow.appendChild(badgesContainer);
    }

    card.appendChild(topRow);

    // Middle: Student Name
    const studentRow = document.createElement("div");
    studentRow.className = "flex flex-col gap-0.5 my-0.5";
    
    const studentLabel = document.createElement("span");
    studentLabel.className = "text-[10px] uppercase font-bold text-slate-500 flex items-center justify-between";
    studentLabel.innerHTML = `<span>${activeSession}</span>`;
    studentRow.appendChild(studentLabel);

    const studentNameEl = document.createElement("div");
    studentNameEl.className = "text-xs font-semibold text-slate-800 line-clamp-2 leading-tight";
    studentNameEl.textContent = studentName || "(Kosong / Tidak Ada)";
    if (!studentName) studentNameEl.classList.add("text-slate-400", "italic");
    studentRow.appendChild(studentNameEl);

    card.appendChild(studentRow);

    // Bottom: Laptop Details / Drop Target
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

      const laptopOwner = document.createElement("span");
      laptopOwner.className = "text-[10px] text-slate-600 truncate";
      laptopOwner.textContent = assignment.pemilikLaptop || assignment.labelLaptop || "-";

      laptopDetails.appendChild(laptopId);
      laptopDetails.appendChild(laptopOwner);
      laptopRow.appendChild(laptopDetails);

      const unassignBtn = document.createElement("button");
      unassignBtn.className = "p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition";
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

    // HTML5 Drag and Drop
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
          assignLaptopToDesk(roomName, deskNo, dragData.idLaptop);
        } else if (dragData.source === "backup") {
          assignBackupLaptopToDesk(roomName, deskNo, dragData.idLaptop);
        } else if (dragData.source === "desk") {
          moveLaptopBetweenDesks(dragData.fromRoom, dragData.fromDesk, roomName, deskNo);
        }
      } catch (err) {
        console.error("Drop error:", err);
      }
    });

    card.addEventListener("click", () => {
      openDeskInspectionModal(roomName, deskNo);
    });

    return card;
  }

  // --- ROOM BACKUPS & RUANG GURU WORKSPACE ---
  function renderRoomBackups(roomName) {
    const container = document.getElementById("room-backups-container");
    const countBadge = document.getElementById("room-backup-count-badge");
    const section = document.getElementById("room-backups-section");
    if (!container || !section) return;

    section.style.display = "flex";

    const backups = getEffectiveRoomBackups(activeDate, activeSession, roomName);
    if (countBadge) countBadge.textContent = `${backups.length} Unit Siap Pakai`;

    container.innerHTML = "";

    if (backups.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-4 text-center text-slate-400 text-xs italic">
          Belum ada laptop cadangan di ruangan ini. Tarik dari Ruang Guru atau Pool.
        </div>
      `;
      return;
    }

    backups.forEach((b, idx) => {
      const card = document.createElement("div");
      card.className = "bg-amber-50/50 hover:bg-amber-50 border border-amber-200 hover:border-amber-400 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-2xs cursor-grab active:cursor-grabbing transition";
      card.setAttribute("draggable", "true");

      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({
          source: "backup",
          fromRoom: roomName,
          backupIdx: idx,
          idLaptop: b.idLaptop
        }));
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-200 text-amber-900">${b.idLaptop}</span>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full ${b.isReady ? "bg-emerald-500" : "bg-rose-500"}" title="${b.isReady ? "Aman" : "Tidak Aman"}"></span>
            <span class="text-xs font-bold ${b.hasCharger ? "text-amber-600" : "text-rose-500"}">${b.hasCharger ? "⚡" : "✕"}</span>
          </div>
        </div>

        <div class="flex flex-col">
          <span class="text-xs font-bold text-slate-900 truncate">${b.labelLaptop}</span>
          <span class="text-[10px] text-slate-500 truncate">${b.pemilikLaptop}</span>
          ${b.catatan ? `<span class="text-[10px] text-amber-800 mt-1">📝 ${b.catatan}</span>` : ""}
        </div>

        <div class="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
          <span class="text-amber-700 font-semibold">Siap Ditukar</span>
          <span class="text-slate-400 italic">Tarik ke meja</span>
        </div>
      `;

      container.appendChild(card);
    });
  }

  function renderRuangGuruWorkspace() {
    const container = document.getElementById("desk-grid-container");
    const backupsSection = document.getElementById("room-backups-section");
    if (!container) return;

    if (backupsSection) backupsSection.style.display = "none";

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col gap-5 w-full";

    const guruBackups = getEffectiveRoomBackups(activeDate, activeSession, "Ruang Guru");

    wrapper.innerHTML = `
      <div class="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-bold border border-indigo-400/30">
              Posko IT & Panitia
            </span>
            <span class="text-xs text-slate-300">Total Stok: ${guruBackups.length} Unit</span>
          </div>
          <h2 class="text-xl font-black">Ruang Guru (Pusat Cadangan Sekolah)</h2>
          <p class="text-xs text-slate-300 mt-1 max-w-xl">
            Pusat penyimpanan unit laptop cadangan, charger cadangan, dan pengganti darurat. Anda dapat mendistribusikan unit cadangan ini ke Ruang 1 s.d. 11 kapan saja.
          </p>
        </div>
        <button id="btn-guru-add-spare" class="px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs shadow-md hover:bg-indigo-50 transition flex items-center gap-2 flex-shrink-0">
          <i data-lucide="plus-circle" class="w-4 h-4 text-indigo-600"></i>
          <span>Tambah Stok Cadangan</span>
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
        ${guruBackups.map((b, idx) => `
          <div class="bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-sm transition">
            <div class="flex items-center justify-between">
              <span class="px-2 py-0.5 rounded-md font-black text-xs bg-indigo-100 text-indigo-900">${b.idLaptop}</span>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full ${b.isReady ? "bg-emerald-500" : "bg-rose-500"}"></span>
                <span class="text-xs font-bold ${b.hasCharger ? "text-amber-600" : "text-rose-500"}">${b.hasCharger ? "⚡" : "✕"}</span>
              </div>
            </div>

            <div class="flex flex-col">
              <span class="text-xs font-bold text-slate-900">${b.labelLaptop}</span>
              <span class="text-[11px] text-slate-500">${b.pemilikLaptop}</span>
              ${b.catatan ? `<span class="text-[10px] text-slate-600 mt-1 bg-white p-1 rounded border border-slate-200">📝 ${b.catatan}</span>` : ""}
            </div>

            <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span class="text-emerald-700 font-bold">Stok Siap</span>
              <button class="btn-dispatch-spare text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1" data-idx="${idx}">
                <span>Kirim ke Ruang</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    container.appendChild(wrapper);

    // Event listeners inside Ruang Guru view
    const btnAdd = wrapper.querySelector("#btn-guru-add-spare");
    if (btnAdd) {
      btnAdd.addEventListener("click", () => {
        document.getElementById("modal-add-laptop").classList.remove("hidden");
      });
    }

    wrapper.querySelectorAll(".btn-dispatch-spare").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        promptDispatchSpareFromGuru(idx);
      });
    });

    refreshIcons();
  }

  function promptDispatchSpareFromGuru(backupIdx) {
    const guruBackups = getEffectiveRoomBackups(activeDate, activeSession, "Ruang Guru");
    const item = guruBackups[backupIdx];
    if (!item) return;

    const targetRoom = prompt(`Kirim laptop ${item.idLaptop} ke ruangan mana? (Contoh: Ruang 1, Ruang 5, Ruang 8)`);
    if (!targetRoom || !ROOMS_DATA[targetRoom]) {
      if (targetRoom) showToast(`Ruangan '${targetRoom}' tidak ditemukan.`, "error");
      return;
    }

    // Move from Ruang Guru to target room's backups
    guruBackups.splice(backupIdx, 1);
    const targetBackups = getEffectiveRoomBackups(activeDate, activeSession, targetRoom);
    targetBackups.push({
      ...item,
      room: targetRoom,
      pemilikLaptop: `Unit Cadangan ${targetRoom} (dari Ruang Guru)`
    });

    saveRoomBackups();
    renderActiveRoom();
    showToast(`Laptop ${item.idLaptop} berhasil dikirim ke ${targetRoom}`, "success");
  }

  function renderLaptopPool() {
    const listContainer = document.getElementById("laptop-pool-list");
    const countBadge = document.getElementById("pool-count-badge");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    let unassigned = laptopPool.filter((l) => !l.assignedRoom || !l.assignedDesk);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      unassigned = unassigned.filter((l) => 
        l.idLaptop.toLowerCase().includes(q) ||
        (l.labelLaptop && l.labelLaptop.toLowerCase().includes(q)) ||
        (l.pemilikLaptop && l.pemilikLaptop.toLowerCase().includes(q))
      );
    }

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

      const left = document.createElement("div");
      left.className = "flex flex-col truncate";

      const top = document.createElement("div");
      top.className = "flex items-center gap-1.5";

      const idSpan = document.createElement("span");
      idSpan.className = "text-xs font-bold text-slate-900";
      idSpan.textContent = laptop.idLaptop;
      top.appendChild(idSpan);

      const readySpan = document.createElement("span");
      readySpan.className = `w-2 h-2 rounded-full ${laptop.isReady ? "bg-emerald-500" : "bg-rose-500"}`;
      readySpan.title = laptop.isReady ? "Aman" : "Tidak Aman";
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
      labelSpan.textContent = laptop.pemilikLaptop || laptop.labelLaptop || "Laptop Mandiri";
      left.appendChild(labelSpan);

      item.appendChild(left);

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

    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, activeRoom);
    Object.values(roomAssignments).forEach((a) => {
      if (a && a.idLaptop) {
        assignedCount++;
        if (a.isReady) readyCount++;
      }
    });

    const backups = getEffectiveRoomBackups(activeDate, activeSession, activeRoom);

    const metricAssigned = document.getElementById("metric-assigned");
    const metricReady = document.getElementById("metric-ready");
    const metricRoomBackups = document.getElementById("metric-room-backups");

    if (metricAssigned) metricAssigned.textContent = `${assignedCount}/${total}`;
    if (metricReady) metricReady.textContent = readyCount;
    if (metricRoomBackups) metricRoomBackups.textContent = backups.length;
  }

  // --- VIEW 2: SPREADSHEET REKAP LAPTOP TABLE (WITH SESI 1, SESI 2, SESI 3) ---
  function renderRekapLaptopTable() {
    const tbody = document.getElementById("rekap-table-body");
    const activeSheetBadge = document.getElementById("rekap-active-sheet-badge");
    if (!tbody) return;

    const curDateConf = TKA_DATES.find((d) => d.id === rekapActiveDate) || TKA_DATES[0];
    if (activeSheetBadge) {
      activeSheetBadge.textContent = `Sheet: ${curDateConf.sheetName}`;
    }

    // Update active tab buttons
    document.querySelectorAll(".rekap-date-tab").forEach((btn) => {
      if (btn.dataset.date === rekapActiveDate) {
        btn.className = "rekap-date-tab px-3.5 py-1.5 rounded-xl font-bold text-xs bg-indigo-600 text-white shadow-sm flex items-center gap-1.5 transition";
      } else {
        btn.className = "rekap-date-tab px-3.5 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5 transition";
      }
    });

    tbody.innerHTML = "";

    const dateList = rekapLaptopsByDate[rekapActiveDate] || [];
    let filtered = [...dateList];

    // Search filter
    if (rekapSearch.trim()) {
      const q = rekapSearch.toLowerCase().trim();
      filtered = filtered.filter((r) => 
        (r.nis && String(r.nis).toLowerCase().includes(q)) ||
        (r.nama && r.nama.toLowerCase().includes(q)) ||
        (r.kelas && r.kelas.toLowerCase().includes(q))
      );
    }

    // Ruang Laptop Filter
    if (rekapFilterRuangLaptop !== "ALL") {
      filtered = filtered.filter((r) => String(r.ruangLaptop).toUpperCase() === rekapFilterRuangLaptop.toUpperCase());
    }

    // Ruang Kelas Filter
    if (rekapFilterRuangKelas !== "ALL") {
      filtered = filtered.filter((r) => String(r.ruangKelas).toUpperCase() === rekapFilterRuangKelas.toUpperCase());
    }

    // Cross-Room Toggle
    if (rekapOnlyCross) {
      filtered = filtered.filter((r) => String(r.ruangLaptop).trim().toUpperCase() !== String(r.ruangKelas).trim().toUpperCase());
    }

    // Issues Toggle
    if (rekapOnlyIssues) {
      filtered = filtered.filter((r) => 
        r.charger === "TIDAK ADA" || 
        r.laptop === "TIDAK AMAN" || 
        !r.keberadaan
      );
    }

    let countNoCharger = 0;
    let countNotSafe = 0;

    dateList.forEach((r) => {
      if (r.charger === "TIDAK ADA") countNoCharger++;
      if (r.laptop === "TIDAK AMAN") countNotSafe++;
    });

    document.getElementById("rekap-count-shown").textContent = filtered.length;
    document.getElementById("rekap-count-no-charger").textContent = countNoCharger;
    document.getElementById("rekap-count-not-safe").textContent = countNotSafe;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="13" class="py-12 text-center text-slate-400">
            <div class="flex flex-col items-center gap-2">
              <i data-lucide="filter-x" class="w-8 h-8 text-slate-300"></i>
              <span>Tidak ada data siswa yang cocok dengan filter pada tanggal ${curDateConf.label}.</span>
            </div>
          </td>
        </tr>
      `;
      refreshIcons();
      return;
    }

    filtered.forEach((row, idx) => {
      const isCross = String(row.ruangLaptop).trim().toUpperCase() !== String(row.ruangKelas).trim().toUpperCase();
      const tr = document.createElement("tr");
      tr.className = "hover:bg-indigo-50/30 transition text-xs " + (idx % 2 === 0 ? "bg-white" : "bg-slate-50/50");

      tr.innerHTML = `
        <td class="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">${row.nis || "-"}</td>
        <td class="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">${row.nama}</td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap text-slate-600 font-semibold">${row.kelas || "-"}</td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap">
          <span class="px-2 py-0.5 rounded-md font-bold text-slate-700 bg-slate-100 border border-slate-200">
            ${row.ruangKelas || "-"}
          </span>
        </td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap">
          <span class="px-2 py-0.5 rounded-md font-bold ${isCross ? "bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}">
            ${row.ruangLaptop || "-"}
          </span>
        </td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap font-bold text-indigo-900 bg-slate-100/70 border-x border-slate-200/50">
          ${row.sesi1 || "-"}
        </td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap font-bold text-indigo-900 bg-slate-100/70 border-r border-slate-200/50">
          ${row.sesi2 || "-"}
        </td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap font-bold text-indigo-900 bg-slate-100/70 border-r border-slate-200/50">
          ${row.sesi3 || "-"}
        </td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap">
          <input type="checkbox" class="rekap-cb-keberadaan w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" data-nis="${row.nis}" data-nama="${row.nama}" ${row.keberadaan ? "checked" : ""}>
        </td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap">
          <select class="rekap-select-charger appearance-none px-2 py-1 rounded-lg text-xs font-bold border cursor-pointer ${row.charger === "TIDAK ADA" ? "bg-red-600 text-white border-red-700 shadow-sm" : "bg-slate-100 text-slate-800 border-slate-300"}" data-nis="${row.nis}" data-nama="${row.nama}">
            <option value="ADA" ${row.charger === "ADA" ? "selected" : ""}>ADA</option>
            <option value="TIDAK ADA" ${row.charger === "TIDAK ADA" ? "selected" : ""}>TIDAK ADA</option>
          </select>
        </td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap">
          <select class="rekap-select-laptop appearance-none px-2 py-1 rounded-lg text-xs font-bold border cursor-pointer ${row.laptop === "TIDAK AMAN" ? "bg-amber-500 text-white border-amber-600" : "bg-slate-100 text-slate-800 border-slate-300"}" data-nis="${row.nis}" data-nama="${row.nama}">
            <option value="AMAN" ${row.laptop === "AMAN" ? "selected" : ""}>AMAN</option>
            <option value="TIDAK AMAN" ${row.laptop === "TIDAK AMAN" ? "selected" : ""}>TIDAK AMAN</option>
          </select>
        </td>
        <td class="py-2.5 px-3 min-w-[200px]">
          <input type="text" class="rekap-input-keterangan w-full bg-transparent hover:bg-white focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1.5 py-0.5 text-xs text-slate-800 transition outline-none" value="${row.keterangan || ""}" placeholder="Catatan teknisi..." data-nis="${row.nis}" data-nama="${row.nama}">
        </td>
        <td class="py-2.5 px-2 text-center whitespace-nowrap">
          <button class="rekap-btn-jump p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition" title="Buka di Denah Ruang" data-room="${row.ruangLaptop}">
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Attach listeners
    tbody.querySelectorAll(".rekap-cb-keberadaan").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        updateRekapItem(rekapActiveDate, e.target.dataset.nis, e.target.dataset.nama, {
          keberadaan: e.target.checked
        });
      });
    });

    tbody.querySelectorAll(".rekap-select-charger").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const val = e.target.value;
        sel.className = `rekap-select-charger appearance-none px-2 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
          val === "TIDAK ADA" ? "bg-red-600 text-white border-red-700 shadow-sm" : "bg-slate-100 text-slate-800 border-slate-300"
        }`;
        updateRekapItem(rekapActiveDate, e.target.dataset.nis, e.target.dataset.nama, {
          charger: val
        });
      });
    });

    tbody.querySelectorAll(".rekap-select-laptop").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const val = e.target.value;
        sel.className = `rekap-select-laptop appearance-none px-2 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
          val === "TIDAK AMAN" ? "bg-amber-500 text-white border-amber-600" : "bg-slate-100 text-slate-800 border-slate-300"
        }`;
        updateRekapItem(rekapActiveDate, e.target.dataset.nis, e.target.dataset.nama, {
          laptop: val
        });
      });
    });

    tbody.querySelectorAll(".rekap-input-keterangan").forEach((inp) => {
      inp.addEventListener("blur", (e) => {
        updateRekapItem(rekapActiveDate, e.target.dataset.nis, e.target.dataset.nama, {
          keterangan: e.target.value.trim()
        });
      });
    });

    tbody.querySelectorAll(".rekap-btn-jump").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rCode = btn.dataset.room;
        const targetRoomName = rCode === "Ruang Guru" ? "Ruang Guru" : rCode.replace("R", "Ruang ");
        if (ROOMS_DATA[targetRoomName]) {
          activeRoom = targetRoomName;
          document.getElementById("select-room").value = targetRoomName;
          activeDate = rekapActiveDate;
          renderDatePills();
          switchTab("denah");
          renderActiveRoom();
        }
      });
    });

    refreshIcons();
  }

  function updateRekapItem(date, nis, nama, changes) {
    const list = rekapLaptopsByDate[date] || [];
    let item = list.find((r) => (nis && r.nis === nis) || (r.nama === nama));
    if (!item) return;

    Object.assign(item, changes);
    saveRekapLaptopsByDate();

    // Cross-sync to current active desk if matches
    const rName = item.ruangLaptop === "Ruang Guru" ? "Ruang Guru" : item.ruangLaptop.replace("R", "Ruang ");
    const roomAssignments = assignments[date] && assignments[date][activeSession] && assignments[date][activeSession][rName];
    if (roomAssignments) {
      Object.values(roomAssignments).forEach((a) => {
        if (a && a.pemilikLaptop === item.nama) {
          if (changes.charger !== undefined) a.hasCharger = changes.charger === "ADA";
          if (changes.laptop !== undefined) a.isReady = changes.laptop === "AMAN";
          if (changes.keterangan !== undefined) a.catatan = changes.keterangan;
        }
      });
      saveAssignments();
      renderActiveRoom();
    }

    syncRekapRowToGAS(date, item);
    showToast(`Data ${item.nama} diperbarui`, "success");
  }

  // --- VIEW 3: OVERVIEW RUANG ---
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
      const isGuru = roomName === "Ruang Guru";
      const totalDesks = conf.totalDesks;
      totalAllDesks += totalDesks;

      const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, roomName);
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

      const backups = getEffectiveRoomBackups(activeDate, activeSession, roomName);

      totalAllAssigned += assigned;
      totalAllReady += ready;
      totalAllChargers += chargers;

      const pct = totalDesks > 0 ? Math.round((assigned / totalDesks) * 100) : 100;

      const card = document.createElement("div");
      card.className = "bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs transition";

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-xs shadow-2xs">
              ${isGuru ? "RG" : roomName.replace("Ruang ", "R")}
            </span>
            <div>
              <h3 class="font-bold text-sm text-slate-900">${roomName}</h3>
              <p class="text-[11px] text-slate-500">${isGuru ? "Pusat Cadangan" : conf.sessions.join(", ")}</p>
            </div>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${
            isGuru ? "bg-amber-100 text-amber-900" : (pct === 100 ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800")
          }">
            ${isGuru ? `${backups.length} Stok` : `${pct}%`}
          </span>
        </div>

        ${!isGuru ? `
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between text-xs text-slate-600">
              <span>Terisi: <strong>${assigned}/${totalDesks}</strong> Meja</span>
              <span>Aman: <strong class="text-emerald-600">${ready}</strong></span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div class="bg-indigo-600 h-2 rounded-full transition-all" style="width: ${pct}%"></div>
            </div>
          </div>
        ` : `
          <div class="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <span>Stok Posko: <strong>${backups.length}</strong> Unit</span>
            <span class="text-emerald-600 font-bold">Siap Suplai</span>
          </div>
        `}

        <div class="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
          <span class="text-amber-600 font-semibold flex items-center gap-1">
            <span>⚡</span> ${isGuru ? `${backups.length} Charger` : `${backups.length} Cadangan`}
          </span>
          <button class="btn-jump-room text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1" data-room="${roomName}">
            <span>Buka Ruang</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    document.getElementById("rekap-total-desks").textContent = totalAllDesks;
    document.getElementById("rekap-total-assigned").textContent = totalAllAssigned;
    document.getElementById("rekap-total-ready").textContent = totalAllReady;
    document.getElementById("rekap-total-charger").textContent = totalAllChargers;

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

  // --- ASSIGNMENTS & OPTIMISTIC UPDATES ---
  function assignLaptopToDesk(roomName, deskNo, idLaptop, customDetails = null) {
    const laptop = laptopPool.find((l) => l.idLaptop === idLaptop);
    if (!laptop) return;

    // Ensure session map exists
    if (!assignments[activeDate]) assignments[activeDate] = {};
    if (!assignments[activeDate][activeSession]) assignments[activeDate][activeSession] = {};
    if (!assignments[activeDate][activeSession][roomName]) assignments[activeDate][activeSession][roomName] = {};

    const isReady = customDetails ? customDetails.isReady : laptop.isReady;
    const hasCharger = customDetails ? customDetails.hasCharger : laptop.hasCharger;
    const catatan = customDetails ? customDetails.catatan : (laptop.catatan || "");

    assignments[activeDate][activeSession][roomName][deskNo] = {
      idLaptop: laptop.idLaptop,
      labelLaptop: laptop.labelLaptop,
      pemilikLaptop: laptop.pemilikLaptop,
      isReady: isReady,
      hasCharger: hasCharger,
      catatan: catatan,
      lastUpdated: new Date().toISOString()
    };

    laptop.assignedRoom = roomName;
    laptop.assignedDesk = deskNo;
    laptop.isReady = isReady;
    laptop.hasCharger = hasCharger;
    laptop.catatan = catatan;

    // Update Sesi column in Rekap for activeDate
    updateRekapDeskPosition(activeDate, laptop.pemilikLaptop, roomName, deskNo, activeSession, {
      hasCharger,
      isReady,
      catatan
    });

    saveAssignments();
    saveLaptopPool();
    renderActiveRoom();
    renderLaptopPool();
    if (currentTab === "tabel-laptop") renderRekapLaptopTable();

    syncAssignmentToGAS(activeDate, activeSession, roomName, deskNo);
    showToast(`Laptop ${idLaptop} dipasang ke ${roomName} Meja ${deskNo} (${activeDate} ${activeSession})`, "success");
  }

  function assignBackupLaptopToDesk(roomName, deskNo, idLaptop) {
    const backups = getEffectiveRoomBackups(activeDate, activeSession, roomName);
    const bIdx = backups.findIndex((b) => b.idLaptop === idLaptop);
    if (bIdx === -1) return;

    const bItem = backups[bIdx];
    backups.splice(bIdx, 1); // Remove from backups
    saveRoomBackups();

    // Assign to desk
    assignLaptopToDesk(roomName, deskNo, bItem.idLaptop, {
      isReady: bItem.isReady,
      hasCharger: bItem.hasCharger,
      catatan: bItem.catatan || `Cadangan ${roomName}`
    });
  }

  function unassignLaptopFromDesk(roomName, deskNo) {
    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, roomName);
    if (!roomAssignments || !roomAssignments[deskNo]) return;

    const assignment = roomAssignments[deskNo];
    const idLaptop = assignment.idLaptop;
    const pemilik = assignment.pemilikLaptop;

    delete roomAssignments[deskNo];

    const laptop = laptopPool.find((l) => l.idLaptop === idLaptop);
    if (laptop) {
      laptop.assignedRoom = null;
      laptop.assignedDesk = null;
    }

    // Clear desk position for this session in rekap
    if (pemilik) {
      clearRekapDeskPosition(activeDate, pemilik, activeSession);
    }

    saveAssignments();
    saveLaptopPool();
    renderActiveRoom();
    renderLaptopPool();
    if (currentTab === "tabel-laptop") renderRekapLaptopTable();

    syncAssignmentToGAS(activeDate, activeSession, roomName, deskNo, true);
    showToast(`Laptop ${idLaptop} dilepas dari Meja ${deskNo}`, "info");
  }

  function moveLaptopBetweenDesks(fromRoom, fromDesk, toRoom, toDesk) {
    if (fromRoom === toRoom && fromDesk === toDesk) return;

    const fromAssignments = getEffectiveRoomAssignments(activeDate, activeSession, fromRoom);
    const fromAssignment = fromAssignments && fromAssignments[fromDesk];
    if (!fromAssignment) return;

    const idLaptop = fromAssignment.idLaptop;
    const toAssignments = getEffectiveRoomAssignments(activeDate, activeSession, toRoom);
    const existingTarget = toAssignments && toAssignments[toDesk];

    if (existingTarget && existingTarget.idLaptop) {
      assignLaptopToDesk(fromRoom, fromDesk, existingTarget.idLaptop);
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
    if (!roomConf || roomConf.isBackupCenter) return;

    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, activeRoom);
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

  // --- SWAP WITH ROOM BACKUP ---
  function swapCurrentDeskWithRoomBackup(roomName, deskNo) {
    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, roomName);
    const curAssignment = roomAssignments && roomAssignments[deskNo];
    if (!curAssignment) {
      showToast("Meja ini belum memiliki laptop untuk ditukar.", "warning");
      return;
    }

    const backups = getEffectiveRoomBackups(activeDate, activeSession, roomName);
    if (backups.length === 0) {
      showToast(`Tidak ada laptop cadangan di ${roomName}. Minta suplai dari Ruang Guru.`, "error");
      return;
    }

    // 1. Take first backup laptop
    const backupLaptop = backups.shift();

    // 2. Move broken laptop to backups as TIDAK AMAN
    backups.push({
      idLaptop: curAssignment.idLaptop,
      labelLaptop: curAssignment.labelLaptop,
      pemilikLaptop: curAssignment.pemilikLaptop,
      isReady: false,
      hasCharger: curAssignment.hasCharger,
      catatan: `Bermasalah dari Meja ${deskNo} (Sesi: ${activeSession}): ${curAssignment.catatan || "Perlu perbaikan"}`,
      isBackup: true,
      room: roomName
    });
    saveRoomBackups();

    // 3. Assign backup laptop to desk
    assignLaptopToDesk(roomName, deskNo, backupLaptop.idLaptop, {
      isReady: backupLaptop.isReady,
      hasCharger: backupLaptop.hasCharger,
      catatan: `Unit Cadangan (${backupLaptop.idLaptop})`
    });

    closeDeskInspectionModal();
    showToast(`Laptop Meja ${deskNo} berhasil ditukar dengan cadangan ${backupLaptop.idLaptop}!`, "success");
  }

  // --- REKAP COLUMN HELPERS (SESI 1, SESI 2, SESI 3) ---
  function updateRekapDeskPosition(date, ownerName, roomName, deskNo, session, details = {}) {
    const list = rekapLaptopsByDate[date] || [];
    let item = list.find((r) => r.nama === ownerName);
    if (!item) return;

    const rCode = roomName === "Ruang Guru" ? "Ruang Guru" : roomName.replace("Ruang ", "R");
    const deskText = `Meja ${deskNo}`;

    item.ruangLaptop = rCode;
    item.keberadaan = true;
    if (details.hasCharger !== undefined) item.charger = details.hasCharger ? "ADA" : "TIDAK ADA";
    if (details.isReady !== undefined) item.laptop = details.isReady ? "AMAN" : "TIDAK AMAN";
    if (details.catatan !== undefined) item.keterangan = details.catatan;

    if (session === "Sesi 1") {
      item.sesi1 = deskText;
      // Propagate forward if subsequent sessions are unassigned
      if (!item.sesi2 || item.sesi2 === "-") item.sesi2 = deskText;
      if (!item.sesi3 || item.sesi3 === "-") item.sesi3 = deskText;
    } else if (session === "Sesi 2") {
      item.sesi2 = deskText;
      if (!item.sesi3 || item.sesi3 === "-") item.sesi3 = deskText;
    } else if (session === "Sesi 3") {
      item.sesi3 = deskText;
    }

    saveRekapLaptopsByDate();
    syncRekapRowToGAS(date, item);
  }

  function clearRekapDeskPosition(date, ownerName, session) {
    const list = rekapLaptopsByDate[date] || [];
    let item = list.find((r) => r.nama === ownerName);
    if (!item) return;

    if (session === "Sesi 1") item.sesi1 = "-";
    else if (session === "Sesi 2") item.sesi2 = "-";
    else if (session === "Sesi 3") item.sesi3 = "-";

    saveRekapLaptopsByDate();
    syncRekapRowToGAS(date, item);
  }

  // --- GAS SYNC PIPELINE ---
  function syncAssignmentToGAS(date, session, roomName, deskNo, isUnassign = false) {
    const roomAssignments = getEffectiveRoomAssignments(date, session, roomName);
    const assignment = roomAssignments && roomAssignments[deskNo];

    const payload = {
      action: "updateAssignment",
      tanggal: date,
      sesi: session,
      room: roomName,
      deskNo: deskNo,
      idLaptop: isUnassign ? "" : (assignment ? assignment.idLaptop : ""),
      labelLaptop: isUnassign ? "" : (assignment ? assignment.labelLaptop : ""),
      pemilikLaptop: isUnassign ? "" : (assignment ? assignment.pemilikLaptop : ""),
      isReady: isUnassign ? false : Boolean(assignment ? assignment.isReady : false),
      hasCharger: isUnassign ? false : Boolean(assignment ? assignment.hasCharger : false),
      catatan: isUnassign ? "" : (assignment ? assignment.catatan : "")
    };

    offlineQueue.push(payload);
    saveOfflineQueue();
    flushOfflineQueue();
  }

  function syncRekapRowToGAS(date, item) {
    const payload = {
      action: "updateRekapRow",
      tanggal: date,
      nis: item.nis || "",
      nama: item.nama || "",
      kelas: item.kelas || "",
      ruangKelas: item.ruangKelas || "",
      ruangLaptop: item.ruangLaptop || "",
      sesi1: item.sesi1 || "-",
      sesi2: item.sesi2 || "-",
      sesi3: item.sesi3 || "-",
      keberadaan: item.keberadaan ? true : false,
      charger: item.charger || "ADA",
      laptopStatus: item.laptop || "AMAN",
      keterangan: item.keterangan || ""
    };

    offlineQueue.push(payload);
    saveOfflineQueue();
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
        await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(item)
        });
        offlineQueue.shift();
        saveOfflineQueue();
      }
      updateSyncPill("synced");
    } catch (err) {
      console.warn("GAS sync error (queued):", err);
      updateSyncPill("offline");
    } finally {
      isSyncing = false;
    }
  }

  function startAutoPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => {
      if (gasUrl && !isSyncing) {
        pollRoomStateFromGAS();
      }
    }, 20000);
  }

  async function pollRoomStateFromGAS() {
    if (!gasUrl) return;
    try {
      const url = `${gasUrl}?action=getRoom&room=${encodeURIComponent(activeRoom)}&tanggal=${encodeURIComponent(activeDate)}&sesi=${encodeURIComponent(activeSession)}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json && json.success && Array.isArray(json.data)) {
        let changed = false;
        const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, activeRoom);

        json.data.forEach((row) => {
          const deskNo = Number(row.NoMeja);
          if (!deskNo) return;

          const remoteLaptopId = String(row.IdLaptop || "").trim();
          const local = roomAssignments[deskNo];

          if (remoteLaptopId) {
            const isReady = String(row.IsReady).toUpperCase() === "TRUE";
            const hasCharger = String(row.HasCharger).toUpperCase() === "TRUE";

            if (!local || local.idLaptop !== remoteLaptopId) {
              roomAssignments[deskNo] = {
                idLaptop: remoteLaptopId,
                labelLaptop: row.LabelLaptop || "",
                pemilikLaptop: row.PemilikLaptop || "",
                isReady: isReady,
                hasCharger: hasCharger,
                catatan: row.Catatan || "",
                lastUpdated: row.LastUpdated || new Date().toISOString()
              };
              changed = true;
            }
          } else if (local && local.idLaptop) {
            delete roomAssignments[deskNo];
            changed = true;
          }
        });

        if (changed) {
          saveAssignments();
          renderActiveRoom();
          if (currentTab === "tabel-laptop") renderRekapLaptopTable();
          showToast(`Pembaruan ${activeRoom} (${activeDate} ${activeSession}) tersinkron`, "info");
        }
      }
    } catch (err) {}
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

  // --- INSPECTION MODAL ---
  function openDeskInspectionModal(roomName, deskNo) {
    selectedDeskForModal = { room: roomName, desk: deskNo };
    const modal = document.getElementById("modal-desk");
    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, roomName);
    const assignment = (roomAssignments && roomAssignments[deskNo]) || null;
    const roomConf = ROOMS_DATA[roomName];
    const roster = roomConf ? roomConf.roster[deskNo] || {} : {};

    document.getElementById("modal-desk-room").textContent = `${roomName} • ${activeDate} • ${activeSession}`;
    document.getElementById("modal-desk-title").textContent = `Inspeksi Meja ${deskNo}`;
    document.getElementById("modal-student-s1").textContent = roster.sesi1 || "(Kosong)";
    document.getElementById("modal-student-s2").textContent = roster.sesi2 || "(Kosong)";
    document.getElementById("modal-student-s3").textContent = roster.sesi3 || "(Kosong)";

    // Populate Laptop Dropdown
    const select = document.getElementById("modal-laptop-select");
    select.innerHTML = '<option value="">-- Pilih Laptop dari Pool / Cadangan --</option>';

    laptopPool.forEach((laptop) => {
      if (!laptop.assignedRoom || (laptop.assignedRoom === roomName && laptop.assignedDesk === deskNo)) {
        const opt = document.createElement("option");
        opt.value = laptop.idLaptop;
        opt.textContent = `${laptop.idLaptop} - ${laptop.pemilikLaptop || laptop.labelLaptop} (${laptop.isReady ? "AMAN" : "TIDAK AMAN"})`;
        if (assignment && assignment.idLaptop === laptop.idLaptop) opt.selected = true;
        select.appendChild(opt);
      }
    });

    // Room Backups in Dropdown
    const backups = getEffectiveRoomBackups(activeDate, activeSession, roomName);
    if (backups.length > 0) {
      const optGroup = document.createElement("optgroup");
      optGroup.label = "Laptop Cadangan Ruangan:";
      backups.forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.idLaptop;
        opt.textContent = `[CADANGAN] ${b.idLaptop} - ${b.labelLaptop}`;
        optGroup.appendChild(opt);
      });
      select.appendChild(optGroup);
    }

    const curLaptop = assignment ? laptopPool.find((l) => l.idLaptop === assignment.idLaptop) : null;
    const ownerName = curLaptop ? curLaptop.pemilikLaptop : (roster.sesi1 || "");
    const dateList = rekapLaptopsByDate[activeDate] || [];
    const rekapItem = dateList.find((r) => r.nama === ownerName);

    const rCode = roomName === "Ruang Guru" ? "Ruang Guru" : roomName.replace("Ruang ", "R");
    const ruangKelasSiswa = rekapItem ? rekapItem.ruangKelas : rCode;
    const isCross = ruangKelasSiswa !== rCode;

    document.getElementById("modal-student-ruang-kelas").textContent = ruangKelasSiswa;
    document.getElementById("modal-laptop-ruang").textContent = rCode;
    
    const crossBadge = document.getElementById("modal-cross-badge");
    if (isCross) {
      crossBadge.classList.remove("hidden");
    } else {
      crossBadge.classList.add("hidden");
    }

    document.getElementById("modal-charger-select").value = assignment ? (assignment.hasCharger ? "ADA" : "TIDAK ADA") : "ADA";
    document.getElementById("modal-safety-select").value = assignment ? (assignment.isReady ? "AMAN" : "TIDAK AMAN") : "AMAN";
    document.getElementById("modal-keberadaan-toggle").checked = rekapItem ? rekapItem.keberadaan : true;
    document.getElementById("modal-notes-input").value = assignment ? (assignment.catatan || "") : "";

    // Quick swap button availability
    const swapBtn = document.getElementById("btn-quick-swap-backup");
    if (swapBtn) {
      swapBtn.style.display = (assignment && assignment.idLaptop && backups.length > 0) ? "flex" : "none";
    }

    modal.classList.remove("hidden");
    refreshIcons();
  }

  function closeDeskInspectionModal() {
    const modal = document.getElementById("modal-desk");
    modal.classList.add("hidden");
    selectedDeskForModal = null;
  }

  // --- CSV EXPORT (PILIHAN A: FORMAT PER TANGGAL DENGAN SESI 1, SESI 2, SESI 3) ---
  function exportMasterCSV() {
    const curDateConf = TKA_DATES.find((d) => d.id === rekapActiveDate) || TKA_DATES[0];
    const rows = [
      ["NIS", "NAMA", "KELAS", "RUANG KELAS", "RUANG LAPTOP", "SESI 1", "SESI 2", "SESI 3", "KEBERADAAN DI RUANGAN", "CHARGER", "LAPTOP", "KETERANGAN / ALASAN JIKA TIDAK AMAN", "LAST UPDATED"]
    ];

    const list = rekapLaptopsByDate[rekapActiveDate] || [];
    list.forEach((r) => {
      rows.push([
        r.nis || "",
        r.nama || "",
        r.kelas || "",
        r.ruangKelas || "",
        r.ruangLaptop || "",
        r.sesi1 || "-",
        r.sesi2 || "-",
        r.sesi3 || "-",
        r.keberadaan ? "TRUE" : "FALSE",
        r.charger || "ADA",
        r.laptop || "AMAN",
        r.keterangan || "",
        new Date().toISOString()
      ]);
    });

    const csvContent = "\uFEFF" + rows.map((e) => 
      e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
    ).join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${curDateConf.sheetName}_TKA_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`File ${curDateConf.sheetName}.csv berhasil diunduh!`, "success");
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Room Selector
    document.getElementById("select-room").addEventListener("change", (e) => {
      activeRoom = e.target.value;
      renderActiveRoom();
    });

    // Session Selector Pills
    document.querySelectorAll(".session-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSession = btn.dataset.session;
        updateSessionPills();
        renderActiveRoom();
      });
    });

    // View Navigation Tabs
    document.getElementById("tab-denah").addEventListener("click", () => switchTab("denah"));
    document.getElementById("tab-tabel-laptop").addEventListener("click", () => switchTab("tabel-laptop"));
    document.getElementById("tab-rekap").addEventListener("click", () => switchTab("rekap"));

    // Rekap Date Tabs (Rekap_26_Okt .. Rekap_29_Okt)
    document.querySelectorAll(".rekap-date-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        rekapActiveDate = btn.dataset.date;
        renderRekapLaptopTable();
      });
    });

    // Search and Filters
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

    document.getElementById("rekap-filter-search").addEventListener("input", (e) => {
      rekapSearch = e.target.value;
      renderRekapLaptopTable();
    });

    document.getElementById("rekap-filter-ruang-laptop").addEventListener("change", (e) => {
      rekapFilterRuangLaptop = e.target.value;
      renderRekapLaptopTable();
    });

    document.getElementById("rekap-filter-ruang-kelas").addEventListener("change", (e) => {
      rekapFilterRuangKelas = e.target.value;
      renderRekapLaptopTable();
    });

    const toggleCrossBtn = document.getElementById("rekap-toggle-cross");
    toggleCrossBtn.addEventListener("click", () => {
      rekapOnlyCross = !rekapOnlyCross;
      toggleCrossBtn.className = `flex-1 px-2.5 py-2 rounded-xl border font-bold transition truncate text-center ${
        rekapOnlyCross ? "border-indigo-500 bg-indigo-600 text-white shadow-xs" : "border-slate-200 bg-slate-50 hover:bg-indigo-50 text-slate-600"
      }`;
      renderRekapLaptopTable();
    });

    const toggleIssuesBtn = document.getElementById("rekap-toggle-issues");
    toggleIssuesBtn.addEventListener("click", () => {
      rekapOnlyIssues = !rekapOnlyIssues;
      toggleIssuesBtn.className = `flex-1 px-2.5 py-2 rounded-xl border font-bold transition truncate text-center ${
        rekapOnlyIssues ? "border-rose-500 bg-rose-600 text-white shadow-xs" : "border-slate-200 bg-slate-50 hover:bg-rose-50 text-slate-600"
      }`;
      renderRekapLaptopTable();
    });

    // Pool Dropzone
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

    // Modal Inspection Events
    document.getElementById("modal-desk-close").addEventListener("click", closeDeskInspectionModal);
    document.getElementById("modal-desk-cancel").addEventListener("click", closeDeskInspectionModal);
    
    document.getElementById("btn-unassign-modal").addEventListener("click", () => {
      if (selectedDeskForModal) {
        unassignLaptopFromDesk(selectedDeskForModal.room, selectedDeskForModal.desk);
        closeDeskInspectionModal();
      }
    });

    document.getElementById("btn-quick-swap-backup").addEventListener("click", () => {
      if (selectedDeskForModal) {
        swapCurrentDeskWithRoomBackup(selectedDeskForModal.room, selectedDeskForModal.desk);
      }
    });

    document.getElementById("form-desk-edit").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!selectedDeskForModal) return;

      const chosenLaptop = document.getElementById("modal-laptop-select").value;
      const chargerVal = document.getElementById("modal-charger-select").value;
      const safetyVal = document.getElementById("modal-safety-select").value;
      const keberadaanVal = document.getElementById("modal-keberadaan-toggle").checked;
      const catatan = document.getElementById("modal-notes-input").value.trim();

      const hasCharger = chargerVal === "ADA";
      const isReady = safetyVal === "AMAN";

      if (chosenLaptop) {
        assignLaptopToDesk(selectedDeskForModal.room, selectedDeskForModal.desk, chosenLaptop, {
          isReady,
          hasCharger,
          catatan
        });

        const laptop = laptopPool.find((l) => l.idLaptop === chosenLaptop);
        if (laptop && laptop.pemilikLaptop) {
          const list = rekapLaptopsByDate[activeDate] || [];
          const item = list.find((r) => r.nama === laptop.pemilikLaptop);
          if (item) {
            item.keberadaan = keberadaanVal;
            saveRekapLaptopsByDate();
            syncRekapRowToGAS(activeDate, item);
          }
        }
      } else {
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
      const chargerVal = document.getElementById("add-laptop-charger-select").value;
      const safetyVal = document.getElementById("add-laptop-safety-select").value;
      const notes = document.getElementById("add-laptop-notes").value.trim();

      if (laptopPool.some((l) => l.idLaptop.toLowerCase() === id.toLowerCase())) {
        showToast(`ID Laptop ${id} sudah terdaftar!`, "error");
        return;
      }

      const newLaptop = {
        idLaptop: id,
        labelLaptop: label,
        pemilikLaptop: pemilik,
        isReady: safetyVal === "AMAN",
        hasCharger: chargerVal === "ADA",
        catatan: notes,
        assignedRoom: null,
        assignedDesk: null
      };

      laptopPool.unshift(newLaptop);
      saveLaptopPool();
      renderLaptopPool();
      modalAdd.classList.add("hidden");
      document.getElementById("form-add-laptop").reset();
      showToast(`Laptop ${id} berhasil ditambahkan`, "success");

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
    document.getElementById("btn-rekap-table-export").addEventListener("click", exportMasterCSV);

    window.addEventListener("online", () => {
      showToast("Koneksi online aktif kembali. Menyinkronkan...", "info");
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
    currentTab = tab;
    const viewDenah = document.getElementById("view-denah");
    const viewTabel = document.getElementById("view-tabel-laptop");
    const viewRekap = document.getElementById("view-rekap");

    const tabDenah = document.getElementById("tab-denah");
    const tabTabel = document.getElementById("tab-tabel-laptop");
    const tabRekap = document.getElementById("tab-rekap");

    viewDenah.classList.add("hidden");
    viewTabel.classList.add("hidden");
    viewRekap.classList.add("hidden");

    tabDenah.className = "tab-btn px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5";
    tabTabel.className = "tab-btn px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5";
    tabRekap.className = "tab-btn px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5";

    if (tab === "denah") {
      viewDenah.classList.remove("hidden");
      tabDenah.className = "tab-btn px-3 py-1.5 rounded-lg font-semibold bg-white text-indigo-700 shadow-sm transition-all flex items-center gap-1.5";
      renderActiveRoom();
    } else if (tab === "tabel-laptop") {
      viewTabel.classList.remove("hidden");
      tabTabel.className = "tab-btn px-3 py-1.5 rounded-lg font-semibold bg-white text-indigo-700 shadow-sm transition-all flex items-center gap-1.5";
      renderRekapLaptopTable();
    } else {
      viewRekap.classList.remove("hidden");
      tabRekap.className = "tab-btn px-3 py-1.5 rounded-lg font-semibold bg-white text-indigo-700 shadow-sm transition-all flex items-center gap-1.5";
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
