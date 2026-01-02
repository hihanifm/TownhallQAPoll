#!/bin/bash

# Release Script for Townhall Q&A Poll
# Automates version bumping, changelog updates, and git tagging

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to get current version from package.json
get_current_version() {
  node -p "require('./package.json').version"
}

# Function to bump version
bump_version() {
  local current_version=$1
  local bump_type=$2
  
  IFS='.' read -ra VERSION_PARTS <<< "$current_version"
  local major=${VERSION_PARTS[0]}
  local minor=${VERSION_PARTS[1]}
  local patch=${VERSION_PARTS[2]}
  
  case $bump_type in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch)
      patch=$((patch + 1))
      ;;
    *)
      echo -e "${RED}Invalid bump type: $bump_type${NC}"
      exit 1
      ;;
  esac
  
  echo "${major}.${minor}.${patch}"
}

# Function to update version in package.json
update_package_version() {
  local new_version=$1
  local package_file=$2
  
  # Use node to update JSON (preserves formatting better)
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$package_file', 'utf8'));
    pkg.version = '$new_version';
    fs.writeFileSync('$package_file', JSON.stringify(pkg, null, 2) + '\n');
  "
}

# Function to update CHANGELOG.md
update_changelog() {
  local new_version=$1
  local release_date=$(date +"%Y-%m-%d")
  
  # Create a temporary file with the new version header
  local temp_file=$(mktemp)
  
  # Read CHANGELOG and insert new version section
  {
    echo "## [${new_version}] - ${release_date}"
    echo ""
    echo "### Added"
    echo "- "
    echo ""
    echo "### Changed"
    echo "- "
    echo ""
    echo "### Fixed"
    echo "- "
    echo ""
    echo "---"
    echo ""
    cat CHANGELOG.md
  } > "$temp_file"
  
  mv "$temp_file" CHANGELOG.md
}

# Check if we're on main branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
  echo -e "${YELLOW}⚠️  Warning: You're not on the main branch (currently on: $current_branch)${NC}"
  read -p "Continue anyway? (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    exit 0
  fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}❌ Error: You have uncommitted changes!${NC}"
  echo "Please commit or stash your changes before creating a release."
  git status --short
  exit 1
fi

# Run tests before release
echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Step 1: Running Tests${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${BLUE}Running test suite...${NC}"
echo ""

# Run tests and capture output
TEST_OUTPUT=$(npm test 2>&1)
TEST_EXIT_CODE=$?

# Display test output
echo "$TEST_OUTPUT"
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed${NC}"
else
  echo -e "${RED}❌ Tests failed!${NC}"
  echo ""
  echo "Please fix failing tests before creating a release."
  read -p "Continue anyway? (y/N): " continue_anyway
  if [ "$continue_anyway" != "y" ] && [ "$continue_anyway" != "Y" ]; then
    exit 1
  fi
  echo -e "${YELLOW}⚠️  Proceeding with release despite test failures${NC}"
fi
echo ""

# Get current version
current_version=$(get_current_version)
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Step 2: Version Selection${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${BLUE}Current version: ${current_version}${NC}"
echo ""

# Determine bump type
echo "What type of release is this?"
echo "  1) Major (${current_version} → $(bump_version $current_version major)) - Breaking changes"
echo "  2) Minor (${current_version} → $(bump_version $current_version minor)) - New features"
echo "  3) Patch (${current_version} → $(bump_version $current_version patch)) - Bug fixes"
echo ""
read -p "Select option (1-3): " option

case $option in
  1)
    bump_type="major"
    ;;
  2)
    bump_type="minor"
    ;;
  3)
    bump_type="patch"
    ;;
  *)
    echo -e "${RED}Invalid option${NC}"
    exit 1
    ;;
esac

# Calculate new version
new_version=$(bump_version $current_version $bump_type)
echo ""
echo -e "${GREEN}New version will be: ${new_version}${NC}"
read -p "Continue? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Release cancelled."
  exit 0
fi

# Update versions in all package.json files
echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Step 3: Updating Files${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${BLUE}Updating versions in package.json files...${NC}"
update_package_version "$new_version" "package.json"
echo -e "  ${GREEN}✓${NC} package.json"
update_package_version "$new_version" "backend/package.json"
echo -e "  ${GREEN}✓${NC} backend/package.json"
update_package_version "$new_version" "frontend/package.json"
echo -e "  ${GREEN}✓${NC} frontend/package.json"
echo -e "${GREEN}✓ All versions updated${NC}"
echo ""

# Update README version badge
echo -e "${BLUE}Updating README version badge...${NC}"
sed -i.bak "s/\*\*Current Version: [0-9.]\+\*\*/**Current Version: ${new_version}**/" README.md
rm -f README.md.bak
echo -e "${GREEN}✓ README updated${NC}"
echo ""

# Update CHANGELOG
echo -e "${BLUE}Updating CHANGELOG.md...${NC}"
update_changelog "$new_version"
echo -e "${GREEN}✓ CHANGELOG updated${NC}"
echo ""

# Show changes
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Step 4: Review Changes${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${BLUE}Changes to be committed:${NC}"
git status --short
echo ""

# Ask for commit message
read -p "Enter release commit message (or press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
  commit_msg="Release v${new_version}"
fi

# Commit changes
echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Step 5: Committing Changes${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${BLUE}Committing version bump...${NC}"
git add package.json backend/package.json frontend/package.json README.md CHANGELOG.md
git commit -m "$commit_msg"
echo -e "${GREEN}✓ Changes committed${NC}"
echo ""

# Create git tag
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Step 6: Creating Git Tag${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
read -p "Create git tag v${new_version}? (Y/n): " create_tag
if [ "$create_tag" != "n" ] && [ "$create_tag" != "N" ]; then
  echo -e "${BLUE}Creating tag v${new_version}...${NC}"
  git tag -a "v${new_version}" -m "Release v${new_version}"
  echo -e "${GREEN}✓ Git tag created: v${new_version}${NC}"
else
  echo -e "${YELLOW}⚠️  Skipping tag creation${NC}"
fi
echo ""

# Push to remote
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Step 7: Pushing to Remote${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
read -p "Push to remote? (Y/n): " push_remote
if [ "$push_remote" != "n" ] && [ "$push_remote" != "N" ]; then
  echo -e "${BLUE}Pushing commits to origin/$current_branch...${NC}"
  git push origin "$current_branch"
  echo -e "${GREEN}✓ Commits pushed${NC}"
  
  if [ "$create_tag" != "n" ] && [ "$create_tag" != "N" ]; then
    echo -e "${BLUE}Pushing tag v${new_version}...${NC}"
    git push origin "v${new_version}"
    echo -e "${GREEN}✓ Tag pushed to remote${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping push${NC}"
  echo "  You can push manually later with:"
  echo "    git push origin $current_branch"
  if [ "$create_tag" != "n" ] && [ "$create_tag" != "N" ]; then
    echo "    git push origin v${new_version}"
  fi
fi
echo ""

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}Release v${new_version} completed!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit CHANGELOG.md to add release notes for v${new_version}"
echo "  2. Commit the CHANGELOG updates"
echo "  3. Push if you haven't already"
echo ""
