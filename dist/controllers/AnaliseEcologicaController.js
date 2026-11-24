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
exports.AnaliseEcologicaController = void 0;
const common_1 = require("@nestjs/common");
const DomainModels_1 = require("../models/DomainModels");
const LifeTableMathEngine_1 = require("../services/LifeTableMathEngine");
let AnaliseEcologicaController = class AnaliseEcologicaController {
    mathEngine;
    constructor(mathEngine) {
        this.mathEngine = mathEngine;
    }
    calcularTabelaDeVida(body) {
        const { plots, stages, useStaticRef100rx } = body;
        if (!plots || !Array.isArray(plots) || !stages || !Array.isArray(stages)) {
            throw new DomainModels_1.ApiException(400, 'Payload inválido: informe "plots" (talhões) e "stages" (fases de desenvolvimento).');
        }
        return this.mathEngine.computeCompleteAnalysis(plots, stages, Boolean(useStaticRef100rx));
    }
};
exports.AnaliseEcologicaController = AnaliseEcologicaController;
__decorate([
    (0, common_1.Post)('calcular'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnaliseEcologicaController.prototype, "calcularTabelaDeVida", null);
exports.AnaliseEcologicaController = AnaliseEcologicaController = __decorate([
    (0, common_1.Controller)('analise'),
    __metadata("design:paramtypes", [LifeTableMathEngine_1.LifeTableMathEngine])
], AnaliseEcologicaController);
