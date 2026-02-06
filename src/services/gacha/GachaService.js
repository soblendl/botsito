import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DATA_PATHS } from '../../config/data.js';
import { globalLogger as logger } from '../../utils/logger.js';
import { normalizeUserId } from '../../utils/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class GachaService {
    constructor() {
        this.characters = [];
        this.characterIndex = new Map();
        this.sourceIndex = new Map();
        this.genderIndex = new Map();
        this.loaded = false;
    }
    async load() {
        if (this.loaded) return this;
        try {
            logger.info('📦 Cargando personajes...');
            const startTime = Date.now();
            const data = await fs.promises.readFile(DATA_PATHS.CHARACTERS, 'utf8');
            this.characters = JSON.parse(data);
            this.indexCharacters();
            const loadTime = Date.now() - startTime;
            logger.info(`✅ ${this.characters.length} personajes cargados en ${loadTime}ms`);
            this.loaded = true;
        } catch (error) {
            logger.error('❌ Error cargando personajes:', error.message);
            this.characters = [];
        }
        return this;
    }
    indexCharacters() {
        this.characterIndex.clear();
        this.sourceIndex.clear();
        this.genderIndex.clear();
        for (let i = 0; i < this.characters.length; i++) {
            const char = this.characters[i];
            if (char.id) {
                this.characterIndex.set(String(char.id), i);
            }
            if (char.name) {
                this.characterIndex.set(char.name.toLowerCase(), i);
            }
            if (char.source) {
                const source = char.source.toLowerCase();
                if (!this.sourceIndex.has(source)) {
                    this.sourceIndex.set(source, []);
                }
                this.sourceIndex.get(source).push(i);
            }
            if (char.gender) {
                const gender = char.gender.toLowerCase();
                if (!this.genderIndex.has(gender)) {
                    this.genderIndex.set(gender, []);
                }
                this.genderIndex.get(gender).push(i);
            }
        }
    }
    getById(id) {
        const index = this.characterIndex.get(String(id));
        return index !== undefined ? this.characters[index] : null;
    }
    getByName(name) {
        const index = this.characterIndex.get(name.toLowerCase());
        return index !== undefined ? this.characters[index] : null;
    }
    getBySource(source) {
        const indices = this.sourceIndex.get(source.toLowerCase()) || [];
        return indices.map(i => this.characters[i]);
    }
    getByGender(gender) {
        const indices = this.genderIndex.get(gender.toLowerCase()) || [];
        return indices.map(i => this.characters[i]);
    }
    getByOwner(userId) {
        const normalizedUserId = normalizeUserId(userId);
        return this.characters.filter(c => {
            const normalizedOwner = normalizeUserId(c.owner);
            return normalizedOwner === normalizedUserId;
        });
    }
    getRandomCharacter(filter = null) {
        let pool = this.characters;
        if (filter) {
            if (filter.gender) {
                pool = this.getByGender(filter.gender);
            } else if (filter.source) {
                pool = this.getBySource(filter.source);
            }
        }
        if (filter?.onlyFree) {
            pool = pool.filter(c => !c.owner && (!c.status || c.status.toLowerCase() === 'libre'));
        }
        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }
    getFreeCharacters() {
        return this.characters.filter(c => !c.owner && (!c.status || c.status.toLowerCase() === 'libre'));
    }
    async updateCharacter(id, updates) {
        const index = this.characterIndex.get(String(id));
        if (index === undefined) return false;
        Object.assign(this.characters[index], updates);
        await this.save();
        return true;
    }
    async addCharacter(character) {
        if (!character.id) {
            const maxId = Math.max(...this.characters.map(c => parseInt(c.id) || 0), 0);
            character.id = String(maxId + 1);
        }
        this.characters.push(character);
        this.indexCharacters();
        await this.save();
        return character;
    }
    async save() {
        try {
            await fs.promises.writeFile(
                DATA_PATHS.CHARACTERS,
                JSON.stringify(this.characters, null, 2),
                'utf8'
            );
            return true;
        } catch (error) {
            logger.error('❌ Error guardando personajes:', error.message);
            return false;
        }
    }
    getStats() {
        const free = this.getFreeCharacters().length;
        const owned = this.characters.length - free;
        return {
            total: this.characters.length,
            free,
            owned,
            sources: this.sourceIndex.size,
            indexed: this.characterIndex.size
        };
    }
    async claim(userId, characterId) {
        const character = this.getById(characterId);
        if (!character) throw new Error('Personaje no encontrado');
        if (character.owner) throw new Error('El personaje ya tiene dueño');
        character.owner = userId;
        character.status = 'Ocupado';
        await this.updateCharacter(characterId, {
            owner: userId,
            status: 'Ocupado'
        });
        return true;
    }
    async transferCharacter(characterId, newOwnerId) {
        const character = this.getById(characterId);
        if (!character) throw new Error('Personaje no encontrado');
        const previousOwner = character.owner;
        await this.updateCharacter(characterId, {
            owner: newOwnerId,
            user: newOwnerId
        });
        return { character, previousOwner };
    }
    vote(userId, characterId) {
        const character = this.getById(characterId);
        if (!character) {
            return { success: false, message: 'Personaje no encontrado' };
        }
        if (!character.votes) character.votes = 0;
        character.votes += 1;
        character.value = (parseInt(character.value) || 0) + 10;
        this.save().catch(err => logger.error('Error saving votes:', err));
        return { success: true, character };
    }
    async gracefulShutdown() {
        logger.info('ꕢ Guardando datos de GachaService antes de apagar...');
        await this.save();
        return true;
    }
}
export default GachaService;