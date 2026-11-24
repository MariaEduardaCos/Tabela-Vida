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
exports.CatalogoService = void 0;
const common_1 = require("@nestjs/common");
const DomainModels_1 = require("../models/DomainModels");
const CatalogoRepository_1 = require("../repositories/CatalogoRepository");
let CatalogoService = class CatalogoService {
    catalogoRepo;
    constructor(catalogoRepo = new CatalogoRepository_1.CatalogoRepository()) {
        this.catalogoRepo = catalogoRepo;
    }
    async listarCulturasComPragas() {
        return this.catalogoRepo.listarCulturasComPragas();
    }
    async buscarCulturaPorId(id) {
        if (!id || !id.trim()) {
            throw new DomainModels_1.ApiException(400, 'O identificador da cultura é obrigatório.');
        }
        const cultura = await this.catalogoRepo.buscarCulturaPorId(id.trim());
        if (!cultura) {
            throw new DomainModels_1.ApiException(404, `Cultura agrícola "${id}" não encontrada.`);
        }
        return cultura;
    }
    async buscarPragaPorId(id) {
        if (!id || !id.trim()) {
            throw new DomainModels_1.ApiException(400, 'O identificador da praga é obrigatório.');
        }
        const praga = await this.catalogoRepo.buscarPragaPorId(id.trim());
        if (!praga) {
            throw new DomainModels_1.ApiException(404, `Praga entomológica "${id}" não encontrada.`);
        }
        return praga;
    }
    async listarAreasUnirv() {
        return this.catalogoRepo.listarAreasExperimentais();
    }
    async listarUsuarios() {
        return this.catalogoRepo.listarUsuarios();
    }
};
exports.CatalogoService = CatalogoService;
exports.CatalogoService = CatalogoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [CatalogoRepository_1.CatalogoRepository])
], CatalogoService);
