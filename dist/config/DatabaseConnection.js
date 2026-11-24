"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DatabaseConnection_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConnection = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pg_1 = require("pg");
let DatabaseConnection = class DatabaseConnection {
    static { DatabaseConnection_1 = this; }
    static instance;
    pool;
    dbName;
    constructor() {
        this.dbName = process.env.PGDATABASE || 'tabela_de_vida';
        this.pool = this.createPool(this.dbName);
        DatabaseConnection_1.instance = this;
    }
    createPool(database) {
        return new pg_1.Pool({
            host: process.env.PGHOST || 'localhost',
            port: Number(process.env.PGPORT || 5432),
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || 'postgres',
            database,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
    }
    static getInstance() {
        if (!DatabaseConnection_1.instance) {
            DatabaseConnection_1.instance = new DatabaseConnection_1();
        }
        return DatabaseConnection_1.instance;
    }
    async ensureDatabaseAndSchema() {
        // 1. Garante que o banco de dados existe
        const adminPool = this.createPool('postgres');
        try {
            const checkDb = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [this.dbName]);
            if (checkDb.rowCount === 0) {
                await adminPool.query(`CREATE DATABASE "${this.dbName}"`);
                console.log(`[DatabaseConnection] Banco de dados "${this.dbName}" criado.`);
            }
        }
        finally {
            await adminPool.end();
        }
        // 2. Verifica se as tabelas já foram criadas
        try {
            const tableCheck = await this.query(`SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'cenarios_analiticos'
        ) AS exists`);
            const exists = tableCheck.rows[0]?.exists;
            if (!exists) {
                console.log('[DatabaseConnection] Esquema não encontrado. Executando script.sql...');
                await this.seedDefaultScript();
            }
            else {
                const countCheck = await this.query('SELECT COUNT(*) AS total FROM culturas');
                if (Number(countCheck.rows[0]?.total || 0) === 0) {
                    console.log('[DatabaseConnection] Tabelas vazias. Executando script.sql...');
                    await this.seedDefaultScript();
                }
            }
        }
        catch (err) {
            console.warn('[DatabaseConnection] Aplicando script.sql de inicialização...', err);
            await this.seedDefaultScript();
        }
    }
    async seedDefaultScript() {
        const candidates = [
            path.resolve(__dirname, '../../database/script.sql'),
            path.resolve(__dirname, '../../../script.sql'),
        ];
        const scriptPath = candidates.find((p) => fs.existsSync(p));
        if (!scriptPath) {
            throw new Error('Arquivo script.sql não encontrado.');
        }
        await this.executeSqlScript(scriptPath);
    }
    async query(sql, params = []) {
        return this.pool.query(sql, params);
    }
    async withTransaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async executeSqlScript(filePath) {
        const sqlContent = fs.readFileSync(filePath, 'utf-8');
        const client = await this.pool.connect();
        try {
            await client.query(sqlContent);
            console.log(`[DatabaseConnection] Script SQL executado com sucesso: ${filePath}`);
        }
        finally {
            client.release();
        }
    }
    async checkHealth() {
        const res = await this.query('SELECT NOW()::text AS now');
        return {
            connected: true,
            database: this.dbName,
            timestamp: res.rows[0]?.now || new Date().toISOString(),
        };
    }
};
exports.DatabaseConnection = DatabaseConnection;
exports.DatabaseConnection = DatabaseConnection = DatabaseConnection_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DatabaseConnection);
