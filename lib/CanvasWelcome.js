import { GlobalFonts, createCanvas, loadImage } from '@napi-rs/canvas';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const FONT_PATH = join(ROOT_DIR, 'fonts', 'ChocolateAdventure.ttf');
const TEMPLATE_PATH = join(ROOT_DIR, 'images', 'plantilla-welcome.jpg');
const DEFAULT_PFP_PATH = join(ROOT_DIR, 'images', 'default.jpeg');
if (fs.existsSync(FONT_PATH)) {
    GlobalFonts.registerFromPath(FONT_PATH, 'ChocolateAdventure');
} else {
    console.warn('[CanvasWelcome] Font not found at:', FONT_PATH);
}
export async function generateWelcomeImage(type, userJid, profilePicUrl) {
    const titleText = type === 'welcome' ? 'Bienvenido/a' : 'Hasta Luego';
    const numberText = '+' + userJid.split('@')[0];
    let background;
    try {
        background = await loadImage(TEMPLATE_PATH);
    } catch (err) {
        console.error('[CanvasWelcome] Error loading template:', err);
        throw new Error('Could not load welcome template');
    }
    const width = background.width;
    const height = background.height;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0, width, height);
    const pfpRadius = height * 0.25;
    const pfpX = width * 0.25;
    const pfpY = height * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pfpX, pfpY, pfpRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    try {
        const pfp = await loadImage(profilePicUrl);
        ctx.drawImage(pfp, pfpX - pfpRadius, pfpY - pfpRadius, pfpRadius * 2, pfpRadius * 2);
    } catch {
        try {
            const defaultPfp = await loadImage(DEFAULT_PFP_PATH);
            ctx.drawImage(defaultPfp, pfpX - pfpRadius, pfpY - pfpRadius, pfpRadius * 2, pfpRadius * 2);
        } catch (e) {
            console.error('[CanvasWelcome] Failed to load default PFP:', e);
        }
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(pfpX, pfpY, pfpRadius, 0, Math.PI * 2, true);
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    const textX = width * 0.65;
    const textY = height * 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const titleFontSize = Math.floor(width * 0.08);
    ctx.font = `${titleFontSize}px "ChocolateAdventure"`;
    ctx.fillText(titleText, textX, textY);
    const numberFontSize = Math.floor(width * 0.05);
    ctx.font = `${numberFontSize}px "ChocolateAdventure"`;
    ctx.fillText(numberText, textX, textY + titleFontSize);
    return canvas.toBuffer('image/jpeg');
}