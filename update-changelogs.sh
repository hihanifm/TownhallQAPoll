#!/bin/bash

# Script to update CHANGELOGs for both projects after release
# Usage: ./update-changelogs.sh

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
echo -e "${BLUE}Update CHANGELOGs for Both Projects${NC}"
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

# Check for uncommitted CHANGELOG changes
cd "$DISCUSSION_APP_DIR"
if git diff --quiet CHANGELOG.md 2>/dev/null && git diff --cached --quiet CHANGELOG.md 2>/dev/null; then
    echo -e "${YELLOW}DiscussionApp: No CHANGELOG changes to commit${NC}"
else
    echo -e "${GREEN}DiscussionApp: Found CHANGELOG changes${NC}"
    git status CHANGELOG.md
    echo ""
    read -p "Commit and push DiscussionApp CHANGELOG changes? (y/N): " commit_discussion
    if [ "$commit_discussion" = "y" ] || [ "$commit_discussion" = "Y" ]; then
        read -p "Enter commit message (or press Enter for default): " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="Update CHANGELOG"
        fi
        git add CHANGELOG.md
        git commit -m "$commit_msg"
        git push
        echo -e "${GREEN}✓ DiscussionApp CHANGELOG updated and pushed${NC}"
    fi
fi

echo ""
cd "$TOWNHALL_QAPOLL_DIR"
if git diff --quiet CHANGELOG.md 2>/dev/null && git diff --cached --quiet CHANGELOG.md 2>/dev/null; then
    echo -e "${YELLOW}TownhallQAPoll: No CHANGELOG changes to commit${NC}"
else
    echo -e "${GREEN}TownhallQAPoll: Found CHANGELOG changes${NC}"
    git status CHANGELOG.md
    echo ""
    read -p "Commit and push TownhallQAPoll CHANGELOG changes? (y/N): " commit_townhall
    if [ "$commit_townhall" = "y" ] || [ "$commit_townhall" = "Y" ]; then
        read -p "Enter commit message (or press Enter for default): " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="Update CHANGELOG"
        fi
        git add CHANGELOG.md
        git commit -m "$commit_msg"
        git push
        echo -e "${GREEN}✓ TownhallQAPoll CHANGELOG updated and pushed${NC}"
    fi
fi

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}CHANGELOG Update Complete${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""

