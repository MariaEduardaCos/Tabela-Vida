import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { CriticalStageComparison } from '../life-table.models';
import { LifeTableService } from '../life-table.service';

const STAGE_COLORS: Record<string, string> = {
  Ov: '#b84a32',
  N1: '#3b7a28',
  N2: '#b47824',
  N3: '#1f6173',
  N4: '#7b528b',
  N5: '#6d6238',
  N6: '#334155',
};

@Component({
  selector: 'app-graficos-estagio-critico',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel-card">
      <h2 class="section-heading">6. Determinação do Estágio Crítico & Gráficos de Fator-Chave</h2>
      <p class="section-desc">
        Visualização das regressões lineares (k da fase vs K total) conforme metodologia de Podoler & Rogers (1975) e Pereira et al. (2018).
      </p>

      <!-- BANNER DE CONCLUSÃO CIENTÍFICA DO ESTÁGIO CRÍTICO (RF015) -->
      @if (criticalStage(); as crit) {
        <div class="critical-banner">
          <div class="crit-overline">Metodologia Varley & Gradwell / Pereira et al. (2018)</div>
          <h3 class="crit-main-title">Estágio Crítico Identificado: {{ crit.stageLabel }}</h3>
          <p class="crit-explanation">
            A fase <strong>{{ crit.stageLabel }}</strong> apresentou regressão linear estatisticamente significativa com o K total com a
            <strong>maior inclinação da reta (slope b = {{ crit.slopeB | number: '1.3-3' }})</strong>, atuando como o
            <strong>fator-chave regulador</strong> da dinâmica populacional.
          </p>
          <div class="crit-badges-row">
            <span class="crit-pill dark">Fator-Chave • Estágio Crítico</span>
            <span class="crit-pill gold">Slope b = {{ crit.slopeB | number: '1.3-3' }}</span>
            <span class="crit-pill green">
              p = {{ crit.pValue | number: '1.4-4' }} {{ crit.pValue < 0.05 ? '< 0.05' : '(ns)' }}
            </span>
            <span class="crit-pill purple">R² = {{ crit.r2 | number: '1.3-3' }}</span>
            <span class="crit-pill blue">
              IC 95% [{{ crit.ci95Low | number: '1.3-3' }} – {{ crit.ci95High | number: '1.3-3' }}]
            </span>
          </div>
        </div>
      }

      <!-- GRÁFICO 1: REGRESSÕES DAS FASES VS K TOTAL (DETERMINAÇÃO DO ESTÁGIO CRÍTICO) -->
      <div class="chart-card" id="chart-main-regression">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">
              Regressões das Fases vs K total (Determinação do Estágio Crítico)
            </h3>
            <div class="chart-subtitle">
              Reprodução da Fig. 2 e 4 de Pereira et al. (2018) / Podoler & Rogers (1975) — 'porfase.png'
            </div>
          </div>
          <button
            type="button"
            class="btn-outline-sm"
            (click)="exportSvgAsPng('svg-main-reg', 'porfase.png')"
          >
            Baixar PNG
          </button>
        </div>

        <div class="svg-wrapper">
          <svg
            id="svg-main-reg"
            viewBox="0 0 860 360"
            class="responsive-svg"
          >
            <!-- Grade de fundo -->
            @for (yTick of mainChartData().yTicks; track yTick.val) {
              <line
                x1="75"
                [attr.y1]="yTick.y"
                x2="820"
                [attr.y2]="yTick.y"
                stroke="#e8e2d5"
                stroke-dasharray="4 4"
              />
              <text
                x="65"
                [attr.y]="yTick.y + 4"
                text-anchor="end"
                class="svg-axis-label"
              >
                {{ yTick.val | number: '1.2-2' }}
              </text>
            }
            @for (xTick of mainChartData().xTicks; track xTick.val) {
              <line
                [attr.x1]="xTick.x"
                y1="25"
                [attr.x2]="xTick.x"
                y2="305"
                stroke="#f0ece1"
                stroke-dasharray="4 4"
              />
              <text
                [attr.x]="xTick.x"
                y="324"
                text-anchor="middle"
                class="svg-axis-label"
              >
                {{ xTick.val | number: '1.2-2' }}
              </text>
            }

            <!-- Eixos -->
            <line x1="75" y1="25" x2="75" y2="305" stroke="#94a3b8" stroke-width="1.5" />
            <line x1="75" y1="305" x2="820" y2="305" stroke="#94a3b8" stroke-width="1.5" />

            <!-- Rótulos dos eixos -->
            <text x="448" y="348" text-anchor="middle" class="svg-axis-title">
              K total
            </text>
            <text
              x="22"
              y="165"
              text-anchor="middle"
              transform="rotate(-90 22 165)"
              class="svg-axis-title"
            >
              k da fase
            </text>

            <!-- Retas de regressão e pontos observados de todas as fases -->
            @for (serie of mainChartData().series; track serie.stageId) {
              <line
                [attr.x1]="serie.x1"
                [attr.y1]="serie.y1"
                [attr.x2]="serie.x2"
                [attr.y2]="serie.y2"
                [attr.stroke]="serie.color"
                [attr.stroke-width]="serie.isCritical ? 3.2 : serie.isSignificant ? 2.2 : 1.5"
                [attr.stroke-dasharray]="serie.isSignificant ? 'none' : '5 5'"
              />
              @for (pt of serie.points; track $index) {
                <circle
                  [attr.cx]="pt.cx"
                  [attr.cy]="pt.cy"
                  [attr.r]="serie.isCritical ? 5.2 : 4.2"
                  [attr.fill]="serie.color"
                  stroke="#ffffff"
                  stroke-width="1.2"
                >
                  <title>{{ serie.stageLabel }} — {{ pt.plotName }}: K={{ pt.x | number: '1.4-4' }}, k={{ pt.y | number: '1.4-4' }}</title>
                </circle>
              }
            }
          </svg>
        </div>

        <!-- Legenda de Fases e Inclinações da Reta (bi) -->
        <div class="slopes-legend-block">
          <div class="legend-title">Fases e Inclinações da Reta (b):</div>
          <div class="legend-pills-row">
            @for (st of criticalStages(); track st.stageId) {
              <div
                class="slope-legend-pill"
                [class.critical]="st.isCriticalPodoler"
              >
                <span
                  class="color-dot"
                  [style.background]="getStageColor(st.stageId)"
                ></span>
                <strong>{{ st.stageId === 'Ov' ? 'Ovo' : st.stageId }}:</strong>
                <span class="mono-text">
                  b = {{ st.slopeB | number: '1.3-3' }}
                </span>
                @if (st.pValue < 0.05) {
                  <span class="sig-green">*(p = {{ st.pValue | number: '1.3-3' }})</span>
                } @else {
                  <span class="sig-muted">(ns)</span>
                }
                @if (st.isCriticalPodoler) {
                  <span class="crit-tag-mini">ESTÁGIO CRÍTICO</span>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- GRADE DUPLA INFERIOR: (A) DISPERSÃO & REGRESSÃO SELETIVA | (B) MORTALIDADE APARENTE MÉDIA (100qx) -->
      <div class="charts-dual-grid">
        <!-- Gráfico Interativo de Dispersão por Fases Selecionadas (RF016) -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">k da Fase vs K total — Dispersão & Regressão</h3>
              <div class="chart-subtitle">Reprodução de '3_k_fase_vs_K_total.png'</div>
            </div>
            <button
              type="button"
              class="btn-outline-sm"
              (click)="exportSvgAsPng('svg-scatter-sel', '3_k_fase_vs_K_total.png')"
            >
              Baixar PNG
            </button>
          </div>

          <div class="stage-filter-pills">
            <span class="pill-label">Fases exibidas:</span>
            @for (st of criticalStages(); track st.stageId) {
              <button
                type="button"
                class="stage-tab-pill"
                [class.active]="isScatterStageSelected(st.stageId)"
                (click)="toggleScatterStage(st.stageId)"
              >
                {{ st.stageId }}
              </button>
            }
          </div>

          <div class="svg-wrapper">
            <svg
              id="svg-scatter-sel"
              viewBox="0 0 460 280"
              class="responsive-svg"
            >
              @for (yTick of scatterChartData().yTicks; track yTick.val) {
                <line
                  x1="55"
                  [attr.y1]="yTick.y"
                  x2="435"
                  [attr.y2]="yTick.y"
                  stroke="#e8e2d5"
                  stroke-dasharray="3 3"
                />
                <text
                  x="48"
                  [attr.y]="yTick.y + 4"
                  text-anchor="end"
                  class="svg-axis-label"
                >
                  {{ yTick.val | number: '1.2-2' }}
                </text>
              }
              <line x1="55" y1="20" x2="55" y2="235" stroke="#94a3b8" stroke-width="1.5" />
              <line x1="55" y1="235" x2="435" y2="235" stroke="#94a3b8" stroke-width="1.5" />
              <text x="245" y="268" text-anchor="middle" class="svg-axis-title">
                K total
              </text>

              @for (serie of scatterChartData().series; track serie.stageId) {
                <line
                  [attr.x1]="serie.x1"
                  [attr.y1]="serie.y1"
                  [attr.x2]="serie.x2"
                  [attr.y2]="serie.y2"
                  [attr.stroke]="serie.color"
                  stroke-width="2.2"
                />
                @for (pt of serie.points; track $index) {
                  <circle
                    [attr.cx]="pt.cx"
                    [attr.cy]="pt.cy"
                    r="4.2"
                    [attr.fill]="serie.color"
                    stroke="#fff"
                    stroke-width="1"
                  />
                  <text
                    [attr.x]="pt.cx + 6"
                    [attr.y]="pt.cy - 4"
                    class="svg-point-label"
                  >
                    {{ pt.plotName }}
                  </text>
                }
              }
            </svg>
          </div>

          <div class="equations-footer">
            @for (serie of scatterChartData().series; track serie.stageId) {
              <div class="eq-row">
                <span class="color-dot" [style.background]="serie.color"></span>
                <strong>{{ serie.stageId === 'Ov' ? 'Ovo' : serie.stageId }}:</strong>
                <span class="mono-text">
                  k = {{ serie.interceptA | number: '1.3-3' }} + {{ serie.slopeB | number: '1.3-3' }} × K (R² = {{ serie.r2 | number: '1.3-3' }})
                </span>
              </div>
            }
          </div>
        </div>

        <!-- Gráfico de Mortalidade Aparente Média (100qx) -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Mortalidade Aparente Média (100qx)</h3>
              <div class="chart-subtitle">Reprodução de '1_mortalidade_aparente_media.png'</div>
            </div>
            <button
              type="button"
              class="btn-outline-sm"
              (click)="exportSvgAsPng('svg-qx-bars', '1_mortalidade_aparente_media.png')"
            >
              Baixar PNG
            </button>
          </div>

          <div class="svg-wrapper">
            <svg
              id="svg-qx-bars"
              viewBox="0 0 460 280"
              class="responsive-svg"
            >
              @for (tick of [0, 25, 50]; track tick) {
                @let yPos = 235 - (tick / 55) * 195;
                <line
                  x1="55"
                  [attr.y1]="yPos"
                  x2="435"
                  [attr.y2]="yPos"
                  stroke="#e8e2d5"
                  stroke-dasharray="3 3"
                />
                <text x="48" [attr.y]="yPos + 4" text-anchor="end" class="svg-axis-label">
                  {{ tick }}%
                </text>
              }
              <line x1="55" y1="235" x2="435" y2="235" stroke="#94a3b8" stroke-width="1.5" />

              @for (bar of qxBarsData(); track bar.stageId) {
                <rect
                  [attr.x]="bar.x"
                  [attr.y]="bar.y"
                  [attr.width]="bar.width"
                  [attr.height]="bar.height"
                  rx="4"
                  fill="#2563eb"
                />
                <text
                  [attr.x]="bar.x + bar.width / 2"
                  [attr.y]="bar.y - 7"
                  text-anchor="middle"
                  class="svg-bar-val"
                >
                  {{ bar.qx100 | number: '1.1-1' }}%
                </text>
                <text
                  [attr.x]="bar.x + bar.width / 2"
                  y="255"
                  text-anchor="middle"
                  class="svg-axis-label"
                >
                  {{ bar.stageId }}
                </text>
              }
            </svg>
          </div>
        </div>
      </div>

      <!-- GRADE DUPLA ADICIONAL: (C) k MÉDIO POR FASE (± EP) | (D) CURVA DE FLUTUAÇÃO DE VARLEY & GRADWELL (kx vs Ktotal) -->
      <div class="charts-dual-grid">
        <!-- k Médio por Fase (± EP) -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">k Médio por Fase (± EP)</h3>
              <div class="chart-subtitle">Reprodução de '2_k_medio_por_fase.png'</div>
            </div>
            <button
              type="button"
              class="btn-outline-sm"
              (click)="exportSvgAsPng('svg-kmean-bars', '2_k_medio_por_fase.png')"
            >
              Baixar PNG
            </button>
          </div>

          <div class="svg-wrapper">
            <svg
              id="svg-kmean-bars"
              viewBox="0 0 460 270"
              class="responsive-svg"
            >
              @for (tick of [0, 0.15, 0.3]; track tick) {
                @let yPos = 225 - (tick / 0.35) * 180;
                <line
                  x1="55"
                  [attr.y1]="yPos"
                  x2="435"
                  [attr.y2]="yPos"
                  stroke="#e8e2d5"
                  stroke-dasharray="3 3"
                />
                <text x="48" [attr.y]="yPos + 4" text-anchor="end" class="svg-axis-label">
                  {{ tick | number: '1.2-2' }}
                </text>
              }
              <line x1="55" y1="225" x2="435" y2="225" stroke="#94a3b8" stroke-width="1.5" />

              @for (bar of kMeanBarsData(); track bar.stageId) {
                <rect
                  [attr.x]="bar.x"
                  [attr.y]="bar.y"
                  [attr.width]="bar.width"
                  [attr.height]="bar.height"
                  rx="4"
                  fill="#059669"
                />
                <!-- Barra de Erro Padrão (± EP) -->
                <line
                  [attr.x1]="bar.x + bar.width / 2"
                  [attr.y1]="bar.errTop"
                  [attr.x2]="bar.x + bar.width / 2"
                  [attr.y2]="bar.errBottom"
                  stroke="#064e3b"
                  stroke-width="1.8"
                />
                <line
                  [attr.x1]="bar.x + bar.width / 2 - 6"
                  [attr.y1]="bar.errTop"
                  [attr.x2]="bar.x + bar.width / 2 + 6"
                  [attr.y2]="bar.errTop"
                  stroke="#064e3b"
                  stroke-width="1.8"
                />
                <text
                  [attr.x]="bar.x + bar.width / 2"
                  [attr.y]="bar.errTop - 7"
                  text-anchor="middle"
                  class="svg-bar-val"
                >
                  {{ bar.kMean | number: '1.3-3' }}
                </text>
                <text
                  [attr.x]="bar.x + bar.width / 2"
                  y="245"
                  text-anchor="middle"
                  class="svg-axis-label"
                >
                  {{ bar.stageId }}
                </text>
              }
            </svg>
          </div>
        </div>

        <!-- Curvas de Flutuação Espacial de kx e Ktotal ao longo dos Talhões (Varley & Gradwell, 1960 — RF015) -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">
                Flutuação Espacial de k<sub>x</sub> vs K<sub>total</sub> (Varley & Gradwell, 1960)
              </h3>
              <div class="chart-subtitle">
                Comparação do contorno de K total (tracejado) com as mortalidades parciais nos talhões 1..{{ lifeTableSvc.plots().length }}
              </div>
            </div>
            <button
              type="button"
              class="btn-outline-sm"
              (click)="exportSvgAsPng('svg-varley-fluct', 'flutuacao_varley_gradwell.png')"
            >
              Baixar PNG
            </button>
          </div>

          <div class="svg-wrapper">
            <svg
              id="svg-varley-fluct"
              viewBox="0 0 460 270"
              class="responsive-svg fluctuation-svg"
            >
              @for (yTick of svgSeries().yTicks; track yTick.val) {
                <line
                  x1="50"
                  [attr.y1]="yTick.y"
                  x2="435"
                  [attr.y2]="yTick.y"
                  stroke="#e8e2d5"
                  stroke-dasharray="3 3"
                />
                <text x="44" [attr.y]="yTick.y + 4" text-anchor="end" class="svg-axis-label">
                  {{ yTick.val | number: '1.2-2' }}
                </text>
              }
              <line x1="50" y1="225" x2="435" y2="225" stroke="#94a3b8" stroke-width="1.5" />

              <!-- Curva tracejada de K total -->
              <polyline
                [attr.points]="svgSeries().kTotalPoints"
                fill="none"
                stroke="#1e293b"
                stroke-width="2.4"
                stroke-dasharray="5 4"
              />

              <!-- Curvas de cada fase -->
              @for (s of svgSeries().stagePolylines; track s.stageId) {
                <polyline
                  [attr.points]="s.points"
                  fill="none"
                  [attr.stroke]="s.color"
                  [attr.stroke-width]="s.isCritical ? 2.6 : 1.5"
                />
              }

              @for (xLbl of svgSeries().xLabels; track xLbl.label) {
                <text
                  [attr.x]="xLbl.x"
                  y="245"
                  text-anchor="middle"
                  class="svg-axis-label"
                >
                  {{ xLbl.label }}
                </text>
              }
            </svg>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class GraficosEstagioCriticoComponent {
  public readonly lifeTableSvc = inject(LifeTableService);

  public readonly selectedScatterStages = signal<Set<string>>(new Set(['Ov', 'N3']));

  public readonly criticalStages = computed<CriticalStageComparison[]>(() => {
    return this.lifeTableSvc.criticalStageAnalysis();
  });

  public readonly criticalStage = computed<CriticalStageComparison | null>(() => {
    return this.lifeTableSvc.fatorChaveStage();
  });

  public getStageColor(stageId: string): string {
    return STAGE_COLORS[stageId] || '#475569';
  }

  public isScatterStageSelected(stageId: string): boolean {
    return this.selectedScatterStages().has(stageId);
  }

  public toggleScatterStage(stageId: string): void {
    const next = new Set(this.selectedScatterStages());
    if (next.has(stageId)) {
      if (next.size > 1) next.delete(stageId);
    } else {
      next.add(stageId);
    }
    this.selectedScatterStages.set(next);
  }

  // Dados para o Gráfico Principal de Regressões Sobrepostas
  public readonly mainChartData = computed(() => {
    const anovas = this.lifeTableSvc.anovaResults();
    const critList = this.criticalStages();
    const tables = this.lifeTableSvc.plotLifeTables();

    const kTotals = tables.map((t) => t.kTotal);
    const minX = Math.max(0, Math.min(...kTotals, 0.3) - 0.05);
    const maxX = Math.max(...kTotals, 0.95) + 0.05;

    let maxY = 0.48;
    for (const a of anovas) {
      for (const p of a.points) {
        if (p.y > maxY) maxY = p.y + 0.04;
      }
    }

    const mapX = (x: number) =>
      75 + ((x - minX) / Math.max(1e-6, maxX - minX)) * 745;
    const mapY = (y: number) =>
      305 - (Math.max(0, y) / Math.max(1e-6, maxY)) * 270;

    const yTicks = [0, 0.15, 0.3, 0.45].map((v) => ({
      val: v,
      y: mapY(v),
    }));

    const xTicks = [0.4, 0.6, 0.8, 1.0]
      .filter((v) => v >= minX && v <= maxX + 0.05)
      .map((v) => ({
        val: v,
        x: mapX(v),
      }));

    const series = anovas.map((a) => {
      const critInfo = critList.find((c) => c.stageId === a.stageId);
      const color = this.getStageColor(a.stageId);
      const yStart = a.intercept.coef + a.slope.coef * minX;
      const yEnd = a.intercept.coef + a.slope.coef * maxX;

      return {
        stageId: a.stageId,
        stageLabel: a.stageLabel,
        color,
        isCritical: Boolean(critInfo?.isCriticalPodoler),
        isSignificant: Boolean(critInfo?.isSignificant),
        x1: mapX(minX),
        y1: mapY(yStart),
        x2: mapX(maxX),
        y2: mapY(yEnd),
        points: a.points.map((pt) => ({
          ...pt,
          cx: mapX(pt.x),
          cy: mapY(pt.y),
        })),
      };
    });

    return { yTicks, xTicks, series };
  });

  // Dados para o Gráfico de Dispersão Seletivo (Ov, N3, etc.)
  public readonly scatterChartData = computed(() => {
    const anovas = this.lifeTableSvc.anovaResults();
    const selected = this.selectedScatterStages();
    const tables = this.lifeTableSvc.plotLifeTables();

    const kTotals = tables.map((t) => t.kTotal);
    const minX = Math.max(0, Math.min(...kTotals, 0.3) - 0.04);
    const maxX = Math.max(...kTotals, 0.95) + 0.04;
    const maxY = 0.55;

    const mapX = (x: number) =>
      55 + ((x - minX) / Math.max(1e-6, maxX - minX)) * 380;
    const mapY = (y: number) =>
      235 - (Math.max(0, y) / maxY) * 205;

    const yTicks = [0, 0.27, 0.55].map((v) => ({
      val: v,
      y: mapY(v),
    }));

    const series = anovas
      .filter((a) => selected.has(a.stageId))
      .map((a) => {
        const color = this.getStageColor(a.stageId);
        const yStart = a.intercept.coef + a.slope.coef * minX;
        const yEnd = a.intercept.coef + a.slope.coef * maxX;
        return {
          stageId: a.stageId,
          color,
          interceptA: a.intercept.coef,
          slopeB: a.slope.coef,
          r2: a.r2,
          x1: mapX(minX),
          y1: mapY(yStart),
          x2: mapX(maxX),
          y2: mapY(yEnd),
          points: a.points.map((pt) => ({
            ...pt,
            cx: mapX(pt.x),
            cy: mapY(pt.y),
          })),
        };
      });

    return { yTicks, series };
  });

  // Barras de Mortalidade Aparente Média (100qx)
  public readonly qxBarsData = computed(() => {
    const rows = this.lifeTableSvc
      .meanLifeTable()
      .rows.filter((r) => !r.isTerminal);
    const count = Math.max(1, rows.length);
    const slotW = 370 / count;
    const barW = Math.min(44, slotW * 0.62);

    return rows.map((r, idx) => {
      const h = (Math.min(55, r.qx100) / 55) * 195;
      return {
        stageId: r.stageId,
        qx100: r.qx100,
        x: 65 + idx * slotW + (slotW - barW) / 2,
        y: 235 - h,
        width: barW,
        height: Math.max(2, h),
      };
    });
  });

  // Barras de k Médio por Fase (± EP)
  public readonly kMeanBarsData = computed(() => {
    const stats = this.lifeTableSvc.kSummaryStats().stageStats;
    const count = Math.max(1, stats.length);
    const slotW = 370 / count;
    const barW = Math.min(44, slotW * 0.62);

    return stats.map((st, idx) => {
      const h = (Math.min(0.35, st.mean) / 0.35) * 180;
      const yTop = 225 - h;
      const sePx = (st.se / 0.35) * 180;
      return {
        stageId: st.stageId,
        kMean: st.mean,
        x: 65 + idx * slotW + (slotW - barW) / 2,
        y: yTop,
        width: barW,
        height: Math.max(2, h),
        errTop: Math.max(18, yTop - sePx),
        errBottom: Math.min(225, yTop + sePx),
      };
    });
  });

  // Curvas de Flutuação Espacial de Varley & Gradwell (1960)
  public readonly svgSeries = computed(() => {
    const plotRows = this.lifeTableSvc.kSummaryStats().plotRows;
    const critList = this.criticalStages();
    const n = Math.max(1, plotRows.length);
    const maxY = Math.max(1.0, ...plotRows.map((p) => p.kTotal));

    const mapX = (i: number) =>
      60 + (i / Math.max(1, n - 1)) * 365;
    const mapY = (v: number) =>
      225 - (Math.max(0, v) / maxY) * 185;

    const yTicks = [0, 0.5, 1.0].map((v) => ({
      val: v,
      y: mapY(v),
    }));

    const kTotalPoints = plotRows
      .map((r, idx) => `${mapX(idx)},${mapY(r.kTotal)}`)
      .join(' ');

    const stagePolylines = critList.map((st) => ({
      stageId: st.stageId,
      color: this.getStageColor(st.stageId),
      isCritical: st.isCriticalPodoler,
      points: plotRows
        .map((r, idx) => `${mapX(idx)},${mapY(r.kByStage[st.stageId] ?? 0)}`)
        .join(' '),
    }));

    const xLabels = plotRows.map((r, idx) => ({
      label: `T${r.plotId}`,
      x: mapX(idx),
    }));

    return { yTicks, kTotalPoints, stagePolylines, xLabels };
  });

  public exportSvgAsPng(svgElementId: string, filename: string): void {
    const svgEl = document.getElementById(svgElementId) as SVGSVGElement | null;
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.png', '.svg');
    a.click();
    URL.revokeObjectURL(url);
  }
}

