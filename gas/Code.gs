/**
 * TKA 2026 - Central Laptop Assignment & Room Layout Synchronization
 * Google Apps Script Web App Backend
 * 
 * Target Sheet Name: Data_Ruangan
 * Columns: [Ruang, NoMeja, Sesi1, Sesi2, Sesi3, IdLaptop, LabelLaptop, PemilikLaptop, IsReady, HasCharger, Catatan, LastUpdated]
 * Target Sheet Name: Laptops_Inventory
 * Columns: [IdLaptop, LabelLaptop, PemilikLaptop, IsReady, HasCharger, AssignedRoom, AssignedDesk, Catatan, LastUpdated]
 */

const SHEET_ROOMS = "Data_Ruangan";
const SHEET_LAPTOPS = "Laptops_Inventory";

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
 * - ?action=getRoom&room=Ruang%201
 * - ?action=getAllSummary
 * - ?action=getInventory
 * - ?action=ping
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "getAllSummary";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSetup(ss);

    let result = {};

    if (action === "ping") {
      result = { success: true, message: "PONG", timestamp: new Date().toISOString() };
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
 * - action: "updateAssignment" (Upsert desk assignment & update laptop status)
 * - action: "batchUpdate" (Multiple desk upserts in a single lock)
 * - action: "upsertLaptop" (Add/update laptop in inventory)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 15 seconds to acquire lock, avoiding write collision across 11 proctors
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

    if (action === "updateAssignment") {
      response = handleUpdateAssignment(ss, body);
    } else if (action === "batchUpdate") {
      response = handleBatchUpdate(ss, body.items || []);
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
 * Upsert a single desk assignment
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
  const catatan = String(payload.catatan || "").trim();
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
      targetRow = i + 1; // 1-indexed
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
    // Retain existing session names if not provided in payload
    if (!sesi1 && values[targetRow - 1][2]) rowData[2] = values[targetRow - 1][2];
    if (!sesi2 && values[targetRow - 1][3]) rowData[3] = values[targetRow - 1][3];
    if (!sesi3 && values[targetRow - 1][4]) rowData[4] = values[targetRow - 1][4];

    sheetRooms.getRange(targetRow, 1, 1, HEADERS_ROOMS.length).setValues([rowData]);
  } else {
    sheetRooms.appendRow(rowData);
  }

  // 2. Sync to Laptops_Inventory if laptop exists
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
 * Handle batch updates in a single execution
 */
function handleBatchUpdate(ss, items) {
  let updatedCount = 0;
  for (let i = 0; i < items.length; i++) {
    handleUpdateAssignment(ss, items[i]);
    updatedCount++;
  }
  return { success: true, count: updatedCount };
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

/**
 * Add or update laptop directly in inventory
 */
function handleUpsertLaptop(ss, payload) {
  const sheetLaptops = ss.getSheetByName(SHEET_LAPTOPS);
  syncLaptopInventory(sheetLaptops, payload);
  return { success: true, idLaptop: payload.idLaptop };
}

/**
 * Ensure sheets exist with correct headers
 */
function ensureSetup(ss) {
  let sRooms = ss.getSheetByName(SHEET_ROOMS);
  if (!sRooms) {
    sRooms = ss.insertSheet(SHEET_ROOMS);
    sRooms.appendRow(HEADERS_ROOMS);
    sRooms.getRange(1, 1, 1, HEADERS_ROOMS.length).setFontWeight("bold").setBackground("#e2e8f0");
    sRooms.setFrozenRows(1);
  }

  let sLaptops = ss.getSheetByName(SHEET_LAPTOPS);
  if (!sLaptops) {
    sLaptops = ss.insertSheet(SHEET_LAPTOPS);
    sLaptops.appendRow(HEADERS_LAPTOPS);
    sLaptops.getRange(1, 1, 1, HEADERS_LAPTOPS.length).setFontWeight("bold").setBackground("#e2e8f0");
    sLaptops.setFrozenRows(1);
  }
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
