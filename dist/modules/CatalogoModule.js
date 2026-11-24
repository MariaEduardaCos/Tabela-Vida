"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogoModule = void 0;
const common_1 = require("@nestjs/common");
const CatalogoController_1 = require("../controllers/CatalogoController");
const CatalogoRepository_1 = require("../repositories/CatalogoRepository");
const CatalogoService_1 = require("../services/CatalogoService");
let CatalogoModule = class CatalogoModule {
};
exports.CatalogoModule = CatalogoModule;
exports.CatalogoModule = CatalogoModule = __decorate([
    (0, common_1.Module)({
        controllers: [CatalogoController_1.CatalogoController],
        providers: [CatalogoRepository_1.CatalogoRepository, CatalogoService_1.CatalogoService],
        exports: [CatalogoRepository_1.CatalogoRepository, CatalogoService_1.CatalogoService],
    })
], CatalogoModule);
