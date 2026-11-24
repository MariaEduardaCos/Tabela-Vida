import { Injectable } from '@nestjs/common';
import {
  ApiException,
  AreaExperimentalModel,
  CulturaModel,
  PragaModel,
  UsuarioModel,
} from '../models/DomainModels';
import { CatalogoRepository } from '../repositories/CatalogoRepository';

@Injectable()
export class CatalogoService {
  private readonly catalogoRepo: CatalogoRepository;

  constructor(catalogoRepo: CatalogoRepository = new CatalogoRepository()) {
    this.catalogoRepo = catalogoRepo;
  }

  public async listarCulturasComPragas(): Promise<CulturaModel[]> {
    return this.catalogoRepo.listarCulturasComPragas();
  }

  public async buscarCulturaPorId(id: string): Promise<CulturaModel> {
    if (!id || !id.trim()) {
      throw new ApiException(400, 'O identificador da cultura é obrigatório.');
    }
    const cultura = await this.catalogoRepo.buscarCulturaPorId(id.trim());
    if (!cultura) {
      throw new ApiException(404, `Cultura agrícola "${id}" não encontrada.`);
    }
    return cultura;
  }

  public async buscarPragaPorId(id: string): Promise<PragaModel> {
    if (!id || !id.trim()) {
      throw new ApiException(400, 'O identificador da praga é obrigatório.');
    }
    const praga = await this.catalogoRepo.buscarPragaPorId(id.trim());
    if (!praga) {
      throw new ApiException(404, `Praga entomológica "${id}" não encontrada.`);
    }
    return praga;
  }

  public async listarAreasUnirv(): Promise<AreaExperimentalModel[]> {
    return this.catalogoRepo.listarAreasExperimentais();
  }

  public async listarUsuarios(): Promise<UsuarioModel[]> {
    return this.catalogoRepo.listarUsuarios();
  }
}

