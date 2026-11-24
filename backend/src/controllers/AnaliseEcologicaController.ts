import { Body, Controller, Post } from '@nestjs/common';
import { ApiException, FaseDesenvolvimentoModel, TalhaoModel } from '../models/DomainModels';
import { LifeTableMathEngine } from '../services/LifeTableMathEngine';

@Controller('analise')
export class AnaliseEcologicaController {
  constructor(private readonly mathEngine: LifeTableMathEngine) {}

  @Post('calcular')
  calcularTabelaDeVida(
    @Body() body: { plots?: TalhaoModel[]; stages?: FaseDesenvolvimentoModel[]; useStaticRef100rx?: boolean }
  ) {
    const { plots, stages, useStaticRef100rx } = body;

    if (!plots || !Array.isArray(plots) || !stages || !Array.isArray(stages)) {
      throw new ApiException(
        400,
        'Payload inválido: informe "plots" (talhões) e "stages" (fases de desenvolvimento).'
      );
    }

    return this.mathEngine.computeCompleteAnalysis(plots, stages, Boolean(useStaticRef100rx));
  }
}

