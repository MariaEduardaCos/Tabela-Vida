import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiException } from '../models/DomainModels';
import { CenarioService } from '../services/CenarioService';

@Controller('cenarios')
export class CenarioController {
  constructor(private readonly cenarioService: CenarioService) {}

  @Get()
  listarCenarios() {
    return this.cenarioService.listarCenarios();
  }

  @Get(':id')
  buscarCenario(@Param('id') id: string) {
    return this.cenarioService.buscarCenarioComAnalise(id);
  }

  @Post()
  criarCenario(@Body() body: any) {
    return this.cenarioService.criarNovoCenario(body);
  }

  @Put(':id')
  atualizarMetadados(@Param('id') id: string, @Body() body: any) {
    return this.cenarioService.atualizarMetadados(id, body);
  }

  @Put(':id/coleta')
  sincronizarColeta(@Param('id') id: string, @Body() body: any) {
    return this.cenarioService.sincronizarColeta(id, body);
  }

  @Patch(':id/talhoes/:num/contagem')
  async atualizarCelulaContagem(
    @Param('id') cenarioId: string,
    @Param('num') num: string,
    @Body() body: any
  ) {
    const numeroTalhao = Number(num);
    const codigoFase = body.codigoFase || body.stageId;
    const indiceAmostra = body.indiceAmostra ?? body.sampleIndex;
    const quantidade = body.quantidade ?? body.value;

    if (!codigoFase || typeof indiceAmostra !== 'number' || typeof quantidade !== 'number') {
      throw new ApiException(
        400,
        'Parâmetros obrigatórios: codigoFase (ou stageId), indiceAmostra (ou sampleIndex) e quantidade (ou value).'
      );
    }

    await this.cenarioService.atualizarCelulaContagem(
      cenarioId,
      numeroTalhao,
      codigoFase,
      indiceAmostra,
      quantidade
    );

    return { ok: true, cenarioId, numeroTalhao, codigoFase, indiceAmostra, quantidade };
  }

  @Post(':id/talhoes/:num/mover-regiao')
  moverRegiaoTalhao(
    @Param('id') cenarioId: string,
    @Param('num') num: string,
    @Body() body: any
  ) {
    return this.cenarioService.moverRegiaoDoTalhao(cenarioId, Number(num), body);
  }

  @Post(':id/duplicar')
  duplicarCenario(@Param('id') id: string) {
    return this.cenarioService.duplicarCenario(id);
  }

  @Delete(':id')
  async excluirCenario(@Param('id') id: string) {
    await this.cenarioService.excluirCenario(id);
    return { ok: true, id };
  }
}

