// ============================================================
// Pul Planning — shared Client / Student ID
// The same number on Pul Planning and ClearNumber.
// Canonical form: CN- plus 6 characters from the alphabet below
// (no 0, O, 1, or I). Lookup strips case, spaces, and hyphens,
// then requires CN and exactly those 6 characters.
// docs/client-number.md is the contract ClearNumber mirrors.
// No DOM required for canonical(). mountPullForm needs document.
// ============================================================

var WPClearNumberId = (function () {
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var BODY = 6;
  var PULL_BUTTON_LABEL = 'Input your ClearNumber # here';
  var SHARED_NOTE = 'This same number works on Pul Planning and ClearNumber.';
  var NUMBER_KEY = 'wp_clearnumber_number';
  var NUMBER_PENDING_KEY = 'wp_clearnumber_number_pending';
  var CANONICAL = new RegExp('^CN-[' + ALPHABET + ']{' + BODY + '}$');
  var COMPACT = new RegExp('^CN[' + ALPHABET + ']{' + BODY + '}$');

  function canonical(value) {
    var raw = String(value == null ? '' : value).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!COMPACT.test(raw)) return null;
    return 'CN-' + raw.slice(2);
  }

  function lookupKey(value) {
    var formatted = canonical(value);
    return formatted ? formatted.replace('-', '') : null;
  }

  function readSession(key) {
    try { return sessionStorage.getItem(key) || ''; }
    catch (e) { return ''; }
  }

  function writeSession(key, value) {
    try { sessionStorage.setItem(key, value); return true; }
    catch (e) { return false; }
  }

  function removeSession(key) {
    try { sessionStorage.removeItem(key); }
    catch (e) { /* ignore */ }
  }

  /** Keep a ClearNumber # from #/import?number= or ?cn= across sign-in. */
  function captureFromHash() {
    var hash = '';
    try { hash = (window.location && window.location.hash) || ''; }
    catch (e) { return null; }
    var q = hash.indexOf('?');
    if (q === -1) return null;
    var params;
    try { params = new URLSearchParams(hash.slice(q + 1)); }
    catch (e) { return null; }
    var formatted = canonical(params.get('number') || params.get('cn') || '');
    if (!formatted) return null;
    writeSession(NUMBER_KEY, formatted);
    writeSession(NUMBER_PENDING_KEY, '1');
    return formatted;
  }

  function readStoredNumber() {
    captureFromHash();
    return canonical(readSession(NUMBER_KEY));
  }

  function rememberNumber(number) {
    var formatted = canonical(number);
    if (!formatted) return null;
    writeSession(NUMBER_KEY, formatted);
    writeSession(NUMBER_PENDING_KEY, '1');
    return formatted;
  }

  function clearPending() {
    removeSession(NUMBER_PENDING_KEY);
  }

  function clearStoredNumber() {
    removeSession(NUMBER_KEY);
    removeSession(NUMBER_PENDING_KEY);
  }

  function numberPending() {
    return readSession(NUMBER_PENDING_KEY) === '1' && !!canonical(readSession(NUMBER_KEY));
  }

  function adoptProfile(result) {
    if (!result || !canonical(result.client_number)) return null;
    var formatted = canonical(result.client_number);
    if (typeof WPApp === 'undefined' || !WPApp.state) return formatted;
    if (!WPApp.state.profile) WPApp.state.profile = {};
    WPApp.state.profile.client_number = formatted;
    if (result.source === 'generated' || result.source === 'claimed') {
      WPApp.state.profile.client_number_source = result.source;
    }
    return formatted;
  }

  function recognitionMessage(result) {
    var formatted = result && canonical(result.client_number);
    if (!formatted) return 'That ClearNumber # could not be linked.';
    var lead = result.status === 'already_linked'
      ? formatted + ' is already your Client / Student ID.'
      : formatted + ' is now your Client / Student ID.';
    var extra = result.has_workbook
      ? ''
      : ' No ClearNumber workbook is stored for it yet.';
    return lead + ' ' + SHARED_NOTE + extra;
  }

  /**
   * Workbook in hand: open the import preview.
   * ID only: tell the person the number is linked and stay put.
   */
  function finishPull(result) {
    var formatted = adoptProfile(result);
    if (result && result.has_workbook && formatted) {
      rememberNumber(formatted);
      if (typeof WPRouter !== 'undefined' && typeof WPRouter.navigate === 'function') {
        WPRouter.navigate('/import', true);
      }
      return { opened: true, client_number: formatted };
    }
    var message = recognitionMessage(result);
    if (typeof WPToast !== 'undefined' && typeof WPToast.success === 'function') {
      WPToast.success(message, 8000);
    }
    return { opened: false, client_number: formatted, message: message };
  }

  function fallbackCopy(text) {
    if (typeof document === 'undefined' || !document.createElement) return false;
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); }
    catch (e) { ok = false; }
    area.remove();
    return !!ok;
  }

  function copyText(value) {
    var formatted = canonical(value);
    if (!formatted) return Promise.resolve(false);
    var clipboard = (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText)
      ? navigator.clipboard.writeText(formatted)
      : null;
    if (clipboard && typeof clipboard.then === 'function') {
      return clipboard.then(function () { return true; }).catch(function () {
        return fallbackCopy(formatted);
      });
    }
    return Promise.resolve(fallbackCopy(formatted));
  }

  function showError(node, message) {
    if (!node) return;
    node.textContent = message || '';
    node.style.display = message ? 'block' : 'none';
  }

  /**
   * Button + field labelled "Input your ClearNumber # here".
   * Signed-out visitors keep the number and go to sign-in.
   * Signed-in visitors call pull_clearnumber_number.
   */
  function mountPullForm(host, options) {
    if (!host || typeof document === 'undefined') return null;
    var opts = options || {};
    var inputId = opts.inputId || 'cn-number-input';
    host.innerHTML = '';

    var wrap = document.createElement('div');
    var label = document.createElement('label');
    label.setAttribute('for', inputId);
    label.textContent = 'ClearNumber #';

    var input = document.createElement('input');
    input.className = 'input';
    input.id = inputId;
    input.type = 'text';
    input.placeholder = 'CN-XXXXXX';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'ClearNumber number');
    input.style.margin = '0.4rem 0 0.75rem';
    input.style.textTransform = 'uppercase';
    if (opts.value) input.value = String(opts.value);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary';
    button.id = opts.buttonId || 'cn-number-submit';
    button.style.width = '100%';
    button.textContent = PULL_BUTTON_LABEL;

    var hint = null;
    if (opts.note !== false) {
      hint = document.createElement('p');
      hint.className = 'input-hint';
      hint.style.marginTop = '0.75rem';
      hint.textContent = SHARED_NOTE;
    }

    var error = document.createElement('div');
    error.className = 'text-sm';
    error.style.display = 'none';
    error.style.color = 'var(--clr-danger)';
    error.style.marginTop = '0.75rem';
    error.setAttribute('role', 'alert');

    wrap.appendChild(label);
    wrap.appendChild(input);
    wrap.appendChild(button);
    if (hint) wrap.appendChild(hint);
    wrap.appendChild(error);
    host.appendChild(wrap);

    async function submit() {
      var formatted = canonical(input.value);
      if (!formatted) {
        showError(error, 'Enter a Client / Student ID like CN-K7M2PQ. This is the ClearNumber #, not the one-time import link.');
        if (typeof input.focus === 'function') input.focus();
        return;
      }
      showError(error, '');
      button.disabled = true;
      var previous = button.textContent;
      button.textContent = 'Linking…';
      try {
        var signedIn = typeof WPApp !== 'undefined' && WPApp.state && WPApp.state.user;
        if (!signedIn) {
          rememberNumber(formatted);
          if (typeof WPRouter !== 'undefined' && typeof WPRouter.navigate === 'function') {
            WPRouter.navigate('/login');
          }
          return;
        }
        if (typeof WPDb === 'undefined' || typeof WPDb.pullClearNumber !== 'function') {
          throw new Error('Could not link that ClearNumber #.');
        }
        var result = await WPDb.pullClearNumber(formatted);
        adoptProfile(result);
        if (typeof opts.onResult === 'function') opts.onResult(result);
        else finishPull(result);
      } catch (err) {
        var explained = (typeof WPImport !== 'undefined' && typeof WPImport.explainRpc === 'function')
          ? WPImport.explainRpc(err)
          : null;
        showError(error, (explained && explained.message) || 'Could not link that ClearNumber #. Please try again.');
      } finally {
        button.disabled = false;
        button.textContent = previous;
      }
    }

    button.addEventListener('click', function () { submit(); });
    input.addEventListener('keydown', function (event) {
      if (event && event.key === 'Enter') {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        submit();
      }
    });

    return { input: input, button: button, error: error, submit: submit };
  }

  return {
    ALPHABET: ALPHABET,
    BODY: BODY,
    PULL_BUTTON_LABEL: PULL_BUTTON_LABEL,
    SHARED_NOTE: SHARED_NOTE,
    NUMBER_KEY: NUMBER_KEY,
    NUMBER_PENDING_KEY: NUMBER_PENDING_KEY,
    CANONICAL: CANONICAL,
    canonical: canonical,
    lookupKey: lookupKey,
    captureFromHash: captureFromHash,
    readStoredNumber: readStoredNumber,
    rememberNumber: rememberNumber,
    clearPending: clearPending,
    clearStoredNumber: clearStoredNumber,
    numberPending: numberPending,
    adoptProfile: adoptProfile,
    recognitionMessage: recognitionMessage,
    finishPull: finishPull,
    copyText: copyText,
    mountPullForm: mountPullForm,
  };
})();
