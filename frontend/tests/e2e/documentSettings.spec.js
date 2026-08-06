import { test, expect } from '@playwright/test';

test.describe('Document Settings Test', () => {
  test('should login as admin and navigate to Document Settings', async ({ page }) => {
    // 1. Go to the login page
    await page.goto('/');

    // 2. Fill in the login credentials
    await page.fill('input[type="email"]', 'admin@techfocal.in');
    await page.fill('input[type="password"]', 'admin123');

    // 3. Click the login button
    await page.click('button:has-text("Sign In")');

    // 4. Wait for navigation to dashboard or handle MFA prompt if it appears
    // We expect the URL to change to something else, or we see the sidebar
    await page.waitForURL('**/dashboard**');

    // 5. Navigate to Settings page
    // Assuming there is a sidebar link with text "Settings"
    await page.click('a:has-text("Settings")');

    // 6. Navigate to Document Security tab
    // Adjust selector based on exactly what the tab is named
    await page.click('text=Document Settings');

    // 7. Toggle the Watermark setting off
    // It's a custom select next to the label "Document Watermarking"
    // Since it's a CustomSelect, we need to locate it and click it. Let's just click Save for this simple test.
    
    // 8. Click Save
    await page.click('button:has-text("Save Prefixes")');

    // 9. Verify success toast or message appears
    await expect(page.locator('text=Document prefix settings updated successfully.')).toBeVisible();
  });
});
