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
exports.CenarioService = void 0;
const common_1 = require("@nestjs/common");
const DomainModels_1 = require("../models/DomainModels");
const CatalogoRepository_1 = require("../repositories/CatalogoRepository");
const CenarioRepository_1 = require("../repositories/CenarioRepository");
const LifeTableMathEngine_1 = require("./LifeTableMathEngine");
// Matriz experimental padrão (10 talhões x 10 amostras) da planilha dados.xlsx
const PLANILHA_DADOS_PADRAO = [
    {
        Ov: [9, 0, 8, 6, 5, 2, 5, 0, 0, 2],
        N1: [0, 0, 0, 0, 0, 3, 0, 0, 0, 0],
        N2: [0, 0, 2, 0, 0, 0, 1, 1, 0, 0],
        N3: [1, 0, 1, 0, 2, 1, 3, 8, 0, 5],
        N4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        Ad: [4, 4, 4, 0, 4, 4, 4, 4, 4, 4],
    },
    {
        Ov: [9, 0, 8, 6, 5, 2, 5, 0, 0, 2],
        N1: [0, 0, 0, 0, 0, 3, 0, 0, 0, 0],
        N2: [0, 0, 2, 0, 0, 0, 1, 1, 0, 0],
        N3: [1, 0, 1, 0, 2, 1, 3, 8, 0, 5],
        N4: [0, 0, 0, 0, 0, 2, 0, 0, 0, 1],
        Ad: [4, 4, 4, 0, 4, 4, 4, 4, 4, 4],
    },
    {
        Ov: [1, 2, 4, 3, 7, 0, 10, 5, 0, 0],
        N1: [0, 0, 2, 2, 0, 0, 0, 0, 0, 0],
        N2: [0, 0, 0, 3, 0, 0, 0, 0, 0, 0],
        N3: [0, 0, 0, 1, 2, 0, 0, 1, 0, 0],
        N4: [0, 0, 0, 1, 1, 0, 1, 0, 1, 0],
        Ad: [5, 1, 7, 3, 9, 3, 4, 2, 2, 1],
    },
    {
        Ov: [0, 7, 0, 0, 3, 16, 25, 12, 5, 0],
        N1: [2, 0, 0, 1, 0, 1, 6, 4, 7, 0],
        N2: [0, 0, 0, 0, 0, 0, 2, 5, 0, 0],
        N3: [0, 3, 0, 0, 0, 0, 0, 3, 0, 0],
        N4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        Ad: [1, 2, 1, 1, 3, 2, 7, 14, 2, 1],
    },
    {
        Ov: [0, 2, 2, 2, 0, 0, 5, 0, 2, 2],
        N1: [0, 0, 1, 0, 0, 0, 7, 0, 6, 0],
        N2: [0, 0, 3, 0, 0, 0, 0, 0, 2, 1],
        N3: [0, 5, 2, 0, 0, 0, 0, 0, 3, 4],
        N4: [0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        Ad: [1, 1, 2, 1, 2, 1, 2, 1, 1, 1],
    },
    {
        Ov: [5, 2, 7, 9, 4, 0, 5, 1, 2, 2],
        N1: [0, 0, 3, 0, 2, 2, 0, 0, 6, 0],
        N2: [0, 0, 1, 0, 0, 2, 0, 0, 2, 1],
        N3: [0, 0, 0, 0, 0, 1, 1, 0, 3, 4],
        N4: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
        Ad: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
    },
    {
        Ov: [4, 0, 0, 0, 6, 0, 7, 0, 3, 1],
        N1: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        N2: [0, 0, 3, 0, 0, 0, 3, 0, 2, 0],
        N3: [6, 0, 7, 2, 3, 1, 7, 0, 4, 6],
        N4: [0, 0, 4, 0, 0, 0, 0, 0, 0, 0],
        Ad: [7, 8, 9, 11, 2, 2, 3, 5, 1, 2],
    },
    {
        Ov: [9, 0, 1, 2, 1, 2, 0, 7, 5, 2],
        N1: [0, 0, 2, 4, 0, 0, 2, 0, 0, 0],
        N2: [0, 0, 0, 3, 0, 0, 0, 0, 0, 0],
        N3: [1, 0, 0, 1, 0, 0, 0, 3, 0, 0],
        N4: [0, 0, 4, 0, 0, 0, 0, 0, 0, 0],
        Ad: [1, 1, 5, 1, 1, 1, 1, 2, 1, 1],
    },
    {
        Ov: [8, 1, 8, 9, 4, 3, 0, 0, 7, 9],
        N1: [0, 0, 0, 0, 0, 0, 0, 1, 3, 0],
        N2: [2, 0, 0, 0, 0, 3, 0, 0, 1, 0],
        N3: [1, 0, 3, 0, 0, 1, 0, 0, 0, 0],
        N4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        Ad: [1, 1, 2, 1, 1, 1, 1, 1, 1, 1],
    },
    {
        Ov: [8, 1, 8, 9, 4, 3, 0, 0, 7, 9],
        N1: [0, 0, 0, 0, 0, 0, 0, 1, 3, 0],
        N2: [2, 0, 0, 0, 0, 3, 0, 0, 1, 0],
        N3: [1, 0, 3, 0, 0, 1, 0, 0, 0, 0],
        N4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        Ad: [1, 1, 2, 1, 1, 1, 1, 1, 1, 1],
    },
];
let CenarioService = class CenarioService {
    cenarioRepo;
    catalogoRepo;
    mathEngine;
    constructor(cenarioRepo = new CenarioRepository_1.CenarioRepository(), catalogoRepo = new CatalogoRepository_1.CatalogoRepository(), mathEngine = new LifeTableMathEngine_1.LifeTableMathEngine()) {
        this.cenarioRepo = cenarioRepo;
        this.catalogoRepo = catalogoRepo;
        this.mathEngine = mathEngine;
    }
    async listarCenarios() {
        return this.cenarioRepo.listarTodosCenariosCompletos();
    }
    async buscarCenarioComAnalise(id) {
        const cenario = await this.cenarioRepo.buscarCenarioPorId(id);
        if (!cenario) {
            throw new DomainModels_1.ApiException(404, `Cenário analítico "${id}" não encontrado.`);
        }
        const analise = this.mathEngine.computeCompleteAnalysis(cenario.plots, cenario.stages, false);
        return { cenario, analise };
    }
    async criarNovoCenario(dto) {
        if (!dto.culturaId || !dto.pragaId) {
            throw new DomainModels_1.ApiException(400, 'Cultura agrícola e praga-alvo são obrigatórias.');
        }
        const numTalhoes = Math.max(2, Math.min(100, Number(dto.numTalhoes) || 10));
        const numAmostras = Math.max(1, Math.min(100, Number(dto.numAmostrasPorTalhao) || 10));
        const cultura = await this.catalogoRepo.buscarCulturaPorId(dto.culturaId);
        if (!cultura) {
            throw new DomainModels_1.ApiException(404, `Cultura "${dto.culturaId}" não encontrada no catálogo.`);
        }
        const praga = await this.catalogoRepo.buscarPragaPorId(dto.pragaId);
        if (!praga) {
            throw new DomainModels_1.ApiException(404, `Praga "${dto.pragaId}" não encontrada no catálogo.`);
        }
        const areas = await this.catalogoRepo.listarAreasExperimentais();
        const defaultArea = areas.find((a) => a.id === dto.areaExperimentalId) ||
            areas.find((a) => a.id === 'fontes-do-saber') ||
            areas[0];
        const stages = dto.stages && dto.stages.length >= 2
            ? dto.stages
            : [
                { id: 'Ov', label: 'Ovo (Ov)', isInitial: true, isTerminal: false, isNymph: false },
                { id: 'N1', label: 'Ninfa 1 (N1)', isInitial: false, isTerminal: false, isNymph: true },
                { id: 'N2', label: 'Ninfa 2 (N2)', isInitial: false, isTerminal: false, isNymph: true },
                { id: 'N3', label: 'Ninfa 3 (N3)', isInitial: false, isTerminal: false, isNymph: true },
                { id: 'N4', label: 'Ninfa 4 (N4)', isInitial: false, isTerminal: false, isNymph: true },
                { id: 'Ad', label: 'Adulto (Ad)', isInitial: false, isTerminal: true, isNymph: false },
            ];
        let plots;
        if (dto.plots && dto.plots.length >= 2) {
            plots = dto.plots;
        }
        else {
            plots = [];
            for (let t = 1; t <= numTalhoes; t++) {
                const areaForPlot = areas[(t - 1) % Math.max(1, areas.length)] || defaultArea;
                const baseSamples = PLANILHA_DADOS_PADRAO[(t - 1) % PLANILHA_DADOS_PADRAO.length];
                const samples = {};
                for (const st of stages) {
                    const arr = [];
                    for (let s = 0; s < numAmostras; s++) {
                        if (dto.zerado) {
                            arr.push(0);
                        }
                        else {
                            const refArr = baseSamples[st.id] || [];
                            arr.push(refArr[s % Math.max(1, refArr.length)] ?? 0);
                        }
                    }
                    samples[st.id] = arr;
                }
                const sampleLocations = this.gerarCoordenadasAmostras(areaForPlot, t, numAmostras);
                plots.push({
                    id: t,
                    name: `Talhão ${t}`,
                    areaId: areaForPlot?.id || 'fontes-do-saber',
                    samples,
                    sampleLocations,
                });
            }
        }
        const id = `cen-unirv-${Date.now()}`;
        const nome = dto.nome?.trim() || `Monitoramento ${praga.nomeComum} em ${cultura.nome} — UniRV`;
        const criadoPor = dto.criadoPor?.trim() || 'Eng. Agr. Dr. Sérgio';
        const observacoes = dto.observacoes?.trim() ||
            `Marcha analítica (${numTalhoes} talhões × ${numAmostras} amostras) para ${praga.nomeComum} (${praga.nomeCientifico}) na cultura de ${cultura.nome}.`;
        return this.cenarioRepo.criarCenario({
            id,
            nome,
            criadoPor,
            culturaId: cultura.id,
            pragaId: praga.id,
            areaExperimentalId: defaultArea?.id || 'fontes-do-saber',
            numTalhoes: plots.length,
            numAmostrasPorTalhao: numAmostras,
            observacoes,
            ativo: true,
            stages,
            plots,
        });
    }
    async atualizarMetadados(id, dto) {
        if (!dto.nome || !dto.nome.trim()) {
            throw new DomainModels_1.ApiException(400, 'O nome do cenário analítico não pode ser vazio.');
        }
        const updated = await this.cenarioRepo.atualizarMetadados(id, {
            nome: dto.nome.trim(),
            criadoPor: dto.criadoPor?.trim() || 'Eng. Agr. Dr. Sérgio',
            observacoes: dto.observacoes,
            ativo: dto.ativo,
        });
        if (!updated) {
            throw new DomainModels_1.ApiException(404, `Cenário "${id}" não encontrado.`);
        }
        return updated;
    }
    async sincronizarColeta(id, dto) {
        if (!dto.stages || dto.stages.length < 2) {
            throw new DomainModels_1.ApiException(400, 'O cenário deve possuir ao menos 2 estágios fenológicos.');
        }
        if (!dto.plots || dto.plots.length < 2) {
            throw new DomainModels_1.ApiException(400, 'O cenário deve possuir ao menos 2 talhões para viabilizar a regressão estatística (RN009).');
        }
        const updated = await this.cenarioRepo.substituirTalhoesEFases(id, dto.stages, dto.plots, dto.ativo);
        if (!updated) {
            throw new DomainModels_1.ApiException(404, `Cenário "${id}" não encontrado.`);
        }
        return updated;
    }
    async atualizarCelulaContagem(cenarioId, numeroTalhao, codigoFase, indiceAmostra, quantidade) {
        if (quantidade < 0 || !Number.isFinite(quantidade)) {
            throw new DomainModels_1.ApiException(400, 'A contagem de indivíduos deve ser um número não-negativo.');
        }
        await this.cenarioRepo.atualizarValorAmostra(cenarioId, numeroTalhao, codigoFase, indiceAmostra, quantidade);
    }
    async moverRegiaoDoTalhao(cenarioId, numeroTalhao, payload) {
        const cenario = await this.cenarioRepo.buscarCenarioPorId(cenarioId);
        if (!cenario) {
            throw new DomainModels_1.ApiException(404, `Cenário "${cenarioId}" não encontrado.`);
        }
        const plot = cenario.plots.find((p) => p.id === numeroTalhao) ||
            cenario.plots[numeroTalhao - 1];
        if (!plot) {
            throw new DomainModels_1.ApiException(404, `Talhão ${numeroTalhao} não encontrado no cenário.`);
        }
        const areas = await this.catalogoRepo.listarAreasExperimentais();
        let targetLat = Number(payload.lat);
        let targetLng = Number(payload.lng);
        let targetAreaId = payload.areaId || plot.areaId || 'fontes-do-saber';
        if (payload.areaId && (!Number.isFinite(targetLat) || !Number.isFinite(targetLng))) {
            const areaObj = areas.find((a) => a.id === payload.areaId);
            if (areaObj) {
                targetLat = areaObj.latitude;
                targetLng = areaObj.longitude;
            }
        }
        if (Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
            // Identifica a estação experimental da UniRV mais próxima (RN012)
            let minDist = Infinity;
            for (const area of areas) {
                const d = Math.pow(area.latitude - targetLat, 2) +
                    Math.pow(area.longitude - targetLng, 2);
                if (d < minDist) {
                    minDist = d;
                    targetAreaId = area.id;
                }
            }
        }
        let novasAmostras = [];
        if (payload.sampleLocations && payload.sampleLocations.length > 0) {
            novasAmostras = payload.sampleLocations.map((s, i) => ({
                index: s.index ?? i,
                lat: Number(s.lat),
                lng: Number(s.lng),
                timestamp: s.timestamp || '2026-11-10 08:30',
                label: s.label,
            }));
        }
        else if (payload.moveAllSamples === false &&
            typeof payload.sampleIndex === 'number' &&
            Number.isFinite(targetLat) &&
            Number.isFinite(targetLng)) {
            // Move apenas a amostra selecionada
            novasAmostras = plot.sampleLocations.map((loc, idx) => idx === payload.sampleIndex
                ? {
                    ...loc,
                    index: idx,
                    lat: Number(targetLat.toFixed(6)),
                    lng: Number(targetLng.toFixed(6)),
                }
                : { ...loc, index: idx });
        }
        else if (Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
            // Translada todas as amostras do talhão preservando a dispersão relativa (RN012)
            const currentLocs = plot.sampleLocations;
            if (currentLocs.length > 0) {
                const centerLat = currentLocs.reduce((acc, p) => acc + p.lat, 0) / currentLocs.length;
                const centerLng = currentLocs.reduce((acc, p) => acc + p.lng, 0) / currentLocs.length;
                const dLat = targetLat - centerLat;
                const dLng = targetLng - centerLng;
                novasAmostras = currentLocs.map((loc, idx) => ({
                    ...loc,
                    index: idx,
                    lat: Number((loc.lat + dLat).toFixed(6)),
                    lng: Number((loc.lng + dLng).toFixed(6)),
                }));
            }
            else {
                const refArea = areas.find((a) => a.id === targetAreaId) || {
                    id: 'fontes-do-saber',
                    nome: 'Fazenda Fontes do Saber',
                    nomeCurto: 'Faz. Fontes do Saber',
                    descricao: '',
                    dmsLat: '',
                    dmsLng: '',
                    latitude: targetLat,
                    longitude: targetLng,
                };
                novasAmostras = this.gerarCoordenadasAmostras(refArea, numeroTalhao, cenario.numAmostrasPorTalhao);
            }
        }
        else {
            novasAmostras = plot.sampleLocations;
        }
        const updated = await this.cenarioRepo.moverRegiaoTalhao(cenarioId, plot.id, targetAreaId, novasAmostras);
        if (!updated) {
            throw new DomainModels_1.ApiException(404, 'Falha ao atualizar coordenadas do talhão.');
        }
        return updated;
    }
    async duplicarCenario(id) {
        const novoId = `${id}-copia-${Date.now().toString().slice(-5)}`;
        const duplicado = await this.cenarioRepo.duplicarCenario(id, novoId);
        if (!duplicado) {
            throw new DomainModels_1.ApiException(404, `Cenário "${id}" não encontrado para duplicação.`);
        }
        return duplicado;
    }
    async excluirCenario(id) {
        const total = await this.cenarioRepo.contarCenarios();
        if (total <= 1) {
            throw new DomainModels_1.ApiException(400, 'RN006: Não é permitido excluir o último cenário ativo do sistema.');
        }
        const ok = await this.cenarioRepo.excluirCenario(id);
        if (!ok) {
            throw new DomainModels_1.ApiException(404, `Cenário "${id}" não encontrado.`);
        }
    }
    gerarCoordenadasAmostras(area, numeroTalhao, numAmostras) {
        const baseLat = area?.latitude ?? -17.785303;
        const baseLng = area?.longitude ?? -50.964869;
        const pts = [];
        for (let idx = 0; idx < numAmostras; idx++) {
            const lat = baseLat -
                Math.floor(idx / 5) * 0.00028 +
                (idx % 2) * 0.00005 -
                numeroTalhao * 0.00012;
            const lng = baseLng +
                ((idx % 5) - 2) * 0.00032 +
                (numeroTalhao % 3) * 0.00018;
            pts.push({
                index: idx,
                lat: Number(lat.toFixed(6)),
                lng: Number(lng.toFixed(6)),
                timestamp: '2026-11-10 08:30',
                label: `${area?.nomeCurto || 'UniRV'} — Talhão ${numeroTalhao} — Amostra ${idx + 1}`,
            });
        }
        return pts;
    }
};
exports.CenarioService = CenarioService;
exports.CenarioService = CenarioService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [CenarioRepository_1.CenarioRepository,
        CatalogoRepository_1.CatalogoRepository,
        LifeTableMathEngine_1.LifeTableMathEngine])
], CenarioService);
