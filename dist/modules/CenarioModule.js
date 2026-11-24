"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CenarioModule = void 0;
const common_1 = require("@nestjs/common");
const CenarioController_1 = require("../controllers/CenarioController");
const CenarioRepository_1 = require("../repositories/CenarioRepository");
const CenarioService_1 = require("../services/CenarioService");
const CatalogoModule_1 = require("./CatalogoModule");
const MathModule_1 = require("./MathModule");
let CenarioModule = class CenarioModule {
};
exports.CenarioModule = CenarioModule;
exports.CenarioModule = CenarioModule = __decorate([
    (0, common_1.Module)({
        imports: [CatalogoModule_1.CatalogoModule, MathModule_1.MathModule],
        controllers: [CenarioController_1.CenarioController],
        providers: [CenarioRepository_1.CenarioRepository, CenarioService_1.CenarioService],
        exports: [CenarioService_1.CenarioService],
    })
], CenarioModule);
