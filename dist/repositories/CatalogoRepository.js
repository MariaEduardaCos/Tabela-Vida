"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogoRepository = void 0;
const common_1 = require("@nestjs/common");
const DatabaseConnection_1 = require("../config/DatabaseConnection");
let CatalogoRepository = class CatalogoRepository {
    db;
    constructor(db = DatabaseConnection_1.DatabaseConnection.getInstance()) {
        this.db = db;
    }
    getDefaultStagesForPraga(ordem) {
        return ['Ovo (Ov)', 'Ninfa 1 (N1)', 'Ninfa 2 (N2)', 'Ninfa 3 (N3)', 'Ninfa 4 (N4)', 'Adulto (Ad)'];
    }
    async listarCulturasComPragas() {
        const culturasRes = await this.db.query(`SELECT id, nome, nome_cientifico, familia, descricao, imagem
       FROM culturas
       ORDER BY nome ASC`);
        const pragasRes = await this.db.query(`SELECT id, cultura_id, nome_comum, nome_cientifico, ordem, fase_critica_tipica, descricao, imagem
       FROM pragas
       ORDER BY nome_comum ASC`);
        const pragasPorCultura = new Map();
        for (const row of pragasRes.rows) {
            const praga = {
                id: row.id,
                culturaId: row.cultura_id,
                nomeComum: row.nome_comum,
                nomeCientifico: row.nome_cientifico,
                ordem: row.ordem || '',
                faseCriticaTipica: row.fase_critica_tipica || 'N3',
                descricao: row.descricao,
                imagem: row.imagem,
                fasesSugeridas: this.getDefaultStagesForPraga(row.ordem),
            };
            const list = pragasPorCultura.get(row.cultura_id) || [];
            list.push(praga);
            pragasPorCultura.set(row.cultura_id, list);
        }
        return culturasRes.rows.map((c) => ({
            id: c.id,
            nome: c.nome,
            nomeCientifico: c.nome_cientifico,
            familia: c.familia,
            descricao: c.descricao,
            imagem: c.imagem,
            pragas: pragasPorCultura.get(c.id) || [],
        }));
    }
    async buscarCulturaPorId(id) {
        const culturas = await this.listarCulturasComPragas();
        return culturas.find((c) => c.id === id) || null;
    }
    async buscarPragaPorId(id) {
        const res = await this.db.query(`SELECT id, cultura_id, nome_comum, nome_cientifico, ordem, fase_critica_tipica, descricao, imagem
       FROM pragas
       WHERE id = $1`, [id]);
        if (res.rowCount === 0)
            return null;
        const row = res.rows[0];
        return {
            id: row.id,
            culturaId: row.cultura_id,
            nomeComum: row.nome_comum,
            nomeCientifico: row.nome_cientifico,
            ordem: row.ordem || '',
            faseCriticaTipica: row.fase_critica_tipica || 'N3',
            descricao: row.descricao,
            imagem: row.imagem,
            fasesSugeridas: this.getDefaultStagesForPraga(row.ordem),
        };
    }
    async listarAreasExperimentais() {
        const res = await this.db.query(`SELECT id, nome, nome_curto, descricao, dms_lat, dms_lng, latitude, longitude
       FROM areas_experimentais
       ORDER BY id ASC`);
        return res.rows.map((r) => ({
            id: r.id,
            nome: r.nome,
            nomeCurto: r.nome_curto,
            descricao: r.descricao,
            dmsLat: r.dms_lat,
            dmsLng: r.dms_lng,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
        }));
    }
    async listarUsuarios() {
        const res = await this.db.query(`SELECT id, nome, email, crea_registro, instituicao, cargo, criado_em
       FROM usuarios
       ORDER BY id ASC`);
        return res.rows.map((u) => ({
            id: Number(u.id),
            nome: u.nome,
            email: u.email,
            creaRegistro: u.crea_registro,
            instituicao: u.instituicao,
            cargo: u.cargo,
            criadoEm: u.criado_em instanceof Date ? u.criado_em.toISOString() : String(u.criado_em),
        }));
    }
};
exports.CatalogoRepository = CatalogoRepository;
exports.CatalogoRepository = CatalogoRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [DatabaseConnection_1.DatabaseConnection])
], CatalogoRepository);
