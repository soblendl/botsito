import axios from 'axios';

const URLS = {
    hentai: 'https://raw.githubusercontent.com/nekyb/Nishikigi-Chisato/refs/heads/main/database/hentai.txt',
    hentaiSemi: 'https://raw.githubusercontent.com/nekyb/Nishikigi-Chisato/refs/heads/main/database/hentai-semi.txt',
    porno: 'https://raw.githubusercontent.com/nekyb/Nishikigi-Chisato/refs/heads/main/database/porno.txt'
};

const cache = {
    hentai: null,
    hentaiSemi: null,
    porno: null
};

export const loadLinks = async (type) => {
    if (cache[type]) return cache[type];

    try {
        const response = await axios.get(URLS[type]);
        const links = response.data.split('\n').filter(line => line.trim() !== '');
        cache[type] = links;
        return links;
    } catch (error) {
        console.error(`𖤐 Error cargando ${type}:`, error.message);
        return [];
    }
};

export const getRandomLink = (links) => {
    return links[Math.floor(Math.random() * links.length)];
};

export const downloadMedia = async (url) => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('𖤐 Error descargando media:', error.message);
        return null;
    }
};
