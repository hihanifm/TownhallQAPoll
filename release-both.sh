#!/bin/bash

# Workflow script to release both DiscussionApp and TownhallQAPoll projects
# Usage: ./release-both.sh [project1] [project2]
#   If no arguments provided, releases DiscussionApp first, then TownhallQAPoll

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directories (assuming both repos are siblings)
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
DISCUSSION_APP_DIR="${DISCUSSION_APP_DIR:-$PARENT_DIR/DiscussionApp}"
TOWNHALL_QAPOLL_DIR="${TOWNHALL_QAPOLL_DIR:-$SCRIPT_DIR}"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Release Workflow: Both Projects${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Check if directories exist
if [ ! -d "$DISCUSSION_APP_DIR" ]; then
    echo -e "${RED}❌ Error: DiscussionApp directory not found at: $DISCUSSION_APP_DIR${NC}"
    exit 1
fi

if [ ! -d "$TOWNHALL_QAPOLL_DIR" ]; then
    echo -e "${RED}❌ Error: TownhallQAPoll directory not found at: $TOWNHALL_QAPOLL_DIR${NC}"
    exit 1
fi

# Check if release scripts exist
if [ ! -f "$DISCUSSION_APP_DIR/release.sh" ]; then
    echo -e "${RED}❌ Error: release.sh not found in DiscussionApp${NC}"
    exit 1
fi

if [ ! -f "$TOWNHALL_QAPOLL_DIR/release.sh" ]; then
    echo -e "${RED}❌ Error: release.sh not found in TownhallQAPoll${NC}"
    exit 1
fi

echo -e "${GREEN}Found both projects:${NC}"
echo "  - DiscussionApp: $DISCUSSION_APP_DIR"
echo "  - TownhallQAPoll: $TOWNHALL_QAPOLL_DIR"
echo ""
echo -e "${YELLOW}Note: Each release script is interactive and will ask for:${NC}"
echo "  1. Version bump type (Major/Minor/Patch)"
echo "  2. Confirmation"
echo "  3. Optional commit message"
echo "  4. Tag creation confirmation"
echo "  5. Push confirmation"
echo ""
read -p "Continue with releases? (y/N): " confirm_start

if [ "$confirm_start" != "y" ] && [ "$confirm_start" != "Y" ]; then
    echo "Release workflow cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Step 1: Releasing DiscussionApp${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
cd "$DISCUSSION_APP_DIR"
./release.sh
DISCUSSION_EXIT_CODE=$?

if [ $DISCUSSION_EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ DiscussionApp release failed or was cancelled${NC}"
    read -p "Continue with TownhallQAPoll release anyway? (y/N): " continue_anyway
    if [ "$continue_anyway" != "y" ] && [ "$continue_anyway" != "Y" ]; then
        echo "Release workflow stopped."
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Step 2: Releasing TownhallQAPoll${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
cd "$TOWNHALL_QAPOLL_DIR"
./release.sh
TOWNHALL_EXIT_CODE=$?

if [ $TOWNHALL_EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  TownhallQAPoll release failed or was cancelled${NC}"
fi

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Release Workflow Complete${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Summary
if [ $DISCUSSION_EXIT_CODE -eq 0 ] && [ $TOWNHALL_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Both releases completed successfully!${NC}"
else
    if [ $DISCUSSION_EXIT_CODE -ne 0 ]; then
        echo -e "${YELLOW}⚠️  DiscussionApp release had issues${NC}"
    fi
    if [ $TOWNHALL_EXIT_CODE -ne 0 ]; then
        echo -e "${YELLOW}⚠️  TownhallQAPoll release had issues${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Edit CHANGELOG.md files in both projects to add release notes"
echo "  2. Commit the CHANGELOG updates:"
echo "     ./update-changelogs.sh"
echo "     Or manually:"
echo "     cd $DISCUSSION_APP_DIR && git add CHANGELOG.md && git commit -m 'Update CHANGELOG' && git push"
echo "     cd $TOWNHALL_QAPOLL_DIR && git add CHANGELOG.md && git commit -m 'Update CHANGELOG' && git push"
echo "  3. Verify tags and releases on GitHub"
echo ""

