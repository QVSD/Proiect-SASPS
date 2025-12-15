import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = join(__dirname, '..', 'dist');

// Regex to match relative imports/exports (./ or ../)
const relativeImportRegex = /from\s+['"](\.\.?\/[^'"]+?)['"]/g;
const relativeExportRegex = /export\s+.*?\s+from\s+['"](\.\.?\/[^'"]+?)['"]/g;
const dynamicImportRegex = /import\s*\(\s*['"](\.\.?\/[^'"]+?)['"]\s*\)/g;

async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    
    let modified = content;
    let changed = false;
    
    // Replace relative imports in from clauses
    const resolveTarget = (p) => {
      // Absolute resolution of the import target in dist
      const resolved = join(dirname(filePath), p);
      if (existsSync(resolved) && statSync(resolved).isDirectory()) {
        return p.endsWith('/') ? `${p}index.js` : `${p}/index.js`;
      }
      if (existsSync(`${resolved}.js`)) {
        return `${p}.js`;
      }
      return `${p}.js`;
    };

    modified = modified.replace(relativeImportRegex, (match, importPath) => {
      if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.includes('node_modules')) {
        return match;
      }
      changed = true;
      return match.replace(importPath, resolveTarget(importPath));
    });
    
    // Replace relative exports
    modified = modified.replace(relativeExportRegex, (match, importPath) => {
      if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.includes('node_modules')) {
        return match;
      }
      changed = true;
      return match.replace(importPath, resolveTarget(importPath));
    });
    
    // Replace dynamic imports
    modified = modified.replace(dynamicImportRegex, (match, importPath) => {
      if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.includes('node_modules')) {
        return match;
      }
      changed = true;
      return match.replace(importPath, resolveTarget(importPath));
    });
    
    if (changed) {
      await writeFile(filePath, modified, 'utf-8');
      const relativePath = filePath.replace(distDir + '/', '');
      console.log(`Fixed imports in: ${relativePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

async function processDirectory(dir) {
  try {
    const entries = await readdir(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        await processDirectory(fullPath);
      } else if (stats.isFile() && extname(entry) === '.js') {
        await processFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error);
  }
}

async function main() {
  console.log('Adding .js extensions to relative imports...');
  await processDirectory(distDir);
  console.log('Done!');
}

main().catch(console.error);

