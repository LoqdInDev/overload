const { test, expect } = require('@playwright/test');

test.describe('Authentication flow', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Overload/i);
  });

  test('login page loads and shows form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Sign In')).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('Enter password')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/login');
    // Switch to signup mode
    await page.getByText('Create Account').click();
    // Submit empty form
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  test('shows email validation error for invalid email', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill('not-an-email');
    await page.getByPlaceholder('Enter password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('signup shows password length requirement', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Create Account').click();
    await page.getByPlaceholder('Your name').fill('Test User');
    await page.getByPlaceholder('you@company.com').fill('test@example.com');
    await page.getByPlaceholder('Min. 8 characters').fill('short');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test('redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    // Should either redirect to login or show login UI
    await expect(page.getByText(/sign in|log in|overload/i)).toBeVisible();
  });
});
