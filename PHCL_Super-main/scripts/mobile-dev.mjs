#!/usr/bin/env node

import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

function getLanIpv4Candidates() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!addresses || /loopback|virtual|vmware|vbox|hyper-v/i.test(name)) {
      continue;
    }

    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }

  return ips;
}

function printMobileUrls() {
  const ips = getLanIpv4Candidates();

  console.log('\nPHCL Super Mobile Dev Ready');
  console.log('----------------------------------------');
  console.log(`Local:   http://localhost:${PORT}`);

  if (ips.length === 0) {
    console.log(`LAN:     http://<YOUR-PC-IP>:${PORT}`);
    console.log('Tip: run "ipconfig" to find your IPv4 address.');
  } else {
    for (const ip of ips) {
      console.log(`LAN:     http://${ip}:${PORT}`);
    }
  }

  console.log('\nOpen this on your phone (same Wi-Fi), e.g.:');
  console.log(`http://<PC-IP>:${PORT}/exchange`);
  console.log('----------------------------------------\n');
}

function startNextDev() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, '..');
  const nextBin = path.resolve(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

  const child = spawn(process.execPath, [nextBin, 'dev', '-H', HOST, '-p', String(PORT)], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

printMobileUrls();
startNextDev();
