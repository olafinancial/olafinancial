/**
 * ClearNumber → Pul Planning
 * Paste into the ClearNumber workbook. Call with the workbook payload
 * (docs/clearnumber-payload.example.json). Amounts are major units.
 * The redirect contains only a one-time code.
 *
 * The key below is Pul's public publishable key (js/config.js).
 * It is not the service role key.
 */
async function continueInPulPlanning(payload) {
  var SUPABASE_URL = 'https://kwymfdbvfzexhckuaorh.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_i_muV01vzwnLzYvaiU6RCg_JV0-qcD6';
  var res = await fetch(SUPABASE_URL + '/rest/v1/rpc/create_clearnumber_handoff', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ p_payload: payload }),
  });
  var data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.message || data.error || res.statusText);
  }
  location.assign(data.redirect_url);
}
