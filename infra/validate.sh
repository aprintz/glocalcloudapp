#!/bin/bash

# Validation script for Bicep templates
# Usage: ./validate.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Validating Bicep templates${NC}"

# Check if Bicep CLI is available
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed${NC}"
    exit 1
fi

# Check Bicep version
echo -e "${YELLOW}Bicep version:${NC}"
az bicep version

# Validate main template
echo -e "${YELLOW}📋 Validating main template...${NC}"
az bicep build --file main.bicep --stdout > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Main template validation successful${NC}"
else
    echo -e "${RED}❌ Main template validation failed${NC}"
    exit 1
fi

# Validate individual modules
echo -e "${YELLOW}📋 Validating modules...${NC}"
for module in modules/*.bicep; do
    echo -e "${YELLOW}Checking $(basename $module)...${NC}"
    az bicep build --file "$module" --stdout > /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $(basename $module) validation successful${NC}"
    else
        echo -e "${RED}❌ $(basename $module) validation failed${NC}"
        exit 1
    fi
done

echo -e "${GREEN}🎉 All templates validated successfully!${NC}"
echo -e "${YELLOW}📖 See docs/infra.md for deployment instructions${NC}"