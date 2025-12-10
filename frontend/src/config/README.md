# Browser Restriction Configuration

This configuration file allows you to control browser restrictions for the application.

## Configuration Options

Edit `browserConfig.js` to customize browser restrictions:

### `enabled` (boolean)
- `true`: Enable browser restrictions (default)
- `false`: Disable browser restrictions, allow all browsers

### `allowedBrowsers` (array of strings)
List of allowed browser names (case-insensitive). Available options:
- `'Microsoft Edge'` - Chromium-based Edge
- `'Microsoft Edge (Legacy)'` - EdgeHTML-based Edge (old Edge)
- `'Google Chrome'`
- `'Mozilla Firefox'`
- `'Safari'`
- `'Opera'`
- `'Unknown Browser'`

**Examples:**
- `['Microsoft Edge', 'Microsoft Edge (Legacy)']` - Only Edge (default)
- `['Microsoft Edge', 'Google Chrome']` - Allow Edge and Chrome
- `['Google Chrome', 'Mozilla Firefox', 'Safari']` - Allow Chrome, Firefox, and Safari
- `[]` - If empty and `enabled: true`, defaults to Microsoft Edge only

### `customMessage` (string)
- Custom message to display when browser is not allowed
- Leave empty (`''`) to use the default message
- Supports HTML (use `<br />` for line breaks)

### `showDownloadLink` (boolean)
- `true`: Show download instructions and link to Microsoft Edge (default)
- `false`: Hide download instructions

### `allowOverride` (boolean)
- `true`: Show a "Continue Anyway" button that allows users to bypass the restriction (default)
- `false`: Hide the override option, users must use an allowed browser
- When enabled, users can click the button to proceed, and their choice is saved in localStorage

## Examples

### Example 1: Disable restrictions (allow all browsers)
```javascript
export const browserConfig = {
  enabled: false,
  allowedBrowsers: [],
  customMessage: '',
  showDownloadLink: true,
};
```

### Example 2: Allow only Edge and Chrome
```javascript
export const browserConfig = {
  enabled: true,
  allowedBrowsers: ['Microsoft Edge', 'Google Chrome'],
  customMessage: '',
  showDownloadLink: true,
};
```

### Example 3: Allow all modern browsers except Safari
```javascript
export const browserConfig = {
  enabled: true,
  allowedBrowsers: ['Microsoft Edge', 'Google Chrome', 'Mozilla Firefox', 'Opera'],
  customMessage: '',
  showDownloadLink: false,
};
```

### Example 4: Custom message
```javascript
export const browserConfig = {
  enabled: true,
  allowedBrowsers: ['Microsoft Edge'],
  customMessage: 'Please use Microsoft Edge to access this application.<br />This ensures a consistent experience for all users.',
  showDownloadLink: true,
  allowOverride: true,
};
```

### Example 5: Strict mode (no override allowed)
```javascript
export const browserConfig = {
  enabled: true,
  allowedBrowsers: ['Microsoft Edge'],
  customMessage: '',
  showDownloadLink: true,
  allowOverride: false, // Users cannot bypass the restriction
};
```

## User Override Feature

When `allowOverride` is set to `true`, users will see a "Continue Anyway" button on the browser restriction screen. When clicked:

- The override is applied for the current session only (stored in component state)
- The application will load normally for that session
- **The override does NOT persist** - users will be asked again on page refresh or when using a different browser
- This ensures users are reminded each time they access the application from a non-allowed browser

**Note:** The override is session-only, so users must click "Continue Anyway" each time they:
- Refresh the page
- Open the application in a new tab/window
- Switch to a different browser

## Notes

- Changes to the configuration require rebuilding the frontend (`npm run build`)
- Browser detection is based on the user agent string
- The restriction check happens immediately when the app loads
- User override is session-only and does not persist across page refreshes or browser sessions
