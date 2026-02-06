import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname);
const srcDir = path.join(rootDir, 'src');

function replaceSymbols(content) {
    return content.replace(/ꕥ/g, 'ꕣ').replace(/ꕤ/g, 'ꕢ');
}

function processDirectory(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                processDirectory(fullPath);
            }
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const newContent = replaceSymbols(content);

            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

console.log('Starting symbol replacement...');
if (fs.existsSync(srcDir)) {
    processDirectory(srcDir);
}
console.log('Symbol replacement complete.');
