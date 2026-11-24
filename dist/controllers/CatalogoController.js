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
exports.CatalogoController = void 0;
const common_1 = require("@nestjs/common");
const CatalogoService_1 = require("../services/CatalogoService");
let CatalogoController = class CatalogoController {
    catalogoService;
    constructor(catalogoService) {
        this.catalogoService = catalogoService;
    }
    listarCulturas() {
        return this.catalogoService.listarCulturasComPragas();
    }
    buscarCulturaPorId(id) {
        return this.catalogoService.buscarCulturaPorId(id);
    }
    buscarPragaPorId(id) {
        return this.catalogoService.buscarPragaPorId(id);
    }
    listarAreasUnirv() {
        return this.catalogoService.listarAreasUnirv();
    }
    listarUsuarios() {
        return this.catalogoService.listarUsuarios();
    }
};
exports.CatalogoController = CatalogoController;
__decorate([
    (0, common_1.Get)('culturas'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogoController.prototype, "listarCulturas", null);
__decorate([
    (0, common_1.Get)('culturas/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogoController.prototype, "buscarCulturaPorId", null);
__decorate([
    (0, common_1.Get)('pragas/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogoController.prototype, "buscarPragaPorId", null);
__decorate([
    (0, common_1.Get)('areas-unirv'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogoController.prototype, "listarAreasUnirv", null);
__decorate([
    (0, common_1.Get)('usuarios'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogoController.prototype, "listarUsuarios", null);
exports.CatalogoController = CatalogoController = __decorate([
    (0, common_1.Controller)('catalogo'),
    __metadata("design:paramtypes", [CatalogoService_1.CatalogoService])
], CatalogoController);
