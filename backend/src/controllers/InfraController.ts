import { Controller, Get, Post } from '@nestjs/common';
import { DatabaseConnection } from '../config/DatabaseConnection';
import { CenarioService } from '../services/CenarioService';

@Controller()
export class InfraController {
  constructor(
    private readonly db: DatabaseConnection,
    private readonly cenarioService: CenarioService
  ) {}

  @Get('health')
  async health() {
    return {
      status: 'ok',
      service: 'Sistema Web de Tabela de Vida Ecológica e Análise de Fator-Chave (UniRV)',
      database: await this.db.checkHealth(),
    };
  }

  @Post('database/seed')
  async seed() {
    await this.db.seedDefaultScript();
    return {
      ok: true,
      message: 'Banco de dados PostgreSQL restaurado com a carga inicial de script.sql.',
      cenarios: await this.cenarioService.listarCenarios(),
    };
  }
}
