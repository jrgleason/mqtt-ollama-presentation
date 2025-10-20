#!/usr/bin/env node
/**
 * Fix wildcard versions in package.json
 *
 * This script replaces all "*" versions with the currently installed versions
 * from package-lock.json, using caret ranges (^) for flexibility.
 *
 * Usage:
 *   cd apps/oracle
 *   node ../../fix-versions.js
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

function main() {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const lockFilePath = path.join(process.cwd(), 'package-lock.json');

    // Check if files exist
    if (!fs.existsSync(packageJsonPath)) {
        console.error('❌ Error: package.json not found in current directory');
        process.exit(1);
    }

    if (!fs.existsSync(lockFilePath)) {
        console.error('❌ Error: package-lock.json not found');
        console.error('   Run "npm install" first to generate lock file');
        process.exit(1);
    }

    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Read package-lock.json to get actual installed versions
    const lockFile = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
    const packages = lockFile.packages || {};

    let changeCount = 0;

    /**
     * Update versions in a dependency object
     */
    function updateVersions(deps, depType) {
        if (!deps) return;

        for (const [name, version] of Object.entries(deps)) {
            if (version !== '*') continue;

            // Find package in lock file
            const lockKey = Object.keys(packages).find(key => {
                const pkg = packages[key];
                return key.includes(`node_modules/${name}`) && !key.includes('node_modules/.') && pkg.version;
            });

            if (lockKey) {
                const installedVersion = packages[lockKey].version;
                const newVersion = `^${installedVersion}`;

                console.log(`  📦 ${name}: "*" → "${newVersion}"`);
                deps[name] = newVersion;
                changeCount++;
            } else {
                console.warn(`  ⚠️  ${name}: Could not find installed version, keeping "*"`);
            }
        }
    }

    console.log('\n🔍 Scanning for wildcard versions...\n');

    // Update all dependency sections
    updateVersions(packageJson.dependencies, 'dependencies');
    updateVersions(packageJson.devDependencies, 'devDependencies');
    updateVersions(packageJson.peerDependencies, 'peerDependencies');
    updateVersions(packageJson.optionalDependencies, 'optionalDependencies');

    if (changeCount === 0) {
        console.log('✅ No wildcard versions found!\n');
        process.exit(0);
    }

    // Create backup
    const backupPath = packageJsonPath + '.backup';
    fs.copyFileSync(packageJsonPath, backupPath);
    console.log(`\n💾 Created backup: ${path.basename(backupPath)}`);

    // Write updated package.json
    fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n'
    );

    console.log(`✅ Fixed ${changeCount} wildcard version(s)\n`);
    console.log('Next steps:');
    console.log('  1. Review changes: git diff package.json');
    console.log('  2. Verify build: npm run build');
    console.log('  3. Commit changes: git add package.json');
    console.log('  4. Delete backup: rm package.json.backup');
    console.log('');
}

// Run script
try {
    main();
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
