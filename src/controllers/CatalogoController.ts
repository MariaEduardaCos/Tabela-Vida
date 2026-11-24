import { Controller, Get, Param } from '@nestjs/common';
import { CatalogoService } from '../services/CatalogoService';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get('culturas')
  listarCulturas() {
    return this.catalogoService.listarCulturasComPragas();
  }

  @Get('culturas/:id')
  buscarCulturaPorId(@Param('id') id: string) {
    return this.catalogoService.buscarCulturaPorId(id);
  }

  @Get('pragas/:id')
  buscarPragaPorId(@Param('id') id: string) {
    return this.catalogoService.buscarPragaPorId(id);
  }

  @Get('areas-unirv')
  listarAreasUnirv() {
    return this.catalogoService.listarAreasUnirv();
  }

  @Get('usuarios')
  listarUsuarios() {
    return this.catalogoService.listarUsuarios();
  }
}

