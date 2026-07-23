# Production Email & Digest Setup Guide (Issue #38)

**Target Cost:** $0 / month  
**Blueprint Created:** [render.yaml](file:///home/shill/Documents/Financial%20App%20Project/render.yaml)

---

## Step 1: Configure Supabase Auth Redirect URLs ($0)

1. Go to your **Supabase Dashboard** $\rightarrow$ **Authentication** $\rightarrow$ **URL Configuration**.
2. Under **Site URL**, set:
   ```text
   https://pul.llc
   ```
3. Under **Redirect URLs**, add the following entries:
   * `https://pul.llc/**`
   * `https://www.pul.llc/**`
   * `https://olafinancial.org/**`
   * `http://localhost:3000/**`
4. Password reset emails sent by Supabase will now land on `https://pul.llc/#/reset-password` without redirect errors.

---

## Step 2: Set Up Resend Free Tier ($0 / month)

1. Sign up at [Resend.com](https://resend.com) (Free plan includes **3,000 emails / month**).
2. Go to **API Keys** $\rightarrow$ Create a new API Key (copy the `re_...` token).
3. Go to **Domains** $\rightarrow$ Add `pul.llc` (or `olafinancial.org`).
4. Add the 3 DNS records provided by Resend to your domain DNS provider (Cloudflare/Namecheap/GoDaddy):
   * TXT record for SPF
   * CNAME/TXT record for DKIM
   * TXT record for DMARC
5. Wait until the domain status turns **Verified**.

---

## Step 3: Deploy Backend Server to Render.com Free Tier ($0 / month)

1. Sign up / log into [Render.com](https://render.com).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your GitHub repository (`olafinancial/olafinancial`).
4. Render will automatically detect the [render.yaml](file:///home/shill/Documents/Financial%20App%20Project/render.yaml) file we created!
5. Fill in the 3 prompt secret values:
   * `SUPABASE_URL`: `https://YOUR_PROJECT_ID.supabase.co`
   * `SUPABASE_SECRET_KEY`: `your-service-role-secret` (found under Supabase Settings $\rightarrow$ API)
   * `RESEND_API_KEY`: `re_your_resend_key`
6. Click **Apply**. Render will build and deploy your Node backend server 24/7 for free!

---

## Step 4: Test & Verify

1. Open your app settings (`#/settings`).
2. Turn on **Enable Email Digest**, select **Daily/Weekly**, and click **Save Settings**.
3. Trigger a manual digest check by curling your new Render URL:
   ```bash
   curl https://your-app-name.onrender.com/api/digest/run
   ```
4. Check your inbox — you will receive the financial digest email!
