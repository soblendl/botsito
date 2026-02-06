import fs from 'fs';
import path from 'path';

const filePath = 'src/data/characters.json';

try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const characters = JSON.parse(rawData);

    let cleanedCount = 0;
    const cleanedCharacters = characters.map(char => {
        if (char.name) {
            const cleanName = char.name.replace(/[^a-zA-Z0-9\s\-\.\(\)!?'"]/g, '').trim();
            if (char.name !== cleanName) {
                char.name = cleanName;
                cleanedCount++;
            }
        }
        if (char.gender) {
            const cleanGender = char.gender.replace(/[^a-zA-Z0-9\s\-\.\(\)!?'"]/g, '').trim();
            if (char.gender !== cleanGender) {
                char.gender = cleanGender;
                cleanedCount++;
            }
        }
        if (char.source) {
            const cleanSource = char.source.replace(/[^a-zA-Z0-9\s\-\.\(\)!?'"]/g, '').trim();
            if (char.source !== cleanSource) {
                char.source = cleanSource;
                cleanedCount++;
            }
        }
        if (char.status) {
            const cleanStatus = char.status.replace(/[^a-zA-Z0-9\s\-\.\(\)!?'"]/g, '').trim();
            if (char.status !== cleanStatus) {
                char.status = cleanStatus;
                cleanedCount++;
            }
        }
        return char;
    });

    if (cleanedCount > 0) {
        fs.writeFileSync(filePath, JSON.stringify(cleanedCharacters, null, 2), 'utf8');
        console.log(`Successfully cleaned ${cleanedCount} character names.`);
    } else {
        console.log('No characters needed cleaning.');
    }

} catch (error) {
    console.error('Error cleaning characters:', error);
}
