#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting Pixel Travel Map Development Environment...\n');

// Load environment variables
console.log('📋 Environment Check:');
console.log('- Port:', process.env.PORT || '8080 (default)');
console.log('- Gemini API Key:', process.env.VITE_GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- Passkey API URL:', process.env.VITE_PASSKEY_API_URL || 'https://passkey.okuso.uk (default)');
console.log('');

// Build the frontend first
console.log('🔨 Building frontend...');
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit'
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Frontend build failed');
    process.exit(1);
  }
  
  console.log('✅ Frontend built successfully');
  console.log('');
  
  // Install server dependencies if needed
  console.log('📦 Installing server dependencies...');
  const serverInstall = spawn('npm', ['install'], {
    cwd: 'server',
    stdio: 'inherit'
  });
  
  serverInstall.on('close', (serverCode) => {
    if (serverCode !== 0) {
      console.error('❌ Server dependency install failed');
      process.exit(1);
    }
    
    console.log('✅ Server dependencies installed');
    console.log('');
    
    // Initialize database
    console.log('🗄️ Initializing database...');
    const dbInit = spawn('node', ['src/initDb.js'], {
      cwd: 'server',
      stdio: 'inherit'
    });
    
    dbInit.on('close', (dbCode) => {
      if (dbCode !== 0) {
        console.error('❌ Database initialization failed');
        process.exit(1);
      }
      
      console.log('✅ Database initialized');
      console.log('');
      
      // Start the server
      console.log('🌟 Starting server...');
      console.log(`📍 Application will be available at: http://localhost:${process.env.PORT || 8080}`);
      console.log('');
      
      const serverProcess = spawn('node', ['src/index.js'], {
        cwd: 'server',
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'development'
        }
      });
      
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down...');
        serverProcess.kill('SIGINT');
        process.exit(0);
      });
    });
  });
});