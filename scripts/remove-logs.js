// Script to remove console.log statements from files
// Usage: node scripts/remove-logs.js

const fs = require('fs');
const path = require('path');

const FILES_TO_CLEAN = [
  'contexts/PurchaseContext.tsx',
  'contexts/NotificationContext.tsx',  
  'contexts/OfflineContext.tsx',
  'services/PaymentService.ts',
  'services/NotificationService.ts',
  'services/ProgressService.ts',
  'services/tourServices.ts',
  'app/(tabs)/index.tsx'
];

function removeConsoleLogs(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Remove console.log statements (but keep console.error for critical errors)
    content = content.replace(/console\.log\([^)]*\);?/g, '// Log removed');
    content = content.replace(/console\.warn\([^)]*\);?/g, '// Warning removed');
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Cleaned: ${filePath}`);
  } catch (error) {
    console.error(`Failed to clean ${filePath}:`, error.message);
  }
}

console.log('Removing console logs from specified files...');
FILES_TO_CLEAN.forEach(removeConsoleLogs);
console.log('Done!');