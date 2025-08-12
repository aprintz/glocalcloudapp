#!/usr/bin/env node
/**
 * Validation script for geofence plugin structure
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function validatePlugin() {
  console.log('🔍 Validating Geofence Plugin Structure...');
  
  const requiredFiles = [
    'cms/src/plugins/geolocation/index.ts',
    'cms/src/plugins/geolocation/package.json',
    'cms/src/plugins/geolocation/server/index.ts',
    'cms/src/plugins/geolocation/server/routes/index.ts',
    'cms/src/plugins/geolocation/server/controllers/index.ts',
    'cms/src/plugins/geolocation/server/controllers/geofence-evaluation.ts',
    'cms/src/plugins/geolocation/server/cron-tasks.ts',
    'cms/config/plugins.ts',
    'server/src/geofence-service.ts',
    'server/sql/003_geofence_schema.sql'
  ];

  let allValid = true;

  for (const file of requiredFiles) {
    if (existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MISSING`);
      allValid = false;
    }
  }

  // Check plugin configuration
  try {
    const pluginConfig = readFileSync('cms/config/plugins.ts', 'utf8');
    if (pluginConfig.includes('geolocation')) {
      console.log('✅ Plugin registered in Strapi config');
    } else {
      console.log('❌ Plugin not found in Strapi config');
      allValid = false;
    }
  } catch (error) {
    console.log('❌ Could not read plugin config');
    allValid = false;
  }

  // Check package.json
  try {
    const packageJson = JSON.parse(readFileSync('cms/src/plugins/geolocation/package.json', 'utf8'));
    if (packageJson.name === 'geolocation') {
      console.log('✅ Plugin package.json valid');
    } else {
      console.log('❌ Plugin package.json invalid');
      allValid = false;
    }
  } catch (error) {
    console.log('❌ Could not read plugin package.json');
    allValid = false;
  }

  if (allValid) {
    console.log('\n🎉 All validations passed! Plugin structure is correct.');
    console.log('\n📋 Next steps:');
    console.log('1. Ensure PostgreSQL with PostGIS is available');
    console.log('2. Set DATABASE_URL in environment');
    console.log('3. Run: cd server && npm run migrate');
    console.log('4. Run: cd cms && npm run develop');
  } else {
    console.log('\n❌ Validation failed. Please check missing files.');
    process.exit(1);
  }
}

validatePlugin();