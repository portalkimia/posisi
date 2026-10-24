/**
 * TKA 2026 - Central Laptop Assignment & Room Layout Synchronization
 * Multi-Day (26–29 Okt) & Multi-Session Backend
 * 
 * Target Sheets:
 * - Rekap_26_Okt
 * - Rekap_27_Okt
 * - Rekap_28_Okt
 * - Rekap_29_Okt
 * Columns: [NIS, NAMA, KELAS, RUANG KELAS, RUANG LAPTOP, SESI 1, SESI 2, SESI 3, KEBERADAAN DI RUANGAN, CHARGER, LAPTOP, KETERANGAN, LAST UPDATED]
 * 
 * - Data_Ruangan (Desk assignments per date & session)
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
 * - ?action=getRekapLaptop&tanggal=2026-10-26
 * - ?action=getAllRekap (all 4 days)
 * - ?action=getRoom&room=Ruang%201&tanggal=2026-10-26&sesi=Sesi%201
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
        const matchTgl = !row.Tanggal || String(row.Tanggal).trim() === String(tanggal).trim();
        const matchSesi = !row.Sesi || String(row.Sesi).trim().toLowerCase() === String(sesi).trim().toLowerCase();
        return matchRoom && matchTgl && matchSesi;
      });
      result = { success: true, room: room, tanggal: tanggal, sesi: sesi, data: roomData, count: roomData.length };
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
 * - action: "updateRekapRow" (Update student row in specific date sheet)
 * - action: "batchSyncDate" (Bulk update for a specific date)
 * - action: "updateAssignment" (Upsert desk assignment and sync to session column)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
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
    } else if (action === "batchSyncDate") {
      response = handleBatchSyncDate(ss, body.tanggal, body.items || []);
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

  const values = sheet.getDataRange().getValues();
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

  sheet.getRange(targetRow, 9).insertCheckboxes();

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
  return { success: true, count: count };
}

/**
 * Upsert desk assignment into Data_Ruangan & cross-sync to date sheet Sesi column
 */
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

  // 1. Update Data_Ruangan
  const values = sheetRooms.getDataRange().getValues();
  let targetRow = -1;

  for (let i = 1; i < values.length; i++) {
    const rTgl = String(values[i][0]).trim();
    const rSesi = String(values[i][1]).trim();
    const rRuang = String(values[i][2]).trim();
    const rDesk = Number(values[i][3]);

    if (rTgl === tanggal && rSesi.toLowerCase() === sesi.toLowerCase() && rRuang.toLowerCase() === room.toLowerCase() && rDesk === deskNo) {
      targetRow = i + 1;
      break;
    }
  }

  const rowData = [
    tanggal,
    sesi,
    room,
    deskNo,
    namaPeserta,
    idLaptop,
    labelLaptop,
    pemilikLaptop,
    isReady ? "TRUE" : "FALSE",
    hasCharger ? "TRUE" : "FALSE",
    catatan,
    now
  ];

  if (targetRow > 0) {
    sheetRooms.getRange(targetRow, 1, 1, HEADERS_ROOMS.length).setValues([rowData]);
  } else {
    sheetRooms.appendRow(rowData);
  }

  // 2. Cross-sync to the date's Rekap sheet under the specific Sesi column
  if (pemilikLaptop) {
    const rCode = room.replace("Ruang ", "R");
    const deskText = deskNo ? "Meja " + deskNo : "Cadangan";
    
    const rekapUpdate = {
      tanggal: tanggal,
      nama: pemilikLaptop,
      ruangLaptop: rCode,
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
    tanggal: tanggal,
    sesi: sesi,
    room: room,
    deskNo: deskNo,
    idLaptop: idLaptop
  };
}

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
 * Ensure sheets exist for all 4 dates with correct headers, dropdown validations & conditional styling
 */
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
  const maxRows = 400;

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

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSetup(ss);
}
