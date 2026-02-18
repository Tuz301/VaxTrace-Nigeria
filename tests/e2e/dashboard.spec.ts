/**
 * VaxTrace Nigeria - Dashboard E2E Tests
 * 
 * End-to-end tests for the main dashboard functionality.
 * Tests critical user flows for viewing stock data and alerts.
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
  });

  test('should display dashboard title', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /dashboard|vaxtrace/i })).toBeVisible();
  });

  test('should display stock map', async ({ page }) => {
    const mapElement = page.locator('[data-testid="stock-map"], .map-container, #map');
    await expect(mapElement.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display alert ticker', async ({ page }) => {
    const alertTicker = page.locator('[data-testid="alert-ticker"], .alert-ticker');
    await expect(alertTicker.first()).toBeVisible({ timeout: 10000 });
  });

  test('should filter by state', async ({ page }) => {
    // Click state filter dropdown
    const stateFilter = page.locator('[data-testid="state-filter"], select:has-text("State")');
    await stateFilter.first().click();
    
    // Select a state (e.g., Lagos)
    const lagosOption = page.locator('option:has-text("Lagos"), [role="option"]:has-text("Lagos")');
    await lagosOption.first().click();
    
    // Verify filter is applied
    await expect(page.locator('.filter-active, [data-filtered="true"]')).toBeVisible();
  });

  test('should navigate to inventory page', async ({ page }) => {
    const inventoryLink = page.locator('a:has-text("Inventory"), [href*="inventory"]');
    await inventoryLink.first().click();
    
    await expect(page).toHaveURL(/\/inventory/);
    await expect(page.locator('h1, h2').filter({ hasText: /inventory/i })).toBeVisible();
  });

  test('should display stock statistics', async ({ page }) => {
    const statsCards = page.locator('[data-testid="stat-card"], .stat-card');
    await expect(statsCards.first()).toBeVisible({ timeout: 10000 });
    
    // Verify at least 3 stat cards are displayed
    const count = await statsCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile menu is present
    const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu, button[aria-label="Menu"]');
    await expect(mobileMenu.first()).toBeVisible();
  });
});

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    
    await page.goto('/dashboard');
    
    // Should redirect to login or show login modal
    await expect(page.locator('[data-testid="login-form"], form:has-text("Login")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');
    
    const h1 = page.locator('h1');
    const h2 = page.locator('h2');
    
    // Should have exactly one h1
    expect(await h1.count()).toBe(1);
    
    // Should have at least one h2
    expect(await h2.count()).toBeGreaterThanOrEqual(1);
  });

  test('should have focus indicators on interactive elements', async ({ page }) => {
    await page.goto('/dashboard');
    
    const buttons = page.locator('button, a[href], input, select');
    const count = await buttons.count();
    
    // Test first 10 interactive elements
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = buttons.nth(i);
      await element.focus();
      
      // Check for focus-visible or outline
      const hasFocus = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline !== 'none' || 
               styles.boxShadow !== 'none' ||
               el.classList.contains('focus-visible') ||
               el.getAttribute('data-focus-visible') === 'true';
      });
      
      expect(hasFocus).toBeTruthy();
    }
  });
});
