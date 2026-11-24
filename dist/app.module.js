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
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const DatabaseConnection_1 = require("./config/DatabaseConnection");
const InfraController_1 = require("./controllers/InfraController");
const CatalogoModule_1 = require("./modules/CatalogoModule");
const CenarioModule_1 = require("./modules/CenarioModule");
const DatabaseModule_1 = require("./modules/DatabaseModule");
const MathModule_1 = require("./modules/MathModule");
let AppModule = class AppModule {
    db;
    constructor(db) {
        this.db = db;
    }
    async onModuleInit() {
        await this.db.ensureDatabaseAndSchema();
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [DatabaseModule_1.DatabaseModule, CatalogoModule_1.CatalogoModule, CenarioModule_1.CenarioModule, MathModule_1.MathModule],
        controllers: [InfraController_1.InfraController],
    }),
    __metadata("design:paramtypes", [DatabaseConnection_1.DatabaseConnection])
], AppModule);
