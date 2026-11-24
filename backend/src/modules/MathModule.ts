import { Module } from '@nestjs/common';
import { AnaliseEcologicaController } from '../controllers/AnaliseEcologicaController';
import { LifeTableMathEngine } from '../services/LifeTableMathEngine';

@Module({
  controllers: [AnaliseEcologicaController],
  providers: [LifeTableMathEngine],
  exports: [LifeTableMathEngine],
})
export class MathModule {}
