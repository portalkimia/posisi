/**
 * TKA 2026 - Central Laptop Assignment & Room Layout Synchronization
 * Google Apps Script Web App Backend
 * 
 * Target Sheets:
 * 1. Rekap_Laptop:
 *    [NIS, NAMA, KELAS, SESI, RUANG_KELAS, RUANG_LAPTOP, NO_MEJA, KEBERADAAN, CHARGER, STATUS_LAPTOP, KETERANGAN, LAST_UPDATED]
 * 2. Data_Ruangan:
 *    [Ruang, NoMeja, Sesi1, Sesi2, Sesi3, IdLaptop, LabelLaptop, PemilikLaptop, IsReady, HasCharger, Catatan, LastUpdated]
 * 3. Laptops_Inventory:
 *    [IdLaptop, LabelLaptop, PemilikLaptop, IsReady, HasCharger, AssignedRoom, AssignedDesk, Catatan, LastUpdated]
 */

const SHEET_REKAP = "Rekap_Laptop";
const SHEET_ROOMS = "Data_Ruangan";
const SHEET_LAPTOPS = "Laptops_Inventory";

const HEADERS_REKAP = [
  "NIS", "NAMA", "KELAS", "SESI", 
  "RUANG KELAS", "RUANG LAPTOP", "NO MEJA", 
  "KEBERADAAN DI RUANGAN", "CHARGER", "LAPTOP", 
  "KETERANGAN", "LAST UPDATED"
];

const HEADERS_ROOMS = [
  "Ruang", "NoMeja", "Sesi1", "Sesi2", "Sesi3", 
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
 * - ?action=getRekapLaptop
 * - ?action=getRoom&room=Ruang%201
 * - ?action=getAllSummary
 * - ?action=getInventory
 * - ?action=ping
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "getRekapLaptop";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSetup(ss);

    let result = {};

    if (action === "ping") {
      result = { success: true, message: "PONG", timestamp: new Date().toISOString() };
    } else if (action === "getRekapLaptop") {
      const sheet = ss.getSheetByName(SHEET_REKAP);
      const data = getSheetDataAsObjects(sheet);
      result = { success: true, data: data, count: data.length };
    } else if (action === "getRoom") {
      const room = e.parameter.room || "Ruang 1";
      const sheet = ss.getSheetByName(SHEET_ROOMS);
      const data = getSheetDataAsObjects(sheet);
      const roomData = data.filter(function (row) {
        return String(row.Ruang).trim().toLowerCase() === String(room).trim().toLowerCase();
      });
      result = { success: true, room: room, data: roomData, count: roomData.length };
    } else if (action === "getAllSummary") {
      const sheet = ss.getSheetByName(SHEET_ROOMS);
      const data = getSheetDataAsObjects(sheet);
      result = { success: true, data: data, count: data.length };
    } else if (action === "getInventory") {
      const sheet = ss.getSheetByName(SHEET_LAPTOPS);
      const data = getSheetDataAsObjects(sheet);
      result = { success: true, data: data, count: data.length };
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
 * - action: "updateRekapRow" (Update student laptop status in Rekap_Laptop)
 * - action: "batchSyncRekap" (Update multiple student laptop records)
 * - action: "updateAssignment" (Upsert desk assignment & cross-sync to Rekap_Laptop)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 15 seconds to acquire lock, avoiding write collision
    lock.waitLock(15000);

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
    } else if (action === "batchSyncRekap") {
      response = handleBatchSyncRekap(ss, body.items || []);
    } else if (action === "updateAssignment") {
      response = handleUpdateAssignment(ss, body);
    } else if (action === "upsertLaptop") {
      response = handleUpsertLaptop(ss, body);
    } else {
      response = { success: false, error: "Unknown POST action: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Lock or Execution Error: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

/**
 * Update single student row in Rekap_Laptop
 */
function handleUpdateRekapRow(ss, payload) {
  const sheetRekap = ss.getSheetByName(SHEET_REKAP);
  const now = new Date().toISOString();

  const nis = String(payload.nis || "").trim();
  const nama = String(payload.nama || "").trim();
  const kelas = String(payload.kelas || "").trim();
  const sesi = String(payload.sesi || "").trim();
  const ruangKelas = String(payload.ruangKelas || "").trim();
  const ruangLaptop = String(payload.ruangLaptop || "").trim();
  const noMeja = payload.noMeja ? Number(payload.noMeja) : "";
  const keberadaan = payload.keberadaan === true || payload.keberadaan === "true" || payload.keberadaan === 1 || payload.keberadaan === "TRUE";
  const charger = String(payload.charger || "ADA").toUpperCase();
  const laptopStatus = String(payload.laptopStatus || payload.laptop || "AMAN").toUpperCase();
  const keterangan = String(payload.keterangan || payload.catatan || "").trim();

  if (!nama && !nis) {
    return { success: false, error: "Missing required identifier: NIS or Nama" };
  }

  const values = sheetRekap.getDataRange().getValues();
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
    sesi || (targetRow > 0 ? values[targetRow - 1][3] : ""),
    ruangKelas || (targetRow > 0 ? values[targetRow - 1][4] : ""),
    ruangLaptop || (targetRow > 0 ? values[targetRow - 1][5] : ""),
    noMeja || (targetRow > 0 ? values[targetRow - 1][6] : ""),
    keberadaan ? true : false,
    charger.indexOf("TIDAK") !== -1 ? "TIDAK ADA" : "ADA",
    laptopStatus.indexOf("TIDAK") !== -1 ? "TIDAK AMAN" : "AMAN",
    keterangan,
    now
  ];

  if (targetRow > 0) {
    sheetRekap.getRange(targetRow, 1, 1, HEADERS_REKAP.length).setValues([rowData]);
  } else {
    sheetRekap.appendRow(rowData);
    targetRow = sheetRekap.getLastRow();
  }

  // Ensure checkbox formatting
  sheetRekap.getRange(targetRow, 8).insertCheckboxes();

  return {
    success: true,
    action: targetRow > 0 ? "updated" : "inserted",
    nis: nis,
    nama: nama,
    ruangLaptop: ruangLaptop,
    lastUpdated: now
  };
}

/**
 * Handle batch updates to Rekap_Laptop
 */
function handleBatchSyncRekap(ss, items) {
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    handleUpdateRekapRow(ss, items[i]);
    count++;
  }
  return { success: true, count: count };
}

/**
 * Upsert a single desk assignment (Data_Ruangan) and cross-sync to Rekap_Laptop
 */
function handleUpdateAssignment(ss, payload) {
  const sheetRooms = ss.getSheetByName(SHEET_ROOMS);
  const sheetLaptops = ss.getSheetByName(SHEET_LAPTOPS);
  const now = new Date().toISOString();

  const room = String(payload.room || "").trim();
  const deskNo = Number(payload.deskNo);
  const idLaptop = String(payload.idLaptop || "").trim();
  const labelLaptop = String(payload.labelLaptop || "").trim();
  const pemilikLaptop = String(payload.pemilikLaptop || "").trim();
  const isReady = payload.isReady === true || payload.isReady === "true" || payload.isReady === 1;
  const hasCharger = payload.hasCharger === true || payload.hasCharger === "true" || payload.hasCharger === 1;
  const catatan = String(payload.catatan || payload.keterangan || "").trim();
  const sesi1 = String(payload.sesi1 || "").trim();
  const sesi2 = String(payload.sesi2 || "").trim();
  const sesi3 = String(payload.sesi3 || "").trim();

  if (!room || !deskNo) {
    return { success: false, error: "Missing required fields: room and deskNo" };
  }

  // 1. Search existing row in Data_Ruangan
  const values = sheetRooms.getDataRange().getValues();
  let targetRow = -1;

  for (let i = 1; i < values.length; i++) {
    const r = String(values[i][0]).trim();
    const d = Number(values[i][1]);
    if (r.toLowerCase() === room.toLowerCase() && d === deskNo) {
      targetRow = i + 1;
      break;
    }
  }

  const rowData = [
    room,
    deskNo,
    sesi1,
    sesi2,
    sesi3,
    idLaptop,
    labelLaptop,
    pemilikLaptop,
    isReady ? "TRUE" : "FALSE",
    hasCharger ? "TRUE" : "FALSE",
    catatan,
    now
  ];

  if (targetRow > 0) {
    if (!sesi1 && values[targetRow - 1][2]) rowData[2] = values[targetRow - 1][2];
    if (!sesi2 && values[targetRow - 1][3]) rowData[3] = values[targetRow - 1][3];
    if (!sesi3 && values[targetRow - 1][4]) rowData[4] = values[targetRow - 1][4];
    sheetRooms.getRange(targetRow, 1, 1, HEADERS_ROOMS.length).setValues([rowData]);
  } else {
    sheetRooms.appendRow(rowData);
  }

  // 2. Cross-sync to Rekap_Laptop if student owner is identified
  if (pemilikLaptop) {
    handleUpdateRekapRow(ss, {
      nama: pemilikLaptop,
      ruangLaptop: room.replace("Ruang ", "R"),
      noMeja: deskNo,
      keberadaan: true,
      charger: hasCharger ? "ADA" : "TIDAK ADA",
      laptopStatus: isReady ? "AMAN" : "TIDAK AMAN",
      keterangan: catatan
    });
  }

  // 3. Sync to Laptops_Inventory
  if (idLaptop) {
    syncLaptopInventory(sheetLaptops, {
      idLaptop: idLaptop,
      labelLaptop: labelLaptop,
      pemilikLaptop: pemilikLaptop,
      isReady: isReady,
      hasCharger: hasCharger,
      assignedRoom: room,
      assignedDesk: deskNo,
      catatan: catatan,
      lastUpdated: now
    });
  }

  return {
    success: true,
    action: targetRow > 0 ? "updated" : "inserted",
    room: room,
    deskNo: deskNo,
    idLaptop: idLaptop,
    lastUpdated: now
  };
}

/**
 * Sync laptop record in Laptops_Inventory
 */
function syncLaptopInventory(sheet, laptop) {
  const values = sheet.getDataRange().getValues();
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
    laptop.assignedDesk || "",
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
  return { success: true, idLaptop: payload.idLaptop };
}

/**
 * Ensure sheets exist with correct headers, dropdown validations & conditional styling
 */
function ensureSetup(ss) {
  // 1. Rekap_Laptop
  let sRekap = ss.getSheetByName(SHEET_REKAP);
  if (!sRekap) {
    sRekap = ss.insertSheet(SHEET_REKAP, 0); // Put in 1st tab
    sRekap.appendRow(HEADERS_REKAP);
    sRekap.getRange(1, 1, 1, HEADERS_REKAP.length)
      .setFontWeight("bold")
      .setBackground("#1e293b")
      .setFontColor("#ffffff");
    sRekap.setFrozenRows(1);
    setupRekapValidations(sRekap);
  }

  // 2. Data_Ruangan
  let sRooms = ss.getSheetByName(SHEET_ROOMS);
  if (!sRooms) {
    sRooms = ss.insertSheet(SHEET_ROOMS);
    sRooms.appendRow(HEADERS_ROOMS);
    sRooms.getRange(1, 1, 1, HEADERS_ROOMS.length)
      .setFontWeight("bold")
      .setBackground("#e2e8f0");
    sRooms.setFrozenRows(1);
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
 * Set dropdowns & conditional formatting for Rekap_Laptop
 */
function setupRekapValidations(sheet) {
  const maxRows = 400;

  // Dropdown for CHARGER (Col 9: ADA, TIDAK ADA)
  const chargerRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["ADA", "TIDAK ADA"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 9, maxRows, 1).setDataValidation(chargerRule);

  // Dropdown for LAPTOP (Col 10: AMAN, TIDAK AMAN)
  const laptopRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["AMAN", "TIDAK AMAN"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 10, maxRows, 1).setDataValidation(laptopRule);

  // Dropdown for RUANG KELAS & RUANG LAPTOP (Cols 5 & 6: R1 .. R11)
  const roomsList = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11"];
  const roomRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(roomsList, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 5, maxRows, 2).setDataValidation(roomRule);

  // Checkbox for KEBERADAAN DI RUANGAN (Col 8)
  sheet.getRange(2, 8, maxRows, 1).insertCheckboxes();

  // Conditional formatting: Highlight "TIDAK ADA" charger in red
  const rules = sheet.getConditionalFormatRules() || [];
  const ruleNoCharger = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("TIDAK ADA")
    .setBackground("#fecaca")
    .setFontColor("#991b1b")
    .setRanges([sheet.getRange(2, 9, maxRows, 1)])
    .build();

  const ruleNotSafe = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("TIDAK AMAN")
    .setBackground("#fed7aa")
    .setFontColor("#9a3412")
    .setRanges([sheet.getRange(2, 10, maxRows, 1)])
    .build();

  rules.push(ruleNoCharger, ruleNotSafe);
  sheet.setConditionalFormatRules(rules);
}

/**
 * Helper to convert sheet rows to JSON array of objects
 */
function getSheetDataAsObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const list = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    list.push(obj);
  }
  return list;
}

/**
 * Manual setup entry point for Google Apps Script Editor
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSetup(ss);
}
