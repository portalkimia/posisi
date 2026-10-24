/**
 * TKA 2026 - Central Laptop Assignment & Room Layout Synchronization
 * Multi-Day (26–29 Okt) & Multi-Session Backend
 * High-Concurrency Architecture for 11 Simultaneous Proctors
 * 
 * Target Sheets:
 * - Rekap_26_Okt
 * - Rekap_27_Okt
 * - Rekap_28_Okt
 * - Rekap_29_Okt
 * Columns: [NIS, NAMA, KELAS, RUANG KELAS, RUANG LAPTOP, SESI 1, SESI 2, SESI 3, KEBERADAAN DI RUANGAN, CHARGER, LAPTOP, KETERANGAN, LAST UPDATED]
 * 
 * - Data_Ruangan (Desk assignments per date & session across all 11 rooms + Ruang Guru)
 * - Laptops_Inventory (Central inventory)
 */

const DATES_CONFIG = {
  "2026-10-26": "Rekap_26_Okt",
  "2026-10-27": "Rekap_27_Okt",
  "2026-10-28": "Rekap_28_Okt",
  "2026-10-29": "Rekap_29_Okt"
};

const SHEET_ROOMS = "Data_Ruangan";
const SHEET_LAPTOPS = "Laptops_Inventory";

const HEADERS_REKAP = [
  "NIS", "NAMA", "KELAS", "RUANG KELAS", "RUANG LAPTOP", 
  "SESI 1", "SESI 2", "SESI 3", 
  "KEBERADAAN DI RUANGAN", "CHARGER", "LAPTOP", 
  "KETERANGAN", "LAST UPDATED"
];

const HEADERS_ROOMS = [
  "Tanggal", "Sesi", "Ruang", "NoMeja", "NamaPeserta", 
  "IdLaptop", "LabelLaptop", "PemilikLaptop", 
  "IsReady", "HasCharger", "Catatan", "LastUpdated"
];

const HEADERS_LAPTOPS = [
  "IdLaptop", "LabelLaptop", "PemilikLaptop", 
  "IsReady", "HasCharger", "AssignedRoom", "AssignedDesk", 
  "Catatan", "LastUpdated"
];

/**
 * Handle HTTP GET Requests
 * Endpoints:
 * - ?action=getSyncState&tanggal=2026-10-26&sesi=Sesi%201 (All 11 rooms assignments + Rekap)
 * - ?action=getRekapLaptop&tanggal=2026-10-26
 * - ?action=getAllRekap (all 4 days)
 * - ?action=getRoom&room=Ruang%201&tanggal=2026-10-26&sesi=Sesi%201
 * - ?action=getInventory
 * - ?action=ping
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "getSyncState";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSetup(ss);

    let result = {};

    if (action === "ping") {
      result = { success: true, message: "PONG", timestamp: new Date().toISOString() };
    } else if (action === "getSyncState") {
      const tanggal = (e && e.parameter && e.parameter.tanggal) || "2026-10-26";
      const sesi = (e && e.parameter && e.parameter.sesi) || "Sesi 1";

      const sheetRooms = ss.getSheetByName(SHEET_ROOMS);
      const roomsData = getSheetDataAsObjects(sheetRooms);
      const sessionAssignments = roomsData.filter(function (row) {
        const rowTgl = String(row.Tanggal || "").trim();
        const matchTgl = !rowTgl || rowTgl === String(tanggal).trim() || rowTgl.indexOf(String(tanggal).trim()) !== -1;
        const matchSesi = !row.Sesi || String(row.Sesi).trim().toLowerCase() === String(sesi).trim().toLowerCase();
        return matchTgl && matchSesi;
      });

      const sheetName = DATES_CONFIG[tanggal] || "Rekap_26_Okt";
      const sheetRekap = ss.getSheetByName(sheetName);
      const rekapData = sheetRekap ? getSheetDataAsObjects(sheetRekap) : [];

      result = {
        success: true,
        tanggal: tanggal,
        sesi: sesi,
        assignments: sessionAssignments,
        rekap: rekapData,
        timestamp: new Date().toISOString()
      };
    } else if (action === "getRekapLaptop") {
      const tanggal = (e && e.parameter && e.parameter.tanggal) || "2026-10-26";
      const sheetName = DATES_CONFIG[tanggal] || "Rekap_26_Okt";
      const sheet = ss.getSheetByName(sheetName);
      const data = getSheetDataAsObjects(sheet);
      result = { success: true, tanggal: tanggal, sheetName: sheetName, data: data, count: data.length };
    } else if (action === "getAllRekap") {
      const allData = {};
      Object.keys(DATES_CONFIG).forEach(function (tgl) {
        const sName = DATES_CONFIG[tgl];
        const s = ss.getSheetByName(sName);
        allData[tgl] = s ? getSheetDataAsObjects(s) : [];
      });
      result = { success: true, data: allData };
    } else if (action === "getRoom") {
      const room = e.parameter.room || "Ruang 1";
      const tanggal = e.parameter.tanggal || "2026-10-26";
      const sesi = e.parameter.sesi || "Sesi 1";

      const sheet = ss.getSheetByName(SHEET_ROOMS);
      const data = getSheetDataAsObjects(sheet);
      const roomData = data.filter(function (row) {
        const matchRoom = String(row.Ruang).trim().toLowerCase() === String(room).trim().toLowerCase();
        const rowTgl = String(row.Tanggal || "").trim();
        const matchTgl = !rowTgl || rowTgl === String(tanggal).trim() || rowTgl.indexOf(String(tanggal).trim()) !== -1;
        const matchSesi = !row.Sesi || String(row.Sesi).trim().toLowerCase() === String(sesi).trim().toLowerCase();
        return matchRoom && matchTgl && matchSesi;
      });
      result = { success: true, room: room, tanggal: tanggal, sesi: sesi, data: roomData, count: roomData.length };
    } else if (action === "getInventory") {
      const sheet = ss.getSheetByName(SHEET_LAPTOPS);
      const data = getSheetDataAsObjects(sheet);
      result = { success: true, data: data, count: data.length };
    } else if (action === "listSheets") {
      result = {
        success: true,
        sheets: ss.getSheets().map(function (s) { return s.getName(); })
      };
    } else if (action === "syncPersiapan") {
      const target = (e && e.parameter && e.parameter.target) || "all";
      if (target === "all") {
        const results = {};
        ["Rekap_26_Okt", "Rekap_27_Okt", "Rekap_28_Okt", "Rekap_29_Okt"].forEach(function (t) {
          results[t] = handleSyncFromPersiapan(ss, t);
        });
        cleanDataRuanganUncollected(ss);
        result = { success: true, message: "Synced Rekap_Persiapan to all date sheets and cleaned Data_Ruangan", results: results };
      } else {
        result = handleSyncFromPersiapan(ss, target);
        cleanDataRuanganUncollected(ss);
      }
    } else if (action === "cleanPinjam") {
      result = cleanPinjamNotes(ss);
    } else if (action === "getSheetData") {
      const sName = (e && e.parameter && e.parameter.sheetName) || "Rekap_Persiapan";
      const sheet = ss.getSheetByName(sName);
      if (!sheet) {
        result = { success: false, error: "Sheet not found: " + sName };
      } else {
        const data = getSheetDataAsObjects(sheet);
        result = { success: true, sheetName: sName, count: data.length, data: data };
      }
    } else {
      result = { success: false, error: "Invalid action: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle HTTP POST Requests
 * Endpoints:
 * - action: "updateRekapRow" (Update student row in specific date sheet)
 * - action: "batchSyncDate" (Bulk update for a specific date)
 * - action: "updateAssignment" (Upsert desk assignment and sync to session column)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // 30 seconds wait for high concurrent access across 11 proctors
    lock.waitLock(30000);

    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const action = body.action || "updateAssignment";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSetup(ss);

    let response = { success: false };

    if (action === "updateRekapRow") {
      response = handleUpdateRekapRow(ss, body);
    } else if (action === "batchSyncDate") {
      response = handleBatchSyncDate(ss, body.tanggal, body.items || []);
    } else if (action === "updateAssignment") {
      response = handleUpdateAssignment(ss, body);
    } else if (action === "batchUpdateAssignments") {
      response = handleBatchUpdateAssignments(ss, body);
    } else if (action === "upsertLaptop") {
      response = handleUpsertLaptop(ss, body);
    } else {
      response = { success: false, error: "Unknown POST action: " + action };
    }

    // Flush pending changes to sheet before releasing lock!
    SpreadsheetApp.flush();

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Lock or Execution Error: " + err.toString(),
      retryable: true
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

/**
 * Update single student row in the specific Date Sheet
 */
function handleUpdateRekapRow(ss, payload) {
  const tanggal = String(payload.tanggal || "2026-10-26").trim();
  const sheetName = DATES_CONFIG[tanggal] || "Rekap_26_Okt";
  const sheet = ss.getSheetByName(sheetName);
  const now = new Date().toISOString();

  const nis = String(payload.nis || "").trim();
  const nama = String(payload.nama || "").trim();
  const kelas = String(payload.kelas || "").trim();
  const ruangKelas = String(payload.ruangKelas || "").trim();
  const ruangLaptop = String(payload.ruangLaptop || "").trim();
  const sesi1 = payload.sesi1 !== undefined ? String(payload.sesi1) : "";
  const sesi2 = payload.sesi2 !== undefined ? String(payload.sesi2) : "";
  const sesi3 = payload.sesi3 !== undefined ? String(payload.sesi3) : "";
  const keberadaan = payload.keberadaan === true || payload.keberadaan === "true" || payload.keberadaan === 1 || payload.keberadaan === "TRUE";
  const charger = String(payload.charger || "ADA").toUpperCase();
  const laptopStatus = String(payload.laptopStatus || payload.laptop || "AMAN").toUpperCase();
  const keterangan = String(payload.keterangan || payload.catatan || "").trim();

  if (!nama && !nis) {
    return { success: false, error: "Missing required identifier: NIS or Nama" };
  }

  const values = sheet.getDataRange().getDisplayValues();
  let targetRow = -1;

  for (let i = 1; i < values.length; i++) {
    const rowNis = String(values[i][0]).trim();
    const rowNama = String(values[i][1]).trim();
    if ((nis && rowNis === nis) || (!nis && rowNama.toLowerCase() === nama.toLowerCase())) {
      targetRow = i + 1;
      break;
    }
  }

  const rowData = [
    nis || (targetRow > 0 ? values[targetRow - 1][0] : ""),
    nama || (targetRow > 0 ? values[targetRow - 1][1] : ""),
    kelas || (targetRow > 0 ? values[targetRow - 1][2] : ""),
    ruangKelas || (targetRow > 0 ? values[targetRow - 1][3] : ""),
    ruangLaptop || (targetRow > 0 ? values[targetRow - 1][4] : ""),
    sesi1 || (targetRow > 0 ? values[targetRow - 1][5] : ""),
    sesi2 || (targetRow > 0 ? values[targetRow - 1][6] : ""),
    sesi3 || (targetRow > 0 ? values[targetRow - 1][7] : ""),
    keberadaan ? true : false,
    charger.indexOf("TIDAK") !== -1 ? "TIDAK ADA" : "ADA",
    laptopStatus.indexOf("TIDAK") !== -1 ? "TIDAK AMAN" : "AMAN",
    keterangan,
    now
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, HEADERS_REKAP.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
    targetRow = sheet.getLastRow();
  }

  return {
    success: true,
    action: targetRow > 0 ? "updated" : "inserted",
    tanggal: tanggal,
    nama: nama,
    lastUpdated: now
  };
}

/**
 * Bulk update date sheet
 */
function handleBatchSyncDate(ss, tanggal, items) {
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    item.tanggal = tanggal;
    handleUpdateRekapRow(ss, item);
    count++;
  }
  SpreadsheetApp.flush();
  return { success: true, count: count };
}

/**
 * Upsert desk assignment into Data_Ruangan & cross-sync to date sheet Sesi column
 * Fully handles assigning and unassigning without orphaned records.
 */

/**
 * Bulk update desk assignments in Data_Ruangan & date sheets
 */
function handleBatchUpdateAssignments(ss, payload) {
  const items = payload.items || [];
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    results.push(handleUpdateAssignment(ss, item));
  }
  SpreadsheetApp.flush();
  return { success: true, count: results.length };
}
function handleUpdateAssignment(ss, payload) {
  const sheetRooms = ss.getSheetByName(SHEET_ROOMS);
  const sheetLaptops = ss.getSheetByName(SHEET_LAPTOPS);
  const now = new Date().toISOString();

  const tanggal = String(payload.tanggal || "2026-10-26").trim();
  const sesi = String(payload.sesi || "Sesi 1").trim();
  const room = String(payload.room || "").trim();
  const deskNo = payload.deskNo !== undefined ? Number(payload.deskNo) : 0;
  const namaPeserta = String(payload.namaPeserta || "").trim();
  const idLaptop = String(payload.idLaptop || "").trim();
  const labelLaptop = String(payload.labelLaptop || "").trim();
  const pemilikLaptop = String(payload.pemilikLaptop || "").trim();
  const isReady = payload.isReady === true || payload.isReady === "true" || payload.isReady === 1;
  const hasCharger = payload.hasCharger === true || payload.hasCharger === "true" || payload.hasCharger === 1;
  const catatan = String(payload.catatan || payload.keterangan || "").trim();
  const isUnassign = payload.isUnassign === true || !idLaptop;

  // 1. Find existing row in Data_Ruangan
  const values = sheetRooms.getDataRange().getDisplayValues();
  let targetRow = -1;
  let oldIdLaptop = "";
  let oldPemilik = "";

  for (let i = 1; i < values.length; i++) {
    const rTgl = String(values[i][0]).trim();
    const rSesi = String(values[i][1]).trim();
    const rRuang = String(values[i][2]).trim();
    const rDesk = Number(values[i][3]);

    const matchTgl = rTgl === tanggal || rTgl.indexOf(tanggal) !== -1;
    if (matchTgl && rSesi.toLowerCase() === sesi.toLowerCase() && rRuang.toLowerCase() === room.toLowerCase() && rDesk === deskNo) {
      targetRow = i + 1;
      oldIdLaptop = String(values[i][5] || "").trim();
      oldPemilik = String(values[i][7] || "").trim();
      break;
    }
  }

  const rowData = [
    tanggal,
    sesi,
    room,
    deskNo,
    namaPeserta,
    isUnassign ? "" : idLaptop,
    isUnassign ? "" : labelLaptop,
    isUnassign ? "" : pemilikLaptop,
    isUnassign ? "FALSE" : (isReady ? "TRUE" : "FALSE"),
    isUnassign ? "FALSE" : (hasCharger ? "TRUE" : "FALSE"),
    isUnassign ? "" : catatan,
    now
  ];

  if (targetRow > 0) {
    sheetRooms.getRange(targetRow, 1, 1, HEADERS_ROOMS.length).setValues([rowData]);
  } else {
    sheetRooms.appendRow(rowData);
  }

  // 2. Cross-sync to the date's Rekap sheet under the specific Sesi column
  const targetPemilik = pemilikLaptop || payload.unassignPemilik || oldPemilik;
  if (targetPemilik) {
    const rCode = room === "Ruang Guru" ? "Ruang Guru" : room.replace("Ruang ", "R");
    const deskText = isUnassign ? "-" : (deskNo ? "Meja " + deskNo : "Cadangan");

    const rekapUpdate = {
      tanggal: tanggal,
      nama: targetPemilik,
      ruangLaptop: rCode, // Tetap berada di ruangan ini (sebagai cadangan ruangan)
      keberadaan: true,
      charger: hasCharger ? "ADA" : "TIDAK ADA",
      laptopStatus: isReady ? "AMAN" : "TIDAK AMAN",
      keterangan: catatan
    };

    if (sesi === "Sesi 1") rekapUpdate.sesi1 = deskText;
    else if (sesi === "Sesi 2") rekapUpdate.sesi2 = deskText;
    else if (sesi === "Sesi 3") rekapUpdate.sesi3 = deskText;

    handleUpdateRekapRow(ss, rekapUpdate);
  }

  // 3. Sync to Laptops_Inventory
  const targetIdLaptop = idLaptop || payload.unassignIdLaptop || oldIdLaptop;
  if (targetIdLaptop) {
    syncLaptopInventory(sheetLaptops, {
      idLaptop: targetIdLaptop,
      labelLaptop: labelLaptop,
      pemilikLaptop: targetPemilik,
      isReady: isReady,
      hasCharger: hasCharger,
      assignedRoom: isUnassign ? "" : room,
      assignedDesk: isUnassign ? "" : deskNo,
      catatan: catatan,
      lastUpdated: now
    });
  }

  return {
    success: true,
    action: isUnassign ? "unassigned" : (targetRow > 0 ? "updated" : "inserted"),
    tanggal: tanggal,
    sesi: sesi,
    room: room,
    deskNo: deskNo,
    idLaptop: isUnassign ? "" : idLaptop
  };
}

function syncLaptopInventory(sheet, laptop) {
  const values = sheet.getDataRange().getDisplayValues();
  let targetRow = -1;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === laptop.idLaptop.toLowerCase()) {
      targetRow = i + 1;
      break;
    }
  }

  const rowData = [
    laptop.idLaptop,
    laptop.labelLaptop || "",
    laptop.pemilikLaptop || "",
    laptop.isReady ? "TRUE" : "FALSE",
    laptop.hasCharger ? "TRUE" : "FALSE",
    laptop.assignedRoom || "",
    laptop.assignedDesk !== undefined && laptop.assignedDesk !== null ? laptop.assignedDesk : "",
    laptop.catatan || "",
    laptop.lastUpdated || new Date().toISOString()
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, HEADERS_LAPTOPS.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function handleUpsertLaptop(ss, payload) {
  const sheetLaptops = ss.getSheetByName(SHEET_LAPTOPS);
  syncLaptopInventory(sheetLaptops, payload);
  SpreadsheetApp.flush();
  return { success: true, idLaptop: payload.idLaptop };
}

/**
 * Ensure sheets exist for all 4 dates with correct headers, dropdown validations & conditional styling
 */

/**
 * Synchronize exact student records, physical room location, and presence
 * from Rekap_Persiapan to date rekap sheets.
 * Guarantees that students with KEBERADAAN=FALSE have no desk assigned and
 * laptops actually present match 100%.
 */
function handleSyncFromPersiapan(ss, targetSheetName) {
  const sPersiapan = ss.getSheetByName("Rekap_Persiapan");
  if (!sPersiapan) return { success: false, error: "Rekap_Persiapan sheet not found" };

  const sTarget = ss.getSheetByName(targetSheetName || "Rekap_26_Okt");
  if (!sTarget) return { success: false, error: "Target sheet not found: " + targetSheetName };

  const persiapanData = getSheetDataAsObjects(sPersiapan);
  const targetData = getSheetDataAsObjects(sTarget);

  const targetMap = {};
  targetData.forEach(function (r) {
    if (r.NAMA) {
      targetMap[String(r.NAMA).trim().toLowerCase()] = r;
    }
  });

  const newRows = [];
  const now = new Date().toISOString();

  let countPresent = 0;
  let countNotPresent = 0;

  persiapanData.forEach(function (p) {
    const name = String(p.NAMA || "").trim();
    if (!name) return;
    const nameKey = name.toLowerCase();
    const existing = targetMap[nameKey] || {};

    const isPresent = String(p["KEBERADAAN DI RUANGAN"] || "").trim().toUpperCase() === "TRUE";
    if (isPresent) countPresent++;
    else countNotPresent++;

    let s1 = existing["SESI 1"] || "";
    let s2 = existing["SESI 2"] || "";
    let s3 = existing["SESI 3"] || "";

    // If laptop is NOT in room, desks MUST be empty
    if (!isPresent) {
      s1 = "";
      s2 = "";
      s3 = "";
    }

    newRows.push([
      existing.NIS || "",
      name,
      String(p.KELAS || existing.KELAS || "").trim(),
      String(p["RUANG KELAS"] || existing["RUANG KELAS"] || "").trim(),
      String(p["RUANG LAPTOP"] || "").trim(),
      s1,
      s2,
      s3,
      isPresent ? "TRUE" : "FALSE",
      String(p.CHARGER || "").trim().toUpperCase(),
      String(p.LAPTOP || "").trim().toUpperCase(),
      String(p.KET || "").trim(),
      now
    ]);
  });

  const lastRow = sTarget.getLastRow();
  if (lastRow > 1) {
    sTarget.getRange(2, 1, lastRow - 1, HEADERS_REKAP.length).clearContent();
  }

  if (newRows.length > 0) {
    sTarget.getRange(2, 1, newRows.length, HEADERS_REKAP.length).setValues(newRows);
  }

  SpreadsheetApp.flush();
  return {
    success: true,
    sheet: targetSheetName,
    totalRows: newRows.length,
    presentCount: countPresent,
    notPresentCount: countNotPresent
  };
}

function cleanDataRuanganUncollected(ss) {
  const sPersiapan = ss.getSheetByName("Rekap_Persiapan");
  const sRooms = ss.getSheetByName(SHEET_ROOMS);
  if (!sPersiapan || !sRooms) return;

  const persiapanData = getSheetDataAsObjects(sPersiapan);
  const uncollectedOwners = new Set();

  persiapanData.forEach(function (p) {
    const isPresent = String(p["KEBERADAAN DI RUANGAN"] || "").trim().toUpperCase() === "TRUE";
    if (!isPresent && p.NAMA) {
      uncollectedOwners.add(String(p.NAMA).trim().toLowerCase());
    }
  });

  const roomsData = getSheetDataAsObjects(sRooms);
  for (let i = roomsData.length - 1; i >= 0; i--) {
    const row = roomsData[i];
    const owner = String(row.PemilikLaptop || "").trim().toLowerCase();
    if (uncollectedOwners.has(owner)) {
      sRooms.deleteRow(i + 2); // 1-based, +1 header
    }
  }
  SpreadsheetApp.flush();
}


/**
 * Clean legacy "Pinjam laptop..." and "Cadangan..." text from KETERANGAN / CATATAN
 * Sesuai instruksi: keterangan hanya untuk catatan laptop bermasalah.
 */
function cleanPinjamNotes(ss) {
  let cleanedRekapCount = 0;
  let cleanedRoomsCount = 0;

  // 1. Clean Rekap date sheets
  ["Rekap_26_Okt", "Rekap_27_Okt", "Rekap_28_Okt", "Rekap_29_Okt"].forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const range = sheet.getDataRange();
    const values = range.getValues();
    let modified = false;

    // Col 11 (0-based) is KETERANGAN
    for (let i = 1; i < values.length; i++) {
      const ket = String(values[i][11] || "").trim();
      if (ket.toLowerCase().includes("pinjam") || ket.toLowerCase().startsWith("cadangan ruang")) {
        let cleaned = ket.replace(/Pinjam\s+laptop\s+[^)]+\([^)]+\)/gi, "")
                         .replace(/\(Pinjam\s+[^)]+\)/gi, "")
                         .replace(/Pinjam\s+laptop\s+[^,;]+/gi, "")
                         .replace(/Cadangan\s+Ruang\s+\d+/gi, "")
                         .trim();
        cleaned = cleaned.replace(/^[\s,;\-]+|[\s,;\-]+$/g, "").trim();
        if (cleaned !== ket) {
          values[i][11] = cleaned;
          cleanedRekapCount++;
          modified = true;
        }
      }
    }
    if (modified) {
      range.setValues(values);
    }
  });

  // 2. Clean Data_Ruangan
  const sRooms = ss.getSheetByName(SHEET_ROOMS);
  if (sRooms) {
    const range = sRooms.getDataRange();
    const values = range.getValues();
    let modified = false;

    // Col 10 (0-based) is CATATAN
    for (let i = 1; i < values.length; i++) {
      const cat = String(values[i][10] || "").trim();
      if (cat.toLowerCase().includes("pinjam") || cat.toLowerCase().startsWith("cadangan ruang")) {
        let cleaned = cat.replace(/Pinjam\s+laptop\s+[^)]+\([^)]+\)/gi, "")
                         .replace(/\(Pinjam\s+[^)]+\)/gi, "")
                         .replace(/Pinjam\s+laptop\s+[^,;]+/gi, "")
                         .replace(/Cadangan\s+Ruang\s+\d+/gi, "")
                         .trim();
        cleaned = cleaned.replace(/^[\s,;\-]+|[\s,;\-]+$/g, "").trim();
        if (cleaned !== cat) {
          values[i][10] = cleaned;
          cleanedRoomsCount++;
          modified = true;
        }
      }
    }
    if (modified) {
      range.setValues(values);
    }
  }

  SpreadsheetApp.flush();
  return { success: true, cleanedRekap: cleanedRekapCount, cleanedRooms: cleanedRoomsCount };
}

function ensureSetup(ss) {
  // 1. Create Sheets for all 4 dates: Rekap_26_Okt .. Rekap_29_Okt
  Object.keys(DATES_CONFIG).forEach(function (tgl, idx) {
    const sName = DATES_CONFIG[tgl];
    let sheet = ss.getSheetByName(sName);
    if (!sheet) {
      sheet = ss.insertSheet(sName, idx);
      sheet.appendRow(HEADERS_REKAP);
      sheet.getRange(1, 1, 1, HEADERS_REKAP.length)
        .setFontWeight("bold")
        .setBackground("#0f172a")
        .setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      setupRekapValidations(sheet);
    }
  });

  // 2. Data_Ruangan
  let sRooms = ss.getSheetByName(SHEET_ROOMS);
  if (!sRooms) {
    sRooms = ss.insertSheet(SHEET_ROOMS);
    sRooms.appendRow(HEADERS_ROOMS);
    sRooms.getRange(1, 1, 1, HEADERS_ROOMS.length)
      .setFontWeight("bold")
      .setBackground("#e2e8f0");
    sRooms.setFrozenRows(1);
    sRooms.getRange(2, 1, 1000, 1).setNumberFormat("@");
  }

  // 3. Laptops_Inventory
  let sLaptops = ss.getSheetByName(SHEET_LAPTOPS);
  if (!sLaptops) {
    sLaptops = ss.insertSheet(SHEET_LAPTOPS);
    sLaptops.appendRow(HEADERS_LAPTOPS);
    sLaptops.getRange(1, 1, 1, HEADERS_LAPTOPS.length)
      .setFontWeight("bold")
      .setBackground("#e2e8f0");
    sLaptops.setFrozenRows(1);
  }
}

/**
 * Set dropdowns & conditional formatting for Rekap sheets
 */
function setupRekapValidations(sheet) {
  const maxRows = 500;

  // Dropdown for CHARGER (Col 10: ADA, TIDAK ADA)
  const chargerRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["ADA", "TIDAK ADA"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 10, maxRows, 1).setDataValidation(chargerRule);

  // Dropdown for LAPTOP (Col 11: AMAN, TIDAK AMAN)
  const laptopRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["AMAN", "TIDAK AMAN"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 11, maxRows, 1).setDataValidation(laptopRule);

  // Dropdown for RUANG KELAS & RUANG LAPTOP (Cols 4 & 5: R1 .. R11, Ruang Guru)
  const roomsList = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "Ruang Guru"];
  const roomRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(roomsList, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 4, maxRows, 2).setDataValidation(roomRule);

  // Checkbox for KEBERADAAN DI RUANGAN (Col 9)
  sheet.getRange(2, 9, maxRows, 1).insertCheckboxes();

  // Conditional formatting: Red highlight for TIDAK ADA charger
  const rules = sheet.getConditionalFormatRules() || [];
  const ruleNoCharger = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("TIDAK ADA")
    .setBackground("#fecaca")
    .setFontColor("#991b1b")
    .setRanges([sheet.getRange(2, 10, maxRows, 1)])
    .build();

  const ruleNotSafe = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("TIDAK AMAN")
    .setBackground("#fed7aa")
    .setFontColor("#9a3412")
    .setRanges([sheet.getRange(2, 11, maxRows, 1)])
    .build();

  rules.push(ruleNoCharger, ruleNotSafe);
  sheet.setConditionalFormatRules(rules);
}

function getSheetDataAsObjects(sheet) {
  if (!sheet) return [];
  const displayValues = sheet.getDataRange().getDisplayValues();
  if (displayValues.length <= 1) return [];

  const headers = displayValues[0];
  const list = [];

  for (let i = 1; i < displayValues.length; i++) {
    const row = displayValues[i];
    if (!row.some(function (cell) { return cell !== ""; })) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    list.push(obj);
  }
  return list;
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSetup(ss);
}
