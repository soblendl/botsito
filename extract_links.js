import fs from 'fs';

try {
    const data = fs.readFileSync('s', 'utf8');
    // Extract all strings starting with http or https
    const links = data.match(/https?:\/\/[^\s"']+/g);

    if (links) {
        // Remove duplicates and save
        const uniqueLinks = [...new Set(links)];
        fs.writeFileSync('links.txt', uniqueLinks.join('\n'));
        console.log(`Successfully extracted ${uniqueLinks.length} unique links to links.txt`);
    } else {
        console.log('No links found in file "s"');
    }
} catch (error) {
    console.error('Error processing file:', error.message);
}
