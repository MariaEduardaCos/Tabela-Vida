import { Module } from '@nestjs/common';
import { CenarioController } from '../controllers/CenarioController';
import { CenarioRepository } from '../repositories/CenarioRepository';
import { CenarioService } from '../services/CenarioService';
import { CatalogoModule } from './CatalogoModule';
import { MathModule } from './MathModule';

@Module({
  imports: [CatalogoModule, MathModule],
  controllers: [CenarioController],
  providers: [CenarioRepository, CenarioService],
  exports: [CenarioService],
})
export class CenarioModule {}
