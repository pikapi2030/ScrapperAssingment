const { execSync } = require('child_process');

console.log('[Postinstall] Ensuring Playwright Chromium browser is installed...');
try {
    execSync('npx playwright install chromium', { stdio: 'inherit' });
    console.log('[Postinstall] Playwright Chromium installed successfully.');
} catch (err) {
    console.warn('[Postinstall] Playwright install notice:', err.message);
}
