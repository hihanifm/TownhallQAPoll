# PM2 Setup and Persistence Guide

This guide explains how to configure PM2 to persist across reboots and handle environment variables correctly.

## Understanding Environment Variables

### Build-time Variables (Vite - Frontend)
Variables prefixed with `VITE_` are **build-time** variables. They are embedded into the frontend JavaScript bundle during the build process (`npm run build`). These must be set **before building**, not at runtime.

**Examples:**
- `VITE_ENABLE_BROWSER_RESTRICTION=true`
- `VITE_API_URL=http://localhost:33001`

**How to set:**
1. Create a `.env` file in the project root (see `.env.example`)
2. Set the variables in `.env`
3. The `start-background.sh` script will automatically load them during build

### Runtime Variables (Backend/Node.js)
These are used by the Node.js backend server at runtime. They can be set in:
- `ecosystem.config.js` (for PM2)
- Environment variables
- `.env` file (loaded by start scripts)

**Examples:**
- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=33001`
- `FRONTEND_URL=http://localhost:33000`

## Setting Up PM2 for Auto-Start on Reboot

### Step 1: Configure PM2 Startup Script

PM2 can automatically start your application on system reboot. Run:

```bash
pm2 startup
```

This will generate a startup script for your system. It will output something like:

```
[PM2] Init System found: systemd
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u youruser --hp /home/youruser
```

**Copy and run the command it provides** (it will be different for each system).

### Step 2: Save PM2 Process List

After starting your application with PM2, save the current process list:

```bash
pm2 save
```

This saves the current PM2 process list so it will be restored on reboot.

### Step 3: Verify Setup

To verify PM2 will start on reboot:

```bash
# Check PM2 status
pm2 list

# Check if startup script is configured
pm2 startup

# Test by rebooting (or use pm2 kill then pm2 resurrect)
```

## Environment Variables in PM2

### For Runtime Variables (Backend)

Add runtime environment variables to `ecosystem.config.js`:

```javascript
env_production: {
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  PORT: 33001,
  FRONTEND_URL: 'http://localhost:33000'
}
```

### For Build-time Variables (Frontend)

Build-time variables must be set **before building**:

1. **Option 1: Use .env file** (Recommended)
   ```bash
   # Create .env file in project root
   cp .env.example .env
   # Edit .env and set VITE_ENABLE_BROWSER_RESTRICTION=true
   
   # Build will automatically load from .env
   ./start-background.sh --pm2
   ```

2. **Option 2: Export before build**
   ```bash
   export VITE_ENABLE_BROWSER_RESTRICTION=true
   ./start-background.sh --pm2
   ```

3. **Option 3: Set in build script**
   ```bash
   VITE_ENABLE_BROWSER_RESTRICTION=true npm run build:frontend
   ```

## Complete Setup Example

### 1. Create .env file
```bash
cp .env.example .env
# Edit .env and set your variables
```

### 2. Build and start with PM2
```bash
./start-background.sh --pm2
```

### 3. Save PM2 configuration
```bash
pm2 save
```

### 4. Setup PM2 startup (one-time)
```bash
pm2 startup
# Copy and run the command it outputs
```

### 5. Verify
```bash
pm2 list
pm2 logs townhall-backend
```

## Important Notes

1. **Build-time vs Runtime**: 
   - `VITE_*` variables are embedded during build - changing them requires rebuilding
   - Runtime variables can be changed in `ecosystem.config.js` and restarting PM2

2. **Rebuilding after changing VITE_ variables**:
   ```bash
   # Stop PM2
   pm2 stop townhall-backend
   
   # Update .env file with new VITE_ variables
   # Rebuild frontend
   cd frontend && npm run build
   
   # Restart PM2
   pm2 restart townhall-backend
   ```

3. **PM2 persists the process list, not environment variables**:
   - PM2 startup restores the process list (which apps to run)
   - Environment variables come from `ecosystem.config.js` or system environment
   - Build-time variables must be set during each build

4. **Checking current environment**:
   ```bash
   # Check PM2 environment
   pm2 env 0  # 0 is the process ID
   
   # Check backend logs for environment info
   pm2 logs townhall-backend
   ```

## Troubleshooting

### PM2 doesn't start on reboot
```bash
# Re-run startup command
pm2 startup
# Follow the instructions it provides

# Verify startup script exists
pm2 unstartup  # Remove old startup
pm2 startup    # Create new startup
```

### Environment variables not working
- **Build-time vars**: Make sure they're set before `npm run build`
- **Runtime vars**: Check `ecosystem.config.js` and restart PM2: `pm2 restart townhall-backend`

### Changes not taking effect
- **VITE_ variables**: Rebuild frontend after changing
- **Runtime variables**: Restart PM2: `pm2 restart townhall-backend`
