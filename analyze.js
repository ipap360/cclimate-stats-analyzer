const { promisify } = require('util');
const { resolve, join, basename } = require('path');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const _ = require('lodash');

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

async function getFiles(dir) {
    const subdirs = await readdir(dir);
    const files = await Promise.all(
        subdirs.map(async subdir => {
            const res = resolve(dir, subdir);
            return (await stat(res)).isDirectory() ? getFiles(res) : res;
        })
    );
    return files.reduce((a, f) => a.concat(f), []);
}

(async function() {
    const summary = {};

    const data = await getFiles('./data');

    await asyncForEach(data, async f => {
        if (!f.endsWith(".json")) {
            return;
        }
            
        // temp
        // if (!f.endsWith('2019-02.json')) {
        //     return;
        // }

        const reportRaw = fs.readFileSync(f);
        const report = JSON.parse(reportRaw);
        
        const cleanReport = report.filter(
            ({ type }) => type === 'issue'
        );

        summary[basename(f, '.json')] = {
            total: cleanReport.length,
            category: _.countBy(cleanReport, 'check_name'),
            severity: _.countBy(cleanReport, 'severity'),
            remediation_points: _.sumBy(cleanReport, 'remediation_points')
        }
        
    });


    fs.writeFileSync(`./report.json`, JSON.stringify(summary, null, 4));

    // await asyncForEach(Object.keys(stories), async kind => {
    //     const storyJS = template
    //         .replace(/{{TITLE}}/g, stories[kind].title)
    //         .replace(/{{KIND}}/g, kind)
    //         .replace(/{{STORIES}}/g, JSON.stringify(stories[kind].stories));

    //     fs.writeFileSync(`./new-tests/${kind}.js`, storyJS);
    // });
})();