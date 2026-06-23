-- ============================================================
-- OlaFinancial — Seed / Reference Data
-- Migration 003
-- ============================================================

-- NOTE: These are reference tables (NOT user-specific, no RLS needed)

-- ============================================================
-- NIGERIAN STATES
-- ============================================================
CREATE TABLE IF NOT EXISTS ref_nigerian_states (
  code  TEXT PRIMARY KEY,
  name  TEXT NOT NULL
);

INSERT INTO ref_nigerian_states (code, name) VALUES
  ('AB','Abia'), ('AD','Adamawa'), ('AK','Akwa Ibom'), ('AN','Anambra'),
  ('BA','Bauchi'), ('BY','Bayelsa'), ('BE','Benue'), ('BO','Borno'),
  ('CR','Cross River'), ('DE','Delta'), ('EB','Ebonyi'), ('ED','Edo'),
  ('EK','Ekiti'), ('EN','Enugu'), ('GO','Gombe'), ('IM','Imo'),
  ('JI','Jigawa'), ('KD','Kaduna'), ('KN','Kano'), ('KT','Katsina'),
  ('KE','Kebbi'), ('KO','Kogi'), ('KW','Kwara'), ('LA','Lagos'),
  ('NA','Nasarawa'), ('NI','Niger'), ('OG','Ogun'), ('ON','Ondo'),
  ('OS','Osun'), ('OY','Oyo'), ('PL','Plateau'), ('RI','Rivers'),
  ('SO','Sokoto'), ('TA','Taraba'), ('YO','Yobe'), ('ZA','Zamfara'),
  ('FC','FCT — Abuja')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS ref_expense_categories (
  id            SERIAL PRIMARY KEY,
  category      TEXT NOT NULL,
  sub_category  TEXT NOT NULL,
  is_discretionary_default BOOLEAN DEFAULT FALSE,
  UNIQUE(category, sub_category)
);

INSERT INTO ref_expense_categories (category, sub_category, is_discretionary_default) VALUES
  -- Housing (non-discretionary)
  ('Housing','Rent / Mortgage', FALSE),
  ('Housing','Power Supply (Generator / Electricity)', FALSE),
  ('Housing','Water', FALSE),
  ('Housing','Waste Disposal', FALSE),
  ('Housing','Household Staff Salaries', FALSE),
  ('Housing','Repairs & Maintenance', FALSE),
  -- Transportation
  ('Transportation','Auto Fuel', FALSE),
  ('Transportation','Auto Maintenance', FALSE),
  ('Transportation','Auto Licenses & Taxes', FALSE),
  ('Transportation','Auto Insurance', FALSE),
  ('Transportation','Taxi / Ride-hailing', FALSE),
  ('Transportation','Public Transport', FALSE),
  -- Education
  ('Education','School Fees (Children)', FALSE),
  ('Education','Tuition (Self)', FALSE),
  ('Education','Books & Materials', FALSE),
  ('Education','Exam Fees', FALSE),
  -- Communication
  ('Communication','Phone Bill / Data', FALSE),
  ('Communication','Internet / WiFi', FALSE),
  ('Communication','Other Subscriptions', TRUE),
  -- Interest & Debt
  ('Interest & Debt','Commercial Loan Repayments', FALSE),
  ('Interest & Debt','Personal Loan Repayments', FALSE),
  ('Interest & Debt','Credit Card Repayments', FALSE),
  ('Interest & Debt','Staff Loan Repayments', FALSE),
  ('Interest & Debt','Other Interest Payments', FALSE),
  -- Insurance
  ('Insurance','Health Insurance', FALSE),
  ('Insurance','Life Insurance', FALSE),
  ('Insurance','Home Insurance', FALSE),
  ('Insurance','Vehicle Insurance', FALSE),
  -- Family Support
  ('Family Support','Child Support', FALSE),
  ('Family Support','Childcare', FALSE),
  ('Family Support','Dependent Support', FALSE),
  -- Shopping (discretionary)
  ('Shopping','Clothing & Jewellery', TRUE),
  ('Shopping','Household Goods', FALSE),
  ('Shopping','Electronics', TRUE),
  -- Entertainment (discretionary)
  ('Entertainment','Movies, Concerts & Events', TRUE),
  ('Entertainment','Holidays & Travel', TRUE),
  ('Entertainment','Dining Out', TRUE),
  ('Entertainment','Sports & Recreation', TRUE),
  -- Gifts & Charity
  ('Gifts & Charity','Gifts', TRUE),
  ('Gifts & Charity','Charitable Donations', TRUE),
  ('Gifts & Charity','Sponsorships', TRUE),
  -- Taxes
  ('Taxes','State Taxes (PAYE)', FALSE),
  ('Taxes','Federal Taxes (Self-Employed)', FALSE),
  ('Taxes','Business Taxes', FALSE),
  -- Health
  ('Health','Medical Bills', FALSE),
  ('Health','Pharmacy / Medications', FALSE),
  -- Food
  ('Food','Groceries', FALSE),
  ('Food','Dining Out', TRUE),
  -- Other
  ('Other','Miscellaneous', TRUE)
ON CONFLICT (category, sub_category) DO NOTHING;

-- ============================================================
-- PENCOM-LICENSED PENSION FUND ADMINISTRATORS
-- ============================================================
CREATE TABLE IF NOT EXISTS ref_pfas (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

INSERT INTO ref_pfas (name) VALUES
  ('ARM Pension Managers Ltd'),
  ('AXA Mansard Pension Ltd'),
  ('Crusader Sterling Pensions Ltd'),
  ('FCMB Pensions Ltd'),
  ('Fidelity Pension Managers Ltd'),
  ('First Guarantee Pension Ltd'),
  ('Investment One Pension Managers Ltd'),
  ('Leadway Pensure PFA Ltd'),
  ('NPF Pensions Ltd'),
  ('OAK Pensions Ltd'),
  ('Pensions Alliance Ltd (PAL)'),
  ('Premium Pension Ltd'),
  ('Radix Pension Managers Ltd'),
  ('Stanbic IBTC Pension Managers Ltd'),
  ('Tangerine APT Pensions Ltd'),
  ('Trustfund Pensions Ltd'),
  ('Veritas Glanvills Pensions Ltd'),
  ('Zenith Pensions Custodian Ltd')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- NIGERIAN BANKS (for institution reference)
-- ============================================================
CREATE TABLE IF NOT EXISTS ref_banks (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  type  TEXT CHECK (type IN ('dmb','mfb','psb','other')) DEFAULT 'dmb',
  ndic_coverage BIGINT DEFAULT 500000000  -- ₦5,000,000 in kobo for DMBs
);

INSERT INTO ref_banks (name, type, ndic_coverage) VALUES
  ('Access Bank', 'dmb', 500000000),
  ('Citibank Nigeria', 'dmb', 500000000),
  ('Ecobank Nigeria', 'dmb', 500000000),
  ('Fidelity Bank', 'dmb', 500000000),
  ('First Bank of Nigeria', 'dmb', 500000000),
  ('First City Monument Bank (FCMB)', 'dmb', 500000000),
  ('Globus Bank', 'dmb', 500000000),
  ('Guaranty Trust Bank (GTBank)', 'dmb', 500000000),
  ('Heritage Bank', 'dmb', 500000000),
  ('Keystone Bank', 'dmb', 500000000),
  ('Parallex Bank', 'dmb', 500000000),
  ('Polaris Bank', 'dmb', 500000000),
  ('Providus Bank', 'dmb', 500000000),
  ('Stanbic IBTC Bank', 'dmb', 500000000),
  ('Standard Chartered Bank', 'dmb', 500000000),
  ('Sterling Bank', 'dmb', 500000000),
  ('SunTrust Bank', 'dmb', 500000000),
  ('Titan Trust Bank', 'dmb', 500000000),
  ('Union Bank of Nigeria', 'dmb', 500000000),
  ('United Bank for Africa (UBA)', 'dmb', 500000000),
  ('Unity Bank', 'dmb', 500000000),
  ('Wema Bank', 'dmb', 500000000),
  ('Zenith Bank', 'dmb', 500000000),
  -- Neobanks / Fintechs
  ('Kuda Bank', 'mfb', 200000000),
  ('Opay', 'psb', 200000000),
  ('PalmPay', 'psb', 200000000),
  ('Moniepoint', 'mfb', 200000000),
  ('Carbon', 'mfb', 200000000),
  ('VFD Microfinance Bank', 'mfb', 200000000),
  ('Other', 'other', 200000000)
ON CONFLICT (name) DO NOTHING;

-- Grant read access to authenticated users for reference tables
GRANT SELECT ON ref_nigerian_states TO authenticated;
GRANT SELECT ON ref_expense_categories TO authenticated;
GRANT SELECT ON ref_pfas TO authenticated;
GRANT SELECT ON ref_banks TO authenticated;

GRANT SELECT ON ref_nigerian_states TO anon;
GRANT SELECT ON ref_expense_categories TO anon;
GRANT SELECT ON ref_pfas TO anon;
GRANT SELECT ON ref_banks TO anon;
