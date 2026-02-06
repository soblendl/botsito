import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname);
const srcDir = path.join(rootDir, 'src');

/**
 * Removes comments from a string of JavaScript code using a state machine.
 * This is safer than regex for handling string literals containing // or /*.
 */
function stripComments(code) {
    let result = '';
    let i = 0;
    const len = code.length;
    let state = 'CODE'; // CODE, BLOCK_COMMENT, LINE_COMMENT, STRING_SINGLE, STRING_DOUBLE, STRING_TEMPLATE

    while (i < len) {
        const char = code[i];
        const nextChar = code[i + 1];

        switch (state) {
            case 'CODE':
                if (char === '/' && nextChar === '*') {
                    state = 'BLOCK_COMMENT';
                    i++;
                } else if (char === '/' && nextChar === '/') {
                    state = 'LINE_COMMENT';
                    i++;
                } else if (char === "'") {
                    state = 'STRING_SINGLE';
                    result += char;
                } else if (char === '"') {
                    state = 'STRING_DOUBLE';
                    result += char;
                } else if (char === '`') {
                    state = 'STRING_TEMPLATE';
                    result += char;
                } else {
                    result += char;
                }
                break;

            case 'BLOCK_COMMENT':
                if (char === '*' && nextChar === '/') {
                    state = 'CODE';
                    i++;
                }
                break;

            case 'LINE_COMMENT':
                if (char === '\n') {
                    state = 'CODE';
                    result += char;
                }
                break;

            case 'STRING_SINGLE':
                result += char;
                if (char === "'" && code[i - 1] !== '\\') { // Simple escape check
                    state = 'CODE';
                }
                break;

            case 'STRING_DOUBLE':
                result += char;
                if (char === '"' && code[i - 1] !== '\\') {
                    state = 'CODE';
                }
                break;

            case 'STRING_TEMPLATE':
                result += char;
                if (char === '`' && code[i - 1] !== '\\') {
                    state = 'CODE';
                }
                break;
        }
        i++;
    }
    return result;
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
            const cleanContent = stripComments(content);
            // Only write if changed to save IO
            if (content.length !== cleanContent.length || content !== cleanContent) {
                // Preserve blank lines to keep formatting somewhat readable, or aggressive? 
                // The parser preserves newlines in CODE state, so formatting stays mostly ok.
                // We might want to remove empty lines resulting from comment removal.
                // Simple regex to collapse multiple blank lines:
                // const minimized = cleanContent.replace(/^\s*[\r\n]/gm, ''); 
                // Let's stick to just removing text for safety.

                fs.writeFileSync(fullPath, cleanContent, 'utf8');
                console.log(`Cleaned: ${fullPath}`);
            }
        }
    }
}

console.log('Starting comment cleanup...');
// Process src directory
if (fs.existsSync(srcDir)) {
    processDirectory(srcDir);
}
// Process index.js if exists
const indexFile = path.join(rootDir, 'index.js');
if (fs.existsSync(indexFile)) {
    const content = fs.readFileSync(indexFile, 'utf8');
    const cleanContent = stripComments(content);
    if (content !== cleanContent) {
        fs.writeFileSync(indexFile, cleanContent, 'utf8');
        console.log(`Cleaned: ${indexFile}`);
    }
}
console.log('Cleanup complete.');
