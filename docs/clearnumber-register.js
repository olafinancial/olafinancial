/**
 * ClearNumber ↔ Pul Planning shared Client / Student ID.
 * Paste beside docs/clearnumber-continue.js.
 *
 * lookupClearNumber("cn k7m2pq") and registerClearNumber(id, payload)
 * use the same canonical form Pul stores (CN-XXXXXX).
 * The key below is Pul's public publishable key (js/config.js).
 * It is not the service role key.
 * Call these from https://clearnumber.kaluaja.org (or localhost).
 */
var PUL_SUPABASE_URL = 'https://kwymfdbvfzexhckuaorh.supabase.co';
var PUL_SUPABASE_ANON_KEY = 'sb_publishable_i_muV01vzwnLzYvaiU6RCg_JV0-qcD6';

async function pulRpc(name, body) {
  var res = await fetch(PUL_SUPABASE_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: PUL_SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + PUL_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body || {}),
  });
  var data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.message || data.error || res.statusText);
  }
  return data;
}

function lookupClearNumber(clientNumber) {
  return pulRpc('lookup_client_number', { p_number: clientNumber });
}

function registerClearNumber(clientNumber, payload) {
  return pulRpc('register_clearnumber_record', {
    p_client_number: clientNumber,
    p_payload: payload,
  });
}
