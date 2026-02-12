import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ASSETS = {
    BASE: path.join(__dirname, '..', 'assets'),
    IMAGES: {
        BASE: path.join(__dirname, '..', 'assets', 'images'),
        DEFAULT: path.join(__dirname, '..', 'assets', 'images', 'default.jpeg'),
        MENU: path.join(__dirname, '..', 'assets', 'images', 'menu.jpg'),
        WELCOME_TEMPLATE: path.join(__dirname, '..', 'assets', 'images', 'plantilla-welcome.jpg'),
        PROFILE: path.join(__dirname, '..', 'assets', 'images', '2d1237ee5bac33aecfb3d98aa23d224d.jpg')
    },
    FONTS: {
        BASE: path.join(__dirname, '..', 'assets', 'fonts'),
        CHOCOLATE_ADVENTURE: path.join(__dirname, '..', 'assets', 'fonts', 'ChocolateAdventure.ttf')
    }
};
export default ASSETS;
