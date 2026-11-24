import { Injectable } from '@nestjs/common';
import { DatabaseConnection } from '../config/DatabaseConnection';
import {
  AreaExperimentalModel,
  CulturaModel,
  PragaModel,
  UsuarioModel,
} from '../models/DomainModels';

@Injectable()
export class CatalogoRepository {
  private readonly db: DatabaseConnection;

  constructor(db: DatabaseConnection = DatabaseConnection.getInstance()) {
    this.db = db;
  }

  private getDefaultStagesForPraga(ordem: string | null): string[] {
    return ['Ovo (Ov)', 'Ninfa 1 (N1)', 'Ninfa 2 (N2)', 'Ninfa 3 (N3)', 'Ninfa 4 (N4)', 'Adulto (Ad)'];
  }

  public async listarCulturasComPragas(): Promise<CulturaModel[]> {
    const culturasRes = await this.db.query(
      `SELECT id, nome, nome_cientifico, familia, descricao, imagem
       FROM culturas
       ORDER BY nome ASC`
    );

    const pragasRes = await this.db.query(
      `SELECT id, cultura_id, nome_comum, nome_cientifico, ordem, fase_critica_tipica, descricao, imagem
       FROM pragas
       ORDER BY nome_comum ASC`
    );

    const pragasPorCultura = new Map<string, PragaModel[]>();
    for (const row of pragasRes.rows) {
      const praga: PragaModel = {
        id: row.id,
        culturaId: row.cultura_id,
        nomeComum: row.nome_comum,
        nomeCientifico: row.nome_cientifico,
        ordem: row.ordem || '',
        faseCriticaTipica: row.fase_critica_tipica || 'N3',
        descricao: row.descricao,
        imagem: row.imagem,
        fasesSugeridas: this.getDefaultStagesForPraga(row.ordem),
      };
      const list = pragasPorCultura.get(row.cultura_id) || [];
      list.push(praga);
      pragasPorCultura.set(row.cultura_id, list);
    }

    return culturasRes.rows.map((c) => ({
      id: c.id,
      nome: c.nome,
      nomeCientifico: c.nome_cientifico,
      familia: c.familia,
      descricao: c.descricao,
      imagem: c.imagem,
      pragas: pragasPorCultura.get(c.id) || [],
    }));
  }

  public async buscarCulturaPorId(id: string): Promise<CulturaModel | null> {
    const culturas = await this.listarCulturasComPragas();
    return culturas.find((c) => c.id === id) || null;
  }

  public async buscarPragaPorId(id: string): Promise<PragaModel | null> {
    const res = await this.db.query(
      `SELECT id, cultura_id, nome_comum, nome_cientifico, ordem, fase_critica_tipica, descricao, imagem
       FROM pragas
       WHERE id = $1`,
      [id]
    );
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      culturaId: row.cultura_id,
      nomeComum: row.nome_comum,
      nomeCientifico: row.nome_cientifico,
      ordem: row.ordem || '',
      faseCriticaTipica: row.fase_critica_tipica || 'N3',
      descricao: row.descricao,
      imagem: row.imagem,
      fasesSugeridas: this.getDefaultStagesForPraga(row.ordem),
    };
  }

  public async listarAreasExperimentais(): Promise<AreaExperimentalModel[]> {
    const res = await this.db.query(
      `SELECT id, nome, nome_curto, descricao, dms_lat, dms_lng, latitude, longitude
       FROM areas_experimentais
       ORDER BY id ASC`
    );
    return res.rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      nomeCurto: r.nome_curto,
      descricao: r.descricao,
      dmsLat: r.dms_lat,
      dmsLng: r.dms_lng,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
    }));
  }

  public async listarUsuarios(): Promise<UsuarioModel[]> {
    const res = await this.db.query(
      `SELECT id, nome, email, crea_registro, instituicao, cargo, criado_em
       FROM usuarios
       ORDER BY id ASC`
    );
    return res.rows.map((u) => ({
      id: Number(u.id),
      nome: u.nome,
      email: u.email,
      creaRegistro: u.crea_registro,
      instituicao: u.instituicao,
      cargo: u.cargo,
      criadoEm: u.criado_em instanceof Date ? u.criado_em.toISOString() : String(u.criado_em),
    }));
  }
}

