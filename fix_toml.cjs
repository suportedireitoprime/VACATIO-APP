const fs = require('fs');
const existingDirs = fs.readdirSync('supabase/functions').filter(f => fs.statSync('supabase/functions/' + f).isDirectory());

let config = fs.readFileSync('supabase/config.toml', 'utf8');
let newConfig = [];
let skip = false;

for (let line of config.split('\n')) {
    let m = line.match(/^\[functions\.([^\]]+)\]/);
    if (m) {
        if (!existingDirs.includes(m[1])) {
            skip = true;
            continue;
        } else {
            skip = false;
        }
    } else if (line.trim().startsWith('[') && !line.startsWith('[functions.')) {
        skip = false;
    }
    if (!skip) newConfig.push(line);
}

fs.writeFileSync('supabase/config.toml', newConfig.join('\n'));
console.log('config.toml fixed!');
