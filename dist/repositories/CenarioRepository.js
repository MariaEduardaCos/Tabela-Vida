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
exports.CenarioRepository = void 0;
const common_1 = require("@nestjs/common");
const DatabaseConnection_1 = require("../config/DatabaseConnection");
let CenarioRepository = class CenarioRepository {
    db;
    constructor(db = DatabaseConnection_1.DatabaseConnection.getInstance()) {
        this.db = db;
    }
    async contarCenarios() {
        const res = await this.db.query('SELECT COUNT(*) AS total FROM cenarios_analiticos');
        return Number(res.rows[0]?.total || 0);
    }
    async listarTodosCenariosCompletos() {
        const cenariosRes = await this.db.query(`SELECT 
         c.id, c.nome, c.usuario_id, c.usuario_nome, c.cultura_id, c.praga_id,
         c.area_experimental_id, c.num_talhoes, c.num_amostras_por_talhao,
         c.observacoes, c.ativo, c.criado_em, c.atualizado_em,
         cu.nome AS cultura_nome, cu.nome_cientifico AS cultura_cientifico,
         p.nome_comum AS praga_nome, p.nome_cientifico AS praga_cientifico
       FROM cenarios_analiticos c
       JOIN culturas cu ON cu.id = c.cultura_id
       JOIN pragas p ON p.id = c.praga_id
       ORDER BY c.ativo DESC, c.criado_em DESC`);
        if (cenariosRes.rowCount === 0)
            return [];
        const fasesRes = await this.db.query(`SELECT cenario_id, codigo_fase, label, ordem, is_initial, is_terminal, is_nymph
       FROM cenario_fases
       ORDER BY cenario_id, ordem ASC`);
        const talhoesRes = await this.db.query(`SELECT id, cenario_id, numero_talhao, nome, area_experimental_id
       FROM talhoes
       ORDER BY cenario_id, numero_talhao ASC`);
        const amostrasRes = await this.db.query(`SELECT talhao_id, indice_amostra, latitude, longitude, data_hora_coleta, observacao
       FROM amostras_coleta
       ORDER BY talhao_id, indice_amostra ASC`);
        const contagensRes = await this.db.query(`SELECT talhao_id, indice_amostra, codigo_fase, quantidade
       FROM contagens_fase
       ORDER BY talhao_id, codigo_fase, indice_amostra ASC`);
        const fasesPorCenario = new Map();
        for (const f of fasesRes.rows) {
            const list = fasesPorCenario.get(f.cenario_id) || [];
            list.push({
                id: f.codigo_fase,
                label: f.label,
                ordem: Number(f.ordem),
                isInitial: Boolean(f.is_initial),
                isTerminal: Boolean(f.is_terminal),
                isNymph: Boolean(f.is_nymph),
            });
            fasesPorCenario.set(f.cenario_id, list);
        }
        const amostrasPorTalhao = new Map();
        for (const a of amostrasRes.rows) {
            const tId = Number(a.talhao_id);
            const list = amostrasPorTalhao.get(tId) || [];
            list.push({
                index: Number(a.indice_amostra),
                lat: Number(a.latitude),
                lng: Number(a.longitude),
                timestamp: a.data_hora_coleta || '2026-11-10 08:30',
                label: a.observacao || undefined,
            });
            amostrasPorTalhao.set(tId, list);
        }
        const contagensPorTalhao = new Map();
        for (const ct of contagensRes.rows) {
            const tId = Number(ct.talhao_id);
            let faseMap = contagensPorTalhao.get(tId);
            if (!faseMap) {
                faseMap = new Map();
                contagensPorTalhao.set(tId, faseMap);
            }
            let idxMap = faseMap.get(ct.codigo_fase);
            if (!idxMap) {
                idxMap = new Map();
                faseMap.set(ct.codigo_fase, idxMap);
            }
            idxMap.set(Number(ct.indice_amostra), Number(ct.quantidade));
        }
        const talhoesPorCenario = new Map();
        for (const t of talhoesRes.rows) {
            const tDbId = Number(t.id);
            const cId = t.cenario_id;
            const stages = fasesPorCenario.get(cId) || [];
            const cenarioRow = cenariosRes.rows.find((c) => c.id === cId);
            const numAmostras = Number(cenarioRow?.num_amostras_por_talhao || 10);
            const locations = amostrasPorTalhao.get(tDbId) || [];
            const faseMap = contagensPorTalhao.get(tDbId) || new Map();
            const samples = {};
            const maxSamples = Math.max(numAmostras, locations.length, 1);
            for (const st of stages) {
                const idxMap = faseMap.get(st.id);
                const arr = [];
                for (let i = 0; i < maxSamples; i++) {
                    arr.push(idxMap?.get(i) ?? 0);
                }
                samples[st.id] = arr;
            }
            const list = talhoesPorCenario.get(cId) || [];
            list.push({
                id: Number(t.numero_talhao),
                name: t.nome,
                areaId: t.area_experimental_id || cenarioRow?.area_experimental_id || 'fontes-do-saber',
                samples,
                sampleLocations: locations,
            });
            talhoesPorCenario.set(cId, list);
        }
        return cenariosRes.rows.map((c) => {
            const stages = fasesPorCenario.get(c.id) || [];
            const plots = talhoesPorCenario.get(c.id) || [];
            return {
                id: c.id,
                nome: c.nome,
                criadoPor: c.usuario_nome,
                usuarioId: c.usuario_id ? Number(c.usuario_id) : null,
                culturaId: c.cultura_id,
                culturaNome: c.cultura_nome,
                culturaCientifico: c.cultura_cientifico,
                pragaId: c.praga_id,
                pragaNome: c.praga_nome,
                pragaCientifico: c.praga_cientifico,
                areaExperimentalId: c.area_experimental_id || 'fontes-do-saber',
                criadoEm: this.formatTimestamp(c.criado_em),
                atualizadoEm: this.formatTimestamp(c.atualizado_em),
                observacoes: c.observacoes || '',
                numTalhoes: plots.length || Number(c.num_talhoes),
                numAmostrasPorTalhao: plots[0]?.sampleLocations.length || Number(c.num_amostras_por_talhao),
                ativo: Boolean(c.ativo),
                stages,
                plots,
            };
        });
    }
    async buscarCenarioPorId(id) {
        const todos = await this.listarTodosCenariosCompletos();
        return todos.find((c) => c.id === id) || null;
    }
    async criarCenario(cenario) {
        await this.db.withTransaction(async (client) => {
            if (cenario.ativo) {
                await client.query('UPDATE cenarios_analiticos SET ativo = FALSE');
            }
            await client.query(`INSERT INTO cenarios_analiticos (
           id, nome, usuario_id, usuario_nome, cultura_id, praga_id,
           area_experimental_id, num_talhoes, num_amostras_por_talhao,
           observacoes, ativo, criado_em, atualizado_em
         ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [
                cenario.id,
                cenario.nome,
                cenario.criadoPor,
                cenario.culturaId,
                cenario.pragaId,
                cenario.areaExperimentalId,
                cenario.numTalhoes,
                cenario.numAmostrasPorTalhao,
                cenario.observacoes,
                cenario.ativo,
            ]);
            await this.inserirFasesETalhoesInterno(client, cenario.id, cenario.stages, cenario.plots, cenario.areaExperimentalId);
        });
        const created = await this.buscarCenarioPorId(cenario.id);
        if (!created)
            throw new Error('Falha ao carregar cenário recém-criado.');
        return created;
    }
    async atualizarMetadados(id, dto) {
        await this.db.withTransaction(async (client) => {
            if (dto.ativo === true) {
                await client.query('UPDATE cenarios_analiticos SET ativo = FALSE');
            }
            await client.query(`UPDATE cenarios_analiticos
         SET nome = COALESCE($2, nome),
             usuario_nome = COALESCE($3, usuario_nome),
             observacoes = COALESCE($4, observacoes),
             ativo = COALESCE($5, ativo),
             atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $1`, [id, dto.nome, dto.criadoPor, dto.observacoes ?? null, dto.ativo ?? null]);
        });
        return this.buscarCenarioPorId(id);
    }
    async substituirTalhoesEFases(cenarioId, stages, plots, ativo) {
        await this.db.withTransaction(async (client) => {
            if (ativo === true) {
                await client.query('UPDATE cenarios_analiticos SET ativo = FALSE');
            }
            const numTalhoes = Math.max(2, plots.length);
            const numAmostras = Math.max(1, plots[0]?.sampleLocations?.length ||
                Object.values(plots[0]?.samples || {})[0]?.length ||
                10);
            await client.query(`UPDATE cenarios_analiticos
         SET num_talhoes = $2,
             num_amostras_por_talhao = $3,
             ativo = COALESCE($4, ativo),
             atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $1`, [cenarioId, numTalhoes, numAmostras, ativo ?? null]);
            await client.query('DELETE FROM cenario_fases WHERE cenario_id = $1', [cenarioId]);
            await client.query('DELETE FROM talhoes WHERE cenario_id = $1', [cenarioId]);
            await this.inserirFasesETalhoesInterno(client, cenarioId, stages, plots, plots[0]?.areaId || 'fontes-do-saber');
        });
        return this.buscarCenarioPorId(cenarioId);
    }
    async atualizarValorAmostra(cenarioId, numeroTalhao, codigoFase, indiceAmostra, quantidade) {
        await this.db.withTransaction(async (client) => {
            const tRes = await client.query('SELECT id FROM talhoes WHERE cenario_id = $1 AND numero_talhao = $2', [cenarioId, numeroTalhao]);
            if (tRes.rowCount === 0)
                return;
            const talhaoDbId = tRes.rows[0].id;
            await client.query(`INSERT INTO contagens_fase (talhao_id, indice_amostra, codigo_fase, quantidade)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (talhao_id, indice_amostra, codigo_fase)
         DO UPDATE SET quantidade = EXCLUDED.quantidade`, [talhaoDbId, indiceAmostra, codigoFase, Math.max(0, Number(quantidade) || 0)]);
            await client.query('UPDATE cenarios_analiticos SET atualizado_em = CURRENT_TIMESTAMP WHERE id = $1', [cenarioId]);
        });
    }
    async moverRegiaoTalhao(cenarioId, numeroTalhao, areaExperimentalId, novasAmostras) {
        await this.db.withTransaction(async (client) => {
            const tRes = await client.query('SELECT id FROM talhoes WHERE cenario_id = $1 AND numero_talhao = $2', [cenarioId, numeroTalhao]);
            if (tRes.rowCount === 0)
                return;
            const talhaoDbId = tRes.rows[0].id;
            if (areaExperimentalId) {
                await client.query('UPDATE talhoes SET area_experimental_id = $2 WHERE id = $1', [talhaoDbId, areaExperimentalId]);
            }
            for (const pt of novasAmostras) {
                await client.query(`INSERT INTO amostras_coleta (talhao_id, indice_amostra, latitude, longitude, data_hora_coleta, observacao)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (talhao_id, indice_amostra)
           DO UPDATE SET
             latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude,
             data_hora_coleta = COALESCE(EXCLUDED.data_hora_coleta, amostras_coleta.data_hora_coleta),
             observacao = COALESCE(EXCLUDED.observacao, amostras_coleta.observacao)`, [
                    talhaoDbId,
                    pt.index,
                    Number(pt.lat.toFixed(6)),
                    Number(pt.lng.toFixed(6)),
                    pt.timestamp || '2026-11-10 08:30',
                    pt.label || null,
                ]);
            }
            await client.query('UPDATE cenarios_analiticos SET atualizado_em = CURRENT_TIMESTAMP WHERE id = $1', [cenarioId]);
        });
        return this.buscarCenarioPorId(cenarioId);
    }
    async duplicarCenario(cenarioOrigemId, novoId) {
        const origem = await this.buscarCenarioPorId(cenarioOrigemId);
        if (!origem)
            return null;
        return this.criarCenario({
            id: novoId,
            nome: `${origem.nome} (Cópia)`,
            criadoPor: origem.criadoPor,
            culturaId: origem.culturaId,
            pragaId: origem.pragaId,
            areaExperimentalId: origem.areaExperimentalId || 'fontes-do-saber',
            numTalhoes: origem.numTalhoes,
            numAmostrasPorTalhao: origem.numAmostrasPorTalhao,
            observacoes: origem.observacoes,
            ativo: false,
            stages: origem.stages,
            plots: origem.plots,
        });
    }
    async excluirCenario(id) {
        return this.db.withTransaction(async (client) => {
            const delRes = await client.query('DELETE FROM cenarios_analiticos WHERE id = $1 RETURNING ativo', [id]);
            if (delRes.rowCount === 0)
                return false;
            const eraAtivo = delRes.rows[0]?.ativo;
            if (eraAtivo) {
                await client.query(`UPDATE cenarios_analiticos
           SET ativo = TRUE
           WHERE id = (SELECT id FROM cenarios_analiticos ORDER BY criado_em DESC LIMIT 1)`);
            }
            return true;
        });
    }
    async inserirFasesETalhoesInterno(client, cenarioId, stages, plots, defaultAreaId) {
        for (let i = 0; i < stages.length; i++) {
            const st = stages[i];
            await client.query(`INSERT INTO cenario_fases (cenario_id, codigo_fase, label, ordem, is_initial, is_terminal, is_nymph)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                cenarioId,
                st.id,
                st.label,
                i + 1,
                Boolean(st.isInitial || i === 0),
                Boolean(st.isTerminal || i === stages.length - 1),
                Boolean(st.isNymph),
            ]);
        }
        for (let pIdx = 0; pIdx < plots.length; pIdx++) {
            const plot = plots[pIdx];
            const numeroTalhao = plot.id || pIdx + 1;
            const tRes = await client.query(`INSERT INTO talhoes (cenario_id, numero_talhao, nome, area_experimental_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`, [
                cenarioId,
                numeroTalhao,
                plot.name || `Talhão ${numeroTalhao}`,
                plot.areaId || defaultAreaId || 'fontes-do-saber',
            ]);
            const talhaoDbId = tRes.rows[0].id;
            const locations = plot.sampleLocations || [];
            for (let sIdx = 0; sIdx < locations.length; sIdx++) {
                const loc = locations[sIdx];
                await client.query(`INSERT INTO amostras_coleta (talhao_id, indice_amostra, latitude, longitude, data_hora_coleta, observacao)
           VALUES ($1, $2, $3, $4, $5, $6)`, [
                    talhaoDbId,
                    sIdx,
                    Number((loc.lat ?? -17.785303).toFixed(6)),
                    Number((loc.lng ?? -50.964869).toFixed(6)),
                    loc.timestamp || '2026-11-10 08:30',
                    loc.label || `Talhão ${numeroTalhao} — Amostra ${sIdx + 1}`,
                ]);
            }
            for (const st of stages) {
                const counts = plot.samples[st.id] || [];
                const totalSamples = Math.max(counts.length, locations.length);
                for (let sIdx = 0; sIdx < totalSamples; sIdx++) {
                    const val = Math.max(0, Number(counts[sIdx] ?? 0));
                    await client.query(`INSERT INTO contagens_fase (talhao_id, indice_amostra, codigo_fase, quantidade)
             VALUES ($1, $2, $3, $4)`, [talhaoDbId, sIdx, st.id, val]);
                }
            }
        }
    }
    formatTimestamp(val) {
        if (!val)
            return '10/11/2026 08:30';
        const d = val instanceof Date ? val : new Date(String(val));
        if (isNaN(d.getTime()))
            return String(val);
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
};
exports.CenarioRepository = CenarioRepository;
exports.CenarioRepository = CenarioRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [DatabaseConnection_1.DatabaseConnection])
], CenarioRepository);
