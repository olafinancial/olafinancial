# App Store Deployment & Referral Monetization Guide

This document outlines the operational and technical strategy to monetize Pul Planning via Paid App Store Downloads (Android & iOS) and the Referral/Promo Code Bypass system.

---

## 1. App Store Deployment Guides (Paid Downloads)

To charge a download fee, we must deploy the web application as native wrappers using tools like **Capacitor** or **Cordova**.

### 📱 Android (Google Play Store)

#### Step 1: Set up Google Play Developer Account
1. Register at the [Google Play Console](https://play.google.com/console/signup).
2. Pay the one-time $25 registration fee.
3. Link a merchant account (required for paid downloads/in-app purchases) via **Settings → Developer Account → Merchant Account**.

#### Step 2: Build & Package the App
1. Add Capacitor to the project:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init "Pul Planning" "llc.pul.app" --web-dir=.
   npm install @capacitor/android
   npx cap add android
   ```
2. Build the production assets and sync to the android folder:
   ```bash
   npx cap sync
   ```
3. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```
4. Generate a signed **App Bundle (AAB)** (`Build -> Generate Signed Bundle / APK`).

#### Step 3: Configure Pricing in Play Console
1. Create a new app, select **App**, and set default currency pricing.
2. In the sidebar, navigate to **Monetize → Products → App Pricing**.
3. Toggle the app from **Free** to **Paid**.
4. Set the download price (e.g., $0.99 / ₦1,000) and choose target countries.
5. Upload the `.aab` file to the production track, complete the Content Rating Questionnaire, and submit for review.

---

### 🍏 iOS (Apple App Store)

#### Step 1: Join Apple Developer Program
1. Register at the [Apple Developer Program Portal](https://developer.apple.com/programs/).
2. Pay the annual $99 fee.
3. Set up tax and banking agreements in **App Store Connect → Agreements, Tax, and Banking** (required to sell paid apps).

#### Step 2: Package the App
1. Install iOS capacitor platform:
   ```bash
   npm install @capacitor/ios
   npx cap add ios
   npx cap sync
   ```
2. Open the project in Xcode:
   ```bash
   npx cap open ios
   ```
3. Set up the Bundle Identifier, App Icons, and Signing Certificates (Provisioning Profile).
4. Archive the application (`Product -> Archive`) and upload it to App Store Connect.

#### Step 3: Configure Pricing in App Store Connect
1. Select your app in App Store Connect.
2. Navigate to **General → Price and Availability**.
3. Select a **Pricing Tier** (e.g., Tier 1 = $0.99).
4. Fill in the app store description, privacy policy link, and screenshots.
5. Select the uploaded build and submit the app for App Review.

---

## 2. Referral & Promo Code System Specification

To allow users to bypass the payment wall or unlock the app for free, we will implement an invite/promo validation system.

### Database Design (`referrals` table)

```sql
CREATE TABLE user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_by_code VARCHAR(20),
  is_premium BOOLEAN DEFAULT FALSE,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Flow & Core Code Logic

1. **Upon Signup / First Boot**:
   - Prompt the user to enter an invite code or referral code if they do not want to subscribe.
   - If they have a valid code, toggle `is_premium` to `true` in `user_profiles`.

2. **Validation Logic Helper**:
   ```javascript
   async function validateReferralCode(code) {
     const { data, error } = await supabase
       .from('user_referrals')
       .select('*')
       .eq('referral_code', code)
       .single();
     
     if (error || !data) return false;
     return true; // Code exists and is valid
   }
   ```

3. **Share Link Generation**:
   - Provide a button in `Settings` or `Goals` to "Invite Friends".
   - Generates a custom sharing link: `https://pul.llc/#/signup?ref=USER_CODE`.
   - On load, parse the `ref` parameter from URL and auto-fill the Signup page Referral input box.
