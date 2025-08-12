#!/bin/bash

# Deployment script for Glocal Cloud App infrastructure
# Usage: ./deploy.sh <environment> <resource-group>

set -e

# Default values
ENVIRONMENT=${1:-dev}
RESOURCE_GROUP=${2:-rg-glocalcloud-$ENVIRONMENT}
LOCATION=${3:-"East US"}
BASE_NAME="glocalcloud"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying Glocal Cloud App infrastructure${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Resource Group: $RESOURCE_GROUP${NC}"
echo -e "${YELLOW}Location: $LOCATION${NC}"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Azure. Please run 'az login' first.${NC}"
    exit 1
fi

# Create resource group if it doesn't exist
echo -e "${YELLOW}📦 Creating resource group if it doesn't exist...${NC}"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

# Validate Bicep template
echo -e "${YELLOW}✅ Validating Bicep template...${NC}"
az deployment group validate \
    --resource-group "$RESOURCE_GROUP" \
    --template-file infra/main.bicep \
    --parameters @infra/main.parameters.json \
    --parameters environmentSuffix="$ENVIRONMENT" \
                baseName="$BASE_NAME" \
                location="$LOCATION" \
    --output none

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Template validation successful${NC}"
else
    echo -e "${RED}❌ Template validation failed${NC}"
    exit 1
fi

# Deploy infrastructure
echo -e "${YELLOW}🏗️  Deploying infrastructure (this may take 10-15 minutes)...${NC}"
DEPLOYMENT_NAME="infra-$(date +%Y%m%d-%H%M%S)"

az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DEPLOYMENT_NAME" \
    --template-file infra/main.bicep \
    --parameters @infra/main.parameters.json \
    --parameters environmentSuffix="$ENVIRONMENT" \
                baseName="$BASE_NAME" \
                location="$LOCATION" \
    --output table

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Infrastructure deployment successful${NC}"
else
    echo -e "${RED}❌ Infrastructure deployment failed${NC}"
    exit 1
fi

# Retrieve and display outputs
echo -e "${YELLOW}📋 Deployment outputs:${NC}"
az deployment group show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DEPLOYMENT_NAME" \
    --query "properties.outputs" \
    --output table

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${YELLOW}📖 Check docs/infra.md for configuration instructions${NC}"

# Save outputs to file
OUTPUTS_FILE="deployment-outputs-$ENVIRONMENT.json"
az deployment group show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DEPLOYMENT_NAME" \
    --query "properties.outputs" \
    --output json > "$OUTPUTS_FILE"

echo -e "${GREEN}💾 Outputs saved to $OUTPUTS_FILE${NC}"