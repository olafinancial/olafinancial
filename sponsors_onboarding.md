# pul.llc — Native Sponsorship Partnership Program
### Contextual Product Placements · Partners Integration Sheet

This document outlines how the native sponsorship banner system works in pul.llc (olafinancial.org), the benefits for partners, and the assets required to launch a campaign.

---

## 1. How It Works (Utility-Based Targeting)

Traditional advertising interrupts users with irrelevant products. pul.llc uses a **utility-based targeting model**. Banners are shown *only* when the application detects a genuine gap in a user's financial health:

| User Scenario | Contextual Placement Triggered | Target Page |
|---|---|---|
| **No Emergency Fund** | High-Yield Savings Account Partner | Emergency Fund, Dashboard |
| **No Insurance Policies** | Insurance Provider / Underwriter Partner | Insurance Tracker, Balance Sheet |
| **High Capital, No Equities** | Wealth Management / Mutual Fund Broker | Balance Sheet, Retirement Planner |
| **High-Interest Debt** | Debt Refinancing / Consolidation Partner | Debt Planner |
| **No Pension Plan** | Vetted Pension Fund Administrator (PFA) | Retirement Planner, Onboarding |

*If a user already has an active product logged (e.g. they possess a valid insurance policy), the corresponding partner banner is automatically suppressed.*

---

## 2. Placement Visual Format

Sponsor placements render natively with a subtle "Sponsored" indicator, a dismiss button, the partner logo, a tagline, and a call-to-action button. The layout adapts to mobile, desktop, and tablet screens:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ [Sponsored]                                                                    │
│  [Logo]   PiggyVest Savings                                   [ Open Account ] │
│           Secure your emergency fund with a 15% APY high-yield savings.     ✕  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Partner Asset Checklist

To set up your native placement, please provide the following 5 assets:

### 1. Target URL (Call-to-Action Link)
* **What it is**: The destination page when a user clicks the button.
* **Format**: A secure link (`https://...`). 
* **Recommendation**: Include UTM parameters to track clicks and conversions inside your analytics platform.
  * *Example: `https://yourbrand.com/signup?utm_source=pul_llc&utm_medium=app_sponsor&utm_campaign=emergency_fund`*

### 2. Company Brand Logo
* **What it is**: A clean version of your logo.
* **Format**: transparent PNG, SVG, or WebP.
* **Size**: Minimum `128px` x `128px` (aspect ratio 1:1, square or compact circle preferred).

### 3. Display Name
* **What it is**: The partner or product name displayed in bold.
* **Format**: Plain text (maximum 30 characters).
  * *Example: `Leadway Auto Cover`*

### 4. Tagline / Hook
* **What it is**: A single sentence highlighting your value proposition.
* **Format**: Plain text (maximum 80 characters).
  * *Example: `Protect what matters most — get comprehensive car cover in 2 minutes.`*

### 5. Call-to-Action (CTA) Button Text
* **What it is**: The actionable phrase shown inside the click button.
* **Format**: Plain text (maximum 20 characters).
  * *Example: `Get Quote`, `Start Savings`, `Compare Rates`*

---

## 4. Integration Process

Once the assets are received:
1. They are added to the application configuration in `js/lib/sponsor.js`.
2. The campaign is deployed via Hostinger to production.
3. Placements begin serving immediately to users meeting the financial gap criteria.
