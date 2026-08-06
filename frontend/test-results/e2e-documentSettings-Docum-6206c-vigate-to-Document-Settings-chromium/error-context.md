# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\documentSettings.spec.js >> Document Settings Test >> should login as admin and navigate to Document Settings
- Location: tests\e2e\documentSettings.spec.js:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Document prefix settings updated successfully.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Document prefix settings updated successfully.')

```

```yaml
- complementary:
  - img "TechFocal Logo"
  - text: TechFocal WMS
  - navigation:
    - link "Dashboard":
      - /url: /dashboard
    - link "Reports & Analytics":
      - /url: /reports
    - link "Customers":
      - /url: /customers
    - link "Purchase Orders":
      - /url: /purchase-orders
    - link "Job Operations":
      - /url: /jobs
    - link "Incoming Challans":
      - /url: /incoming-challans
    - link "Delivery Challans":
      - /url: /delivery-challans
    - link "Invoices & Billing":
      - /url: /invoices
    - link "User Accounts":
      - /url: /users
    - link "Staff Profiles":
      - /url: /staffs
    - link "Staff Attendance":
      - /url: /attendance
    - link "Machines":
      - /url: /machines
    - link "Payroll":
      - /url: /payroll
    - link "Expenses":
      - /url: /expenses
    - link "Inventory":
      - /url: /inventory
  - link "Settings":
    - /url: /settings/company
  - link "Security Center":
    - /url: /security
  - text: Sign Out
- main:
  - text: Dashboard > Settings > Document Serializations
  - textbox "Search anything..."
  - button
  - paragraph: TechFocal Admin
  - paragraph: System Administrator
  - text: TA
  - heading "System Settings" [level=2]
  - paragraph: Configure company preferences, branding, domains, email hosts, and worker permissions.
  - heading "Settings Navigation" [level=3]
  - navigation:
    - link "Company Information":
      - /url: /settings/company
    - link "Branding":
      - /url: /settings/branding
    - link "Domains & DNS":
      - /url: /settings/domains
    - link "Email Settings":
      - /url: /settings/email
    - link "Mobile Device Pairing":
      - /url: /settings/devices
    - link "Users & Roles":
      - /url: /settings/users-roles
    - link "Security & Auth":
      - /url: /settings/security
    - link "Notifications":
      - /url: /settings/notifications
    - link "Attendance Settings":
      - /url: /settings/attendance
    - link "Document Settings":
      - /url: /settings/documents
    - link "System Settings":
      - /url: /settings/system
    - link "Schedulers (Cron Jobs)":
      - /url: /settings/schedulers
    - link "Archived Records":
      - /url: /settings/archived
  - heading "Document Serialization" [level=2]
  - paragraph: Define prefixes and numbering sequences for jobs, purchase orders, outgoing challans, and commercial invoice ledgers.
  - text: Purchase Order (PO) Prefix
  - textbox "PO-"
  - text: "Example: PO-0001 Job Card Prefix"
  - textbox "JOB-"
  - text: "Example: JOB-0001 Delivery Challan (DC) Prefix"
  - textbox "DC-"
  - text: "Example: DC-0001 Commercial Invoice Prefix"
  - textbox "INV-"
  - text: "Example: INV-0001 Auto Document Numbering Automatically increment document serial numbers on creation. Enabled (Auto) Document Watermarking Apply dynamic security watermarks on all generated PDFs. Disabled QR Code Verification Embed scan-to-verify QR codes on PDFs. Disabled"
  - button "Save Prefixes" [disabled]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Document Settings Test', () => {
  4  |   test('should login as admin and navigate to Document Settings', async ({ page }) => {
  5  |     // 1. Go to the login page
  6  |     await page.goto('/');
  7  | 
  8  |     // 2. Fill in the login credentials
  9  |     await page.fill('input[type="email"]', 'admin@techfocal.in');
  10 |     await page.fill('input[type="password"]', 'admin123');
  11 | 
  12 |     // 3. Click the login button
  13 |     await page.click('button:has-text("Sign In")');
  14 | 
  15 |     // 4. Wait for navigation to dashboard or handle MFA prompt if it appears
  16 |     // We expect the URL to change to something else, or we see the sidebar
  17 |     await page.waitForURL('**/dashboard**');
  18 | 
  19 |     // 5. Navigate to Settings page
  20 |     // Assuming there is a sidebar link with text "Settings"
  21 |     await page.click('a:has-text("Settings")');
  22 | 
  23 |     // 6. Navigate to Document Security tab
  24 |     // Adjust selector based on exactly what the tab is named
  25 |     await page.click('text=Document Settings');
  26 | 
  27 |     // 7. Toggle the Watermark setting off
  28 |     // It's a custom select next to the label "Document Watermarking"
  29 |     // Since it's a CustomSelect, we need to locate it and click it. Let's just click Save for this simple test.
  30 |     
  31 |     // 8. Click Save
  32 |     await page.click('button:has-text("Save Prefixes")');
  33 | 
  34 |     // 9. Verify success toast or message appears
> 35 |     await expect(page.locator('text=Document prefix settings updated successfully.')).toBeVisible();
     |                                                                                       ^ Error: expect(locator).toBeVisible() failed
  36 |   });
  37 | });
  38 | 
```