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
  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbwDvYEMSLq_oS8cQH8wvZRtQfqYEwTkINi6Haevbc-iOQXBNiEg6nyxBcT_vVOsChrr/exec";

  // --- STATE ---
  let activeDate = localStorage.getItem(STORAGE_KEY_ACTIVE_DATE) || "2026-10-26";
  let activeRoom = localStorage.getItem(STORAGE_KEY_ACTIVE_ROOM) || "Ruang 1";
  let activeSession = "Sesi 1";
  let gasUrl = localStorage.getItem(STORAGE_KEY_GAS_URL) || DEFAULT_GAS_URL;
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
  let rekapOnlyUncollected = false;

  // Pool Drawer Sort & Filter State
  let poolSortOption = "room-asc";
  let deskViewFilter = "all"; // "all" | "empty-only"
  let selectedLaptopForPicker = null; // idLaptop currently being assigned
  let deskPickerFilter = "empty-only"; // "empty-only" | "all" in modal-pick-desk // 'room-asc' | 'room-current-first' | 'name-asc' | 'ready-first'
  let poolRoomFilter = "ALL";     // 'ALL' | 'R1' | ... | 'Ruang Guru'

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
    if (currentTab === "tabel-laptop") renderRekapLaptopTable();
    updateSyncPill();
    startAutoPolling();
    pollRoomStateFromGAS();
    refreshIcons();
  });

  // --- LOCAL STATE LOADING & AUTO SEEDING ---
  const CACHE_VERSION_KEY = "tka_cache_version";
  const CURRENT_CACHE_VERSION = "20261025_008";

  function loadLocalState() {
    const savedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    if (savedVersion !== CURRENT_CACHE_VERSION) {
      // Clear old cached state to force fresh load of verified 462 data from Google Sheets
      localStorage.removeItem(STORAGE_KEY_REKAP_BY_DATE);
      localStorage.removeItem(STORAGE_KEY_ASSIGNMENTS);
      localStorage.removeItem(STORAGE_KEY_POOL);
      localStorage.removeItem(STORAGE_KEY_BACKUPS);
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    }

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
      if (storedPool && JSON.parse(storedPool).length >= 100) {
        laptopPool = JSON.parse(storedPool);
      } else {
        laptopPool = generateDefaultLaptopPool();
        saveLaptopPool();
      }
    } catch (e) {
      laptopPool = generateDefaultLaptopPool();
      saveLaptopPool();
    }
    syncLaptopPoolFromRekap();

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

  function buildLaptopPoolFromRekap() {
    const list = [];
    const seenNames = new Set();
    const seenIds = new Set();
    const dateList = rekapLaptopsByDate[activeDate] || [];

    dateList.forEach((r, idx) => {
      const nama = String(r.nama || r.NAMA || "").trim();
      if (!nama || seenNames.has(nama.toLowerCase())) return;
      seenNames.add(nama.toLowerCase());

      const nis = String(r.nis || r.NIS || idx + 1).trim();
      const idLap = `LP-${nis}`;
      seenIds.add(idLap.toLowerCase());

      const rKelas = String(r.ruangKelas || r["RUANG KELAS"] || "").trim();
      const rLaptop = String(r.ruangLaptop || r["RUANG LAPTOP"] || "").trim();
      const isReady = (r.laptop || r.LAPTOP) !== "TIDAK AMAN";
      const hasCharger = (r.charger || r.CHARGER) === "ADA";
      const catatan = r.keterangan || r.KETERANGAN || "";

      const isPresent = r.keberadaan === true || String(r.keberadaan || r["KEBERADAAN DI RUANGAN"] || "").trim().toUpperCase() === "TRUE";
      list.push({
        idLaptop: idLap,
        labelLaptop: `Laptop Mandiri (${r.kelas || r.KELAS || "-"})`,
        pemilikLaptop: nama,
        nis: nis,
        kelas: r.kelas || r.KELAS || "",
        ruangKelas: rKelas,
        ruangLaptop: rLaptop,
        isReady: isReady,
        hasCharger: hasCharger,
        catatan: catatan,
        keberadaan: isPresent,
        assignedRoom: null,
        assignedDesk: null
      });
    });

    const brands = [
      "Asus Vivobook 14 (Core i5, 8GB)",
      "Lenovo ThinkPad L14 (Core i5, 8GB)",
      "Acer Aspire 5 (Ryzen 5, 8GB)",
      "HP ProBook 440 G8 (Core i5, 16GB)",
      "Dell Latitude 3420 (Core i3, 8GB)"
    ];

    const currentLen = list.length;
    for (let i = 1; i <= 30; i++) {
      const idx = currentLen + i;
      list.push({
        idLaptop: `LP-${String(idx).padStart(3, "0")}`,
        labelLaptop: brands[(i - 1) % brands.length],
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

  
    // --- ROOM HELPERS & SORTING ---
  function normalizeRoomCode(r) {
    if (!r) return "R1";
    const str = String(r).trim();
    if (/^ruang\s*guru$/i.test(str)) return "Ruang Guru";
    const match = str.match(/^ruang\s*(\d+)$/i) || str.match(/^r(\d+)$/i);
    if (match) return "R" + match[1];
    return str;
  }

  function getRoomRank(rCode) {
    if (!rCode) return 999;
    const str = String(rCode).trim();
    if (/^ruang\s*guru$/i.test(str)) return 100;
    const match = str.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    return 99;
  }

function getRoomBackupsStore(date, session, room) {
    if (!roomBackups[date]) roomBackups[date] = {};
    if (!roomBackups[date][session]) roomBackups[date][session] = {};
    if (!roomBackups[date][session][room]) {
      roomBackups[date][session][room] = [];
    }
    return roomBackups[date][session][room];
  }

  function syncLaptopPoolFromRekap() {
    const existingIds = new Set(laptopPool.map((l) => String(l.idLaptop).toLowerCase()));
    const existingOwners = new Set(laptopPool.map((l) => String(l.pemilikLaptop || "").trim().toLowerCase()));
    const dateList = rekapLaptopsByDate[activeDate] || [];
    let added = false;

    dateList.forEach((r, idx) => {
      const nama = String(r.nama || r.NAMA || "").trim();
      if (!nama || existingOwners.has(nama.toLowerCase())) return;
      const nis = String(r.nis || r.NIS || idx + 1).trim();
      const idLap = `LP-${nis}`;
      if (existingIds.has(idLap.toLowerCase())) return;

      existingOwners.add(nama.toLowerCase());
      existingIds.add(idLap.toLowerCase());

      laptopPool.push({
        idLaptop: idLap,
        labelLaptop: `Laptop Mandiri (${r.kelas || r.KELAS || "-"})`,
        pemilikLaptop: nama,
        nis: nis,
        kelas: r.kelas || r.KELAS || "",
        ruangKelas: String(r.ruangKelas || r["RUANG KELAS"] || "").trim(),
        ruangLaptop: String(r.ruangLaptop || r["RUANG LAPTOP"] || "").trim(),
        isReady: (r.laptop || r.LAPTOP) !== "TIDAK AMAN",
        hasCharger: (r.charger || r.CHARGER) === "ADA",
        catatan: r.keterangan || r.KETERANGAN || "",
        assignedRoom: null,
        assignedDesk: null
      });
      added = true;
    });

    if (added) {
      saveLaptopPool();
    }
  }

  function generateDefaultLaptopPool() {
    return buildLaptopPoolFromRekap();
  }

  // --- CASCADING AUTO-COPY & INHERITANCE ENGINE ---
  /**
   * Resolves desk assignments for (date, session, room)
   * If current session is empty, auto-copies from previous session or previous day!
   */
  function getEffectiveRoomAssignments(date, session, room) {
    if (!assignments[date]) assignments[date] = {};
    if (!assignments[date][session]) assignments[date][session] = {};
    if (!assignments[date][session][room]) assignments[date][session][room] = {};

    const currentRoomMap = assignments[date][session][room];

    // If this room session has already been initialized, return it
    if (currentRoomMap._initialized) {
      return currentRoomMap;
    }

    // Otherwise, check for predecessor state to inherit/auto-copy
    let predecessorState = null;

    if (session === "Sesi 2") {
      predecessorState = assignments[date]["Sesi 1"] && assignments[date]["Sesi 1"][room];
    } else if (session === "Sesi 3") {
      predecessorState = (assignments[date]["Sesi 2"] && assignments[date]["Sesi 2"][room]) ||
                         (assignments[date]["Sesi 1"] && assignments[date]["Sesi 1"][room]);
    } else if (session === "Sesi 1") {
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

    // Merge predecessor desks into current session for desks not already explicitly set
    if (predecessorState) {
      Object.keys(predecessorState).forEach((key) => {
        if (key !== "_initialized" && currentRoomMap[key] === undefined) {
          const predItem = predecessorState[key];
          if (predItem && predItem.idLaptop && !predItem.unassigned) {
            currentRoomMap[key] = JSON.parse(JSON.stringify(predItem));
          }
        }
      });
    }

    // Reconcile remaining unset desks from verified rekap table (cross-device fallback)
    const rCode = room === "Ruang Guru" ? "Ruang Guru" : room.replace("Ruang ", "R");
    const sesKey = session === "Sesi 1" ? "sesi1" : (session === "Sesi 2" ? "sesi2" : "sesi3");
    const dateList = rekapLaptopsByDate[date] || [];
    const roomConf = ROOMS_DATA[room];
    const totalDesks = roomConf ? roomConf.totalDesks : 0;

    for (let d = 1; d <= totalDesks; d++) {
      if (currentRoomMap[d] === undefined) {
        const student = dateList.find((r) => {
          const rl = String(r.ruangLaptop || "").trim().toUpperCase();
          const matchRoom = rl === rCode.toUpperCase() || rl === room.toUpperCase();
          const deskMatch = String(r[sesKey] || "").trim().toLowerCase() === `meja ${d}`;
          const isPresent = r.keberadaan === true || String(r.keberadaan || "").trim().toUpperCase() === "TRUE";
          return matchRoom && deskMatch && isPresent;
        });

        if (student) {
          currentRoomMap[d] = {
            idLaptop: `LP-${student.nis || student.nama.replace(/\s+/g, "").substring(0, 8)}`,
            labelLaptop: `Laptop Mandiri (${student.kelas || "-"})`,
            pemilikLaptop: student.nama,
            isReady: student.laptop !== "TIDAK AMAN",
            hasCharger: student.charger !== "TIDAK ADA",
            catatan: student.keterangan || "",
            lastUpdated: new Date().toISOString()
          };
        }
      }
    }

    currentRoomMap._initialized = true;
    saveAssignments();
    return currentRoomMap;
  }

  function getEffectiveRoomBackups(date, session, room) {
    const rCode = room === "Ruang Guru" ? "Ruang Guru" : room.replace("Ruang ", "R");
    
    // Globally track assigned owners & laptop IDs across ALL rooms in this session:
    const globallyAssignedOwners = new Set();
    const globallyAssignedIds = new Set();
    Object.keys(ROOMS_DATA).forEach((rName) => {
      const rAssignments = getEffectiveRoomAssignments(date, session, rName);
      if (rAssignments) {
        Object.values(rAssignments).forEach((a) => {
          if (a && a.idLaptop && !a.unassigned) {
            globallyAssignedIds.add(String(a.idLaptop).toLowerCase().trim());
            if (a.pemilikLaptop) globallyAssignedOwners.add(String(a.pemilikLaptop).toLowerCase().trim());
          }
        });
      }
    });

    const cadanganList = [];

    // 1. Find all student laptops physically placed in this room (HANYA YANG SUDAH DIKUMPULKAN / ADA DI RUANGAN)
    const dateList = rekapLaptopsByDate[date] || [];
    dateList.forEach((r) => {
      const isPresent = r.keberadaan === true || String(r.keberadaan || r["KEBERADAAN DI RUANGAN"] || "").trim().toUpperCase() === "TRUE";
      if (!isPresent) return; // Siswa belum mengumpulkan laptop, tidak ada di ruangan!

      const rl = String(r.ruangLaptop || r["RUANG LAPTOP"] || "").trim().toUpperCase();
      if (rl !== rCode.toUpperCase() && rl !== room.toUpperCase()) return;

      const nama = String(r.nama || r.NAMA || "").trim();
      const nis = String(r.nis || r.NIS || "").trim();
      const idLap = `LP-${nis || nama.replace(/\s+/g, "").substring(0, 8)}`;

      // If already placed on ANY desk in this session, exclude from cadangan
      if (globallyAssignedOwners.has(nama.toLowerCase()) || globallyAssignedIds.has(idLap.toLowerCase())) {
        return;
      }

      const rKelas = String(r.ruangKelas || r["RUANG KELAS"] || "").trim();
      const isCross = rKelas && rKelas.toUpperCase() !== rl;
      const isReady = (r.laptop || r.LAPTOP) !== "TIDAK AMAN";
      const hasCharger = (r.charger || r.CHARGER) === "ADA";
      const catatan = r.keterangan || r.KETERANGAN || "";

      // Check if student has a scheduled desk in this room roster for active session
      const roomConf = ROOMS_DATA[room];
      let scheduledDesk = null;
      if (roomConf && roomConf.roster) {
        const sesKey = session === "Sesi 1" ? "sesi1" : (session === "Sesi 2" ? "sesi2" : "sesi3");
        for (const [dNo, deskData] of Object.entries(roomConf.roster)) {
          if (deskData && deskData[sesKey] && deskData[sesKey].trim().toLowerCase() === nama.toLowerCase()) {
            scheduledDesk = Number(dNo);
            break;
          }
        }
      }

      cadanganList.push({
        idLaptop: idLap,
        labelLaptop: `Laptop Mandiri (${r.kelas || r.KELAS || "-"})`,
        pemilikLaptop: nama,
        nis: nis,
        kelas: r.kelas || r.KELAS || "",
        ruangKelas: rKelas,
        ruangLaptop: rl,
        isReady: isReady,
        hasCharger: hasCharger,
        catatan: catatan,
        isBackup: true,
        isRoomCadangan: true,
        isCrossRoom: isCross,
        scheduledDesk: scheduledDesk,
        room: room
      });
    });

    // 2. Add extra school spares in roomBackups (excluding dummy units)
    const extraSpares = getRoomBackupsStore(date, session, room);
    extraSpares.forEach((extra) => {
      if (extra && extra.idLaptop && !globallyAssignedIds.has(String(extra.idLaptop).toLowerCase())) {
        const idLow = String(extra.idLaptop).toLowerCase();
        if (idLow.startsWith("cad-guru") || idLow.startsWith("cad-r")) return;
        if (!cadanganList.some((c) => c.idLaptop.toLowerCase() === idLow)) {
          cadanganList.push(extra);
        }
      }
    });

    return cadanganList;
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
        pollRoomStateFromGAS();
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

    const btnAutoPlot = document.getElementById("btn-auto-plot");
    if (btnAutoPlot) {
      btnAutoPlot.style.display = roomConf.isBackupCenter ? "none" : "inline-flex";
    }
    const btnClearDesks = document.getElementById("btn-clear-room-desks");
    if (btnClearDesks) {
      btnClearDesks.style.display = roomConf.isBackupCenter ? "none" : "inline-flex";
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
    gridEl.className = "grid gap-2 sm:gap-3.5 w-max sm:w-auto sm:mx-auto justify-start sm:justify-center p-1 sm:p-2";
    gridEl.style.gridTemplateColumns = `repeat(${numCols}, minmax(110px, 1fr))`;
    gridEl.style.maxWidth = `${numCols * 170}px`;

    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, roomConf.name);

    grid.forEach((row) => {
      row.forEach((deskNo) => {
        if (deskNo === null) {
          const spacer = document.createElement("div");
          spacer.className = "pointer-events-none opacity-0 min-w-[8px] sm:min-w-[20px] h-full";
          gridEl.appendChild(spacer);
          return;
        }

        const deskCard = createDeskCard(roomConf.name, deskNo, roomAssignments);
        gridEl.appendChild(deskCard);
      });
    });

    container.appendChild(gridEl);
    container.scrollLeft = 0;
  }

  function createDeskCard(roomName, deskNo, roomAssignments) {
    const card = document.createElement("div");
    card.className = "desk-card group relative bg-white border-2 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between gap-1.5 sm:gap-2 shadow-xs cursor-pointer select-none transition-all active:scale-[0.98]";
    card.dataset.room = roomName;
    card.dataset.desk = deskNo;

    const assignment = (roomAssignments && roomAssignments[deskNo]) || null;
    const hasLaptop = Boolean(assignment && assignment.idLaptop && !assignment.unassigned);
    const studentName = getStudentName(roomName, deskNo, activeSession);

    if (hasLaptop) {
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
      (hasLaptop ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700");
    deskBadge.textContent = `Meja ${deskNo}`;

    topRow.appendChild(deskBadge);

    if (hasLaptop) {
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

    if (hasLaptop) {
      const laptopRow = document.createElement("div");
      laptopRow.className = "flex items-center justify-between gap-1";

      const laptopDetails = document.createElement("div");
      laptopDetails.className = "flex flex-col truncate";

      const laptopOwner = document.createElement("span");
      laptopOwner.className = "text-xs font-black text-slate-900 truncate";
      laptopOwner.textContent = assignment.pemilikLaptop || assignment.labelLaptop || "-";
      laptopOwner.title = assignment.pemilikLaptop || "";

      const laptopId = document.createElement("span");
      laptopId.className = "text-[10px] font-semibold text-indigo-600 truncate";
      laptopId.textContent = assignment.idLaptop;

      laptopDetails.appendChild(laptopOwner);
      laptopDetails.appendChild(laptopId);
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
    if (hasLaptop) {
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
    if (countBadge) countBadge.textContent = `${backups.length} Unit Tersedia (Cadangan)`;

    const metricRoomBackups = document.getElementById("metric-room-backups");
    if (metricRoomBackups) metricRoomBackups.textContent = backups.length;

    container.innerHTML = "";

    if (backups.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-6 text-center text-slate-400 text-xs italic flex flex-col items-center gap-1.5">
          <i data-lucide="check-circle" class="w-5 h-5 text-emerald-500"></i>
          <span>Semua laptop yang berada di ${roomName} telah terpasang ke meja. Tidak ada laptop cadangan tersisa di ruangan ini.</span>
        </div>
      `;
      refreshIcons();
      return;
    }

    backups.forEach((b, idx) => {
      const card = document.createElement("div");
      card.className = "bg-amber-50/70 hover:bg-amber-50 border border-amber-200 hover:border-amber-400 rounded-xl p-3 flex flex-col justify-between gap-2.5 shadow-2xs hover:shadow-xs cursor-grab active:cursor-grabbing transition";
      card.setAttribute("draggable", "true");

      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({
          source: "backup",
          fromRoom: roomName,
          backupIdx: idx,
          idLaptop: b.idLaptop,
          pemilikLaptop: b.pemilikLaptop
        }));
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));

      card.innerHTML = `
        <div class="flex items-center justify-between gap-1.5">
          <div class="flex items-center gap-1.5 truncate">
            <span class="text-xs font-black text-slate-900 truncate" title="${b.pemilikLaptop}">${b.pemilikLaptop}</span>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="w-2.5 h-2.5 rounded-full ${b.isReady ? "bg-emerald-500" : "bg-rose-500"}" title="${b.isReady ? "Aman" : "Tidak Aman"}"></span>
            <span class="text-xs font-bold ${b.hasCharger ? "text-amber-600" : "text-rose-500"}">${b.hasCharger ? "⚡" : "✕"}</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
          <span class="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">${b.idLaptop}</span>
          ${b.isCrossRoom ? `<span class="px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">Asal ${b.ruangKelas}</span>` : `<span class="truncate">${b.labelLaptop}</span>`}
          ${b.catatan ? `<span class="text-amber-800 truncate">📝 ${b.catatan}</span>` : ""}
        </div>

        <div class="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] gap-2">
          <span class="text-amber-700 font-semibold text-[10px] truncate">
            ${b.scheduledDesk ? `Jadwal: Meja ${b.scheduledDesk}` : "Cadangan"}
          </span>
          ${b.scheduledDesk ?
            `<button type="button" class="btn-quick-plot px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-2xs transition" data-desk="${b.scheduledDesk}" data-id="${b.idLaptop}">Pasang M.${b.scheduledDesk}</button>` :
            `<button type="button" class="btn-quick-plot-any px-2 py-0.5 rounded-md bg-slate-700 hover:bg-slate-800 text-white font-bold text-[10px] shadow-2xs transition" data-id="${b.idLaptop}">Pasang Meja</button>`
          }
        </div>
      `;

      // Quick Plot click listeners
      const btnPlotDesk = card.querySelector(".btn-quick-plot");
      if (btnPlotDesk) {
        btnPlotDesk.addEventListener("click", (e) => {
          e.stopPropagation();
          const targetDesk = Number(btnPlotDesk.dataset.desk);
          assignBackupLaptopToDesk(roomName, targetDesk, b.idLaptop);
        });
      }

      const btnPlotAny = card.querySelector(".btn-quick-plot-any");
      if (btnPlotAny) {
        btnPlotAny.addEventListener("click", (e) => {
          e.stopPropagation();
          quickAssignToFirstAvailableDesk(b.idLaptop);
        });
      }

      container.appendChild(card);
    });

    refreshIcons();
  }

  function autoPlotRoomDesks(roomName) {
    const roomConf = ROOMS_DATA[roomName];
    if (!roomConf || roomConf.isBackupCenter) {
      showToast("Ruangan ini tidak memiliki denah meja untuk diplot.", "info");
      return;
    }

    const rCode = roomName === "Ruang Guru" ? "Ruang Guru" : roomName.replace("Ruang ", "R");
    const dateList = rekapLaptopsByDate[activeDate] || [];

    // 1. Kumpulkan seluruh unit laptop yang secara fisik berada di ruangan ini
    const allLaptopsInRoom = [];
    const seenLapIds = new Set();

    dateList.forEach((r, idx) => {
      const rl = String(r.ruangLaptop || r["RUANG LAPTOP"] || "").trim().toUpperCase();
      if (rl !== rCode.toUpperCase() && rl !== roomName.toUpperCase()) return;

      const nama = String(r.nama || r.NAMA || "").trim();
      const nis = String(r.nis || r.NIS || idx + 1).trim();
      const idLap = `LP-${nis || nama.replace(/\s+/g, "").substring(0, 8)}`;
      if (seenLapIds.has(idLap.toLowerCase())) return;
      seenLapIds.add(idLap.toLowerCase());

      const isReady = (r.laptop || r.LAPTOP) !== "TIDAK AMAN";
      const hasCharger = (r.charger || r.CHARGER) === "ADA";
      const catatan = r.keterangan || r.KETERANGAN || "";

      allLaptopsInRoom.push({
        idLaptop: idLap,
        labelLaptop: `Laptop Mandiri (${r.kelas || r.KELAS || "-"})`,
        pemilikLaptop: nama,
        nis: nis,
        kelas: r.kelas || r.KELAS || "",
        ruangKelas: String(r.ruangKelas || r["RUANG KELAS"] || "").trim(),
        ruangLaptop: rl,
        isReady: isReady,
        hasCharger: hasCharger,
        catatan: catatan
      });
    });

    // Tambahkan juga unit cadangan inventaris sekolah di ruangan ini
    const extraSpares = getRoomBackupsStore(activeDate, activeSession, roomName);
    extraSpares.forEach((extra) => {
      if (extra && !seenLapIds.has(String(extra.idLaptop).toLowerCase())) {
        seenLapIds.add(String(extra.idLaptop).toLowerCase());
        allLaptopsInRoom.push(extra);
      }
    });

    // Filter HANYA laptop yang AMAN (laptop TIDAK AMAN tidak boleh diikutkan plot otomatis)
    const safeLaptops = allLaptopsInRoom.filter(
      (l) => l.isReady !== false && String(l.laptop || "AMAN").toUpperCase() !== "TIDAK AMAN"
    );

    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, roomName);
    const sesKey = activeSession === "Sesi 1" ? "sesi1" : (activeSession === "Sesi 2" ? "sesi2" : "sesi3");

    // Urutan sesi untuk fallback peminjaman laptop pada nomor meja yang sama
    let fallbackSessions = [];
    if (activeSession === "Sesi 1") {
      fallbackSessions = [
        { key: "sesi2", label: "Sesi 2" },
        { key: "sesi3", label: "Sesi 3" }
      ];
    } else if (activeSession === "Sesi 2") {
      fallbackSessions = [
        { key: "sesi1", label: "Sesi 1" },
        { key: "sesi3", label: "Sesi 3" }
      ];
    } else {
      fallbackSessions = [
        { key: "sesi2", label: "Sesi 2" },
        { key: "sesi1", label: "Sesi 1" }
      ];
    }

    const plannedAssignments = {};
    const claimedLaptopIds = new Set();
    let plottedPrimary = 0;
    let plottedFallback = 0;
    let replacedCount = 0;

    // TAHAP 1: Cari laptop milik siswa sesi aktif di meja masing-masing (Primary Owner)
    for (let d = 1; d <= roomConf.totalDesks; d++) {
      const studentName = (roomConf.roster && roomConf.roster[d] && roomConf.roster[d][sesKey]) || "";
      if (!studentName) continue;

      const targetLaptop = safeLaptops.find(
        (l) => l.pemilikLaptop && l.pemilikLaptop.trim().toLowerCase() === studentName.trim().toLowerCase() && !claimedLaptopIds.has(l.idLaptop.toLowerCase())
      );

      if (targetLaptop) {
        plannedAssignments[d] = {
          laptop: targetLaptop,
          isPrimary: true,
          catatan: targetLaptop.catatan || ""
        };
        claimedLaptopIds.add(targetLaptop.idLaptop.toLowerCase());
        plottedPrimary++;
      }
    }

    // TAHAP 2: Jika ada meja yang belum mendapatkan laptop (siswa tidak mengumpulkan laptop / rusak),
    // pinjam laptop milik siswa sesi sebelumnya atau sesudahnya di meja yang sama!
    for (let d = 1; d <= roomConf.totalDesks; d++) {
      if (plannedAssignments[d]) continue; // Meja ini sudah berhasil mendapatkan laptop pemiliknya

      for (const fb of fallbackSessions) {
        const candidateName = (roomConf.roster && roomConf.roster[d] && roomConf.roster[d][fb.key]) || "";
        if (!candidateName) continue;

        const fallbackLaptop = safeLaptops.find(
          (l) => l.pemilikLaptop && l.pemilikLaptop.trim().toLowerCase() === candidateName.trim().toLowerCase() && !claimedLaptopIds.has(l.idLaptop.toLowerCase())
        );

        if (fallbackLaptop) {
          plannedAssignments[d] = {
            laptop: fallbackLaptop,
            isPrimary: false,
            catatan: fallbackLaptop.catatan || ""
          };
          claimedLaptopIds.add(fallbackLaptop.idLaptop.toLowerCase());
          plottedFallback++;
          break; // Meja ini sudah berhasil meminjam laptop
        }
      }
    }

    // TAHAP 3: EKSEKUSI PENEMPATAN & UPDATE LAPTOP PADA SETIAP MEJA
    for (let d = 1; d <= roomConf.totalDesks; d++) {
      const cur = roomAssignments[d];
      const plan = plannedAssignments[d];

      if (plan) {
        // Jika meja sebelumnya berisi laptop lain yang berbeda (misal peninggalan sesi 1),
        // lepaskan hak laptop lama tersebut agar kembali menjadi cadangan sesi ini
        if (cur && cur.idLaptop && cur.pemilikLaptop && cur.pemilikLaptop.toLowerCase() !== plan.laptop.pemilikLaptop.toLowerCase()) {
          clearRekapDeskPosition(activeDate, cur.pemilikLaptop, activeSession);
          const oldLap = laptopPool.find((l) => l.idLaptop === cur.idLaptop);
          if (oldLap) {
            oldLap.assignedRoom = null;
            oldLap.assignedDesk = null;
          }
          replacedCount++;
        }

        // Pasangkan laptop yang sesuai
        assignBackupLaptopToDesk(roomName, d, plan.laptop.idLaptop, {
          isReady: plan.laptop.isReady,
          hasCharger: plan.laptop.hasCharger,
          catatan: plan.catatan
        });
      } else {
        // Jika meja tidak memperoleh laptop yang aman (atau laptop lama diklaim meja lain / tidak aman),
        // lepaskan dari meja agar meja kosong dan laptop tidak aman masuk cadangan
        if (cur && cur.idLaptop && !cur.unassigned) {
          if (claimedLaptopIds.has(cur.idLaptop.toLowerCase()) || cur.isReady === false) {
            unassignLaptopFromDesk(roomName, d);
          }
        }
      }
    }

    const totalPlotted = plottedPrimary + plottedFallback;
    const remainingSpares = getEffectiveRoomBackups(activeDate, activeSession, roomName).length;
    const skippedUnsafe = allLaptopsInRoom.length - safeLaptops.length;

    if (totalPlotted > 0) {
      let msg = `${totalPlotted} meja di ${roomName} berhasil diplot (${plottedPrimary} laptop sendiri, ${plottedFallback} pinjam sesi sebelum/sesudahnya)!`;
      if (replacedCount > 0) {
        msg += ` (${replacedCount} meja disesuaikan dengan pemilik sesi ini)`;
      }
      if (skippedUnsafe > 0) {
        msg += ` [${skippedUnsafe} laptop TIDAK AMAN tetap di cadangan]`;
      }
      showToast(msg, "success");
    } else {
      if (skippedUnsafe > 0) {
        showToast(`Semua meja sudah terisi atau laptop yang tersedia berstatus TIDAK AMAN (${skippedUnsafe} unit dilewati).`, "warning");
      } else {
        showToast(`Semua meja yang sesuai jadwal sudah terisi atau belum ada laptop yang tersedia di ${roomName}.`, "warning");
      }
    }
  }

  function clearAllDesksInRoom(roomName) {
    const roomConf = ROOMS_DATA[roomName];
    if (!roomConf || roomConf.isBackupCenter) {
      showToast("Ruangan ini tidak memiliki denah meja.", "info");
      return;
    }

    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, roomName);
    const assignedDesks = [];
    for (let d = 1; d <= roomConf.totalDesks; d++) {
      const a = roomAssignments[d];
      if (a && a.idLaptop && !a.unassigned) {
        assignedDesks.push(d);
      }
    }

    if (assignedDesks.length === 0) {
      showToast(`Semua meja di ${roomName} (${activeSession}) sudah kosong.`, "info");
      return;
    }

    if (!confirm(`Kosongkan semua ${assignedDesks.length} meja di ${roomName} (${activeSession})?\n\nSemua laptop yang terpasang akan dilepas dan dikembalikan menjadi cadangan ruangan.`)) {
      return;
    }

    assignedDesks.forEach((deskNo) => {
      const assignment = roomAssignments[deskNo];
      const idLaptop = assignment.idLaptop;
      const pemilik = assignment.pemilikLaptop;

      // Beri tombstone marker agar tidak terwarisi kembali
      roomAssignments[deskNo] = { unassigned: true, lastUpdated: new Date().toISOString() };

      const laptop = laptopPool.find((l) => l.idLaptop === idLaptop);
      if (laptop) {
        laptop.assignedRoom = null;
        laptop.assignedDesk = null;
      }

      if (pemilik) {
        clearRekapDeskPosition(activeDate, pemilik, activeSession);
      }

      // Sinkronisasi ke Google Apps Script
      syncAssignmentToGAS(activeDate, activeSession, roomName, deskNo, true, pemilik, idLaptop);
    });

    saveAssignments();
    saveLaptopPool();
    saveRekapLaptopsByDate();
    renderActiveRoom();
    renderLaptopPool();
    if (currentTab === "tabel-laptop") renderRekapLaptopTable();

    showToast(`${assignedDesks.length} meja di ${roomName} berhasil dikosongkan. Seluruh laptop telah menjadi cadangan.`, "success");
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

      ${guruBackups.length === 0 ? `
        <div class="py-14 text-center text-slate-400 text-xs flex flex-col items-center gap-2.5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6">
          <div class="w-12 h-12 rounded-2xl bg-slate-200/60 flex items-center justify-center text-slate-400">
            <i data-lucide="inbox" class="w-6 h-6 text-slate-400"></i>
          </div>
          <span class="font-bold text-slate-700 text-sm">Ruang Guru Saat Ini Kosong</span>
          <span class="text-slate-500 max-w-md text-center">
            Belum ada unit laptop yang diplotkan ke Ruang Guru. Anda dapat memindahkan unit cadangan dari daftar sebelah kanan atau menambahkan unit stok baru.
          </span>
        </div>
      ` : `
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
                <span class="text-xs font-black text-slate-900">${b.pemilikLaptop || b.labelLaptop}</span>
                <span class="text-[11px] text-slate-500">${b.labelLaptop}</span>
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
      `}
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
    const guruStore = getRoomBackupsStore(activeDate, activeSession, "Ruang Guru");
    const item = guruStore[backupIdx];
    if (!item) return;

    const targetRoom = prompt(`Kirim laptop ${item.idLaptop} ke ruangan mana? (Contoh: Ruang 1, Ruang 5, Ruang 8)`);
    if (!targetRoom || !ROOMS_DATA[targetRoom]) {
      if (targetRoom) showToast(`Ruangan '${targetRoom}' tidak ditemukan.`, "error");
      return;
    }

    guruStore.splice(backupIdx, 1);
    const targetStore = getRoomBackupsStore(activeDate, activeSession, targetRoom);
    targetStore.push({
      ...item,
      room: targetRoom,
      pemilikLaptop: `Unit Cadangan ${targetRoom} (dari Ruang Guru)`
    });

    saveRoomBackups();
    renderActiveRoom();
    showToast(`Laptop ${item.idLaptop} berhasil dikirim ke ${targetRoom}`, "success");
  }

  
  // --- POOL OF AVAILABLE BACKUPS ACROSS ALL ROOMS ---
  function getAllAvailableBackupsAcrossRooms(date, session) {
    const globallyAssignedOwners = new Set();
    const globallyAssignedIds = new Set();

    Object.keys(ROOMS_DATA).forEach((rName) => {
      const roomAssignments = getEffectiveRoomAssignments(date, session, rName);
      if (roomAssignments) {
        Object.values(roomAssignments).forEach((a) => {
          if (a && a.idLaptop && !a.unassigned) {
            globallyAssignedIds.add(String(a.idLaptop).toLowerCase().trim());
            if (a.pemilikLaptop) {
              globallyAssignedOwners.add(String(a.pemilikLaptop).toLowerCase().trim());
            }
          }
        });
      }
    });

    const available = [];
    const seenIds = new Set();

    const dateList = rekapLaptopsByDate[date] || [];
    dateList.forEach((r, idx) => {
      const isPresent = r.keberadaan === true || String(r.keberadaan || r["KEBERADAAN DI RUANGAN"] || "").trim().toUpperCase() === "TRUE";
      if (!isPresent) return; // Siswa belum kumpul laptop

      const nama = String(r.nama || r.NAMA || "").trim();
      const nis = String(r.nis || r.NIS || idx + 1).trim();
      const idLap = `LP-${nis || nama.replace(/\s+/g, "").substring(0, 8)}`;

      const idLower = idLap.toLowerCase();
      const nameLower = nama.toLowerCase();

      // If already on any desk in this session, skip!
      if (globallyAssignedIds.has(idLower) || (nama && globallyAssignedOwners.has(nameLower))) {
        return;
      }

      if (seenIds.has(idLower)) return;
      seenIds.add(idLower);

      let rl = String(r.ruangLaptop || r["RUANG LAPTOP"] || r.ruangKelas || "R1").trim();
      rl = normalizeRoomCode(rl);

      const rKelas = String(r.ruangKelas || r["RUANG KELAS"] || "").trim();
      const isReady = (r.laptop || r.LAPTOP) !== "TIDAK AMAN";
      const hasCharger = (r.charger || r.CHARGER) === "ADA";
      const catatan = r.keterangan || r.KETERANGAN || "";

      available.push({
        idLaptop: idLap,
        labelLaptop: `Laptop Mandiri (${r.kelas || r.KELAS || "-"})`,
        pemilikLaptop: nama,
        nis: nis,
        kelas: r.kelas || r.KELAS || "",
        ruangKelas: rKelas,
        ruangLaptop: rl,
        isReady: isReady,
        hasCharger: hasCharger,
        catatan: catatan,
        isBackup: true,
        keberadaan: true
      });
    });

    // Also include valid custom spares in roomBackups
    Object.keys(ROOMS_DATA).forEach((rName) => {
      const rCode = normalizeRoomCode(rName);
      const extraSpares = getRoomBackupsStore(date, session, rName);
      extraSpares.forEach((sp) => {
        if (!sp || !sp.idLaptop) return;
        const spIdLower = String(sp.idLaptop).toLowerCase();
        if (spIdLower.startsWith("cad-guru") || spIdLower.startsWith("cad-r")) return;
        if (globallyAssignedIds.has(spIdLower) || seenIds.has(spIdLower)) return;
        seenIds.add(spIdLower);

        available.push({
          ...sp,
          ruangLaptop: sp.ruangLaptop || rCode,
          keberadaan: true,
          isBackup: true
        });
      });
    });

    return available;
  }

  function renderLaptopPool() {
    const listContainer = document.getElementById("laptop-pool-list");
    const countBadge = document.getElementById("pool-count-badge");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    let list = getAllAvailableBackupsAcrossRooms(activeDate, activeSession);

    // 1. Filter by Room
    if (poolRoomFilter !== "ALL") {
      list = list.filter((l) => l.ruangLaptop.toUpperCase() === poolRoomFilter.toUpperCase());
    }

    // 2. Filter by Search Query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((l) =>
        l.idLaptop.toLowerCase().includes(q) ||
        (l.labelLaptop && l.labelLaptop.toLowerCase().includes(q)) ||
        (l.pemilikLaptop && l.pemilikLaptop.toLowerCase().includes(q)) ||
        (l.ruangLaptop && l.ruangLaptop.toLowerCase().includes(q)) ||
        (l.kelas && l.kelas.toLowerCase().includes(q))
      );
    }

    // 3. Filter by Condition
    if (currentFilter === "ready") {
      list = list.filter((l) => l.isReady);
    } else if (currentFilter === "charger") {
      list = list.filter((l) => l.hasCharger);
    }

    // Update count badge
    if (countBadge) countBadge.textContent = `${list.length} Unit`;
    const mobilePoolBadge = document.getElementById("mobile-pool-count");
    if (mobilePoolBadge) mobilePoolBadge.textContent = list.length;

    // 4. Sort Options
    const activeRCode = activeRoom === "Ruang Guru" ? "Ruang Guru" : activeRoom.replace("Ruang ", "R");
    if (poolSortOption === "room-asc") {
      list.sort((a, b) => getRoomRank(a.ruangLaptop) - getRoomRank(b.ruangLaptop) || (a.pemilikLaptop || "").localeCompare(b.pemilikLaptop || ""));
    } else if (poolSortOption === "room-current-first") {
      list.sort((a, b) => {
        const aIsCur = a.ruangLaptop.toUpperCase() === activeRCode.toUpperCase() ? 0 : 1;
        const bIsCur = b.ruangLaptop.toUpperCase() === activeRCode.toUpperCase() ? 0 : 1;
        if (aIsCur !== bIsCur) return aIsCur - bIsCur;
        return getRoomRank(a.ruangLaptop) - getRoomRank(b.ruangLaptop) || (a.pemilikLaptop || "").localeCompare(b.pemilikLaptop || "");
      });
    } else if (poolSortOption === "name-asc") {
      list.sort((a, b) => (a.pemilikLaptop || "").localeCompare(b.pemilikLaptop || ""));
    } else if (poolSortOption === "ready-first") {
      list.sort((a, b) => (b.isReady ? 1 : 0) - (a.isReady ? 1 : 0) || getRoomRank(a.ruangLaptop) - getRoomRank(b.ruangLaptop));
    }

    if (list.length === 0) {
      listContainer.innerHTML = `
        <div class="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <i data-lucide="check-check" class="w-6 h-6 text-emerald-500"></i>
          <span>${searchQuery ? "Tidak ada laptop cadangan yang cocok dengan pencarian." : (poolRoomFilter !== "ALL" ? `Tidak ada laptop cadangan tersisa di ${poolRoomFilter}.` : "Semua laptop telah terpasang di meja.")}</span>
        </div>
      `;
      refreshIcons();
      return;
    }

    list.forEach((laptop) => {
      const isCurrentRoom = laptop.ruangLaptop.toUpperCase() === activeRCode.toUpperCase();
      const item = document.createElement("div");
      item.className = "group border rounded-xl p-2.5 flex flex-col justify-between gap-2 shadow-2xs hover:shadow-xs transition select-none bg-slate-50 hover:bg-white border-slate-200 hover:border-indigo-400 cursor-grab active:cursor-grabbing";
      item.setAttribute("draggable", "true");
      item.dataset.idLaptop = laptop.idLaptop;

      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({
          source: "pool",
          idLaptop: laptop.idLaptop,
          fromRoom: laptop.ruangLaptop,
          pemilikLaptop: laptop.pemilikLaptop
        }));
        item.classList.add("dragging");
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
      });

      item.innerHTML = `
        <div class="flex items-center justify-between gap-1.5">
          <span class="text-xs font-black text-slate-900 truncate" title="${laptop.pemilikLaptop}">${laptop.pemilikLaptop}</span>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="w-2.5 h-2.5 rounded-full ${laptop.isReady ? "bg-emerald-500" : "bg-rose-500"}" title="${laptop.isReady ? "Aman" : "Tidak Aman"}"></span>
            <span class="text-xs font-bold ${laptop.hasCharger ? "text-amber-600" : "text-rose-500"}" title="${laptop.hasCharger ? "Ada Charger" : "Tanpa Charger"}">${laptop.hasCharger ? "⚡" : "✕"}</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
          <span class="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">${laptop.idLaptop}</span>
          <span class="truncate">${laptop.kelas || laptop.labelLaptop || ""}</span>
          ${laptop.ruangKelas && laptop.ruangKelas !== laptop.ruangLaptop ? `<span class="text-[9px] px-1 rounded bg-slate-200 text-slate-700">Kelas ${laptop.ruangKelas}</span>` : ""}
        </div>

        <div class="pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-black ${isCurrentRoom ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'} flex items-center gap-1 truncate" title="Lokasi fisik laptop cadangan ini saat ini">
            <i data-lucide="map-pin" class="w-3 h-3 ${isCurrentRoom ? 'text-emerald-700' : 'text-amber-700'}"></i>
            <span>${isCurrentRoom ? `Ruang Ini (${laptop.ruangLaptop})` : `Ruang ${laptop.ruangLaptop}`}</span>
          </span>

          <button type="button" class="btn-pool-quick-assign px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-2xs transition flex items-center gap-1" title="Pasang ke meja aktif di ${activeRoom}">
            <i data-lucide="plus-circle" class="w-3 h-3"></i>
            <span>Pasang Meja</span>
          </button>
        </div>
      `;

      const btnAssign = item.querySelector(".btn-pool-quick-assign");
      if (btnAssign) {
        btnAssign.addEventListener("click", (e) => {
          e.stopPropagation();
          openDeskPickerModal(laptop.idLaptop);
        });
      }

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
      if (a && a.idLaptop && !a.unassigned) {
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

    if (rekapOnlyUncollected) {
      filtered = filtered.filter((r) => !r.keberadaan || String(r.keberadaan || r["KEBERADAAN DI RUANGAN"] || "").trim().toUpperCase() !== "TRUE");
    }

    let countPresent = 0;
    let countUncollected = 0;
    let countNoCharger = 0;
    let countNotSafe = 0;

    dateList.forEach((r) => {
      const isPresent = r.keberadaan === true || String(r.keberadaan || r["KEBERADAAN DI RUANGAN"] || "").trim().toUpperCase() === "TRUE";
      if (isPresent) countPresent++;
      else countUncollected++;
      if (r.charger === "TIDAK ADA") countNoCharger++;
      if (r.laptop === "TIDAK AMAN") countNotSafe++;
    });

    const elShown = document.getElementById("rekap-count-shown");
    const elPresent = document.getElementById("rekap-count-present");
    const elUncollected = document.getElementById("rekap-count-uncollected");
    const elNoCharger = document.getElementById("rekap-count-no-charger");
    const elNotSafe = document.getElementById("rekap-count-not-safe");

    if (elShown) elShown.textContent = filtered.length;
    if (elPresent) elPresent.textContent = countPresent;
    if (elUncollected) elUncollected.textContent = countUncollected;
    if (elNoCharger) elNoCharger.textContent = countNoCharger;
    if (elNotSafe) elNotSafe.textContent = countNotSafe;

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
          <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${row.keberadaan ? "bg-emerald-50 text-emerald-800 border border-emerald-300" : "bg-rose-50 text-rose-700 border border-rose-200"}">
            <input type="checkbox" class="rekap-cb-keberadaan w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" data-nis="${row.nis}" data-nama="${row.nama}" ${row.keberadaan ? "checked" : ""}>
            <span>${row.keberadaan ? "Ada di Ruang" : "Belum Kumpul"}</span>
          </div>
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
        if (a && a.idLaptop && !a.unassigned) {
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
    const targetRCode = roomName === "Ruang Guru" ? "Ruang Guru" : roomName.replace("Ruang ", "R");
    
    // Find student in rekapLaptopsByDate
    const dateList = rekapLaptopsByDate[activeDate] || [];
    let student = dateList.find((r) => 
      (r.nis && `LP-${r.nis}` === idLaptop) ||
      (r.nama && `LP-${r.nama}` === idLaptop) ||
      (r.nama && idLaptop.includes(r.nama))
    );

    let laptop = laptopPool.find((l) => l.idLaptop === idLaptop);
    if (!laptop && student) {
      laptop = {
        idLaptop: idLaptop,
        labelLaptop: `Laptop Mandiri (${student.kelas || student.KELAS || "-"})`,
        pemilikLaptop: student.nama || student.NAMA,
        isReady: (student.laptop || student.LAPTOP) !== "TIDAK AMAN",
        hasCharger: (student.charger || student.CHARGER) === "ADA",
        catatan: student.keterangan || student.KETERANGAN || "",
        ruangLaptop: student.ruangLaptop || student.ruangKelas || targetRCode
      };
      laptopPool.push(laptop);
    }
    if (!laptop) return;

    // STEP A: If this laptop was already assigned to ANOTHER desk in this session (any room), unassign old desk
    if (assignments[activeDate] && assignments[activeDate][activeSession]) {
      Object.keys(assignments[activeDate][activeSession]).forEach((rName) => {
        const rMap = assignments[activeDate][activeSession][rName];
        if (rMap) {
          Object.keys(rMap).forEach((dStr) => {
            const dNum = Number(dStr);
            if (dNum && (rName !== roomName || dNum !== deskNo)) {
              const curA = rMap[dNum];
              if (curA && curA.idLaptop === idLaptop && !curA.unassigned) {
                rMap[dNum] = { unassigned: true, lastUpdated: new Date().toISOString() };
                syncAssignmentToGAS(activeDate, activeSession, rName, dNum, true, curA.pemilikLaptop, idLaptop);
              }
            }
          });
        }
      });
    }

    // STEP B: If the destination desk already has a DIFFERENT laptop, free that old laptop
    const destMap = assignments[activeDate] && assignments[activeDate][activeSession] && assignments[activeDate][activeSession][roomName];
    const prevDeskOccupant = destMap && destMap[deskNo];
    if (prevDeskOccupant && prevDeskOccupant.idLaptop && prevDeskOccupant.idLaptop !== idLaptop && !prevDeskOccupant.unassigned) {
      const oldLap = laptopPool.find((l) => l.idLaptop === prevDeskOccupant.idLaptop);
      if (oldLap) {
        oldLap.assignedRoom = null;
        oldLap.assignedDesk = null;
      }
      if (prevDeskOccupant.pemilikLaptop) {
        clearRekapDeskPosition(activeDate, prevDeskOccupant.pemilikLaptop, activeSession);
      }
    }

    const oldRoom = (student && student.ruangLaptop) || laptop.ruangLaptop || "";
    const hasMovedRoom = oldRoom && oldRoom.toUpperCase() !== targetRCode.toUpperCase();

    // 1. UPDATE RUANGAN SECARA OTOMATIS JIKA BERPINDAH RUANGAN
    if (student) {
      student.ruangLaptop = targetRCode;
      student.keberadaan = true;
      // Perbarui ruangLaptop di seluruh tanggal agar sinkron
      TKA_DATES.forEach((dConf) => {
        const dList = rekapLaptopsByDate[dConf.id];
        if (dList) {
          const dItem = dList.find((r) => r.nama === student.nama || (r.nis && student.nis && r.nis === student.nis));
          if (dItem) {
            dItem.ruangLaptop = targetRCode;
            dItem.keberadaan = true;
          }
        }
      });
    }

    laptop.ruangLaptop = targetRCode;
    laptop.assignedRoom = roomName;
    laptop.assignedDesk = deskNo;

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
    saveRekapLaptopsByDate();
    saveLaptopPool();
    renderActiveRoom();
    renderLaptopPool();
    if (currentTab === "tabel-laptop") renderRekapLaptopTable();

    syncAssignmentToGAS(activeDate, activeSession, roomName, deskNo);

    if (hasMovedRoom) {
      showToast(`Laptop ${laptop.pemilikLaptop} dipindahkan dari ${oldRoom} ke ${roomName} Meja ${deskNo} (Ruang laptop otomatis diubah ke ${targetRCode})`, "success");
    } else {
      showToast(`Laptop ${laptop.pemilikLaptop} dipasang ke ${roomName} Meja ${deskNo} (${activeDate} ${activeSession})`, "success");
    }
  }

  function assignBackupLaptopToDesk(roomName, deskNo, idLaptop, customDetails = null) {
    const backups = getEffectiveRoomBackups(activeDate, activeSession, roomName);
    const bItem = backups.find((b) => b.idLaptop === idLaptop);
    if (!bItem) return;

    let poolItem = laptopPool.find((l) => l.idLaptop === bItem.idLaptop);
    if (!poolItem) {
      poolItem = {
        idLaptop: bItem.idLaptop,
        labelLaptop: bItem.labelLaptop,
        pemilikLaptop: bItem.pemilikLaptop,
        isReady: bItem.isReady,
        hasCharger: bItem.hasCharger,
        catatan: bItem.catatan || ""
      };
      laptopPool.push(poolItem);
    }

    assignLaptopToDesk(roomName, deskNo, bItem.idLaptop, {
      isReady: customDetails ? customDetails.isReady : bItem.isReady,
      hasCharger: customDetails ? customDetails.hasCharger : bItem.hasCharger,
      catatan: customDetails ? customDetails.catatan : (bItem.catatan || "")
    });
  }

  function unassignLaptopFromDesk(roomName, deskNo) {
    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, roomName);
    if (!roomAssignments || !roomAssignments[deskNo]) return;

    const assignment = roomAssignments[deskNo];
    const idLaptop = assignment.idLaptop;
    const pemilik = assignment.pemilikLaptop;

    // Explicit tombstone marker so inherited session doesn't overwrite unassigned status
    roomAssignments[deskNo] = { unassigned: true, lastUpdated: new Date().toISOString() };

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

    syncAssignmentToGAS(activeDate, activeSession, roomName, deskNo, true, pemilik, idLaptop);
    showToast(`Laptop ${idLaptop || "meja"} dilepas dari Meja ${deskNo}`, "info");
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

  
  // --- INTERACTIVE DESK PICKER MODAL (PILIH MEJA TUJUAN) ---
  function openDeskPickerModal(idLaptop) {
    const roomConf = ROOMS_DATA[activeRoom];
    if (!roomConf || roomConf.isBackupCenter) {
      showToast(`Ruangan ${activeRoom} adalah pusat cadangan dan tidak memiliki meja ujian. Pilih Ruang 1-11 untuk memasang ke meja.`, "warning");
      return;
    }

    selectedLaptopForPicker = idLaptop;
    const modal = document.getElementById("modal-pick-desk");
    if (!modal) return;

    // Find laptop details
    let laptop = laptopPool.find((l) => l.idLaptop === idLaptop);
    if (!laptop) {
      const backups = getEffectiveRoomBackups(activeDate, activeSession, activeRoom);
      laptop = backups.find((b) => b.idLaptop === idLaptop);
    }
    if (!laptop) {
      const dateList = rekapLaptopsByDate[activeDate] || [];
      const r = dateList.find((item) => (item.idLaptop && item.idLaptop === idLaptop) || item.nis === idLaptop || `LP-${item.nis}` === idLaptop);
      if (r) {
        laptop = {
          idLaptop: idLaptop,
          labelLaptop: r.nama,
          pemilikLaptop: r.nama,
          isReady: r.laptop !== "TIDAK AMAN",
          hasCharger: r.charger !== "TIDAK ADA",
          ruangLaptop: r.ruangLaptop
        };
      }
    }

    const titleRoom = document.getElementById("modal-pick-desk-room-badge");
    if (titleRoom) titleRoom.textContent = `${activeRoom} • ${activeDate} • ${activeSession}`;

    const infoEl = document.getElementById("modal-pick-desk-laptop-info");
    if (infoEl) {
      const owner = laptop ? (laptop.pemilikLaptop || laptop.labelLaptop) : idLaptop;
      const isReady = laptop ? laptop.isReady : true;
      const rLoc = laptop ? (laptop.ruangLaptop || activeRoom) : activeRoom;
      infoEl.innerHTML = `
        <span class="font-bold text-slate-900">${owner}</span>
        <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">${idLaptop}</span>
        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${isReady ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}">
          ${isReady ? "✅ AMAN" : "⚠️ TIDAK AMAN"}
        </span>
        <span class="text-[10px] text-slate-500 font-medium">📍 Lokasi: ${rLoc}</span>
      `;
    }

    renderDeskPickerGrid();
    modal.classList.remove("hidden");
    refreshIcons();
  }

  function renderDeskPickerGrid() {
    const gridContainer = document.getElementById("modal-pick-desk-grid");
    if (!gridContainer) return;
    gridContainer.innerHTML = "";

    const roomConf = ROOMS_DATA[activeRoom];
    if (!roomConf) return;

    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, activeRoom);

    for (let d = 1; d <= roomConf.totalDesks; d++) {
      const cur = roomAssignments[d];
      const isOccupied = Boolean(cur && cur.idLaptop && !cur.unassigned);

      if (deskPickerFilter === "empty-only" && isOccupied) {
        continue;
      }

      const studentName = getStudentName(activeRoom, d, activeSession);
      const card = document.createElement("div");

      if (!isOccupied) {
        card.className = "bg-emerald-50/70 hover:bg-emerald-100 border-2 border-emerald-300 rounded-xl p-3 flex items-center justify-between gap-2 cursor-pointer transition shadow-2xs hover:shadow-xs active:scale-95";
        card.innerHTML = `
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-md bg-slate-900 text-white font-black text-xs">Meja ${d}</span>
              <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">KOSONG</span>
            </div>
            <span class="text-xs font-semibold text-slate-700 truncate mt-1">Peserta Sesi: ${studentName || "(Kosong)"}</span>
          </div>
          <button type="button" class="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition flex-shrink-0 flex items-center gap-1">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>Pilih</span>
          </button>
        `;
      } else {
        card.className = "bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl p-3 flex items-center justify-between gap-2 cursor-pointer transition active:scale-95";
        card.innerHTML = `
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-md bg-slate-700 text-white font-black text-xs">Meja ${d}</span>
              <span class="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">TERISI</span>
            </div>
            <span class="text-xs font-semibold text-slate-700 truncate mt-1">Peserta: ${studentName || "(Kosong)"}</span>
            <span class="text-[11px] text-amber-800 font-medium truncate">Laptop: ${cur.pemilikLaptop || cur.idLaptop}</span>
          </div>
          <button type="button" class="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-400 font-bold text-xs transition flex-shrink-0">
            Ganti
          </button>
        `;
      }

      card.addEventListener("click", () => {
        const targetId = selectedLaptopForPicker;
        const modal = document.getElementById("modal-pick-desk");
        if (modal) modal.classList.add("hidden");
        
        assignLaptopToDesk(activeRoom, d, targetId);

        // Smooth scroll to denah meja to highlight the desk
        const deskSection = document.getElementById("workspace-desk-section");
        if (deskSection) {
          deskSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });

      gridContainer.appendChild(card);
    }

    if (gridContainer.children.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
          <i data-lucide="check-circle" class="w-6 h-6 text-emerald-500"></i>
          <span>Semua meja di ${activeRoom} (${activeSession}) sudah terisi. Klik tab "Semua Meja" di atas jika ingin menukar atau mengganti meja terisi.</span>
        </div>
      `;
    }

    refreshIcons();
  }

  function quickAssignToFirstAvailableDesk(idLaptop) {
    const roomConf = ROOMS_DATA[activeRoom];
    if (!roomConf || roomConf.isBackupCenter) {
      showToast(`Ruangan ${activeRoom} adalah pusat cadangan dan tidak memiliki meja ujian. Pilih Ruang 1-11 untuk memasang ke meja.`, "warning");
      return;
    }

    const roomAssignments = getEffectiveRoomAssignments(activeDate, activeSession, activeRoom);
    let targetDesk = null;

    for (let d = 1; d <= roomConf.totalDesks; d++) {
      if (!roomAssignments[d] || !roomAssignments[d].idLaptop || roomAssignments[d].unassigned) {
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

    const backupLaptop = backups[0];
    const currentStore = getRoomBackupsStore(activeDate, activeSession, roomName);
    const storeIdx = currentStore.findIndex((b) => b.idLaptop && b.idLaptop.toLowerCase() === backupLaptop.idLaptop.toLowerCase());
    if (storeIdx !== -1) {
      currentStore.splice(storeIdx, 1);
    }

    currentStore.push({
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
  function syncAssignmentToGAS(date, session, roomName, deskNo, isUnassign = false, unassignPemilik = "", unassignIdLaptop = "") {
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
      catatan: isUnassign ? "" : (assignment ? assignment.catatan : ""),
      isUnassign: Boolean(isUnassign),
      unassignPemilik: unassignPemilik,
      unassignIdLaptop: unassignIdLaptop
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
        let postBody = null;
        let itemsConsumed = 1;

        // Jika terdapat beberapa antrian updateAssignment, kirim sekaligus via batchUpdateAssignments (maks 30 item/request)
        if (offlineQueue.length > 1 && offlineQueue[0].action === "updateAssignment") {
          const batch = [];
          for (let i = 0; i < Math.min(offlineQueue.length, 30); i++) {
            if (offlineQueue[i].action === "updateAssignment") {
              batch.push(offlineQueue[i]);
            } else {
              break;
            }
          }
          if (batch.length > 1) {
            postBody = {
              action: "batchUpdateAssignments",
              items: batch
            };
            itemsConsumed = batch.length;
          }
        }

        if (!postBody) {
          postBody = offlineQueue[0];
          itemsConsumed = 1;
        }

        const res = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(postBody)
        });

        const text = await res.text();
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (e) {
          json = null;
        }

        if (!res.ok || (json && json.success === false)) {
          console.warn("GAS write locked or error:", (json && json.error) || text);
          updateSyncPill("offline");
          // Jadwalkan retry backoff tanpa menghapus antrian
          setTimeout(() => {
            if (offlineQueue.length > 0) flushOfflineQueue();
          }, 3000);
          return;
        }

        offlineQueue.splice(0, itemsConsumed);
        saveOfflineQueue();
      }
      updateSyncPill("synced");
    } catch (err) {
      console.warn("GAS sync network error (queued):", err);
      updateSyncPill("offline");
      setTimeout(() => {
        if (offlineQueue.length > 0) flushOfflineQueue();
      }, 5000);
    } finally {
      isSyncing = false;
    }
  }

  function startAutoPolling() {
    if (pollInterval) clearInterval(pollInterval);
    // Polling setiap 6-8 detik dengan random jitter agar 11 pengawas tidak menembak server serentak
    const intervalMs = 6000 + Math.floor(Math.random() * 2000);
    pollInterval = setInterval(() => {
      if (gasUrl && !isSyncing && offlineQueue.length === 0) {
        pollRoomStateFromGAS();
      }
    }, intervalMs);
  }

  async function pollRoomStateFromGAS() {
    // Jangan lakukan polling jika sedang ada proses pengiriman antrian lokal
    if (!gasUrl || isSyncing || offlineQueue.length > 0) return;
    try {
      const url = `${gasUrl}?action=getSyncState&tanggal=${encodeURIComponent(activeDate)}&sesi=all`;
      const res = await fetch(url);
      const json = await res.json();

      if (json && json.success) {
        let activeRoomChanged = false;

        // 1. Process room assignments across all sessions & 11 rooms
        if (Array.isArray(json.assignments)) {
          if (!assignments[activeDate]) assignments[activeDate] = {};

          const remoteBySessionAndRoom = {};
          json.assignments.forEach((row) => {
            const r = String(row.Ruang || "").trim();
            const desk = Number(row.NoMeja);
            const rSesi = String(row.Sesi || activeSession).trim();
            if (!r || !desk || !rSesi) return;

            if (!remoteBySessionAndRoom[rSesi]) remoteBySessionAndRoom[rSesi] = {};
            if (!remoteBySessionAndRoom[rSesi][r]) remoteBySessionAndRoom[rSesi][r] = {};

            const idLap = String(row.IdLaptop || "").trim();
            const rowTimeMs = new Date(row.LastUpdated || 0).getTime();
            const existing = remoteBySessionAndRoom[rSesi][r][desk];

            // If duplicate found in payload, keep newer row
            if (existing && existing._timeMs > rowTimeMs) {
              return;
            }

            if (idLap) {
              remoteBySessionAndRoom[rSesi][r][desk] = {
                idLaptop: idLap,
                labelLaptop: row.LabelLaptop || "",
                pemilikLaptop: row.PemilikLaptop || "",
                isReady: String(row.IsReady).toUpperCase() === "TRUE",
                hasCharger: String(row.HasCharger).toUpperCase() === "TRUE",
                catatan: row.Catatan || "",
                lastUpdated: row.LastUpdated || new Date().toISOString(),
                _timeMs: rowTimeMs
              };
            } else {
              remoteBySessionAndRoom[rSesi][r][desk] = {
                unassigned: true,
                lastUpdated: row.LastUpdated || new Date().toISOString(),
                _timeMs: rowTimeMs
              };
            }
          });

          // Overlay remote assignments for all sessions into memory
          Object.keys(remoteBySessionAndRoom).forEach((s) => {
            if (!assignments[activeDate][s]) assignments[activeDate][s] = {};
            Object.keys(remoteBySessionAndRoom[s]).forEach((r) => {
              if (!assignments[activeDate][s][r]) assignments[activeDate][s][r] = {};

              if (s === activeSession && r === activeRoom) {
                // Handle active room carefully with timestamp protection
                const localActive = getEffectiveRoomAssignments(activeDate, activeSession, activeRoom);
                const activeRoomRemote = remoteBySessionAndRoom[s][r];

                Object.keys(activeRoomRemote).forEach((dStr) => {
                  const d = Number(dStr);
                  const rData = activeRoomRemote[d];
                  const cur = localActive[d];

                  const curTime = cur && cur.lastUpdated ? new Date(cur.lastUpdated).getTime() : 0;
                  const remoteTime = rData._timeMs || 0;

                  // Protect against race condition: don't overwrite if local edit is very recent and newer
                  if (cur && curTime > remoteTime && (Date.now() - curTime < 15000)) {
                    return;
                  }

                  if (rData.unassigned) {
                    if (localActive[d] && !localActive[d].unassigned) {
                      localActive[d] = { unassigned: true, lastUpdated: rData.lastUpdated };
                      activeRoomChanged = true;
                    }
                  } else {
                    if (!cur || cur.unassigned || cur.idLaptop !== rData.idLaptop || cur.isReady !== rData.isReady || cur.hasCharger !== rData.hasCharger || cur.catatan !== rData.catatan) {
                      localActive[d] = {
                        idLaptop: rData.idLaptop,
                        labelLaptop: rData.labelLaptop,
                        pemilikLaptop: rData.pemilikLaptop,
                        isReady: rData.isReady,
                        hasCharger: rData.hasCharger,
                        catatan: rData.catatan,
                        lastUpdated: rData.lastUpdated
                      };
                      activeRoomChanged = true;
                    }
                  }
                });
              } else {
                // Non-active session/room: overlay cleanly
                Object.keys(remoteBySessionAndRoom[s][r]).forEach((dStr) => {
                  const d = Number(dStr);
                  const rData = remoteBySessionAndRoom[s][r][d];
                  assignments[activeDate][s][r][d] = rData.unassigned ? { unassigned: true, lastUpdated: rData.lastUpdated } : {
                    idLaptop: rData.idLaptop,
                    labelLaptop: rData.labelLaptop,
                    pemilikLaptop: rData.pemilikLaptop,
                    isReady: rData.isReady,
                    hasCharger: rData.hasCharger,
                    catatan: rData.catatan,
                    lastUpdated: rData.lastUpdated
                  };
                });
              }
            });
          });

          // 2. Global Laptop Pool Reconciliation
          const assignedLaptopsMap = {};
          if (assignments[activeDate] && assignments[activeDate][activeSession]) {
            Object.keys(assignments[activeDate][activeSession]).forEach((r) => {
              const desks = assignments[activeDate][activeSession][r] || {};
              Object.keys(desks).forEach((d) => {
                const a = desks[d];
                if (a && a.idLaptop && !a.unassigned) {
                  assignedLaptopsMap[a.idLaptop] = { room: r, desk: Number(d) };
                }
              });
            });
          }

          let poolChanged = false;
          laptopPool.forEach((l) => {
            const assignInfo = assignedLaptopsMap[l.idLaptop];
            if (assignInfo) {
              if (l.assignedRoom !== assignInfo.room || l.assignedDesk !== assignInfo.desk) {
                l.assignedRoom = assignInfo.room;
                l.assignedDesk = assignInfo.desk;
                poolChanged = true;
              }
            } else {
              if (l.assignedRoom || l.assignedDesk) {
                l.assignedRoom = null;
                l.assignedDesk = null;
                poolChanged = true;
              }
            }
          });

          if (poolChanged) {
            saveLaptopPool();
            renderLaptopPool();
          }
        }

        // 3. Process Rekap Table
        if (Array.isArray(json.rekap) && json.rekap.length > 0) {
          rekapLaptopsByDate[activeDate] = json.rekap.map((row) => ({
            nis: row.NIS || "",
            nama: row.NAMA || "",
            kelas: row.KELAS || "",
            ruangKelas: row["RUANG KELAS"] || "",
            ruangLaptop: row["RUANG LAPTOP"] || "",
            sesi1: row["SESI 1"] || "-",
            sesi2: row["SESI 2"] || "-",
            sesi3: row["SESI 3"] || "-",
            keberadaan: row["KEBERADAAN DI RUANGAN"] === true || row["KEBERADAAN DI RUANGAN"] === "TRUE" || row["KEBERADAAN DI RUANGAN"] === 1,
            charger: String(row.CHARGER || "ADA").toUpperCase(),
            laptop: String(row.LAPTOP || "AMAN").toUpperCase(),
            keterangan: row.KETERANGAN || ""
          }));
          saveRekapLaptopsByDate();
          syncLaptopPoolFromRekap();
          renderRoomBackups(activeRoom);
          renderLaptopPool();
          if (currentTab === "tabel-laptop") renderRekapLaptopTable();
        }

        if (activeRoomChanged) {
          saveAssignments();
          renderActiveRoom();
        }

        if (currentTab === "overview") renderRekapOverview();
      }
    } catch (err) {
      console.warn("Poll state sync error:", err);
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
        opt.textContent = `${laptop.pemilikLaptop || laptop.labelLaptop} [${laptop.idLaptop}] (${laptop.isReady ? "AMAN" : "TIDAK AMAN"})`;
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
      pollRoomStateFromGAS();
    });

    // Session Selector Pills
    document.querySelectorAll(".session-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSession = btn.dataset.session;
        updateSessionPills();
        renderActiveRoom();
        pollRoomStateFromGAS();
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

    const poolSortSelect = document.getElementById("pool-sort-select");
    if (poolSortSelect) {
      poolSortSelect.addEventListener("change", (e) => {
        poolSortOption = e.target.value;
        renderLaptopPool();
      });
    }

    const poolRoomFilterSelect = document.getElementById("pool-room-filter");
    if (poolRoomFilterSelect) {
      poolRoomFilterSelect.addEventListener("change", (e) => {
        poolRoomFilter = e.target.value;
        renderLaptopPool();
      });
    }

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

    const toggleUncollectedBtn = document.getElementById("rekap-toggle-uncollected");
    if (toggleUncollectedBtn) {
      toggleUncollectedBtn.addEventListener("click", () => {
        rekapOnlyUncollected = !rekapOnlyUncollected;
        toggleUncollectedBtn.className = `flex-1 px-2.5 py-2 rounded-xl border font-bold transition truncate text-center ${
          rekapOnlyUncollected ? "border-rose-500 bg-rose-600 text-white shadow-xs" : "border-slate-200 bg-slate-50 hover:bg-rose-50 text-slate-600"
        }`;
        renderRekapLaptopTable();
      });
    }

    // Mobile Smooth Scrolling Navigation (Denah Meja <-> Laptop Tersedia)
    const mobileToggleDesks = document.getElementById("mobile-toggle-desks");
    const mobileTogglePool = document.getElementById("mobile-toggle-pool");
    const btnScrollToDesks = document.getElementById("btn-scroll-to-desks");
    const deskSection = document.getElementById("workspace-desk-section");
    const poolSection = document.getElementById("workspace-pool-section");

    if (mobileTogglePool && poolSection) {
      mobileTogglePool.addEventListener("click", () => {
        poolSection.scrollIntoView({ behavior: "smooth", block: "start" });
        if (mobileToggleDesks) mobileToggleDesks.className = "flex-1 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition";
        mobileTogglePool.className = "flex-1 py-2 px-3 rounded-lg bg-white text-indigo-700 shadow-xs flex items-center justify-center gap-1.5 transition";
      });
    }

    if (mobileToggleDesks && deskSection) {
      mobileToggleDesks.addEventListener("click", () => {
        deskSection.scrollIntoView({ behavior: "smooth", block: "start" });
        if (mobileTogglePool) mobileTogglePool.className = "flex-1 py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition";
        mobileToggleDesks.className = "flex-1 py-2 px-3 rounded-lg bg-white text-indigo-700 shadow-xs flex items-center justify-center gap-1.5 transition";
      });
    }

    if (btnScrollToDesks && deskSection) {
      btnScrollToDesks.addEventListener("click", () => {
        deskSection.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    // Quick Desk Filters (Semua Meja vs Hanya Meja Kosong)
    const btnFilterDeskAll = document.getElementById("btn-filter-desk-all");
    const btnFilterDeskEmpty = document.getElementById("btn-filter-desk-empty");

    if (btnFilterDeskAll && btnFilterDeskEmpty) {
      btnFilterDeskAll.addEventListener("click", () => {
        deskViewFilter = "all";
        btnFilterDeskAll.className = "px-2.5 py-1 rounded-lg bg-white text-indigo-700 shadow-2xs font-bold text-[11px] sm:text-xs transition";
        btnFilterDeskEmpty.className = "px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 font-semibold text-[11px] sm:text-xs transition flex items-center gap-1";
        renderDeskGrid(ROOMS_DATA[activeRoom]);
      });

      btnFilterDeskEmpty.addEventListener("click", () => {
        deskViewFilter = "empty-only";
        btnFilterDeskEmpty.className = "px-2.5 py-1 rounded-lg bg-white text-indigo-700 shadow-2xs font-bold text-[11px] sm:text-xs transition flex items-center gap-1";
        btnFilterDeskAll.className = "px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 font-semibold text-[11px] sm:text-xs transition";
        renderDeskGrid(ROOMS_DATA[activeRoom]);
      });
    }

    // Modal Pick Desk Controls
    const modalPickDesk = document.getElementById("modal-pick-desk");
    const btnPickClose = document.getElementById("modal-pick-desk-close");
    const btnPickCancel = document.getElementById("modal-pick-desk-cancel");
    const filterPickEmpty = document.getElementById("filter-pick-empty-only");
    const filterPickAll = document.getElementById("filter-pick-all");

    if (btnPickClose && modalPickDesk) {
      btnPickClose.addEventListener("click", () => modalPickDesk.classList.add("hidden"));
    }
    if (btnPickCancel && modalPickDesk) {
      btnPickCancel.addEventListener("click", () => modalPickDesk.classList.add("hidden"));
    }

    if (filterPickEmpty && filterPickAll) {
      filterPickEmpty.addEventListener("click", () => {
        deskPickerFilter = "empty-only";
        filterPickEmpty.className = "px-2.5 py-1 rounded-md bg-white text-indigo-700 shadow-2xs font-bold text-xs transition";
        filterPickAll.className = "px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 font-semibold text-xs transition";
        renderDeskPickerGrid();
      });

      filterPickAll.addEventListener("click", () => {
        deskPickerFilter = "all";
        filterPickAll.className = "px-2.5 py-1 rounded-md bg-white text-indigo-700 shadow-2xs font-bold text-xs transition";
        filterPickEmpty.className = "px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 font-semibold text-xs transition";
        renderDeskPickerGrid();
      });
    }

    // Modal backdrop click to dismiss on mobile touch
    ["modal-desk", "modal-add-laptop", "modal-settings", "modal-pick-desk"].forEach((modalId) => {
      const modalEl = document.getElementById(modalId);
      if (modalEl) {
        modalEl.addEventListener("click", (e) => {
          if (e.target === modalEl) {
            modalEl.classList.add("hidden");
          }
        });
      }
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

    const btnAutoPlot = document.getElementById("btn-auto-plot");
    if (btnAutoPlot) {
      btnAutoPlot.addEventListener("click", () => {
        autoPlotRoomDesks(activeRoom);
      });
    }

    const btnClearDesks = document.getElementById("btn-clear-room-desks");
    if (btnClearDesks) {
      btnClearDesks.addEventListener("click", () => {
        clearAllDesksInRoom(activeRoom);
      });
    }
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
