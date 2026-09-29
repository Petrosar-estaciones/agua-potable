/**
 * Partes de agua potable — backend en Google Sheets + Drive
 * Pegar este código en Extensiones > Apps Script de la planilla.
 */

// Cambiá esta clave. La misma se ingresa una sola vez en la app del celular.
const CLAVE = 'cambiar-esta-clave';

const HOJA = 'Partes';
const CARPETA = 'Partes agua potable - fotos';
const TZ = 'America/Argentina/Buenos_Aires';
const COLS = ['ID', 'N° parte', 'Fecha', 'Día', 'Litros', 'Destino', 'Recibe / firma', 'Foto', 'Foto ID', 'Cargado', 'Actualizado'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Ejecutar una vez a mano: crea la hoja y la carpeta de fotos y pide los permisos. */
function setup() {
  hoja_();
  carpeta_();
}

function hoja_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) {
    sh = ss.insertSheet(HOJA);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS])
      .setFontWeight('bold').setBackground('#FDD849');
    sh.setFrozenRows(1);
    sh.getRange('A:B').setNumberFormat('@');
    sh.getRange('C:C').setNumberFormat('dd/mm/yyyy');
    sh.getRange('E:E').setNumberFormat('#,##0');
  }
  return sh;
}

function carpeta_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CARPETA_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* se borró: se crea de nuevo */ }
  }
  const f = DriveApp.createFolder(CARPETA);
  props.setProperty('CARPETA_ID', f.getId());
  return f;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fechaIso_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const s = String(v || '');
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
}

function aDate_(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

function leer_() {
  const sh = hoja_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, COLS.length).getValues()
    .filter(r => r[0] !== '')
    .map(r => ({
      id: String(r[0]),
      numero: String(r[1]),
      fecha: fechaIso_(r[2]),
      dia: r[3],
      litros: Number(r[4]) || 0,
      destino: r[5],
      recibe: r[6],
      fotoId: r[8] || null,
    }));
}

function filaDe_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return -1;
  const ids = sh.getRange(2, 1, n, 1).getValues().map(r => String(r[0]));
  const i = ids.indexOf(String(id));
  return i < 0 ? -1 : i + 2;
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.clave !== CLAVE) return json_({ ok: false, error: 'clave' });
  return json_({ ok: true, partes: leer_() });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'formato' }); }
  if (req.clave !== CLAVE) return json_({ ok: false, error: 'clave' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (req.accion === 'guardar') return json_(guardar_(req));
    if (req.accion === 'borrar') return json_(borrar_(req));
    return json_({ ok: false, error: 'accion' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function guardar_(req) {
  const sh = hoja_();
  const p = req.parte || {};
  const id = String(p.numero || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(p.fecha || '')) return { ok: false, error: 'datos' };
  const numero = id.padStart(8, '0');

  let fila = filaDe_(sh, id);
  const anterior = req.idAnterior && String(req.idAnterior) !== id ? filaDe_(sh, req.idAnterior) : -1;
  const filaPrevia = fila > 0 ? fila : anterior;
  const prev = filaPrevia > 0 ? sh.getRange(filaPrevia, 1, 1, COLS.length).getValues()[0] : null;

  let fotoId = p.fotoId || null;
  let fotoUrl = prev ? prev[7] : '';
  if (req.foto) {
    const blob = Utilities.newBlob(Utilities.base64Decode(req.foto), 'image/jpeg', `parte_${numero}_${p.fecha}.jpg`);
    const file = carpeta_().createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    if (prev && prev[8] && prev[8] !== file.getId()) {
      try { DriveApp.getFileById(prev[8]).setTrashed(true); } catch (e) {}
    }
    fotoId = file.getId();
    fotoUrl = file.getUrl();
  } else if (!fotoId && prev && prev[8]) {
    // se quitó la foto en la app
    try { DriveApp.getFileById(prev[8]).setTrashed(true); } catch (e) {}
    fotoUrl = '';
  }

  const ahora = new Date();
  const fecha = aDate_(p.fecha);
  const fila_ = [
    id, numero, fecha, DIAS[fecha.getDay()], Number(p.litros) || 0,
    p.destino || '', p.recibe || '', fotoUrl || '', fotoId || '',
    prev ? prev[9] : ahora, ahora,
  ];

  if (fila > 0) {
    sh.getRange(fila, 1, 1, COLS.length).setValues([fila_]);
    if (anterior > 0) sh.deleteRow(anterior);
  } else if (anterior > 0) {
    sh.getRange(anterior, 1, 1, COLS.length).setValues([fila_]);
  } else {
    sh.appendRow(fila_);
  }
  return { ok: true };
}

function borrar_(req) {
  const sh = hoja_();
  const fila = filaDe_(sh, req.id);
  if (fila < 0) return { ok: true };
  const fotoId = sh.getRange(fila, 9).getValue();
  if (fotoId) { try { DriveApp.getFileById(fotoId).setTrashed(true); } catch (e) {} }
  sh.deleteRow(fila);
  return { ok: true };
}
