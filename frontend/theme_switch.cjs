const fs = require('fs');
const path = require('path');

const directoryPath = 'c:\\\\Dhairya Amin\\\\Projects\\\\TechFocal\\\\frontend\\\\src\\\\website';

const replacements = [
    { regex: /bg-slate-950/g, replacement: 'bg-slate-50' },
    { regex: /bg-slate-900(\/\d+)?/g, replacement: 'bg-white' }, // Handles bg-slate-900/40 etc
    { regex: /bg-slate-800/g, replacement: 'bg-slate-100' },
    { regex: /text-slate-400/g, replacement: 'text-slate-600' },
    { regex: /text-slate-300/g, replacement: 'text-slate-600' },
    { regex: /border-white\/5/g, replacement: 'border-slate-200' },
    { regex: /border-white\/8/g, replacement: 'border-slate-200' },
    { regex: /border-white\/10/g, replacement: 'border-slate-200' },
    { regex: /border-white\/15/g, replacement: 'border-slate-300' },
    { regex: /border-white\/20/g, replacement: 'border-slate-300' },
    { regex: /border-white\/30/g, replacement: 'border-slate-300' },
    { regex: /border-white\/50/g, replacement: 'border-slate-400' },
    { regex: /bg-white\/5/g, replacement: 'bg-slate-100' },
    { regex: /bg-white\/10/g, replacement: 'bg-slate-100' },
    { regex: /text-white/g, replacement: 'text-slate-900' },
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (stat.isFile() && /\.(jsx?|css)$/.test(fullPath)) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            for (const { regex, replacement } of replacements) {
                if (regex.test(content)) {
                    content = content.replace(regex, replacement);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

processDirectory(directoryPath);
console.log('Theme conversion completed.');
