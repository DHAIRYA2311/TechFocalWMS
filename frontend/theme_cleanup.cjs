const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'website');

const replacements = [
    {
        regex: /border-slate-[78]00(\/50)?/g,
        replacement: 'border-slate-100'
    },
    {
        regex: /hover:border-slate-700/g,
        replacement: 'hover:border-slate-300'
    },
    {
        regex: /bg-white border border-slate-100 p-6 rounded-xl hover:border-slate-300 transition-colors/g,
        replacement: 'web-card'
    },
    {
        regex: /bg-white border border-slate-100 rounded-xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between hover:border-slate-300 transition-colors/g,
        replacement: 'web-card flex flex-col md:flex-row md:items-center justify-between'
    },
    {
        regex: /flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-slate-100/g,
        replacement: 'flex flex-col items-center justify-center web-card'
    },
    {
        regex: /text-slate-400/g,
        replacement: 'text-slate-500'
    }
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
console.log('Final component cleanup completed.');
