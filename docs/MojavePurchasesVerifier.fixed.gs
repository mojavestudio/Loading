/****************************************************
 * Mojave Plugins — Purchases Verifier API (read-only)
 *
 * Current sheet headers (Row 1):
 * Client Name | Client Email | Paid At | Access Code | Plugin Name | Framer User ID | Event ID
 *
 * Required for verifier to work well:
 * Client Email | Access Code | Plugin Name | Framer User ID
 *
 * Supported plugin names (by convention):
 *   Grid | Globe | Particles | Loading | Ribbon
 ****************************************************/

// === CONFIG (edit these) ===
const SPREADSHEET_ID = '14eYZZtKF-k23Emp_rqMcFaEZ7rII576BQ-hvfCO7XFA';
const SHEET_NAME     = 'Purchases';

// Cache TTL (seconds) for GET verifier responses
const CACHE_SECONDS  = 300; // 5 minutes

// Supported plugin names (normalized)
const SUPPORTED_PLUGINS = ['grid', 'globe', 'particles', 'loading', 'ribbon'];

// Required exact headers (including Event ID)
const REQUIRED_HEADERS = [
  'Client Name',
  'Client Email',
  'Paid At',
  'Access Code',
  'Plugin Name',
  'Framer User ID',
  'Event ID'
];

/************** Utilities **************/

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getHeaderMap_(sh) {
  const lastCol = sh.getLastColumn();
  if (lastCol < 1) throw new Error('Sheet has no columns');
  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  header.forEach((h, i) => (map[norm(h)] = i + 1));
  return { map, header };
}

function isValidJsonpCallback_(callback) {
  // Only allow JS identifiers and dotted paths (e.g. foo, foo.bar, foo_bar.baz9)
  // Prevents JSONP injection via callback param.
  if (!callback) return false;
  return /^[a-zA-Z_$][0-9a-zA-Z_$]*(\.[a-zA-Z_$][0-9a-zA-Z_$]*)*$/.test(callback);
}

function respond_(obj, callback) {
  const cb = String(callback || '').trim();
  if (cb && isValidJsonpCallback_(cb)) {
    return ContentService.createTextOutput(
      `${cb}(${JSON.stringify(obj)});`
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const MEMO = {};
function getCache_(key) {
  if (MEMO[key]) return MEMO[key];
  const cache = CacheService.getScriptCache();
  const raw = cache.get(key);
  if (!raw) return null;
  const val = JSON.parse(raw);
  MEMO[key] = val;
  return val;
}
function putCache_(key, value, seconds) {
  MEMO[key] = value;
  CacheService.getScriptCache().put(key, JSON.stringify(value), seconds);
}

/************** Verifier + (Auto)Binder (GET only) **************/
/**
 * Query params:
 *   email=... (required)
 *   access_code=... (required)
 *   plugin=Grid|Globe|Particles|Loading|Ribbon (optional but recommended; narrows match)
 *   framer_user_id=... (optional)
 *   bind=1  (optional) → writes framer_user_id if empty
 *   nocache=1 (optional) → bypass cache
 *   callback=... (optional) → JSONP
 *
 * Sheet: Client Name | Client Email | Paid At | Access Code | Plugin Name | Framer User ID | Event ID
 */
function doGet(e) {
  const p   = e && e.parameter ? e.parameter : {};
  const cb  = (p.callback || '').trim();
  const email = String(p.email || '').trim().toLowerCase();
  const code  = String(p.access_code || '').trim();
  const fid   = String(p.framer_user_id || '').trim();
  const bind  = p.bind == '1';
  const noCache = p.nocache == '1';

  // Optional plugin hint (recommended): plugin or plugin_name
  const pluginReqRaw = String(p.plugin || p.plugin_name || '').trim();
  const pluginReq = pluginReqRaw ? norm(pluginReqRaw) : '';

  if (!email || !code) {
    return respond_({ ok: false, error: 'missing email or access_code' }, cb);
  }

  // Validate plugin parameter if provided
  if (pluginReq && !SUPPORTED_PLUGINS.includes(pluginReq)) {
    return respond_({
      ok: false,
      valid: false,
      bound: false,
      reason: 'unsupported_plugin',
      supported_plugins: ['Grid', 'Globe', 'Particles', 'Loading', 'Ribbon']
    }, cb);
  }

  let cacheKey = null;
  let lock = null;

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) return respond_({ ok: false, error: `Sheet "${SHEET_NAME}" not found` }, cb);

    const lastRow = sh.getLastRow();
    if (lastRow < 2) {
      return respond_({ ok: true, valid: false, bound: false, reason: 'not_found' }, cb);
    }

    const { map, header } = getHeaderMap_(sh);

    // Enforce exact visible headers in row 1 (including Event ID)
    const headerMismatch = REQUIRED_HEADERS.some((h, i) => header[i] !== h);
    if (headerMismatch || header.length !== REQUIRED_HEADERS.length) {
      return respond_(
        { ok: false, error: 'Sheet headers must exactly be: ' + REQUIRED_HEADERS.join(' | ') },
        cb
      );
    }

    const col = (name) => map[norm(name)] || 0;

    const cEmail   = col('Client Email');
    const cCode    = col('Access Code');
    const cPlugin  = col('Plugin Name');
    const cFuid    = col('Framer User ID');
    const cClient  = col('Client Name'); // used as "project_name" in responses

    if (!cEmail || !cCode) {
      return respond_(
        { ok: false, error: 'Expected "Client Email" and "Access Code" columns' },
        cb
      );
    }
    if (!cPlugin) {
      return respond_(
        { ok: false, error: 'Expected "Plugin Name" column' },
        cb
      );
    }
    if (!cFuid) {
      return respond_(
        { ok: false, error: 'Expected "Framer User ID" column' },
        cb
      );
    }

    const num = lastRow - 1;
    const emailVals   = sh.getRange(2, cEmail,  num, 1).getValues().flat();
    const codeVals    = sh.getRange(2, cCode,   num, 1).getValues().flat();
    const pluginVals  = sh.getRange(2, cPlugin, num, 1).getValues().flat();
    const fuidVals    = sh.getRange(2, cFuid,   num, 1).getValues().flat();
    const clientVals  = cClient ? sh.getRange(2, cClient, num, 1).getValues().flat() : null;

    // All rows that match email+code
    const emailCodeMatches = [];
    for (let i = 0; i < num; i++) {
      const rowEmail = String(emailVals[i] || '').trim().toLowerCase();
      const rowCode  = String(codeVals[i]  || '').trim();
      if (rowEmail === email && rowCode === code) {
        emailCodeMatches.push(i);
      }
    }

    if (emailCodeMatches.length === 0) {
      return respond_({ ok: true, valid: false, bound: false, reason: 'not_found' }, cb);
    }

    // If a plugin is specified, filter to that plugin; else keep all candidates
    let candidates = emailCodeMatches;
    if (pluginReq) {
      candidates = candidates.filter(i => norm(pluginVals[i]) === pluginReq);
      if (candidates.length === 0) {
        const firstIdx = emailCodeMatches[0];
        return respond_({
          ok: true,
          valid: false,
          bound: !!String(fuidVals[firstIdx] || '').trim(),
          reason: 'wrong_plugin',
          plugin_name_found: String(pluginVals[firstIdx] || '')
        }, cb);
      }
    }

    // Validate plugin names only on relevant rows (prevents unrelated rows from breaking verification)
    for (let k = 0; k < candidates.length; k++) {
      const i = candidates[k];
      const pNorm = norm(pluginVals[i]);
      if (pNorm && !SUPPORTED_PLUGINS.includes(pNorm)) {
        return respond_(
          {
            ok: false,
            error: 'Unsupported plugin name in sheet: "' + pluginVals[i] +
                   '". Supported: Grid, Globe, Particles, Loading, Ribbon.'
          },
          cb
        );
      }
    }

    // Prefer: (1) unbound, (2) already bound to this fid, (3) first candidate
    let idx = candidates.find(i => !String(fuidVals[i] || '').trim());
    if (idx === undefined) idx = candidates.find(i => String(fuidVals[i] || '').trim() === fid);
    if (idx === undefined) idx = candidates[0];

    const rowNumber      = idx + 2;
    const projectName    = clientVals ? clientVals[idx] : undefined; // mapped from "Client Name"
    const pluginNameNow  = String(pluginVals[idx] || '');
    const fuidNow        = String(fuidVals[idx] || '').trim();

    // Per-plugin cache (include plugin tag)
    if (!noCache && !bind) {
      const fidTag    = fid || 'noid';
      const pluginTag = pluginReq || norm(pluginNameNow) || 'any';
      cacheKey = `verify:${email}:${code}:${fidTag}:${pluginTag}`;
      const cached = getCache_(cacheKey);
      if (cached) return respond_(cached, cb);
    }

    const shouldAutoBind = !!fid && !fuidNow;

    if (shouldAutoBind) {
      lock = LockService.getScriptLock();
      lock.waitLock(5000);

      const fuidCell = sh.getRange(rowNumber, cFuid, 1, 1);
      const freshFuid = String(fuidCell.getValue() || '').trim();

      if (!freshFuid) {
        fuidCell.setValue(fid);
        return respond_({
          ok: true,
          valid: true,
          bound: true,
          project_name: projectName,
          action: 'auto_bound'
        }, cb);
      } else if (freshFuid === fid) {
        return respond_({
          ok: true,
          valid: true,
          bound: true,
          project_name: projectName,
          action: 'already_bound'
        }, cb);
      } else {
        return respond_({
          ok: true,
          valid: false,
          bound: true,
          reason: 'bound_to_other'
        }, cb);
      }
    }

    if (bind) {
      if (!fid) {
        return respond_(
          { ok: false, error: 'bind requested but framer_user_id missing' },
          cb
        );
      }

      lock = LockService.getScriptLock();
      lock.waitLock(5000);

      const fuidCell = sh.getRange(rowNumber, cFuid, 1, 1);
      const freshFuid = String(fuidCell.getValue() || '').trim();

      if (!freshFuid) {
        fuidCell.setValue(fid);
        return respond_({
          ok: true,
          valid: true,
          bound: true,
          project_name: projectName,
          action: 'bound'
        }, cb);
      } else if (freshFuid === fid) {
        return respond_({
          ok: true,
          valid: true,
          bound: true,
          project_name: projectName,
          action: 'already_bound'
        }, cb);
      } else {
        return respond_({
          ok: true,
          valid: false,
          bound: true,
          reason: 'bound_to_other'
        }, cb);
      }
    }

    // No bind requested — just verification + cache

    if (!fuidNow) {
      const res = {
        ok: true,
        valid: true,
        bound: false,
        project_name: projectName
      };
      if (cacheKey) putCache_(cacheKey, res, CACHE_SECONDS);
      return respond_(res, cb);
    }

    if (!fid) {
      const res = {
        ok: true,
        valid: false,
        bound: true,
        reason: 'bound_requires_user_id'
      };
      if (cacheKey) putCache_(cacheKey, res, CACHE_SECONDS);
      return respond_(res, cb);
    }

    if (fuidNow === fid) {
      const res = {
        ok: true,
        valid: true,
        bound: true,
        project_name: projectName,
        action: 'already_bound'
      };
      if (cacheKey) putCache_(cacheKey, res, CACHE_SECONDS);
      return respond_(res, cb);
    } else {
      const res = {
        ok: true,
        valid: false,
        bound: true,
        reason: 'bound_to_other'
      };
      if (cacheKey) putCache_(cacheKey, res, CACHE_SECONDS);
      return respond_(res, cb);
    }

  } catch (err) {
    return respond_(
      { ok: false, error: String(err) },
      (e && e.parameter && e.parameter.callback) || ''
    );
  } finally {
    try { if (lock) lock.releaseLock(); } catch (_) {}
  }
}
