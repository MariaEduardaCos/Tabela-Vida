import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  computeCorrelationMatrix,
  computeCriticalStageAnalysis,
  computeKSummaryStats,
  computeLifeTableForPlot,
  computeMeanLifeTable,
  linearRegressionAnova,
} from './life-table.math';
import {
  AnovaRegressionResult,
  CenarioAnalitico,
  CorrelationMatrixResult,
  CriticalStageComparison,
  KSummaryStatsResult,
  MeanLifeTableResult,
  PlotData,
  PlotLifeTable,
  SamplePoint,
  StageDefinition,
} from './life-table.models';
import { SelecaoContextService } from './selecao-context.service';

@Injectable({
  providedIn: 'root',
})
export class LifeTableService {
  private readonly http = inject(HttpClient);
  private readonly selecaoCtx = inject(SelecaoContextService);
  private readonly apiUrl = 'http://localhost:3000/api';

  // Estado reativo principal (RN023: 100% carregado do PostgreSQL via API REST)
  public readonly cenarios = signal<CenarioAnalitico[]>([]);
  public readonly activeCenarioId = signal<string>('');
  public readonly selectedPlotIndex = signal<number>(0);
  public readonly useSpreadsheet100rx = signal<boolean>(false);
  public readonly loading = signal<boolean>(false);
  public readonly statusBanner = signal<string>('');

  // Cenário analítico ativo
  public readonly activeCenario = computed<CenarioAnalitico | null>(() => {
    const list = this.cenarios();
    if (!list.length) return null;
    const id = this.activeCenarioId();
    return list.find((c) => c.id === id) || list.find((c) => c.ativo) || list[0];
  });

  public readonly stages = computed<StageDefinition[]>(() => {
    return this.activeCenario()?.stages || [];
  });

  public readonly plots = computed<PlotData[]>(() => {
    return this.activeCenario()?.plots || [];
  });

  public readonly immatureStages = computed<StageDefinition[]>(() => {
    const st = this.stages();
    return st.filter((s, idx) => !s.isTerminal && idx < st.length - 1);
  });

  public readonly nymphCount = computed<number>(() => {
    return this.stages().filter((s) => s.isNymph).length;
  });

  // =========================================================================
  // SINAIS COMPUTADOS ANALÍTICOS (ABAS 2 A 7)
  // =========================================================================

  public readonly plotLifeTables = computed<PlotLifeTable[]>(() => {
    const plots = this.plots();
    const stages = this.stages();
    const useStatic = this.useSpreadsheet100rx();
    if (!plots.length || !stages.length) return [];

    const firstTable = computeLifeTableForPlot(plots[0], stages, false);
    const refL0 = firstTable.totalOvosIniciais;

    return plots.map((p) => computeLifeTableForPlot(p, stages, useStatic, refL0));
  });

  public readonly meanLifeTable = computed<MeanLifeTableResult>(() => {
    return computeMeanLifeTable(this.plotLifeTables(), this.stages());
  });

  public readonly kSummaryStats = computed<KSummaryStatsResult>(() => {
    return computeKSummaryStats(this.plotLifeTables(), this.stages());
  });

  public readonly correlationMatrix = computed<CorrelationMatrixResult>(() => {
    return computeCorrelationMatrix(this.plotLifeTables(), this.stages());
  });

  public readonly anovaResults = computed<AnovaRegressionResult[]>(() => {
    const tables = this.plotLifeTables();
    const imm = this.immatureStages();
    if (!tables.length || !imm.length) return [];
    const kTotalVec = tables.map((t) => t.kTotal);

    return imm.map((st) => {
      const yVec = tables.map(
        (t) => t.rows.find((r) => r.stageId === st.id)?.k2 ?? 0
      );
      return linearRegressionAnova(kTotalVec, yVec, st.id, st.label, tables);
    });
  });

  public readonly criticalStageAnalysis = computed<CriticalStageComparison[]>(() => {
    return computeCriticalStageAnalysis(
      this.plotLifeTables(),
      this.stages(),
      this.meanLifeTable(),
      this.kSummaryStats(),
      this.anovaResults()
    );
  });

  public readonly fatorChaveStage = computed<CriticalStageComparison | null>(() => {
    const list = this.criticalStageAnalysis();
    return list.find((s) => s.isCriticalPodoler) || list[0] || null;
  });

  // Diagnóstico rápido para qualquer cenário (usado na Central de Cenários — Aba 0)
  public computeScenarioSummaryDiagnosis(cenario: CenarioAnalitico): {
    criticalStageLabel: string;
    mortalityPct: number;
    kTotalMean: number;
  } {
    if (!cenario.plots?.length || !cenario.stages?.length) {
      return { criticalStageLabel: 'Ovo (Ov)', mortalityPct: 0, kTotalMean: 0 };
    }
    const tables = cenario.plots.map((p) =>
      computeLifeTableForPlot(p, cenario.stages, false)
    );
    const meanTbl = computeMeanLifeTable(tables, cenario.stages);
    const kStats = computeKSummaryStats(tables, cenario.stages);
    const imm = cenario.stages.filter(
      (s, idx) => !s.isTerminal && idx < cenario.stages.length - 1
    );
    const kTotalVec = tables.map((t) => t.kTotal);
    const anovas = imm.map((st) => {
      const yVec = tables.map(
        (t) => t.rows.find((r) => r.stageId === st.id)?.k2 ?? 0
      );
      return linearRegressionAnova(kTotalVec, yVec, st.id, st.label, tables);
    });
    const crit = computeCriticalStageAnalysis(
      tables,
      cenario.stages,
      meanTbl,
      kStats,
      anovas
    );
    const keyStage = crit.find((c) => c.isCriticalPodoler) || crit[0];
    return {
      criticalStageLabel: keyStage?.stageLabel || 'Ovo (Ov)',
      mortalityPct: meanTbl.mortalidadeTotalMedia,
      kTotalMean: kStats.kTotalMean,
    };
  }

  // =========================================================================
  // COMUNICAÇÃO HTTP REST COM O BACKEND E POSTGRESQL
  // =========================================================================

  public async carregarCenariosDoBackend(): Promise<void> {
    this.loading.set(true);
    try {
      const lista = await firstValueFrom(
        this.http.get<CenarioAnalitico[]>(`${this.apiUrl}/cenarios`)
      );
      this.cenarios.set(lista || []);
      if (lista.length > 0) {
        const ativo = lista.find((c) => c.ativo) || lista[0];
        this.activeCenarioId.set(ativo.id);
        this.selectedPlotIndex.set(0);
        this.selecaoCtx.sincronizarComCenario(ativo.culturaId, ativo.pragaId);
        this.statusBanner.set(
          `Cenário "${ativo.nome}" carregado do banco (${ativo.plots.length} talhões × ${
            ativo.plots[0]?.sampleLocations?.length || ativo.numAmostrasPorTalhao
          } amostras).`
        );
      }
    } catch (error) {
      console.error('[LifeTableService] Erro ao carregar cenários:', error);
    } finally {
      this.loading.set(false);
    }
  }

  public async ativarCenario(cenarioId: string): Promise<void> {
    const lista = this.cenarios();
    const alvo = lista.find((c) => c.id === cenarioId);
    if (!alvo) return;

    this.activeCenarioId.set(cenarioId);
    this.selectedPlotIndex.set(0);
    this.selecaoCtx.sincronizarComCenario(alvo.culturaId, alvo.pragaId);
    this.statusBanner.set(
      `Cenário "${alvo.nome}" carregado do banco (${alvo.plots.length} talhões × ${
        alvo.plots[0]?.sampleLocations?.length || alvo.numAmostrasPorTalhao
      } amostras).`
    );

    this.cenarios.update((arr) =>
      arr.map((c) => ({ ...c, ativo: c.id === cenarioId }))
    );

    try {
      await firstValueFrom(
        this.http.put<CenarioAnalitico>(`${this.apiUrl}/cenarios/${cenarioId}`, {
          nome: alvo.nome,
          criadoPor: alvo.criadoPor,
          observacoes: alvo.observacoes,
          ativo: true,
        })
      );
    } catch (error) {
      console.error('[LifeTableService] Erro ao ativar cenário no backend:', error);
    }
  }

  public async criarCenario(payload: {
    nome: string;
    criadoPor: string;
    culturaId: string;
    pragaId: string;
    numTalhoes: number;
    numAmostrasPorTalhao: number;
    zerado: boolean;
    observacoes?: string;
  }): Promise<CenarioAnalitico | null> {
    this.loading.set(true);
    try {
      const novo = await firstValueFrom(
        this.http.post<CenarioAnalitico>(`${this.apiUrl}/cenarios`, payload)
      );
      this.cenarios.update((list) => [
        novo,
        ...list.map((c) => ({ ...c, ativo: false })),
      ]);
      this.activeCenarioId.set(novo.id);
      this.selectedPlotIndex.set(0);
      this.selecaoCtx.sincronizarComCenario(novo.culturaId, novo.pragaId);
      this.statusBanner.set(
        `Novo cenário "${novo.nome}" criado e persistido no PostgreSQL (${novo.plots.length} talhões × ${novo.numAmostrasPorTalhao} amostras).`
      );
      return novo;
    } catch (error) {
      console.error('[LifeTableService] Erro ao criar cenário:', error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  public async atualizarMetadadosCenario(
    cenarioId: string,
    dados: { nome: string; criadoPor: string; observacoes?: string }
  ): Promise<void> {
    try {
      const atualizado = await firstValueFrom(
        this.http.put<CenarioAnalitico>(`${this.apiUrl}/cenarios/${cenarioId}`, dados)
      );
      this.cenarios.update((list) =>
        list.map((c) => (c.id === cenarioId ? atualizado : c))
      );
      this.statusBanner.set(`Metadados do cenário "${atualizado.nome}" atualizados.`);
    } catch (error) {
      console.error('[LifeTableService] Erro ao atualizar metadados:', error);
    }
  }

  public async duplicarCenario(cenarioId: string): Promise<void> {
    try {
      const copia = await firstValueFrom(
        this.http.post<CenarioAnalitico>(
          `${this.apiUrl}/cenarios/${cenarioId}/duplicar`,
          {}
        )
      );
      this.cenarios.update((list) => [...list, copia]);
      this.statusBanner.set(`Cenário duplicado com sucesso: "${copia.nome}".`);
    } catch (error) {
      console.error('[LifeTableService] Erro ao duplicar cenário:', error);
    }
  }

  public async excluirCenario(cenarioId: string): Promise<boolean> {
    if (this.cenarios().length <= 1) {
      this.statusBanner.set(
        'Não é permitido excluir o último cenário ativo do sistema (RN006).'
      );
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/cenarios/${cenarioId}`)
      );
      const restantes = this.cenarios().filter((c) => c.id !== cenarioId);
      if (restantes.length > 0 && !restantes.some((c) => c.ativo)) {
        restantes[0] = { ...restantes[0], ativo: true };
      }
      this.cenarios.set(restantes);
      if (this.activeCenarioId() === cenarioId && restantes.length > 0) {
        this.activeCenarioId.set(restantes[0].id);
        this.selecaoCtx.sincronizarComCenario(
          restantes[0].culturaId,
          restantes[0].pragaId
        );
      }
      this.statusBanner.set('Cenário removido do PostgreSQL.');
      return true;
    } catch (error) {
      console.error('[LifeTableService] Erro ao excluir cenário:', error);
      return false;
    }
  }

  public async restaurarPadraoBanco(): Promise<void> {
    this.loading.set(true);
    try {
      const resp = await firstValueFrom(
        this.http.post<{ ok: boolean; cenarios: CenarioAnalitico[] }>(
          `${this.apiUrl}/database/seed`,
          {}
        )
      );
      if (resp?.cenarios?.length) {
        this.cenarios.set(resp.cenarios);
        const ativo = resp.cenarios.find((c) => c.ativo) || resp.cenarios[0];
        this.activeCenarioId.set(ativo.id);
        this.selectedPlotIndex.set(0);
        this.selecaoCtx.sincronizarComCenario(ativo.culturaId, ativo.pragaId);
        this.statusBanner.set(
          'Carga inicial padrão restaurada com sucesso no PostgreSQL (script.sql).'
        );
      }
    } catch (error) {
      console.error('[LifeTableService] Erro ao restaurar banco:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // =========================================================================
  // EDIÇÃO REATIVA DE AMOSTRAS, FASES, TALHÕES E GEORREFERENCIAMENTO (ABA 1)
  // =========================================================================

  public setUseSpreadsheet100rx(val: boolean): void {
    this.useSpreadsheet100rx.set(val);
  }

  public updateSampleValue(
    plotIdx: number,
    stageId: string,
    sampleIdx: number,
    newValue: number
  ): void {
    const val = Math.max(0, Math.round(Number(newValue) || 0));
    const current = this.activeCenario();
    if (!current) return;

    const targetPlot = current.plots[plotIdx];
    if (!targetPlot) return;

    this.cenarios.update((list) =>
      list.map((c) => {
        if (c.id !== current.id) return c;
        const newPlots = c.plots.map((p, idx) => {
          if (idx !== plotIdx) return p;
          const stageArr = [...(p.samples[stageId] || [])];
          stageArr[sampleIdx] = val;
          return {
            ...p,
            samples: {
              ...p.samples,
              [stageId]: stageArr,
            },
          };
        });
        return { ...c, plots: newPlots };
      })
    );

    // Persiste assincronamente via PATCH no PostgreSQL (RN014)
    firstValueFrom(
      this.http.patch(
        `${this.apiUrl}/cenarios/${current.id}/talhoes/${targetPlot.id}/contagem`,
        {
          codigoFase: stageId,
          indiceAmostra: sampleIdx,
          quantidade: val,
        }
      )
    ).catch((err) => console.error('[LifeTableService] Falha no PATCH de célula:', err));
  }

  public addStage(customLabel?: string): void {
    const current = this.activeCenario();
    if (!current) return;

    const nymphStages = current.stages.filter((s) => s.isNymph);
    const nextNum = nymphStages.length + 1;
    const newId = `N${nextNum}`;
    const newLabel = customLabel?.trim() || `Ninfa ${nextNum} (${newId})`;

    if (current.stages.some((s) => s.id === newId)) return;

    const numSamples =
      current.plots[0]?.sampleLocations?.length || current.numAmostrasPorTalhao || 10;

    // Insere antes do estágio Adulto
    const newStages: StageDefinition[] = [];
    for (const st of current.stages) {
      if (st.isTerminal) {
        newStages.push({
          id: newId,
          label: newLabel,
          isInitial: false,
          isTerminal: false,
          isNymph: true,
        });
      }
      newStages.push(st);
    }

    const newPlots = current.plots.map((p) => ({
      ...p,
      samples: {
        ...p.samples,
        [newId]: Array(numSamples).fill(0),
      },
    }));

    this.atualizarEstruturaLocalESincronizar(
      current.id,
      newStages,
      newPlots,
      `Estágio ${newLabel} adicionado! Insira os dados nas amostras.`
    );
  }

  public removeStage(stageId: string): void {
    const current = this.activeCenario();
    if (!current) return;

    const target = current.stages.find((s) => s.id === stageId);
    if (!target || target.isInitial || target.isTerminal) return;
    if (current.stages.length <= 3) return;

    const newStages = current.stages.filter((s) => s.id !== stageId);
    const newPlots = current.plots.map((p) => {
      const copy = { ...p.samples };
      delete copy[stageId];
      return { ...p, samples: copy };
    });

    this.atualizarEstruturaLocalESincronizar(
      current.id,
      newStages,
      newPlots,
      `Estágio ${target.label} removido da marcha analítica.`
    );
  }

  public addPlot(): void {
    const current = this.activeCenario();
    if (!current) return;

    const nextNum =
      current.plots.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const numSamples =
      current.plots[0]?.sampleLocations?.length || current.numAmostrasPorTalhao || 10;

    const areas = this.selecaoCtx.areasUnirv();
    const area =
      areas[(nextNum - 1) % Math.max(1, areas.length)] || {
        id: 'fontes-do-saber',
        latitude: -17.785303,
        longitude: -50.964869,
        nomeCurto: 'Faz. Fontes do Saber (Campus I)',
      };

    const samples: Record<string, number[]> = {};
    for (const st of current.stages) {
      samples[st.id] = Array(numSamples).fill(0);
    }

    const sampleLocations: SamplePoint[] = [];
    for (let i = 0; i < numSamples; i++) {
      const lat =
        area.latitude -
        Math.floor(i / 5) * 0.00028 +
        (i % 2) * 0.00005 -
        nextNum * 0.00012;
      const lng =
        area.longitude +
        ((i % 5) - 2) * 0.00032 +
        (nextNum % 3) * 0.00018;
      sampleLocations.push({
        index: i,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        timestamp: '2026-11-10 08:30',
        label: `${area.nomeCurto} — Talhão ${nextNum} — Amostra ${i + 1}`,
      });
    }

    const novoPlot: PlotData = {
      id: nextNum,
      name: `Talhão ${nextNum}`,
      areaId: area.id,
      samples,
      sampleLocations,
    };

    const newPlots = [...current.plots, novoPlot];
    this.atualizarEstruturaLocalESincronizar(
      current.id,
      current.stages,
      newPlots,
      `Talhão ${nextNum} adicionado ao cenário.`
    );
    this.selectedPlotIndex.set(newPlots.length - 1);
  }

  public removePlot(plotIdx: number): void {
    const current = this.activeCenario();
    if (!current || current.plots.length <= 2) {
      this.statusBanner.set(
        'O cenário requer no mínimo 2 talhões para cálculo de regressão e erro padrão (RN009).'
      );
      return;
    }

    const removed = current.plots[plotIdx];
    const newPlots = current.plots
      .filter((_, idx) => idx !== plotIdx)
      .map((p, idx) => ({
        ...p,
        id: idx + 1,
        name: `Talhão ${idx + 1}`,
      }));

    if (this.selectedPlotIndex() >= newPlots.length) {
      this.selectedPlotIndex.set(Math.max(0, newPlots.length - 1));
    }

    this.atualizarEstruturaLocalESincronizar(
      current.id,
      current.stages,
      newPlots,
      `${removed?.name || 'Talhão'} removido do cenário.`
    );
  }

  public resizeSamplingDimension(newNumPlots: number, newNumSamples: number): void {
    const current = this.activeCenario();
    if (!current) return;

    const targetT = Math.max(2, Math.min(50, Math.round(Number(newNumPlots) || 10)));
    const targetA = Math.max(1, Math.min(100, Math.round(Number(newNumSamples) || 10)));
    const areas = this.selecaoCtx.areasUnirv();

    const newPlots: PlotData[] = [];
    for (let t = 0; t < targetT; t++) {
      const existing = current.plots[t];
      const plotNum = t + 1;
      const area =
        areas.find((a) => a.id === existing?.areaId) ||
        areas[t % Math.max(1, areas.length)] || {
          id: 'fontes-do-saber',
          latitude: -17.785303,
          longitude: -50.964869,
          nomeCurto: 'Faz. Fontes do Saber (Campus I)',
        };

      const samples: Record<string, number[]> = {};
      for (const st of current.stages) {
        const oldArr = existing?.samples[st.id] || [];
        const arr: number[] = [];
        for (let s = 0; s < targetA; s++) {
          arr.push(oldArr[s] ?? 0);
        }
        samples[st.id] = arr;
      }

      const sampleLocations: SamplePoint[] = [];
      for (let s = 0; s < targetA; s++) {
        const oldLoc = existing?.sampleLocations[s];
        if (oldLoc) {
          sampleLocations.push({ ...oldLoc, index: s });
        } else {
          const lat =
            area.latitude -
            Math.floor(s / 5) * 0.00028 +
            (s % 2) * 0.00005 -
            plotNum * 0.00012;
          const lng =
            area.longitude +
            ((s % 5) - 2) * 0.00032 +
            (plotNum % 3) * 0.00018;
          sampleLocations.push({
            index: s,
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
            timestamp: '2026-11-10 08:30',
            label: `${area.nomeCurto} — Talhão ${plotNum} — Amostra ${s + 1}`,
          });
        }
      }

      newPlots.push({
        id: plotNum,
        name: existing?.name || `Talhão ${plotNum}`,
        areaId: area.id,
        samples,
        sampleLocations,
      });
    }

    if (this.selectedPlotIndex() >= newPlots.length) {
      this.selectedPlotIndex.set(0);
    }

    this.atualizarEstruturaLocalESincronizar(
      current.id,
      current.stages,
      newPlots,
      `Dimensionamento atualizado para ${targetT} talhões × ${targetA} amostras.`
    );
  }

  public async movePlotToCoordinates(
    plotIdx: number,
    targetLat: number,
    targetLng: number,
    options?: {
      areaId?: string;
      moveAllSamples?: boolean;
      sampleIndex?: number;
    }
  ): Promise<void> {
    const current = this.activeCenario();
    if (!current) return;
    const plot = current.plots[plotIdx];
    if (!plot) return;

    const areas = this.selecaoCtx.areasUnirv();
    let nearestAreaId = options?.areaId || plot.areaId || 'fontes-do-saber';
    if (!options?.areaId && areas.length > 0) {
      let minDist = Infinity;
      for (const a of areas) {
        const d =
          Math.pow(a.latitude - targetLat, 2) +
          Math.pow(a.longitude - targetLng, 2);
        if (d < minDist) {
          minDist = d;
          nearestAreaId = a.id;
        }
      }
    }

    const moveAll = options?.moveAllSamples !== false;
    let newLocations: SamplePoint[];

    if (!moveAll && typeof options?.sampleIndex === 'number') {
      newLocations = plot.sampleLocations.map((loc, idx) =>
        idx === options.sampleIndex
          ? {
              ...loc,
              lat: Number(targetLat.toFixed(6)),
              lng: Number(targetLng.toFixed(6)),
            }
          : loc
      );
    } else {
      const locs = plot.sampleLocations;
      const centerLat =
        locs.reduce((acc, p) => acc + p.lat, 0) / Math.max(1, locs.length);
      const centerLng =
        locs.reduce((acc, p) => acc + p.lng, 0) / Math.max(1, locs.length);
      const dLat = targetLat - centerLat;
      const dLng = targetLng - centerLng;

      newLocations = locs.map((loc, idx) => ({
        ...loc,
        index: idx,
        lat: Number((loc.lat + dLat).toFixed(6)),
        lng: Number((loc.lng + dLng).toFixed(6)),
      }));
    }

    this.cenarios.update((list) =>
      list.map((c) => {
        if (c.id !== current.id) return c;
        const newPlots = c.plots.map((p, idx) =>
          idx === plotIdx
            ? { ...p, areaId: nearestAreaId, sampleLocations: newLocations }
            : p
        );
        return { ...c, plots: newPlots };
      })
    );

    try {
      await firstValueFrom(
        this.http.post<CenarioAnalitico>(
          `${this.apiUrl}/cenarios/${current.id}/talhoes/${plot.id}/mover-regiao`,
          {
            lat: targetLat,
            lng: targetLng,
            areaId: nearestAreaId,
            moveAllSamples: moveAll,
            sampleIndex: options?.sampleIndex,
            sampleLocations: newLocations,
          }
        )
      );
    } catch (error) {
      console.error('[LifeTableService] Erro ao persistir movimento de talhão:', error);
    }
  }

  public updateSingleSampleCoordinates(
    plotIdx: number,
    sampleIdx: number,
    lat: number,
    lng: number
  ): void {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    this.movePlotToCoordinates(plotIdx, lat, lng, {
      moveAllSamples: false,
      sampleIndex: sampleIdx,
    });
  }

  /**
   * Importação flexível de matrizes TSV / CSV / Excel (RF009 / RN013).
   */
  public importFromTSV(
    rawText: string,
    mode: 'replace' | 'append' | 'single' = 'replace',
    targetPlotIdx: number = 0
  ): boolean {
    const current = this.activeCenario();
    if (!current || !rawText.trim()) return false;

    const stages = current.stages;
    const stageMap = new Map<string, string>();
    for (const st of stages) {
      stageMap.set(st.id.toLowerCase(), st.id);
      stageMap.set(st.label.toLowerCase(), st.id);
    }
    stageMap.set('ovo', 'Ov');
    stageMap.set('ov', 'Ov');
    stageMap.set('adulto', 'Ad');
    stageMap.set('ad', 'Ad');

    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsedBlocks: Record<string, number[]>[] = [];
    let currentBlock: Record<string, number[]> = {};

    const flushBlock = () => {
      if (Object.keys(currentBlock).length > 0) {
        parsedBlocks.push(currentBlock);
        currentBlock = {};
      }
    };

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith('#') || lower.startsWith('talhão') || lower.startsWith('talhao')) {
        if (
          !lower.includes('\t') ||
          lower.includes('fases') ||
          /^#?\s*talh[aã]o\s+\d+\s*$/i.test(line)
        ) {
          flushBlock();
          continue;
        }
      }

      const tokens = line
        .split(/[\t;]+|\s{2,}/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      let cleanTokens = tokens;
      if (
        cleanTokens.length > 1 &&
        /^talh[aã]o\s*\d*$/i.test(cleanTokens[0])
      ) {
        cleanTokens = cleanTokens.slice(1);
      }

      if (cleanTokens.length < 2) continue;

      const stageCandidate = cleanTokens[0].toLowerCase();
      let matchedStageId = stageMap.get(stageCandidate);
      if (!matchedStageId) {
        for (const st of stages) {
          if (
            stageCandidate.startsWith(st.id.toLowerCase()) ||
            st.label.toLowerCase().includes(stageCandidate)
          ) {
            matchedStageId = st.id;
            break;
          }
        }
      }

      if (!matchedStageId) continue;

      if (currentBlock[matchedStageId]) {
        flushBlock();
      }

      const nums = cleanTokens
        .slice(1)
        .map((n) => Number(n.replace(',', '.')))
        .filter((n) => Number.isFinite(n) && n >= 0);

      if (nums.length > 0) {
        currentBlock[matchedStageId] = nums;
      }
    }
    flushBlock();

    if (parsedBlocks.length === 0) return false;

    const areas = this.selecaoCtx.areasUnirv();
    const numSamples =
      Object.values(parsedBlocks[0])[0]?.length ||
      current.numAmostrasPorTalhao ||
      10;

    const buildPlotFromBlock = (
      block: Record<string, number[]>,
      plotNumber: number,
      existingPlot?: PlotData
    ): PlotData => {
      const area =
        areas.find((a) => a.id === existingPlot?.areaId) ||
        areas[(plotNumber - 1) % Math.max(1, areas.length)] || {
          id: 'fontes-do-saber',
          latitude: -17.785303,
          longitude: -50.964869,
          nomeCurto: 'Faz. Fontes do Saber (Campus I)',
        };

      const samples: Record<string, number[]> = {};
      for (const st of stages) {
        const imported = block[st.id] || [];
        const arr: number[] = [];
        for (let i = 0; i < numSamples; i++) {
          arr.push(imported[i] ?? 0);
        }
        samples[st.id] = arr;
      }

      const sampleLocations: SamplePoint[] = [];
      for (let i = 0; i < numSamples; i++) {
        const oldLoc = existingPlot?.sampleLocations[i];
        if (oldLoc) {
          sampleLocations.push({ ...oldLoc, index: i });
        } else {
          const lat =
            area.latitude -
            Math.floor(i / 5) * 0.00028 +
            (i % 2) * 0.00005 -
            plotNumber * 0.00012;
          const lng =
            area.longitude +
            ((i % 5) - 2) * 0.00032 +
            (plotNumber % 3) * 0.00018;
          sampleLocations.push({
            index: i,
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
            timestamp: '2026-11-10 08:30',
            label: `${area.nomeCurto} — Talhão ${plotNumber} — Amostra ${i + 1}`,
          });
        }
      }

      return {
        id: plotNumber,
        name: existingPlot?.name || `Talhão ${plotNumber}`,
        areaId: area.id,
        samples,
        sampleLocations,
      };
    };

    let newPlots: PlotData[] = [];
    if (mode === 'single') {
      newPlots = current.plots.map((p, idx) =>
        idx === targetPlotIdx
          ? buildPlotFromBlock(parsedBlocks[0], p.id, p)
          : p
      );
    } else if (mode === 'append') {
      const startId = current.plots.length + 1;
      const appended = parsedBlocks.map((b, i) =>
        buildPlotFromBlock(b, startId + i)
      );
      newPlots = [...current.plots, ...appended];
    } else {
      newPlots = parsedBlocks.map((b, i) =>
        buildPlotFromBlock(b, i + 1, current.plots[i])
      );
      if (newPlots.length === 1 && current.plots.length >= 2) {
        newPlots = [newPlots[0], ...current.plots.slice(1)];
      }
    }

    this.atualizarEstruturaLocalESincronizar(
      current.id,
      stages,
      newPlots,
      `Matriz de dados importada e sincronizada com o PostgreSQL (${newPlots.length} talhões).`
    );
    return true;
  }

  private atualizarEstruturaLocalESincronizar(
    cenarioId: string,
    stages: StageDefinition[],
    plots: PlotData[],
    bannerMsg: string
  ): void {
    const numAmostras =
      plots[0]?.sampleLocations?.length ||
      Object.values(plots[0]?.samples || {})[0]?.length ||
      10;

    this.cenarios.update((list) =>
      list.map((c) =>
        c.id === cenarioId
          ? {
              ...c,
              stages,
              plots,
              numTalhoes: plots.length,
              numAmostrasPorTalhao: numAmostras,
            }
          : c
      )
    );
    this.statusBanner.set(bannerMsg);
    this.sincronizarCenarioAtivoNoBackend();
  }

  public sincronizarCenarioAtivoNoBackend(): void {
    const current = this.activeCenario();
    if (!current) return;

    firstValueFrom(
      this.http.put<CenarioAnalitico>(
        `${this.apiUrl}/cenarios/${current.id}/coleta`,
        {
          stages: current.stages,
          plots: current.plots,
          numTalhoes: current.plots.length,
          numAmostrasPorTalhao:
            current.plots[0]?.sampleLocations?.length ||
            current.numAmostrasPorTalhao,
        }
      )
    ).catch((err) =>
      console.error('[LifeTableService] Erro ao sincronizar coleta com o backend:', err)
    );
  }
}

