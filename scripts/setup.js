#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Competitors Analysis Agent...\n');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
    log(`\n${step}`, 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

// Check Node.js version
function checkNodeVersion() {
    logStep('Checking Node.js version...');
    
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
        logError(`Node.js version ${version} is not supported. Please use Node.js 18 or higher.`);
        process.exit(1);
    }
    
    logSuccess(`Node.js version ${version} is supported`);
}

// Create necessary directories
function createDirectories() {
    logStep('Creating directories...');
    
    const directories = [
        'data',
        'data/reports',
        'data/reports/snapshots',
        'logs',
        'public'
    ];
    
    directories.forEach(dir => {
        const dirPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            logSuccess(`Created directory: ${dir}`);
        } else {
            logWarning(`Directory already exists: ${dir}`);
        }
    });
}

// Check if .env file exists
function checkEnvFile() {
    logStep('Checking environment configuration...');
    
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), 'env.example');
    
    if (!fs.existsSync(envPath)) {
        if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            logSuccess('Created .env file from template');
            logWarning('Please edit .env file with your configuration');
        } else {
            logError('env.example file not found');
            process.exit(1);
        }
    } else {
        logSuccess('.env file already exists');
    }
}

// Install dependencies
function installDependencies() {
    logStep('Installing dependencies...');
    
    try {
        log('Running npm install...');
        execSync('npm install', { stdio: 'inherit' });
        logSuccess('Dependencies installed successfully');
    } catch (error) {
        logError('Failed to install dependencies');
        console.error(error);
        process.exit(1);
    }
}

// Validate configuration
function validateConfiguration() {
    logStep('Validating configuration...');
    
    try {
        // Try to load the configuration
        require('dotenv').config();
        const { config, validateConfig } = require('../src/config');
        
        const isValid = validateConfig();
        
        if (isValid) {
            logSuccess('Configuration is valid');
        } else {
            logWarning('Configuration has some issues - check the warnings above');
        }
        
        // Display current configuration
        log('\nCurrent configuration:', 'bright');
        log(`Environment: ${config.env}`, 'blue');
        log(`Port: ${config.port}`, 'blue');
        log(`Schedule: ${config.schedule.analysis} (${config.schedule.timezone})`, 'blue');
        log(`Competitors file: ${config.paths.competitors}`, 'blue');
        log(`Reports directory: ${config.paths.reports}`, 'blue');
        log(`Logs directory: ${config.paths.logs}`, 'blue');
        
    } catch (error) {
        logError('Failed to validate configuration');
        console.error(error);
    }
}

// Check competitors file
function checkCompetitorsFile() {
    logStep('Checking competitors configuration...');
    
    const competitorsPath = path.join(process.cwd(), 'data', 'competitors.json');
    
    if (fs.existsSync(competitorsPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(competitorsPath, 'utf8'));
            const count = data.competitors ? data.competitors.length : 0;
            logSuccess(`Found ${count} competitors configured`);
        } catch (error) {
            logError('Invalid competitors.json file');
        }
    } else {
        logWarning('No competitors.json file found');
        logWarning('Please add competitors to data/competitors.json');
    }
}

// Test the application
function testApplication() {
    logStep('Testing application...');
    
    try {
        // Try to require the main application
        const CompetitorsAnalysisAgent = require('../src/index');
        logSuccess('Application can be loaded successfully');
        
        // Test configuration loading
        const { config } = require('../src/config');
        logSuccess('Configuration loaded successfully');
        
        // Test logger
        const logger = require('../src/utils/logger');
        logger.info('Setup test - logger is working');
        logSuccess('Logger is working');
        
    } catch (error) {
        logError('Failed to test application');
        console.error(error);
    }
}

// Display next steps
function displayNextSteps() {
    logStep('Setup completed! Next steps:');
    
    log('\n1. Configure your environment:', 'bright');
    log('   Edit the .env file with your settings', 'blue');
    log('   - Email configuration for reports', 'blue');
    log('   - API keys (optional for MVP)', 'blue');
    
    log('\n2. Configure competitors:', 'bright');
    log('   Edit data/competitors.json with your competitors', 'blue');
    log('   - Add competitor websites', 'blue');
    log('   - Add social media handles', 'blue');
    log('   - Configure monitoring settings', 'blue');
    
    log('\n3. Start the application:', 'bright');
    log('   npm start          # Production mode', 'blue');
    log('   npm run dev        # Development mode', 'blue');
    
    log('\n4. Access the dashboard:', 'bright');
    log('   http://localhost:3000/dashboard', 'green');
    
    log('\n5. API endpoints:', 'bright');
    log('   GET  /health       # Health check', 'blue');
    log('   GET  /status       # System status', 'blue');
    log('   POST /analyze      # Run analysis', 'blue');
    log('   GET  /reports      # List reports', 'blue');
    log('   GET  /competitors  # List competitors', 'blue');
    
    log('\n6. Scheduled runs:', 'bright');
    log('   The application will automatically run analysis every Wednesday at 9:00 AM', 'blue');
    log('   You can modify the schedule in the .env file', 'blue');
    
    log('\n🎉 Happy monitoring!', 'magenta');
}

// Main setup function
async function main() {
    try {
        checkNodeVersion();
        createDirectories();
        checkEnvFile();
        installDependencies();
        validateConfiguration();
        checkCompetitorsFile();
        testApplication();
        displayNextSteps();
        
    } catch (error) {
        logError('Setup failed');
        console.error(error);
        process.exit(1);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { main }; 