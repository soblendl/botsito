import { LocalDB } from '@imjxsx/localdb'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import Character from './models/Character.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class GachaService {
    constructor() {
        this.localDB = null
        this.charactersCollection = null
        this.characters = []
        this.charactersByGender = { male: [], female: [], other: [] }
        this.charactersBySource = {}
        this.isDirty = false // Not used for MongoDB in same way
        this.saveInterval = null
    }

    async load() {
        // Load catalog from JSON
        const dbPath = path.join(__dirname, '..', 'database')
        const gachaJsonPath = path.join(dbPath, 'characters.json')
        let catalogCharacters = []
        try {
            const rawData = fs.readFileSync(gachaJsonPath, 'utf8')
            const jsonData = JSON.parse(rawData)
            // characters.json is an array, not an object with a characters property
            catalogCharacters = Array.isArray(jsonData) ? jsonData : (jsonData.characters || [])
        } catch (e) {
            console.error('❌ Error loading characters.json:', e.message)
        }

        // Migrate if needed
        await this.checkAndMigrate()

        // Load dynamic data from MongoDB
        const dbCharacters = await Character.find()
        const dbMap = new Map(dbCharacters.map(c => [c.id, c]))

        // Merge catalog with DB data
        this.characters = catalogCharacters.map(char => {
            const saved = dbMap.get(char.id)
            if (saved) {
                return {
                    ...char,
                    owner: saved.owner,
                    claimedAt: saved.claimedAt,
                    transferredAt: saved.transferredAt,
                    votes: saved.votes,
                    voteCount: saved.voteCount
                }
            } else {
                // If in catalog but not in DB, create entry in DB (lazy creation or now? )
                // Original used lazy creation or bulk? Original: if !saved -> insertOne.
                // We can create it now to be safe, or just treat it as available.
                // Let's create it if we want strict tracking, but maybe lazily is better for perf?
                // But the original code did:
                // if (!saved) { this.charactersCollection.insertOne({ id: char.id }); return { ...char } }
                // So it created entries for ALL catalog items.
                // We will skip this to avoid thousands of empty docs, UNLESS required.
                // But wait, if we don't create it, we can't query it by ID in DB easily without inserting.
                // Actually, we only need to access DB when updating state.
                return { ...char }
            }
        })

        // Also handle characters in DB but not in catalog (legacy or custom?)
        for (const old of dbCharacters) {
            if (!catalogCharacters.find(c => c.id === old.id)) {
                this.characters.push({
                    id: old.id,
                    name: old.name || old.id, // name might not be in DB schema
                    disabled: true,
                    owner: old.owner,
                    claimedAt: old.claimedAt
                })
            }
        }

        this.indexCharacters()
        // No auto-save needed for MongoDB
    }

    async checkAndMigrate() {
        const count = await Character.countDocuments()
        if (count === 0) {
            console.log('𖤐 MongoDB Gacha vacío. Verificando migración...')
            await this.migrateData()
        }
    }

    async migrateData() {
        try {
            console.log('𖤐 Iniciando poblado inicial de MongoDB desde characters.json...');
            const dbPath = path.join(__dirname, '..', 'database');
            const charactersJsonPath = path.join(dbPath, 'characters.json');
            
            if (fs.existsSync(charactersJsonPath)) {
                const rawData = fs.readFileSync(charactersJsonPath, 'utf8');
                const jsonData = JSON.parse(rawData);
                const characters = Array.isArray(jsonData) ? jsonData : (jsonData.characters || []);
                
                if (characters.length > 0) {
                    await Character.insertMany(characters);
                    console.log(`𖤐 Poblado exitoso: ${characters.length} personajes insertados en MongoDB.`);
                } else {
                    console.log('𖤐 characters.json está vacío.');
                }
            } else {
                console.log('❌ No se encontró database/characters.json para el poblado inicial.');
            }
        } catch (error) {
            console.error('❌ Error migrando/poblando datos:', error);
        }
    }


    indexCharacters() {
        this.charactersByGender = { male: [], female: [], other: [] }
        this.charactersBySource = {}
        for (const char of this.characters) {
            const gender = char.gender?.toLowerCase() || 'other'
            if (this.charactersByGender[gender]) {
                this.charactersByGender[gender].push(char)
            }
            const source = char.source || 'Unknown'
            if (!this.charactersBySource[source]) {
                this.charactersBySource[source] = []
            }
            this.charactersBySource[source].push(char)
        }
    }

    getRandom() {
        const available = this.characters.filter(c => !c.owner && !c.disabled)
        if (!available.length) return null
        return available[Math.floor(Math.random() * available.length)]
    }

    getById(id) {
        return this.characters.find(c => c.id === id)
    }

    getUserCharacters(userId) {
        return this.characters.filter(c => c.owner === userId)
    }

    async claim(userId, characterId) {
        const char = this.getById(characterId)
        if (!char || char.disabled) return { success: false, message: 'Personaje no disponible' }
        if (char.owner) return { success: false, message: 'Este personaje ya tiene dueño' }

        try {
            // Update in Memory
            char.owner = userId
            char.claimedAt = Date.now()

            // Update in DB
            await Character.updateOne(
                { id: characterId },
                { $set: { id: characterId, owner: userId, claimedAt: char.claimedAt } }, // $set id to ensure it exists if new
                { upsert: true }
            )
            return { success: true, character: char }
        } catch (error) {
            console.error('Claim error:', error)
             // Revert memory
            delete char.owner
            delete char.claimedAt
            return { success: false, message: 'Error al reclamar' }
        }
    }

    async release(userId, characterId) {
        const char = this.getById(characterId)
        if (!char || char.owner !== userId) {
            return { success: false, message: 'No eres el dueño' }
        }

        try {
             // Update in Memory
            delete char.owner
            delete char.claimedAt

             // Update in DB
            await Character.updateOne(
                { id: characterId },
                { $unset: { owner: '', claimedAt: '' } }
            )
            return { success: true }
        } catch (error) {
             console.error('Release error:', error)
             // Restore memory (approximation)
             char.owner = userId 
             return { success: false, message: 'Error al liberar' }
        }
    }

    async transferCharacter(characterId, newOwner) {
        const char = this.getById(characterId)
        if (!char) return { success: false, message: 'Personaje no encontrado' }
        
        const previousOwner = char.owner
        const now = Date.now()

        try {
            // Update in Memory
            char.owner = newOwner
            char.transferredAt = now
            
            // Update in DB
            await Character.updateOne(
                { id: characterId },
                { $set: { owner: newOwner, transferredAt: now } },
                { upsert: true }
            )
            return { success: true, character: char, previousOwner }
        } catch (error) {
            console.error('Transfer error:', error)
            char.owner = previousOwner
            return { success: false, message: 'Error al transferir' }
        }
    }

    markDirty() {
        this.isDirty = true
    }

    async save() {
         // No-op
         return true
    }

    startAutoSave() {
        // No-op
    }

    async gracefulShutdown() {
         // No-op
    }
}

export default GachaService