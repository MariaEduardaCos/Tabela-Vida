import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { LifeTableService } from '../life-table.service';

@Component({
  selector: 'app-correlacao-regressao',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (lifeTableSvc.correlationMatrix(); as corr) {
      <div class="panel-card">
        <!-- PARTE A: MATRIZ DE CORRELAÇÃO DE PEARSON (r) E TESTE t DE STUDENT (RF013 / RN019) -->
        <h2 class="section-heading">5. Matriz de Correlação de Pearson (k vs K total)</h2>
        <p class="section-desc">
          Coeficiente de correlação linear (r) entre a mortalidade de cada estágio e o K total acumulado.
        </p>

        <div class="table-scroll-container">
          <table class="data-table corr-table">
            <thead>
              <tr>
                <th class="col-stage">FASE</th>
                @for (col of corr.labels; track col.id) {
                  <th class="num-col">{{ col.label | uppercase }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of corr.labels; track row.id) {
                <tr>
                  <td class="stage-name-cell">
                    <strong>{{ row.label }}</strong>
                  </td>
                  @for (col of corr.labels; track col.id) {
                    @let val = corr.matrix[row.id][col.id];
                    <td
                      class="num-col mono-bold"
                      [class.corr-diag]="row.id === col.id"
                      [class.corr-strong-pos]="row.id !== col.id && val >= 0.7"
                      [class.corr-mod-pos]="row.id !== col.id && val >= 0.35 && val < 0.7"
                      [class.corr-neg]="row.id !== col.id && val < 0"
                    >
                      {{ val | number: '1.4-4' }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- PARTE B: RESUMO DAS REGRESSÕES LINEARES (FORMATO EXCEL ANOVA) (RF014 / RN020) -->
        <div class="anova-header-bar">
          <div>
            <h2 class="section-heading">Resumo das Regressões Lineares (Formato Excel ANOVA)</h2>
            <p class="section-desc">
              Equação: k(Fase) = Interseção + b × K total
            </p>
          </div>

          <div class="stage-filter-pills">
            <span class="pill-label">Fase detalhada:</span>
            @for (an of lifeTableSvc.anovaResults(); track an.stageId; let idx = $index) {
              <button
                type="button"
                class="stage-tab-pill"
                [class.active]="selectedStageIdx() === idx"
                (click)="selectedStageIdx.set(idx)"
              >
                {{ an.stageId === 'Ov' ? 'Ovo' : an.stageId }}
              </button>
            }
          </div>
        </div>

        @if (currentAnova(); as anova) {
          <div class="anova-split-grid">
            <!-- (1) Estatísticas da Regressão -->
            <div class="sub-card">
              <h3 class="sub-card-title">
                Estatística de Regressão — {{ anova.stageLabel }}
              </h3>
              <table class="data-table kv-table">
                <tbody>
                  <tr>
                    <td>R múltiplo</td>
                    <td class="num-col mono-bold">{{ anova.rMultiple | number: '1.4-4' }}</td>
                  </tr>
                  <tr>
                    <td>R-Quadrado (R²)</td>
                    <td class="num-col mono-gold">{{ anova.r2 | number: '1.4-4' }}</td>
                  </tr>
                  <tr>
                    <td>R-quadrado ajustado</td>
                    <td class="num-col mono-bold">{{ anova.r2Adj | number: '1.4-4' }}</td>
                  </tr>
                  <tr>
                    <td>Erro padrão</td>
                    <td class="num-col mono-bold">{{ anova.standardError | number: '1.4-4' }}</td>
                  </tr>
                  <tr>
                    <td>Observações</td>
                    <td class="num-col mono-bold">{{ anova.observations }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- (2) Quadro Completo de ANOVA -->
            <div class="sub-card">
              <h3 class="sub-card-title">ANOVA</h3>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>FONTE</th>
                    <th class="num-col">GL</th>
                    <th class="num-col">SQ</th>
                    <th class="num-col">MQ</th>
                    <th class="num-col">F</th>
                    <th class="num-col">P-VALOR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Regressão</strong></td>
                    <td class="num-col mono-bold">{{ anova.dfReg }}</td>
                    <td class="num-col mono-muted">{{ anova.ssReg | number: '1.4-4' }}</td>
                    <td class="num-col mono-muted">{{ anova.msReg | number: '1.4-4' }}</td>
                    <td class="num-col mono-bold">{{ anova.fStat | number: '1.2-2' }}</td>
                    <td
                      class="num-col mono-bold"
                      [class.mono-green]="anova.pValueF < 0.05"
                    >
                      {{ anova.pValueF | number: '1.4-4' }}
                    </td>
                  </tr>
                  <tr>
                    <td>Resíduo</td>
                    <td class="num-col mono-bold">{{ anova.dfRes }}</td>
                    <td class="num-col mono-muted">{{ anova.ssRes | number: '1.4-4' }}</td>
                    <td class="num-col mono-muted">{{ anova.msRes | number: '1.4-4' }}</td>
                    <td class="num-col"></td>
                    <td class="num-col"></td>
                  </tr>
                  <tr class="summary-row">
                    <td><strong>Total</strong></td>
                    <td class="num-col mono-bold">{{ anova.dfTotal }}</td>
                    <td class="num-col mono-bold">{{ anova.ssTotal | number: '1.4-4' }}</td>
                    <td class="num-col"></td>
                    <td class="num-col"></td>
                    <td class="num-col"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- (3) Tabela de Coeficientes da Reta de Regressão com IC 95% -->
          <div class="sub-card coef-card">
            <h3 class="sub-card-title">Coeficientes da Reta de Regressão</h3>
            <div class="table-scroll-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>VARIÁVEL</th>
                    <th class="num-col">COEFICIENTE (B)</th>
                    <th class="num-col">ERRO PADRÃO</th>
                    <th class="num-col">STAT T</th>
                    <th class="num-col">VALOR-P</th>
                    <th class="num-col">IC 95% INFERIOR</th>
                    <th class="num-col">IC 95% SUPERIOR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>{{ anova.intercept.name }}</strong></td>
                    <td class="num-col mono-bold">{{ anova.intercept.coef | number: '1.4-4' }}</td>
                    <td class="num-col mono-muted">{{ anova.intercept.se | number: '1.4-4' }}</td>
                    <td class="num-col mono-bold">{{ anova.intercept.tStat | number: '1.2-2' }}</td>
                    <td class="num-col mono-bold">{{ anova.intercept.pValue | number: '1.4-4' }}</td>
                    <td class="num-col mono-muted">{{ anova.intercept.ci95Low | number: '1.4-4' }}</td>
                    <td class="num-col mono-muted">{{ anova.intercept.ci95High | number: '1.4-4' }}</td>
                  </tr>
                  <tr>
                    <td><strong class="slope-label">{{ anova.slope.name }}</strong></td>
                    <td class="num-col mono-gold">{{ anova.slope.coef | number: '1.4-4' }}</td>
                    <td class="num-col mono-muted">{{ anova.slope.se | number: '1.4-4' }}</td>
                    <td class="num-col mono-bold">{{ anova.slope.tStat | number: '1.2-2' }}</td>
                    <td
                      class="num-col mono-bold"
                      [class.mono-green]="anova.slope.pValue < 0.05"
                    >
                      {{ anova.slope.pValue | number: '1.4-4' }}
                    </td>
                    <td class="num-col mono-muted">{{ anova.slope.ci95Low | number: '1.4-4' }}</td>
                    <td class="num-col mono-muted">{{ anova.slope.ci95High | number: '1.4-4' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class CorrelacaoRegressaoComponent {
  public readonly lifeTableSvc = inject(LifeTableService);

  public readonly selectedStageIdx = signal<number>(0);

  public readonly currentAnova = computed(() => {
    const list = this.lifeTableSvc.anovaResults();
    const idx = this.selectedStageIdx();
    return list[idx] || list[0] || null;
  });
}
