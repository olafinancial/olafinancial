// ============================================================
// Pul Planning — ClearNumber workbook → Pul rows
// Pure mapping. No DOM, no network. Amounts in the payload are
// major units (naira, dollars, …). Rows are stored in minor
// units (kobo) to match income_entries, expense_entries, assets,
// liabilities, financial_goals, and emergency_fund.
//
// Enum values match migration align_check_constraints_006, which
// is already applied on the live Ola Financial project. Do not
// emit the pre-006 values that the database rejects (frequency
// "bi-weekly", institution_type "mmo", goal types outside the
// widened list).
// ============================================================

var WPClearNumberMap = (function () {
  var CURRENCIES = ['USD','NGN','EUR','GBP','AED','CNY','XOF','XAF','KES','GHS','CAD','ZAR','SAR','AUD'];

  var CONSTRAINTS = {
    income_type: ['active', 'passive', 'investment'],
    frequency: ['weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'one_time'],
    goal_type: ['retirement', 'mortgage', 'college', 'emergency', 'custom', 'debt', 'investment', 'travel', 'business', 'spend'],
    institution_type: ['dmb', 'mfb', 'psb', 'investment', 'other'],
    recurrence_freq: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual', 'custom'],
    employment_type: ['salaried', 'self_employed', 'business_owner', 'retired', 'student', 'other'],
    risk_tolerance: ['conservative', 'moderate', 'aggressive'],
    asset_type: ['alternative', 'commodities', 'crypto', 'currency', 'equity', 'fixed_deposit', 'forex', 'not_applicable', 'retirement_contribution', 'property', 'savings', 'vehicle', 'other'],
    liability_type: ['mortgage', 'personal_loan', 'auto_loan', 'credit_card', 'student_loan', 'qard_hasan', 'other'],
    expense_category: [
      'Communication', 'Dining Out', 'Education', 'Entertainment', 'Family Support',
      'Food', 'Gifts & Charity', 'Health', 'Housing', 'Insurance', 'Interest & Debt',
      'Investment', 'Land Use Act/Tenement Rate', 'Security', 'Shopping', 'Taxes',
      'Transportation', 'Utilities-Power Generation', 'Utilities-Refuse', 'Utilities-Water', 'Other',
    ],
  };

  var WANT_CATEGORIES = {
    'Dining Out': true,
    'Entertainment': true,
    'Shopping': true,
    'Gifts & Charity': true,
  };

  var INCOME_GENERATING = {
    equity: true,
    fixed_deposit: true,
    property: true,
    alternative: true,
    crypto: true,
    commodities: true,
    forex: true,
  };

  var SYMBOLS = {
    NGN: '₦', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
    AED: 'AED ', CNY: 'CN¥', XOF: 'CFA ', XAF: 'FCFA ', KES: 'KSh ',
    GHS: 'GH₵', ZAR: 'R ', SAR: 'SAR ',
  };

  function normKey(value) {
    return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function clip(value, max) {
    var s = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
    if (!s) return '';
    return s.length > max ? s.slice(0, max) : s;
  }

  function inList(list, value) {
    return list.indexOf(value) !== -1;
  }

  function toMinor(major) {
    var n = Number(major);
    if (!Number.isFinite(n) || n < 0 || n > 1e12) return null;
    return Math.round(n * 100);
  }

  function round4(n) {
    return Math.round(n * 10000) / 10000;
  }

  function formatMajor(minor, currency) {
    var n = Math.round(Number(minor) || 0) / 100;
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);
    var fixed = abs.toFixed(2).split('.');
    fixed[0] = fixed[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var digits = fixed[1] === '00' ? fixed[0] : fixed.join('.');
    return sign + (SYMBOLS[currency] || (currency + ' ')) + digits;
  }

  function withCurrency(notes, currency) {
    var cur = inList(CURRENCIES, currency) ? currency : 'NGN';
    var clean = String(notes || '').replace(/\[(USD|NGN|EUR|GBP|AED|CNY|XOF|XAF|KES|GHS|CAD|ZAR|SAR|AUD)\]/g, '').replace(/\s+/g, ' ').trim();
    return (clean ? clean + ' ' : '') + '[' + cur + ']';
  }

  function localToday(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function addYears(iso, years) {
    var parts = String(iso).split('-');
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var day = Number(parts[2]);
    var dt = new Date(Date.UTC(y + years, m - 1, day));
    return dt.toISOString().slice(0, 10);
  }

  function isBlank(value) {
    return value == null || String(value).trim() === '';
  }

  function validAge(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return null;
    n = Math.round(n);
    if (n < 1 || n > 119) return null;
    return n;
  }

  function validRetirementAge(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return null;
    n = Math.round(n);
    if (n < 18 || n > 100) return null;
    return n;
  }

  function normalizeCurrency(value) {
    var c = String(value || '').trim().toUpperCase();
    return inList(CURRENCIES, c) ? c : null;
  }

  function normalizeEmployment(value) {
    var key = normKey(value).replace(/-/g, ' ');
    var aliases = {
      salaried: 'salaried',
      salary: 'salaried',
      employed: 'salaried',
      'self employed': 'self_employed',
      self_employed: 'self_employed',
      'business owner': 'business_owner',
      business_owner: 'business_owner',
      business: 'business_owner',
      retired: 'retired',
      student: 'student',
      other: 'other',
    };
    return aliases[key] || null;
  }

  function normalizeRisk(value) {
    var key = normKey(value);
    if (key === 'balanced') return 'moderate';
    if (key === 'conservative' || key === 'moderate' || key === 'aggressive') return key;
    return null;
  }

  function normalizeIncomeType(value) {
    var key = normKey(value);
    if (key === 'active' || key === 'passive' || key === 'investment') return key;
    return null;
  }

  function normalizeAssetType(value) {
    var key = normKey(value).replace(/[_/]+/g, ' ');
    var aliases = {
      savings: 'savings',
      'savings account': 'savings',
      'fixed deposit': 'fixed_deposit',
      'fixed deposit t bill': 'fixed_deposit',
      'fixed deposit t-bill': 'fixed_deposit',
      't bill': 'fixed_deposit',
      tbill: 'fixed_deposit',
      'treasury bill': 'fixed_deposit',
      equities: 'equity',
      equity: 'equity',
      'equities etfs': 'equity',
      'equities stocks etfs': 'equity',
      etf: 'equity',
      etfs: 'equity',
      stocks: 'equity',
      stock: 'equity',
      rsa: 'retirement_contribution',
      pension: 'retirement_contribution',
      'retirement contribution': 'retirement_contribution',
      property: 'property',
      'real estate': 'property',
      crypto: 'crypto',
      vehicle: 'vehicle',
      car: 'vehicle',
      alternative: 'alternative',
      commodities: 'commodities',
      currency: 'currency',
      forex: 'forex',
      'not applicable': 'not_applicable',
    };
    if (aliases[key]) return aliases[key];
    var raw = String(value || '').trim();
    if (inList(CONSTRAINTS.asset_type, raw)) return raw;
    return 'other';
  }

  function normalizeInstitution(value) {
    if (value == null || String(value).trim() === '') return null;
    var key = normKey(value).replace(/[_-]+/g, ' ');
    // Live migration 006 rewrote mmo → psb. Never write "mmo".
    if (key === 'mmo' || key === 'psb' || key === 'mobile money' || key === 'mobile money operator') return 'psb';
    if (key === 'dmb' || key === 'commercial bank' || key === 'bank') return 'dmb';
    if (key === 'mfb' || key === 'microfinance') return 'mfb';
    if (key === 'investment' || key === 'broker') return 'investment';
    if (key === 'other') return 'other';
    if (inList(CONSTRAINTS.institution_type, String(value).trim())) return String(value).trim();
    return null;
  }

  function normalizeLiabilityType(value) {
    var key = normKey(value).replace(/[_-]+/g, ' ');
    var aliases = {
      mortgage: 'mortgage',
      'home loan': 'mortgage',
      'personal loan': 'personal_loan',
      personal_loan: 'personal_loan',
      'auto loan': 'auto_loan',
      auto_loan: 'auto_loan',
      auto: 'auto_loan',
      'car loan': 'auto_loan',
      vehicle: 'auto_loan',
      'credit card': 'credit_card',
      credit_card: 'credit_card',
      card: 'credit_card',
      'student loan': 'student_loan',
      student_loan: 'student_loan',
      'qard hasan': 'qard_hasan',
      qard_hasan: 'qard_hasan',
      other: 'other',
    };
    if (aliases[key]) return aliases[key];
    var raw = String(value || '').trim();
    if (inList(CONSTRAINTS.liability_type, raw)) return raw;
    return 'other';
  }

  function normalizeGoalType(value) {
    var key = normKey(value).replace(/[_-]+/g, ' ');
    var aliases = {
      retirement: 'retirement',
      'retirement savings': 'retirement',
      emergency: 'emergency',
      'emergency fund': 'emergency',
      mortgage: 'mortgage',
      home: 'mortgage',
      college: 'college',
      education: 'college',
      custom: 'custom',
      other: 'custom',
      debt: 'debt',
      'pay down debt': 'debt',
      investment: 'investment',
      travel: 'travel',
      business: 'business',
      spend: 'spend',
    };
    if (aliases[key]) return aliases[key];
    var raw = String(value || '').trim();
    if (inList(CONSTRAINTS.goal_type, raw)) return raw;
    return 'custom';
  }

  function normalizeCategory(value) {
    var raw = String(value || '').trim();
    var i;
    for (i = 0; i < CONSTRAINTS.expense_category.length; i++) {
      if (normKey(CONSTRAINTS.expense_category[i]) === normKey(raw)) return CONSTRAINTS.expense_category[i];
    }
    return null;
  }

  function percentValue(value, cap) {
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    // Values strictly between 0 and 1 are fractions (0.185 → 18.5%). 1 means 1%.
    if (n > 0 && n < 1) n = n * 100;
    n = round4(n);
    if (n > cap) return cap;
    return n;
  }

  function returnPercent(value) {
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    if (n > 0 && n <= 1) n = n * 100;
    n = round4(n);
    if (n > 50) return 50;
    return n;
  }

  function makeSet(names) {
    var set = {};
    (names || []).forEach(function (name) {
      var key = normKey(name);
      if (key) set[key] = 'existing';
    });
    return set;
  }

  /** 'new' | 'existing' | 'repeat' | 'invalid' */
  function reserve(set, name) {
    var key = normKey(name);
    if (!key) return 'invalid';
    if (set[key] === 'existing') return 'existing';
    if (set[key]) return 'repeat';
    set[key] = 'new';
    return 'new';
  }

  function skipReason(code) {
    if (code === 'repeat') return 'Repeated in this workbook';
    if (code === 'invalid') return 'Name is missing';
    return 'Already in your plan';
  }

  function line(section, label, detail, skip, reason, row) {
    return {
      section: section,
      label: label,
      detail: detail,
      skip: !!skip,
      reason: skip ? (reason || 'Already in your plan') : '',
      row: row || null,
    };
  }

  function importUrl(code) {
    var clean = String(code || '').trim();
    return 'https://pul.llc/#/import?code=' + encodeURIComponent(clean);
  }

  // Shared with ClearNumber. CN- plus 8 characters. 0/O and 1/I are
  // left out so a number read aloud cannot be confused. Spaces and
  // extra hyphens are ignored. A one-time handoff code does not match.
  var CLIENT_NUMBER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function normalizeClientNumber(value) {
    var compact = String(value == null ? '' : value).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^CN[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(compact)) return null;
    return 'CN-' + compact.slice(2);
  }

  function clientNumberFromPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    var top = normalizeClientNumber(payload.client_number);
    if (top) return top;
    var profile = payload.profile;
    if (profile && typeof profile === 'object') return normalizeClientNumber(profile.client_number);
    return null;
  }

  function emptyPlan(currency, warnings, error) {
    return {
      error: error || null,
      currency: currency || 'NGN',
      profilePatch: {},
      profileLines: [],
      inserts: { income: [], expenses: [], assets: [], liabilities: [], goals: [] },
      emergencyFund: null,
      fiLocal: null,
      warnings: warnings || [],
    };
  }

  function mapPayload(raw, options) {
    var opts = options || {};
    var existing = opts.existing || {};
    var profile = existing.profile || null;
    var warnings = [];
    var payload = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};

    if (payload.schema_version != null && Number(payload.schema_version) !== 1) {
      return emptyPlan('NGN', ['schema_version must be 1.'], 'This workbook uses a format Pul does not recognise yet.');
    }

    var srcProfile = (payload.profile && typeof payload.profile === 'object') ? payload.profile : {};
    var pension = (payload.pension && typeof payload.pension === 'object') ? payload.pension : {};
    var targets = (payload.targets && typeof payload.targets === 'object') ? payload.targets : {};

    var currency = normalizeCurrency(srcProfile.currency) || 'NGN';
    if (srcProfile.currency && !normalizeCurrency(srcProfile.currency)) {
      warnings.push('Currency was not recognised, so amounts are tagged NGN.');
    }

    var today = opts.today || localToday();
    var period = opts.period || (String(today).slice(0, 7) + '-01');

    var profilePatch = {};
    var profileLines = [];
    var done = !!(profile && profile.onboarding_done);

    var incomingName = clip(srcProfile.full_name, 120);
    if (incomingName) {
      if (isBlank(profile && profile.full_name)) {
        profilePatch.full_name = incomingName;
        profileLines.push(line('Profile', 'Full name', incomingName, false));
      } else {
        profileLines.push(line('Profile', 'Full name', 'Keeping ' + profile.full_name, true, 'Already on your account'));
      }
    }

    var age = validAge(srcProfile.age);
    if (srcProfile.age != null && srcProfile.age !== '' && age == null) {
      warnings.push('Age was ignored because it is outside 1–119.');
    }
    if (age != null) {
      if (!profile || profile.age == null) {
        profilePatch.age = age;
        profileLines.push(line('Profile', 'Age', String(age), false));
      } else {
        profileLines.push(line('Profile', 'Age', 'Keeping ' + profile.age, true, 'Already on your account'));
      }
    }

    var state = clip(srcProfile.state, 80);
    if (state) {
      if (isBlank(profile && profile.state)) {
        profilePatch.state = state;
        profileLines.push(line('Profile', 'State', state, false));
      } else {
        profileLines.push(line('Profile', 'State', 'Keeping ' + profile.state, true, 'Already on your account'));
      }
    }

    var requestedCurrency = normalizeCurrency(srcProfile.currency);
    if (requestedCurrency) {
      var currentCurrency = profile && profile.currency;
      if (!done && currentCurrency !== requestedCurrency) {
        profilePatch.currency = requestedCurrency;
        profileLines.push(line('Profile', 'Base currency', requestedCurrency, false));
      } else if (done && currentCurrency && currentCurrency !== requestedCurrency) {
        profileLines.push(line('Profile', 'Base currency', 'Keeping ' + currentCurrency, true, 'Already on your account'));
      }
    }

    var employment = normalizeEmployment(srcProfile.employment_type);
    if (srcProfile.employment_type && !employment) {
      warnings.push('Employment type was ignored because it is not one of the account options.');
    }
    if (employment) {
      if (!profile || profile.employment_type == null) {
        profilePatch.employment_type = employment;
        profileLines.push(line('Profile', 'Employment', employment.replace(/_/g, ' '), false));
      } else {
        profileLines.push(line('Profile', 'Employment', 'Keeping ' + String(profile.employment_type).replace(/_/g, ' '), true, 'Already on your account'));
      }
    }

    var risk = normalizeRisk(srcProfile.risk_tolerance);
    if (risk) {
      if (!profile || profile.risk_tolerance == null) {
        profilePatch.risk_tolerance = risk;
        profileLines.push(line('Profile', 'Risk profile', risk, false));
      } else {
        profileLines.push(line('Profile', 'Risk profile', 'Keeping ' + profile.risk_tolerance, true, 'Already on your account'));
      }
    }

    var retirementAge = validRetirementAge(
      srcProfile.retirement_age != null && srcProfile.retirement_age !== ''
        ? srcProfile.retirement_age
        : pension.retirement_age
    );
    if ((srcProfile.retirement_age != null && srcProfile.retirement_age !== '' && validRetirementAge(srcProfile.retirement_age) == null)
      || (srcProfile.retirement_age == null && pension.retirement_age != null && pension.retirement_age !== '' && retirementAge == null)) {
      warnings.push('Retirement age was ignored because it is outside 18–100.');
    }
    if (retirementAge != null) {
      if (!done) {
        if (!profile || profile.retirement_age !== retirementAge) profilePatch.retirement_age = retirementAge;
        profileLines.push(line('Profile', 'Retirement age', String(retirementAge), false));
      } else {
        profileLines.push(line('Profile', 'Retirement age', 'Keeping ' + (profile.retirement_age || 60), true, 'Already on your account'));
      }
    }

    var resolvedName = profilePatch.full_name || (profile && profile.full_name);
    var resolvedAge = profilePatch.age != null ? profilePatch.age : (profile && profile.age);
    if (!done && resolvedName && resolvedAge) {
      profilePatch.onboarding_done = true;
      profileLines.push(line('Profile', 'Setup', 'Mark setup complete and open the dashboard', false));
    }

    var incomeNames = makeSet(existing.incomeNames);
    var assetNames = makeSet(existing.assetNames);
    var liabilityNames = makeSet(existing.liabilityNames);
    var goalNames = makeSet(existing.goalNames);
    var expenseKeys = {};
    (existing.expenses || []).forEach(function (e) {
      [e && e.category, e && e.description].forEach(function (part) {
        var key = normKey(part);
        if (key) expenseKeys[key] = 'existing';
      });
    });

    var income = [];
    var incomeSrc = (payload.income && typeof payload.income === 'object') ? payload.income : null;
    var grossSource = null;
    if (incomeSrc && incomeSrc.gross_monthly != null && incomeSrc.gross_monthly !== '') grossSource = incomeSrc.gross_monthly;
    else if (pension.monthly_gross != null && pension.monthly_gross !== '') grossSource = pension.monthly_gross;
    if (grossSource != null) {
      var grossMinor = toMinor(grossSource);
      if (grossMinor == null) warnings.push('Income amount was ignored because it was not a valid number.');
      else if (grossMinor === 0) warnings.push('Income was skipped because gross pay is zero.');
      else {
        var sourceName = clip((incomeSrc && incomeSrc.source_name) || 'Salary', 120) || 'Salary';
        var pensionMinor = 0;
        if (incomeSrc && incomeSrc.pension_monthly != null && incomeSrc.pension_monthly !== '') {
          var parsedPension = toMinor(incomeSrc.pension_monthly);
          if (parsedPension == null) warnings.push('Pension deduction was ignored because it was not a valid number.');
          else pensionMinor = parsedPension;
        }
        if (pensionMinor > grossMinor) {
          warnings.push('Pension deduction was capped at gross pay.');
          pensionMinor = grossMinor;
        }
        var paye = 0;
        if (incomeSrc && incomeSrc.net_monthly != null && incomeSrc.net_monthly !== '') {
          var netMinor = toMinor(incomeSrc.net_monthly);
          if (netMinor == null) warnings.push('Net pay was ignored because it was not a valid number.');
          else {
            paye = grossMinor - pensionMinor - netMinor;
            if (paye < 0) {
              paye = 0;
              warnings.push('Net pay is higher than gross minus pension, so tax was left at zero.');
            }
          }
        }
        var incomeType = (incomeSrc && normalizeIncomeType(incomeSrc.income_type)) || 'active';
        var incomeRow = {
          income_type: incomeType,
          source_name: sourceName,
          gross_amount: grossMinor,
          frequency: 'monthly',
          paye_tax: paye,
          pension_contrib: pensionMinor,
          nhf_contrib: 0,
          other_deductions: 0,
          period_month: period,
          is_active: true,
          deduction_notes: 'Imported from ClearNumber',
          notes: withCurrency('', currency),
        };
        var incomeCode = reserve(incomeNames, sourceName);
        var incomeSkip = incomeCode !== 'new';
        var netShown = grossMinor - paye - pensionMinor;
        income.push(line(
          'Income',
          sourceName,
          formatMajor(grossMinor, currency) + ' gross / month · pension ' + formatMajor(pensionMinor, currency) + ' · tax ' + formatMajor(paye, currency) + ' · net ' + formatMajor(netShown, currency),
          incomeSkip,
          skipReason(incomeCode),
          incomeRow
        ));
      }
    }

    var expenseGroups = {};
    var expenseOrder = [];
    var expenseList = Array.isArray(payload.expenses) ? payload.expenses : [];
    expenseList.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var amountSource = item.amount_monthly != null ? item.amount_monthly : item.amount;
      var minor = toMinor(amountSource);
      if (minor == null) {
        warnings.push('An expense was ignored because the amount was not a valid number.');
        return;
      }
      if (minor === 0) return;
      var canonical = normalizeCategory(item.category);
      var original = clip(item.category, 80) || 'Other';
      var category = canonical || 'Other';
      var label = canonical || original;
      var key = canonical ? normKey(canonical) : ('other:' + normKey(original));
      if (!expenseGroups[key]) {
        expenseGroups[key] = {
          key: key,
          category: category,
          label: label,
          sub_category: canonical ? null : original,
          minor: 0,
          discretionary: !!WANT_CATEGORIES[category],
        };
        expenseOrder.push(key);
      }
      expenseGroups[key].minor += minor;
    });

    var expenses = expenseOrder.map(function (key) {
      var g = expenseGroups[key];
      var description = g.label;
      var expenseCode = g.sub_category
        ? (expenseKeys[normKey(g.label)] ? (expenseKeys[normKey(g.label)] === 'existing' ? 'existing' : 'repeat') : 'new')
        : (expenseKeys[normKey(g.category)] || expenseKeys[normKey(g.label)]
          ? ((expenseKeys[normKey(g.category)] === 'existing' || expenseKeys[normKey(g.label)] === 'existing') ? 'existing' : 'repeat')
          : 'new');
      if (expenseCode === 'new') expenseKeys[normKey(g.label)] = 'new';
      var expenseSkip = expenseCode !== 'new';
      var row = {
        expense_date: today,
        amount: g.minor,
        category: g.category,
        description: withCurrency('[freq:monthly] ' + description, currency),
        is_discretionary: g.discretionary,
        is_recurring: true,
        recurrence_freq: 'monthly',
      };
      if (g.sub_category) row.sub_category = g.sub_category;
      return line(
        'Expenses',
        g.label,
        formatMajor(g.minor, currency) + ' / month · ' + g.category + (g.discretionary ? ' · want' : ' · need'),
        expenseSkip,
        skipReason(expenseCode),
        row
      );
    });

    var assets = [];
    var emergencyMinor = 0;
    var emergencyName = '';
    var emergencyInstitution = null;
    var sawRetirementAsset = false;
    var assetList = Array.isArray(payload.assets) ? payload.assets : [];
    assetList.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var minor = toMinor(item.balance != null ? item.balance : item.amount);
      if (minor == null) {
        warnings.push('An asset was ignored because the balance was not a valid number.');
        return;
      }
      if (minor === 0) return;
      var assetType = normalizeAssetType(item.asset_type || item.type || item.name);
      if (assetType === 'retirement_contribution') sawRetirementAsset = true;
      var name = clip(item.name || item.asset_name, 120);
      if (!name) {
        if (assetType === 'savings') name = 'Savings Account';
        else if (assetType === 'fixed_deposit') name = 'Fixed Deposit / T-Bill';
        else if (assetType === 'equity') name = 'Equities / ETFs';
        else if (assetType === 'retirement_contribution') name = 'RSA';
        else name = 'Asset';
      }
      var notes = '';
      if (item.is_emergency_fund) {
        notes = '[Emergency Fund]';
        emergencyMinor += minor;
        if (!emergencyName) emergencyName = name;
        if (!emergencyInstitution) emergencyInstitution = clip(item.institution_name, 120) || null;
      }
      var rate = null;
      if (item.interest_rate != null && item.interest_rate !== '') {
        rate = percentValue(item.interest_rate, 200);
        if (rate == null) warnings.push('An asset interest rate was ignored.');
      }
      var institution = normalizeInstitution(item.institution_type);
      if (item.institution_type && institution == null && String(item.institution_type).trim() !== '') {
        warnings.push('An institution type was left blank because it is not dmb, mfb, psb, investment, or other.');
      }
      var row = {
        asset_name: name,
        asset_type: assetType,
        is_income_generating: !!INCOME_GENERATING[assetType],
        open_balance: minor,
        close_balance: minor,
        period_month: period,
        notes: withCurrency(notes, currency),
      };
      if (institution) row.institution_type = institution;
      var instName = clip(item.institution_name, 120);
      if (instName) row.institution_name = instName;
      if (rate != null) row.interest_rate = rate;
      var assetCode = reserve(assetNames, name);
      var assetSkip = assetCode !== 'new';
      var detail = formatMajor(minor, currency) + ' · ' + assetType.replace(/_/g, ' ');
      if (item.is_emergency_fund) detail += ' · emergency fund';
      assets.push(line('Assets', name, detail, assetSkip, skipReason(assetCode), row));
    });

    var rsaMinor = toMinor(pension.rsa_balance);
    if (pension.rsa_balance != null && pension.rsa_balance !== '' && rsaMinor == null) {
      warnings.push('RSA balance was ignored because it was not a valid number.');
    }
    var contribMinor = toMinor(pension.rsa_contribution_monthly);
    if (pension.rsa_contribution_monthly != null && pension.rsa_contribution_monthly !== '' && contribMinor == null) {
      warnings.push('RSA contribution was ignored because it was not a valid number.');
    }
    if (!sawRetirementAsset && ((rsaMinor && rsaMinor > 0) || (contribMinor && contribMinor > 0))) {
      var pfa = clip(pension.pfa_name, 120);
      var rsaName = pfa ? ('RSA (' + pfa + ')') : 'RSA';
      var rsaNotes = '[sub:rsa]';
      if (contribMinor && contribMinor > 0) rsaNotes += ' [rsa_contrib_monthly:' + contribMinor + ']';
      var rsaRow = {
        asset_name: rsaName,
        asset_type: 'retirement_contribution',
        is_income_generating: false,
        open_balance: rsaMinor || 0,
        close_balance: rsaMinor || 0,
        period_month: period,
        notes: withCurrency(rsaNotes, currency),
      };
      if (pfa) rsaRow.pfa_name = pfa;
      var rsaCode = reserve(assetNames, rsaName);
      var rsaSkip = rsaCode !== 'new';
      var rsaDetail = formatMajor(rsaMinor || 0, currency);
      if (contribMinor) rsaDetail += ' · ' + formatMajor(contribMinor, currency) + ' / month contribution';
      if (pfa) rsaDetail += ' · ' + pfa;
      assets.push(line('Assets', rsaName, rsaDetail, rsaSkip, skipReason(rsaCode), rsaRow));
    }

    var liabilities = [];
    var debtList = Array.isArray(payload.debts) ? payload.debts : (Array.isArray(payload.liabilities) ? payload.liabilities : []);
    debtList.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var minor = toMinor(item.balance != null ? item.balance : item.amount);
      if (minor == null) {
        warnings.push('A debt was ignored because the balance was not a valid number.');
        return;
      }
      if (minor === 0) return;
      var liabilityType = normalizeLiabilityType(item.liability_type || item.type);
      var name = clip(item.name || item.liability_name, 120);
      if (!name) name = liabilityType.replace(/_/g, ' ');
      var apr = 0;
      if (item.apr != null && item.apr !== '') {
        var parsedApr = percentValue(item.apr, 200);
        if (parsedApr == null) warnings.push('A debt APR was ignored.');
        else apr = parsedApr;
      }
      if (liabilityType === 'qard_hasan') apr = 0;
      var payment = 0;
      if (item.monthly_payment != null && item.monthly_payment !== '') {
        var parsedPay = toMinor(item.monthly_payment);
        if (parsedPay == null) warnings.push('A debt payment was ignored.');
        else payment = parsedPay;
      }
      var row = {
        liability_name: name,
        liability_type: liabilityType,
        is_interest_bearing: liabilityType !== 'qard_hasan' && apr > 0,
        open_balance: minor,
        close_balance: minor,
        original_amount: minor,
        apr: apr,
        monthly_payment: payment,
        period_month: period,
        notes: withCurrency('', currency),
      };
      var lender = clip(item.lender_name || item.lender, 120);
      if (lender) row.lender_name = lender;
      var debtCode = reserve(liabilityNames, name);
      var debtSkip = debtCode !== 'new';
      var detail = formatMajor(minor, currency) + ' · ' + liabilityType.replace(/_/g, ' ');
      if (apr > 0) detail += ' · ' + apr + '% APR';
      if (payment > 0) detail += ' · ' + formatMajor(payment, currency) + ' / month';
      liabilities.push(line('Debts', name, detail, debtSkip, skipReason(debtCode), row));
    });

    var goals = [];
    function pushGoal(name, goalType, targetMajor, currentMajor, monthlyMajor, when, returnPct) {
      var targetMinor = toMinor(targetMajor);
      if (targetMinor == null || targetMinor <= 0) return;
      var currentMinor = toMinor(currentMajor);
      if (currentMinor == null) currentMinor = 0;
      var monthlyMinor = toMinor(monthlyMajor);
      if (monthlyMinor == null) monthlyMinor = 0;
      var goalName = clip(name, 120) || 'Goal';
      var row = {
        goal_name: goalName,
        goal_type: goalType,
        target_amount: targetMinor,
        target_date: when,
        current_savings: currentMinor,
        monthly_contribution: monthlyMinor,
        notes: withCurrency('', currency),
      };
      if (returnPct != null) row.expected_return_rate = round4(returnPct / 100);
      var goalCode = reserve(goalNames, goalName);
      var goalSkip = goalCode !== 'new';
      goals.push(line(
        'Goals',
        goalName,
        'Target ' + formatMajor(targetMinor, currency) + ' · saved ' + formatMajor(currentMinor, currency) + ' · by ' + when,
        goalSkip,
        skipReason(goalCode),
        row
      ));
    }

    var explicitGoals = Array.isArray(payload.goals) ? payload.goals : [];
    explicitGoals.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var goalType = normalizeGoalType(item.goal_type || item.type || item.goal_name);
      var when = item.target_date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(when || ''))) {
        when = goalType === 'retirement'
          ? addYears(today, Math.max(1, (retirementAge || 60) - (age || (profile && profile.age) || 35)))
          : addYears(today, 1);
      }
      pushGoal(
        item.goal_name || item.name,
        goalType,
        item.target_amount != null ? item.target_amount : item.target,
        item.current_savings,
        item.monthly_contribution,
        when,
        item.expected_return_percent != null ? returnPercent(item.expected_return_percent) : null
      );
    });

    var efTarget = toMinor(targets.emergency_fund_target);
    if (targets.emergency_fund_target != null && targets.emergency_fund_target !== '' && (efTarget == null || efTarget <= 0)) {
      warnings.push('Emergency fund target was ignored because it was not a positive number.');
    }
    if (efTarget && efTarget > 0) {
      pushGoal('Emergency Fund', 'emergency', efTarget / 100, emergencyMinor / 100, 0, addYears(today, 1), null);
    }

    var retTarget = toMinor(targets.retirement_target);
    if (targets.retirement_target != null && targets.retirement_target !== '' && (retTarget == null || retTarget <= 0)) {
      warnings.push('Retirement target was ignored because it was not a positive number.');
    }
    var returnPct = targets.expected_return_percent != null && targets.expected_return_percent !== ''
      ? returnPercent(targets.expected_return_percent)
      : null;
    if (targets.expected_return_percent != null && targets.expected_return_percent !== '' && returnPct == null) {
      warnings.push('Expected return was ignored.');
    }
    if (returnPct != null && Number(targets.expected_return_percent) > 50 && Number(targets.expected_return_percent) > 1) {
      warnings.push('Expected return was capped at 50% per year.');
    }
    var savingsMajor = targets.monthly_savings;
    if (retTarget && retTarget > 0) {
      var years = Math.max(1, (retirementAge || (profile && profile.retirement_age) || 60) - (resolvedAge || age || 35));
      pushGoal('Retirement Savings', 'retirement', retTarget / 100, (rsaMinor || 0) / 100, savingsMajor, addYears(today, years), returnPct);
    }

    var emergencyFund = null;
    if (emergencyMinor > 0) {
      var ef = existing.emergencyFund;
      var existingBal = ef && ef.current_balance != null ? Number(ef.current_balance) : null;
      var action = 'insert';
      var efSkip = false;
      var efReason = '';
      if (ef && existingBal > 0) {
        action = 'skip';
        efSkip = true;
        efReason = 'Already in your plan';
      } else if (ef) {
        action = 'update';
      }
      emergencyFund = {
        action: action,
        id: ef && ef.id ? ef.id : null,
        label: 'Emergency fund balance',
        detail: formatMajor(emergencyMinor, currency) + (emergencyName ? ' · ' + emergencyName : ''),
        skip: efSkip,
        reason: efReason,
        row: {
          current_balance: emergencyMinor,
          account_name: emergencyName || 'Emergency fund',
          institution_name: emergencyInstitution,
        },
      };
    }

    var addedExpenseMinor = expenses.reduce(function (sum, item) {
      return sum + (item.skip ? 0 : item.row.amount);
    }, 0);
    var addedAssetMinor = assets.reduce(function (sum, item) {
      return sum + (item.skip ? 0 : (item.row.close_balance || 0));
    }, 0);
    var fiExpenses = toMinor(targets.monthly_expenses);
    var fiPortfolio = toMinor(targets.fi_portfolio);
    var fiSavings = toMinor(targets.monthly_savings);
    var fiExpenseMajor = fiExpenses && fiExpenses > 0 ? fiExpenses / 100 : addedExpenseMinor / 100;
    var fiPortfolioMajor = fiPortfolio && fiPortfolio > 0 ? fiPortfolio / 100 : addedAssetMinor / 100;
    var fiSavingsMajor = fiSavings && fiSavings > 0 ? fiSavings / 100 : 0;
    var fiLocal = null;
    if (fiExpenseMajor > 0 || fiPortfolioMajor > 0 || fiSavingsMajor > 0) {
      // A saved calculator on this device is replaced with the workbook
      // figures when the person confirms. Other device keys are not touched.
      var fiDetail = 'Expenses ' + formatMajor(Math.round(fiExpenseMajor * 100), currency)
        + ' / month · portfolio ' + formatMajor(Math.round(fiPortfolioMajor * 100), currency)
        + ' · savings ' + formatMajor(Math.round(fiSavingsMajor * 100), currency) + ' / month';
      if (existing.fiSaved) fiDetail += '. Replaces the numbers saved on this device';
      fiLocal = {
        write: true,
        skip: false,
        reason: '',
        label: 'FI Calculator',
        detail: fiDetail,
        payload: {
          expenses: fiExpenseMajor,
          passive: 0,
          dividends: 0,
          rentals: 0,
          pensions: 0,
          otherPassive: 0,
          portfolio: fiPortfolioMajor,
          returnRate: returnPct != null ? returnPct : 9,
          monthlySavings: fiSavingsMajor,
        },
      };
    }

    return {
      error: null,
      currency: currency,
      profilePatch: profilePatch,
      profileLines: profileLines,
      inserts: {
        income: income,
        expenses: expenses,
        assets: assets,
        liabilities: liabilities,
        goals: goals,
      },
      emergencyFund: emergencyFund,
      fiLocal: fiLocal,
      warnings: warnings,
    };
  }

  return {
    CONSTRAINTS: CONSTRAINTS,
    CURRENCIES: CURRENCIES,
    mapPayload: mapPayload,
    importUrl: importUrl,
    CLIENT_NUMBER_ALPHABET: CLIENT_NUMBER_ALPHABET,
    normalizeClientNumber: normalizeClientNumber,
    clientNumberFromPayload: clientNumberFromPayload,
    toMinor: toMinor,
    normalizeInstitution: normalizeInstitution,
    normalizeGoalType: normalizeGoalType,
    normalizeAssetType: normalizeAssetType,
    normalizeLiabilityType: normalizeLiabilityType,
    normalizeCategory: normalizeCategory,
  };
})();
