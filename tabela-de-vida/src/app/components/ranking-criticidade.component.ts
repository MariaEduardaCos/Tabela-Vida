import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { CriticalStageComparison, RankingCriterion } from '../life-table.models';
import { LifeTableService } from '../life-table.service';

export interface RankedStageItem extends CriticalStageComparison {
  rank: number;
  relativeScorePct: number;
  roleTitle: string;
}

@Component({
  selector: 'app-ranking-criticidade',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel-card">
      <div class="ranking-top-header">
        <div>
          <h2 class="section-heading">Ranking de Criticidade dos Estágios de Desenvolvimento</h2>
          <p class="section-desc">
            Hierarquização formal de todas as fases ontogenéticas de acordo com sua contribuição para a mortalidade total da população (Podoler & Rogers, 1975; Pereira et al., 2018; Naranjo & Ellsworth, 2005).
          </p>
        </div>

        @if (lifeTableSvc.fatorChaveStage(); as keySt) {
          <div class="fator-chave-top-box">
            <span class="fc-overline">FATOR-CHAVE POPULACIONAL:</span>
            <div class="fc-stage-name">{{ keySt.stageLabel }}</div>
            <div class="fc-metrics">
              b = {{ keySt.slopeB | number: '1.3-3' }} (p = {{ keySt.pValue | number: '1.3-3' }})
            </div>
          </div>
        }
      </div>

      <!-- SELETOR MULTI-CRITÉRIO DE METODOLOGIA CIENTÍFICA (RF018 / RN021) -->
      <div class="criteria-selector-box">
        <div class="criteria-label">Critério de ordenação:</div>
        <div class="criteria-pills-row">
          <button
            type="button"
            class="criterion-card"
            [class.active]="selectedCriterion() === 'podoler'"
            (click)="selectCriterion('podoler')"
          >
            Podoler & Rogers (Slope b & p &lt; 0.05)
          </button>
          <button
            type="button"
            class="criterion-card"
            [class.active]="selectedCriterion() === 'mi'"
            (click)="selectCriterion('mi')"
          >
            Mortalidade Indispensável (MI %)
          </button>
          <button
            type="button"
            class="criterion-card"
            [class.active]="selectedCriterion() === 'potencial'"
            (click)="selectCriterion('potencial')"
          >
            Aumento Populacional (%)
          </button>
          <button
            type="button"
            class="criterion-card"
            [class.active]="selectedCriterion() === 'r2'"
            (click)="selectCriterion('r2')"
          >
            Poder Explicativo (R²)
          </button>
          <button
            type="button"
            class="criterion-card"
            [class.active]="selectedCriterion() === 'kmedio'"
            (click)="selectCriterion('kmedio')"
          >
            Intensidade Média (k Médio)
          </button>
        </div>
      </div>

      <!-- Caixa explicativa dinâmica do critério selecionado -->
      <div class="recommendation-box">
        @switch (selectedCriterion()) {
          @case ('podoler') {
            <strong>Método Podoler & Rogers (1975) e Pereira et al. (2018):</strong>
            Prioriza estágios com regressão linear estatisticamente significante (P &lt; 0.05) e maior inclinação da reta (b). O estágio com maior b significante é o fator-chave que mais dita a variação do K total.
          }
          @case ('mi') {
            <strong>Mortalidade Indispensável (MI % — Southwood, 1978):</strong>
            Classifica os estágios pela fração líquida da população inicial que morreria sem compensação pelos fatores de mortalidade das fases subsequentes.
          }
          @case ('potencial') {
            <strong>Potencial de Aumento Populacional (%):</strong>
            Estima a explosão proporcional de adultos sobreviventes que ocorreria caso a mortalidade do estágio fosse zerada. Ideal para avaliar risco biológico de falhas no controle.
          }
          @case ('r2') {
            <strong>Poder Explicativo da Regressão (R² & Estatística F da ANOVA):</strong>
            Hierarquiza as fases pelo coeficiente de determinação linear (R²), identificando o estágio que explica a maior proporção percentual da variância de K total entre os talhões.
          }
          @case ('kmedio') {
            <strong>Intensidade Média de Mortalidade Logarítmica (k̄ Médio):</strong>
            Ordena os estágios pela magnitude média absoluta do fator k de Haldane entre os talhões monitorados.
          }
        }
      </div>

      <!-- PÓDIO E CARTÕES HIERÁRQUICOS DE CRITICIDADE (RF017) -->
      <div class="podium-grid">
        @for (item of rankedStages(); track item.stageId) {
          <div
            class="podium-card"
            [class.first-place]="item.rank === 1"
          >
            <div class="podium-card-header">
              <div class="rank-badge" [class.gold]="item.rank === 1">
                <div class="rank-num">{{ item.rank.toString().padStart(2, '0') }}</div>
                <div class="rank-sub">{{ item.rank }}º LUGAR</div>
              </div>
              <div class="stage-title-info">
                <div class="stage-line">
                  <span class="stage-code-pill">{{ item.stageId }}</span>
                  <strong>{{ item.stageLabel }}</strong>
                </div>
                <div
                  class="role-subtitle"
                  [class.critical-text]="item.isCriticalPodoler"
                >
                  {{ item.roleTitle }}
                </div>
              </div>
            </div>

            <div class="impact-bar-section">
              <div class="impact-bar-labels">
                <span>Impacto Relativo</span>
                <strong>{{ item.relativeScorePct | number: '1.0-0' }}%</strong>
              </div>
              <div class="impact-bar-track">
                <div
                  class="impact-bar-fill"
                  [class.gold-fill]="item.rank === 1"
                  [style.width.%]="item.relativeScorePct"
                ></div>
              </div>
            </div>

            <div class="podium-metrics-grid">
              <div class="metric-cell">
                <span class="m-label">INCLINAÇÃO DA RETA (B)</span>
                <div class="m-val mono-bold">{{ item.slopeB | number: '1.3-3' }}</div>
                <div class="m-sub">
                  IC95%: {{ item.ci95Low | number: '1.2-2' }} a {{ item.ci95High | number: '1.2-2' }}
                </div>
              </div>

              <div class="metric-cell">
                <span class="m-label">SIGNIFICÂNCIA (P)</span>
                <div
                  class="m-val mono-bold"
                  [class.mono-green]="item.pValue < 0.05"
                >
                  {{ item.pValue | number: '1.4-4' }} ({{ item.pValue < 0.05 ? '*' : 'ns' }})
                </div>
                <div class="m-sub">r = {{ item.r | number: '1.3-3' }}</div>
              </div>

              <div class="metric-cell">
                <span class="m-label">R² (AJUSTE)</span>
                <div class="m-val mono-bold">{{ item.r2 * 100 | number: '1.1-1' }}%</div>
                <div class="m-sub">da variância de K total</div>
              </div>

              <div class="metric-cell">
                <span class="m-label">MORTALIDADE INDISPENSÁVEL</span>
                <div class="m-val mono-bold">{{ item.miPct | number: '1.2-2' }}%</div>
                <div class="m-sub">MI (Pereira et al.)</div>
              </div>

              <div class="metric-cell">
                <span class="m-label">AUMENTO POP. SUPRIMIDO</span>
                <div class="m-val mono-danger">+{{ item.aumentoPopPct | number: '1.1-1' }}%</div>
                <div class="m-sub">de sobreviventes adultos</div>
              </div>

              <div class="metric-cell">
                <span class="m-label">K MÉDIO (± EP)</span>
                <div class="m-val mono-bold">{{ item.kMean | number: '1.4-4' }}</div>
                <div class="m-sub">± {{ item.kSe | number: '1.4-4' }}</div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- COMPARATIVO VISUAL DE INCLINAÇÃO (SLOPE B) COM INTERVALO DE CONFIANÇA (95%) -->
      <div class="slope-comparison-card">
        <h3 class="sub-card-title">
          Comparativo Visual de Inclinação (Slope b) com Intervalo de Confiança (95%)
        </h3>
        <p class="section-desc">
          Estágios ordenados. A linha tracejada em b = 1.0 representa correspondência unitária teórica com K total.
        </p>

        <div class="slope-bars-list">
          @for (item of rankedStages(); track item.stageId) {
            <div class="slope-bar-row">
              <div class="slope-bar-label">
                <strong>{{ item.rank }}º {{ item.stageId }}</strong>
              </div>
              <div class="slope-bar-track">
                <div
                  class="slope-bar-fill"
                  [class.critical]="item.isCriticalPodoler"
                  [style.width.%]="Math.max(4, Math.min(100, item.slopeB * 100))"
                ></div>
                @if (item.ci95High > 0) {
                  <div
                    class="ci-whisker-line"
                    [style.left.%]="Math.max(0, item.ci95Low * 100)"
                    [style.width.%]="Math.max(2, Math.min(95, (item.ci95High - Math.max(0, item.ci95Low)) * 100))"
                  ></div>
                }
                <span
                  class="slope-bar-text"
                  [style.left.%]="Math.min(82, Math.max(8, Math.max(item.slopeB, item.ci95High) * 100 + 2))"
                >
                  b = {{ item.slopeB | number: '1.3-3' }} {{ item.pValue < 0.05 ? '*' : '' }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- TABELA EXECUTIVA COMPLETA DE CLASSIFICAÇÃO HIERÁRQUICA (RF017) -->
      <div class="sub-card ranking-table-card">
        <h3 class="sub-card-title">Tabela Executiva de Classificação Hierárquica e Recomendação de MIP</h3>
        <div class="table-scroll-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>POSIÇÃO</th>
                <th>FASE</th>
                <th class="num-col">SCORE</th>
                <th class="num-col">SLOPE (bᵢ)</th>
                <th class="num-col">PEARSON (r)</th>
                <th class="num-col">R² (%)</th>
                <th class="num-col">MI (%)</th>
                <th class="num-col">100qₓ (%)</th>
                <th>DIAGNÓSTICO & JUSTIFICATIVA TÉCNICA</th>
              </tr>
            </thead>
            <tbody>
              @for (item of rankedStages(); track item.stageId) {
                <tr [class.first-rank-row]="item.rank === 1">
                  <td class="mono-bold">{{ item.rank }}º Lugar</td>
                  <td>
                    <span class="stage-code-pill">{{ item.stageId }}</span>
                    <strong>{{ item.stageLabel }}</strong>
                  </td>
                  <td class="num-col mono-gold">{{ item.relativeScorePct | number: '1.0-0' }}%</td>
                  <td class="num-col mono-bold">{{ item.slopeB | number: '1.4-4' }}</td>
                  <td class="num-col mono-bold">{{ item.r | number: '1.4-4' }}</td>
                  <td class="num-col mono-bold">{{ item.r2 * 100 | number: '1.1-1' }}%</td>
                  <td class="num-col mono-gold">{{ item.miPct | number: '1.2-2' }}%</td>
                  <td class="num-col mono-bold">{{ item.qx100Mean | number: '1.2-2' }}%</td>
                  <td class="justificativa-cell">{{ item.roleTitle }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class RankingCriticidadeComponent {
  public readonly lifeTableSvc = inject(LifeTableService);
  public readonly Math = Math;

  public readonly selectedCriterion = signal<RankingCriterion>('podoler');

  public selectCriterion(c: RankingCriterion): void {
    this.selectedCriterion.set(c);
  }

  public readonly rankedStages = computed<RankedStageItem[]>(() => {
    const stages = [...this.lifeTableSvc.criticalStageAnalysis()];
    const crit = this.selectedCriterion();

    stages.sort((a, b) => {
      switch (crit) {
        case 'podoler': {
          if (a.isSignificant !== b.isSignificant) {
            return a.isSignificant ? -1 : 1;
          }
          return b.slopeB - a.slopeB;
        }
        case 'mi':
          return b.miPct - a.miPct;
        case 'potencial':
          return b.aumentoPopPct - a.aumentoPopPct;
        case 'r2':
          return b.r2 - a.r2;
        case 'kmedio':
          return b.kMean - a.kMean;
      }
    });

    const getMetricValue = (item: CriticalStageComparison): number => {
      switch (crit) {
        case 'podoler':
          return Math.max(0.035, item.slopeB);
        case 'mi':
          return Math.max(0.5, item.miPct);
        case 'potencial':
          return Math.max(1, item.aumentoPopPct);
        case 'r2':
          return Math.max(0.05, item.r2);
        case 'kmedio':
          return Math.max(0.01, item.kMean);
      }
    };

    const maxMetric = Math.max(
      1e-6,
      ...stages.map((s) => getMetricValue(s))
    );

    return stages.map((st, idx) => {
      const val = getMetricValue(st);
      const relativeScorePct = Math.max(
        8,
        Math.min(100, Math.round((val / maxMetric) * 100))
      );

      let roleTitle = 'Mortalidade Estável (ns)';
      if (st.isCriticalPodoler) {
        roleTitle = 'Estágio Crítico Principal (Fator-Chave)';
      } else if (st.isSignificant) {
        roleTitle = 'Fator Secundário Significativo';
      }

      return {
        ...st,
        rank: idx + 1,
        relativeScorePct: idx === 0 ? 100 : relativeScorePct,
        roleTitle,
      };
    });
  });
}

