const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'website');

const replacements = [
    // 1. Replace the long card classes with `web-card`
    {
        regex: /bg-white border border-slate-[12]00 rounded-2xl p-6(.*?)hover:shadow-card-dark/g,
        replacement: 'web-card'
    },
    {
        regex: /bg-white border border-slate-[12]00 rounded-2xl p-6(.*?)hover:shadow-premium/g,
        replacement: 'web-card'
    },
    {
        regex: /bg-white border border-slate-[12]00 rounded-2xl p-6 transition-all duration-300 hover:border-slate-[34]00 hover:-translate-y-1 hover:shadow-sm/g,
        replacement: 'web-card-flat'
    },
    // 2. Headings and labels
    {
        regex: /text-[34]xl md:text-[45]xl font-bold text-slate-900 mb-[456]( tracking-tight)?/g,
        replacement: 'section-title'
    },
    {
        regex: /text-slate-600 text-base md:text-lg leading-relaxed max-w-2xl/g,
        replacement: 'section-subtitle'
    },
    {
        regex: /inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary bg-primary\/10 border border-primary\/20 px-4 py-1\.5 rounded-full mb-4/g,
        replacement: 'section-label'
    },
    // 3. Inputs
    {
        regex: /w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-[45]00 text-sm rounded-xl px-4 py-[34](.5)? outline-none transition-all duration-[23]00 focus:border-primary focus:ring-2 focus:ring-primary\/20 focus:bg-white/g,
        replacement: 'web-input'
    },
    {
        regex: /block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2/g,
        replacement: 'web-label'
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
console.log('Component refactoring completed.');
