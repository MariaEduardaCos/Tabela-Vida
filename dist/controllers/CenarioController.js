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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CenarioController = void 0;
const common_1 = require("@nestjs/common");
const DomainModels_1 = require("../models/DomainModels");
const CenarioService_1 = require("../services/CenarioService");
let CenarioController = class CenarioController {
    cenarioService;
    constructor(cenarioService) {
        this.cenarioService = cenarioService;
    }
    listarCenarios() {
        return this.cenarioService.listarCenarios();
    }
    buscarCenario(id) {
        return this.cenarioService.buscarCenarioComAnalise(id);
    }
    criarCenario(body) {
        return this.cenarioService.criarNovoCenario(body);
    }
    atualizarMetadados(id, body) {
        return this.cenarioService.atualizarMetadados(id, body);
    }
    sincronizarColeta(id, body) {
        return this.cenarioService.sincronizarColeta(id, body);
    }
    async atualizarCelulaContagem(cenarioId, num, body) {
        const numeroTalhao = Number(num);
        const codigoFase = body.codigoFase || body.stageId;
        const indiceAmostra = body.indiceAmostra ?? body.sampleIndex;
        const quantidade = body.quantidade ?? body.value;
        if (!codigoFase || typeof indiceAmostra !== 'number' || typeof quantidade !== 'number') {
            throw new DomainModels_1.ApiException(400, 'Parâmetros obrigatórios: codigoFase (ou stageId), indiceAmostra (ou sampleIndex) e quantidade (ou value).');
        }
        await this.cenarioService.atualizarCelulaContagem(cenarioId, numeroTalhao, codigoFase, indiceAmostra, quantidade);
        return { ok: true, cenarioId, numeroTalhao, codigoFase, indiceAmostra, quantidade };
    }
    moverRegiaoTalhao(cenarioId, num, body) {
        return this.cenarioService.moverRegiaoDoTalhao(cenarioId, Number(num), body);
    }
    duplicarCenario(id) {
        return this.cenarioService.duplicarCenario(id);
    }
    async excluirCenario(id) {
        await this.cenarioService.excluirCenario(id);
        return { ok: true, id };
    }
};
exports.CenarioController = CenarioController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CenarioController.prototype, "listarCenarios", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CenarioController.prototype, "buscarCenario", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CenarioController.prototype, "criarCenario", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CenarioController.prototype, "atualizarMetadados", null);
__decorate([
    (0, common_1.Put)(':id/coleta'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CenarioController.prototype, "sincronizarColeta", null);
__decorate([
    (0, common_1.Patch)(':id/talhoes/:num/contagem'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('num')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CenarioController.prototype, "atualizarCelulaContagem", null);
__decorate([
    (0, common_1.Post)(':id/talhoes/:num/mover-regiao'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('num')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CenarioController.prototype, "moverRegiaoTalhao", null);
__decorate([
    (0, common_1.Post)(':id/duplicar'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CenarioController.prototype, "duplicarCenario", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CenarioController.prototype, "excluirCenario", null);
exports.CenarioController = CenarioController = __decorate([
    (0, common_1.Controller)('cenarios'),
    __metadata("design:paramtypes", [CenarioService_1.CenarioService])
], CenarioController);
