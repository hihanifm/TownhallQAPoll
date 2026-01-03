# Release Workflow for Both Projects

This directory contains workflow scripts to manage releases for both DiscussionApp and TownhallQAPoll projects.

## Scripts

### 1. `release-both.sh`
Runs the release process for both projects sequentially.

**Usage:**
```bash
./release-both.sh
```

**What it does:**
1. Runs `release.sh` for DiscussionApp (interactive)
2. Runs `release.sh` for TownhallQAPoll (interactive)
3. Provides summary and next steps

**Interactive prompts in each release:**
- Version bump type (Major/Minor/Patch)
- Confirmation
- Optional commit message
- Tag creation confirmation
- Push confirmation

### 2. `update-changelogs.sh`
Helper script to commit and push CHANGELOG updates after releases.

**Usage:**
```bash
./update-changelogs.sh
```

**What it does:**
1. Checks for uncommitted CHANGELOG changes in both projects
2. Prompts to commit and push changes
3. Allows custom commit messages

## Typical Workflow

1. **Run releases:**
   ```bash
   ./release-both.sh
   ```
   - Follow the interactive prompts for each project
   - Select version bump type (usually Minor for new features)
   - Confirm and push when prompted

2. **Update CHANGELOGs:**
   - Edit CHANGELOG.md files in both projects to add release notes
   - Fill in the template sections (Added, Changed, Fixed)

3. **Commit CHANGELOG updates:**
   ```bash
   ./update-changelogs.sh
   ```
   - Or manually commit and push:
     ```bash
     cd DiscussionApp && git add CHANGELOG.md && git commit -m "Update CHANGELOG for vX.X.X" && git push
     cd ../TownhallQAPoll && git add CHANGELOG.md && git commit -m "Update CHANGELOG for vX.X.X" && git push
     ```

## Configuration

You can override the default project paths with environment variables:

```bash
export DISCUSSION_APP_DIR=/path/to/DiscussionApp
export TOWNHALL_QAPOLL_DIR=/path/to/TownhallQAPoll
./release-both.sh
```

By default, the scripts assume:
- This script is in the TownhallQAPoll directory
- DiscussionApp is a sibling directory (same parent folder)
- TownhallQAPoll is the current directory

## Notes

- Each release script runs tests before creating a release
- The release scripts create git tags automatically
- CHANGELOG templates are created by the release scripts (you fill in the details)
- Both scripts are interactive and require user input

