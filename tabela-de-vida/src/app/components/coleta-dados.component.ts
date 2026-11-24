import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LifeTableService } from '../life-table.service';
import { MapaColetaComponent } from './mapa-coleta.component';

@Component({
  selector: 'app-coleta-dados',
  standalone: true,
  imports: [CommonModule, FormsModule, MapaColetaComponent],
  template: `
    @if (lifeTableSvc.statusBanner(); as msg) {
      <div class="status-toast-banner">
        <span>{{ msg }}</span>
      </div>
    }

    <div class="panel-card">
      <h2 class="section-heading">1. Coleta de Amostras (Entrada de Dados)</h2>
      <p class="section-desc">
        Informe as contagens observadas por amostra. Todos os cálculos ecológicos e estatísticos são atualizados instantaneamente.
      </p>

      <!-- Barra de dimensionamento e adição/remoção de fases (RF006 / RN008) -->
      <div class="stages-chips-bar">
        <div class="dim-inline-box">
          <label>
            <span>Talhões:</span>
            <input type="number" min="2" max="50" [(ngModel)]="inputNumTalhoes" />
          </label>
          <label>
            <span>Amostras / Talhão:</span>
            <input type="number" min="1" max="100" [(ngModel)]="inputNumAmostras" />
          </label>
          <button
            type="button"
            class="btn-outline-sm"
            (click)="aplicarDimensionamento()"
          >
            Dimensionar Amostragem
          </button>
        </div>

        <button
          type="button"
          class="btn-primary-dark"
          (click)="adicionarProximoEstagio()"
        >
          Adicionar Ninfa (N{{ proximoNumeroNinfa() }})
        </button>

        @if (lifeTableSvc.nymphCount() > 4) {
          <button
            type="button"
            class="btn-outline-sm danger"
            (click)="removerUltimoEstagioNinfa()"
          >
            Remover N{{ lifeTableSvc.nymphCount() }}
          </button>
        }
      </div>

      <!-- Seletor horizontal de Talhões (Talhão 1..T) + Novo Talhão -->
      <div class="plot-selector-box">
        <div class="active-plot-header">
          <span class="overline-label">TALHÃO ATIVO:</span>
          <span class="active-plot-badge">{{ currentPlotName() }}</span>
        </div>

        <div class="plot-tabs-row">
          @for (p of lifeTableSvc.plots(); track p.id; let idx = $index) {
            <button
              type="button"
              class="plot-tab"
              [class.active]="lifeTableSvc.selectedPlotIndex() === idx"
              (click)="selecionarTalhao(idx)"
            >
              <span class="tab-num">{{ (idx + 1).toString().padStart(2, '0') }}</span>
              {{ p.name }}
            </button>
          }
          <button
            type="button"
            class="plot-tab add-plot-btn"
            (click)="adicionarTalhao()"
          >
            + Novo Talhão
          </button>
        </div>
      </div>

      <!-- Matriz Editável de Contagens por Fase × Ponto Amostral (RF006 / RN010 / RN014) -->
      @if (currentPlot(); as plot) {
        <div class="table-scroll-container">
          <table class="data-table samples-matrix-table">
            <thead>
              <tr>
                <th class="col-stage">FASE DE DESENVOLVIMENTO</th>
                @for (loc of plot.sampleLocations; track loc.index; let sIdx = $index) {
                  <th class="col-sample">
                    AMOSTRA {{ sIdx + 1 }} <span class="gps-dot" [title]="loc.lat + ', ' + loc.lng">●</span>
                  </th>
                }
                <th class="col-sum">SOMA (M)</th>
                <th class="col-lx">VIVOS (L<sub>x</sub>)</th>
              </tr>
            </thead>
            <tbody>
              @for (st of lifeTableSvc.stages(); track st.id; let rIdx = $index) {
                <tr>
                  <td class="stage-name-cell">
                    <span class="stage-code-pill">{{ st.id }}</span>
                    <strong>{{ st.label }}</strong>
                  </td>
                  @for (loc of plot.sampleLocations; track loc.index; let sIdx = $index) {
                    <td class="sample-input-cell">
                      <input
                        type="number"
                        min="0"
                        class="cell-number-input"
                        [ngModel]="getSampleValue(plot, st.id, sIdx)"
                        (ngModelChange)="onCellEdit(st.id, sIdx, $event)"
                      />
                    </td>
                  }
                  <td class="sum-cell mono-bold">
                    {{ getStageSoma(rIdx) }}
                  </td>
                  <td class="sum-cell mono-highlight">
                    {{ getStageLx(rIdx) }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Cartões de resumo demográfico do Talhão ativo -->
        @if (currentPlotLifeTable(); as pt) {
          <div class="plot-summary-footer">
            <div class="kpi-cards-row">
              <div class="kpi-card">
                <span class="kpi-label">TOTAL DE OVOS INICIAIS (L₀)</span>
                <div class="kpi-value">{{ pt.totalOvosIniciais }}</div>
              </div>
              <div class="kpi-card">
                <span class="kpi-label">ADULTOS SOBREVIVENTES</span>
                <div class="kpi-value">{{ pt.adultosSobreviventes }}</div>
              </div>
              <div class="kpi-card danger-tint">
                <span class="kpi-label">MORTALIDADE TOTAL</span>
                <div class="kpi-value danger">
                  {{ pt.mortalidadeTotalPct | number: '1.2-2' }}%
                </div>
              </div>
              <div class="kpi-card gold-tint">
                <span class="kpi-label">K TOTAL (VARLEY & GRADWELL)</span>
                <div class="kpi-value gold">{{ pt.kTotal | number: '1.4-4' }}</div>
              </div>
            </div>

            <button
              type="button"
              class="btn-delete-plot"
              (click)="excluirTalhaoAtivo()"
            >
              Excluir {{ plot.name }}
            </button>
          </div>
        }
      }
    </div>

    <!-- Mapa Interativo Leaflet integrado à Aba 1 (RF007 / RF008) -->
    <app-mapa-coleta></app-mapa-coleta>
  `,
})
export class ColetaDadosComponent {
  public readonly lifeTableSvc = inject(LifeTableService);

  public inputNumTalhoes = 10;
  public inputNumAmostras = 10;

  public readonly currentPlot = computed(() => {
    const plots = this.lifeTableSvc.plots();
    const idx = this.lifeTableSvc.selectedPlotIndex();
    return plots[idx] || plots[0] || null;
  });

  public readonly currentPlotName = computed(() => this.currentPlot()?.name || 'Talhão 1');

  public getSampleValue(plot: { samples: Record<string, number[]> }, stageId: string, sampleIdx: number): number {
    return plot.samples[stageId]?.[sampleIdx] ?? 0;
  }

  public readonly currentPlotLifeTable = computed(() => {
    const tables = this.lifeTableSvc.plotLifeTables();
    const idx = this.lifeTableSvc.selectedPlotIndex();
    return tables[idx] || tables[0] || null;
  });

  public readonly proximoNumeroNinfa = computed(() => {
    return this.lifeTableSvc.nymphCount() + 1;
  });

  public getStageSoma(rowIdx: number): number {
    const tbl = this.currentPlotLifeTable();
    return tbl?.rows[rowIdx]?.soma ?? 0;
  }

  public getStageLx(rowIdx: number): number {
    const tbl = this.currentPlotLifeTable();
    return tbl?.rows[rowIdx]?.lx ?? 0;
  }

  constructor() {
    effect(() => {
      const c = this.lifeTableSvc.activeCenario();
      if (c) {
        this.inputNumTalhoes = c.plots.length || c.numTalhoes;
        this.inputNumAmostras =
          c.plots[0]?.sampleLocations?.length || c.numAmostrasPorTalhao;
      }
    });
  }

  public selecionarTalhao(idx: number): void {
    this.lifeTableSvc.selectedPlotIndex.set(idx);
  }

  public onCellEdit(stageId: string, sampleIdx: number, val: number): void {
    this.lifeTableSvc.updateSampleValue(
      this.lifeTableSvc.selectedPlotIndex(),
      stageId,
      sampleIdx,
      val
    );
  }

  public adicionarProximoEstagio(): void {
    this.lifeTableSvc.addStage();
  }

  public removerUltimoEstagioNinfa(): void {
    const nCount = this.lifeTableSvc.nymphCount();
    if (nCount > 4) {
      this.lifeTableSvc.removeStage(`N${nCount}`);
    }
  }

  public adicionarTalhao(): void {
    this.lifeTableSvc.addPlot();
  }

  public excluirTalhaoAtivo(): void {
    this.lifeTableSvc.removePlot(this.lifeTableSvc.selectedPlotIndex());
  }

  public aplicarDimensionamento(): void {
    this.lifeTableSvc.resizeSamplingDimension(
      this.inputNumTalhoes,
      this.inputNumAmostras
    );
  }
}
