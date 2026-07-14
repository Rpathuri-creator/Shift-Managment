var sheetName = 'Shifts';
var scriptProp = PropertiesService.getScriptProperties();

function initialSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('key', ss.getId());
}

// ─── COLUMN LOOKUP ──────────────────────────────────────────────────────────
// Finds a column by its header text in row 1 (case-insensitive, trimmed).
// Returns 0-based index into a header row array, or -1 if not found.
function findColumnIndex(headerRow, name) {
  const target = name.trim().toLowerCase();
  for (let i = 0; i < headerRow.length; i++) {
    if (String(headerRow[i] || '').trim().toLowerCase() === target) return i;
  }
  return -1;
}

// Returns the 1-based column number for a header, creating it at the end of
// the header row if it doesn't already exist. Mutates headerRow in place so
// repeated calls within the same request see columns already created.
function getOrCreateColumn(sheet, headerRow, name) {
  const idx = findColumnIndex(headerRow, name);
  if (idx !== -1) return idx + 1;

  const newCol = headerRow.length + 1;
  sheet.getRange(1, newCol).setValue(name);
  headerRow.push(name);
  return newCol;
}

function getHeaderRow(sheet) {
  const lastCol = sheet.getLastColumn();
  return lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
}

// Parses a balance cell that may be a real number OR text like "$1,234.56"
// (parseFloat alone returns NaN/truncates on a leading "$", which silently
// reads as 0 and creates a fake difference against the other balance).
function parseAmount(raw) {
  if (raw === '' || raw === null || typeof raw === 'undefined') return 0;
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw).replace(/[^0-9.\-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function columnToLetter(col) {
  let letter = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

// ─── GET ────────────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));

    // Return employees with hourly rates + role
    if (e.parameter.action === 'getEmployees') {
      const sheet = doc.getSheetByName('Employee');
      if (!sheet) return createResponse({ employees: [] });
      const rows = sheet.getDataRange().getValues().slice(1);
      // Columns: 0=Name, 1=HourlyRate, 2=StartDate, 3=Username, 4=Password, 5=Role
      const employees = rows
        .filter(r => r[0])
        .map(r => ({
          name:       String(r[0]).trim(),
          hourlyRate: parseFloat(r[1]) || 0,
          username:   String(r[3] || '').trim(),
          role:       String(r[5] || 'Employee').trim()
        }));
      return createResponse({ employees });
    }

    // Default: return shifts (optionally filtered by year + month)
    const sheet = doc.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() === 0) return createResponse({ shifts: [] });

    const rows = sheet.getDataRange().getValues();
    const [headerRow, ...data] = rows;

    const dailyBalanceCol   = findColumnIndex(headerRow, 'Daily Balance');
    const countedBalanceCol = findColumnIndex(headerRow, 'Counted Balance');
    const differenceCol     = findColumnIndex(headerRow, 'Difference');
    const reasonCol         = findColumnIndex(headerRow, 'Reason');

    // Diagnostic: visible in the Apps Script "Executions" log — shows exactly
    // which sheet column each field resolved to (or MISSING if not found).
    Logger.log(
      'Column map — Daily Balance: %s, Counted Balance: %s, Difference: %s, Reason: %s',
      dailyBalanceCol   !== -1 ? columnToLetter(dailyBalanceCol + 1)   : 'MISSING',
      countedBalanceCol !== -1 ? columnToLetter(countedBalanceCol + 1) : 'MISSING',
      differenceCol     !== -1 ? columnToLetter(differenceCol + 1)    : 'MISSING',
      reasonCol         !== -1 ? columnToLetter(reasonCol + 1)        : 'MISSING'
    );

    const filterYear  = e.parameter.year  ? parseInt(e.parameter.year)  : null;
    const filterMonth = e.parameter.month ? parseInt(e.parameter.month) : null;

    const shifts = data
      .map((r, index) => ({
        employee:  r[0] || '',
        date: typeof r[1] === 'object' && r[1] instanceof Date
          ? Utilities.formatDate(r[1], Session.getScriptTimeZone(), 'yyyy-MM-dd')
          : (r[1] || ''),
        startTime: typeof r[2] === 'object' && r[2] instanceof Date
          ? Utilities.formatDate(r[2], Session.getScriptTimeZone(), 'HH:mm')
          : (r[2] || ''),
        endTime: typeof r[3] === 'object' && r[3] instanceof Date
          ? Utilities.formatDate(r[3], Session.getScriptTimeZone(), 'HH:mm')
          : (r[3] || ''),
        notes:          r[12] || '',
        dailyBalance:   dailyBalanceCol   !== -1 ? parseAmount(r[dailyBalanceCol])   : 0,
        countedBalance: countedBalanceCol !== -1 ? parseAmount(r[countedBalanceCol]) : 0,
        // Always derived from the two balances rather than trusted from the
        // sheet's Difference cell — that cell can be stale, blank on old rows,
        // or (if "Difference" pre-existed for an unrelated purpose) contain
        // numbers that have nothing to do with cash reconciliation at all.
        difference: (countedBalanceCol !== -1 ? parseAmount(r[countedBalanceCol]) : 0)
                  - (dailyBalanceCol   !== -1 ? parseAmount(r[dailyBalanceCol])   : 0),
        reason:         reasonCol         !== -1 ? (r[reasonCol] || '') : '',
        rowIndex:       index + 2
      }))
      .filter(s => {
        if (!filterYear || !filterMonth || !s.date) return true;
        const [y, m] = s.date.split('-').map(Number);
        return y === filterYear && m === filterMonth;
      });

    return createResponse({ shifts });
  } catch (err) {
    return createResponse({ result: 'error', message: err.toString() });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    // Handle login before anything else
    if (e.parameter.action === 'login') {
      return handleLogin(e);
    }

    if (e.parameter.action === 'updateDeposit') {
      return handleUpdateDeposit(e);
    }

    const method = e.parameter.method || 'POST';
    switch (method.toUpperCase()) {
      case 'PUT':    return handleUpdateShift(e);
      case 'DELETE': return handleDeleteShift(e);
      case 'POST':
      default:       return handleCreateShift(e);
    }
  } catch (err) {
    return createResponse({ result: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doOptions(e) {
  return createResponse({});
}

// ─── LOGIN ──────────────────────────────────────────────────────────────────
function handleLogin(e) {
  const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
  const sheet = doc.getSheetByName('Employee');
  if (!sheet) return createResponse({ success: false, message: 'Employee sheet not found' });

  const rows = sheet.getDataRange().getValues().slice(1); // skip header
  // Columns: 0=Name, 1=HourlyRate, 2=StartDate, 3=Username, 4=Password, 5=Role
  const match = rows.find(r =>
    String(r[3]).trim() === e.parameter.username &&
    String(r[4]).trim() === e.parameter.password
  );

  if (match) {
    return createResponse({
      success:  true,
      username: String(match[3]).trim(),
      role:     String(match[5] || 'Employee').trim(),
      name:     String(match[0]).trim(),
      payRate:  parseFloat(match[1]) || 0
    });
  }

  return createResponse({ success: false, message: 'Invalid username or password' });
}

// ─── SHIFT CRUD ─────────────────────────────────────────────────────────────
function handleCreateShift(e) {
  try {
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    const sheet = doc.getSheetByName(sheetName) || doc.insertSheet(sheetName);

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1).setValue('Employee');
      sheet.getRange(1, 2).setValue('Date');
      sheet.getRange(1, 3).setValue('Start Time');
      sheet.getRange(1, 4).setValue('End Time');
      sheet.getRange(1, 13).setValue('Notes');
    }

    const headerRow = getHeaderRow(sheet);
    const dailyBalanceCol   = getOrCreateColumn(sheet, headerRow, 'Daily Balance');
    const countedBalanceCol = getOrCreateColumn(sheet, headerRow, 'Counted Balance');
    const differenceCol     = getOrCreateColumn(sheet, headerRow, 'Difference');
    const reasonCol         = getOrCreateColumn(sheet, headerRow, 'Reason');

    const nextRow = sheet.getLastRow() + 1;
    const dailyBalance   = parseFloat(e.parameter.dailyBalance) || 0;
    const countedBalance = parseFloat(e.parameter.countedBalance) || 0;

    sheet.getRange(nextRow, 1).setValue(e.parameter.employee  || '').setNumberFormat('@STRING@');
    sheet.getRange(nextRow, 2).setValue(e.parameter.date      || '').setNumberFormat('@STRING@');
    sheet.getRange(nextRow, 3).setValue(e.parameter.startTime || '').setNumberFormat('@STRING@');
    sheet.getRange(nextRow, 4).setValue(e.parameter.endTime   || '').setNumberFormat('@STRING@');
    sheet.getRange(nextRow, 13).setValue(e.parameter.notes    || '').setNumberFormat('@STRING@');
    sheet.getRange(nextRow, dailyBalanceCol).setValue(dailyBalance);
    sheet.getRange(nextRow, countedBalanceCol).setValue(countedBalance);
    sheet.getRange(nextRow, differenceCol).setValue(countedBalance - dailyBalance);
    sheet.getRange(nextRow, reasonCol).setValue(e.parameter.reason || '').setNumberFormat('@STRING@');

    return createResponse({ result: 'success', rowIndex: nextRow });
  } catch (err) {
    return createResponse({ result: 'error', message: err.toString() });
  }
}

function handleUpdateShift(e) {
  try {
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    const sheet = doc.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found');

    const rowIndex = parseInt(e.parameter.rowIndex);
    if (!rowIndex || rowIndex < 2) throw new Error('Invalid row index');

    const headerRow = getHeaderRow(sheet);
    const dailyBalanceCol   = getOrCreateColumn(sheet, headerRow, 'Daily Balance');
    const countedBalanceCol = getOrCreateColumn(sheet, headerRow, 'Counted Balance');
    const differenceCol     = getOrCreateColumn(sheet, headerRow, 'Difference');
    const reasonCol         = getOrCreateColumn(sheet, headerRow, 'Reason');

    sheet.getRange(rowIndex, 1).setValue(e.parameter.employee  || '').setNumberFormat('@STRING@');
    sheet.getRange(rowIndex, 2).setValue(e.parameter.date      || '').setNumberFormat('@STRING@');
    sheet.getRange(rowIndex, 3).setValue(e.parameter.startTime || '').setNumberFormat('@STRING@');
    sheet.getRange(rowIndex, 4).setValue(e.parameter.endTime   || '').setNumberFormat('@STRING@');
    sheet.getRange(rowIndex, 13).setValue(e.parameter.notes    || '').setNumberFormat('@STRING@');

    const dailyBalance   = parseFloat(e.parameter.dailyBalance) || 0;
    const countedBalance = parseFloat(e.parameter.countedBalance) || 0;
    sheet.getRange(rowIndex, dailyBalanceCol).setValue(dailyBalance);
    sheet.getRange(rowIndex, countedBalanceCol).setValue(countedBalance);
    sheet.getRange(rowIndex, differenceCol).setValue(countedBalance - dailyBalance);
    sheet.getRange(rowIndex, reasonCol).setValue(e.parameter.reason || '').setNumberFormat('@STRING@');

    return createResponse({ result: 'success' });
  } catch (err) {
    return createResponse({ result: 'error', message: err.toString() });
  }
}

function handleUpdateDeposit(e) {
  try {
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    const sheet = doc.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found');

    const rowIndex = parseInt(e.parameter.rowIndex);
    if (!rowIndex || rowIndex < 2) throw new Error('Invalid row index');

    const headerRow = getHeaderRow(sheet);
    const dailyBalanceCol   = getOrCreateColumn(sheet, headerRow, 'Daily Balance');
    const countedBalanceCol = getOrCreateColumn(sheet, headerRow, 'Counted Balance');
    const differenceCol     = getOrCreateColumn(sheet, headerRow, 'Difference');
    const reasonCol         = getOrCreateColumn(sheet, headerRow, 'Reason');

    const dailyBalance   = parseFloat(e.parameter.dailyBalance) || 0;
    const countedBalance = parseFloat(e.parameter.countedBalance) || 0;
    sheet.getRange(rowIndex, dailyBalanceCol).setValue(dailyBalance);
    sheet.getRange(rowIndex, countedBalanceCol).setValue(countedBalance);
    sheet.getRange(rowIndex, differenceCol).setValue(countedBalance - dailyBalance);
    sheet.getRange(rowIndex, reasonCol).setValue(e.parameter.reason || '').setNumberFormat('@STRING@');

    return createResponse({ result: 'success' });
  } catch (err) {
    return createResponse({ result: 'error', message: err.toString() });
  }
}

function handleDeleteShift(e) {
  try {
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    const sheet = doc.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found');

    const rowIndex = parseInt(e.parameter.rowIndex);
    if (!rowIndex || rowIndex < 2) throw new Error('Invalid row index');

    sheet.deleteRow(rowIndex);
    return createResponse({ result: 'success' });
  } catch (err) {
    return createResponse({ result: 'error', message: err.toString() });
  }
}

// ─── HELPER ─────────────────────────────────────────────────────────────────
function createResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
