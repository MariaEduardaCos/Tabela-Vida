import { Module, OnModuleInit } from '@nestjs/common';
import { DatabaseConnection } from './config/DatabaseConnection';
import { InfraController } from './controllers/InfraController';
import { CatalogoModule } from './modules/CatalogoModule';
import { CenarioModule } from './modules/CenarioModule';
import { DatabaseModule } from './modules/DatabaseModule';
import { MathModule } from './modules/MathModule';

@Module({
  imports: [DatabaseModule, CatalogoModule, CenarioModule, MathModule],
  controllers: [InfraController],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly db: DatabaseConnection) {}

  async onModuleInit(): Promise<void> {
    await this.db.ensureDatabaseAndSchema();
  }
}
