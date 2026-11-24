import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LifeTableService } from '../life-table.service';

@Component({
  selector: 'app-matriz-k',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (lifeTableSvc.kSummaryStats(); as kStats) {
      <div class="panel-card">
        <div class="header-with-badge">
          <div>
            <h2 class="section-heading">
              4. Valores de k por Fase e K total (Aba FASE DE MORTALIDADE)
            </h2>
            <p class="section-desc">
              Mortalidade parcial de cada estágio (k) e mortalidade acumulada (K total) para cada um dos talhões.
            </p>
          </div>
          <span class="badge-outline-gold">Tabela Padronizada</span>
        </div>

        <div class="table-scroll-container">
          <table class="data-table k-matrix-table">
            <thead>
              <tr>
                <th class="col-stage">TALHÃO</th>
                @for (st of kStats.stageStats; track st.stageId) {
                  <th class="num-col">{{ st.stageId | uppercase }}</th>
                }
                <th class="num-col ktotal-col">K TOTAL</th>
                <th class="num-col">MORTALIDADE TOTAL (%)</th>
              </tr>
            </thead>
            <tbody>
              @for (row of kStats.plotRows; track row.plotId) {
                <tr>
                  <td class="stage-name-cell">
                    <strong>{{ row.plotName }}</strong>
                  </td>
                  @for (st of kStats.stageStats; track st.stageId) {
                    <td
                      class="num-col mono-bold"
                      [class.max-k-highlight]="
                        row.maxStageId === st.stageId && (row.kByStage[st.stageId] || 0) > 0
                      "
                    >
                      {{ row.kByStage[st.stageId] | number: '1.4-4' }}
                    </td>
                  }
                  <td class="num-col mono-gold ktotal-cell">
                    {{ row.kTotal | number: '1.4-4' }}
                  </td>
                  <td class="num-col mono-bold">
                    {{ row.mortalidadeTotalPct | number: '1.2-2' }}%
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="summary-row">
                <td><strong>Soma (∑)</strong></td>
                @for (st of kStats.stageStats; track st.stageId) {
                  <td class="num-col mono-bold">{{ st.sum | number: '1.4-4' }}</td>
                }
                <td class="num-col mono-gold ktotal-cell">
                  {{ kStats.kTotalSum | number: '1.4-4' }}
                </td>
                <td class="num-col">—</td>
              </tr>
              <tr class="summary-row">
                <td><strong>Média (k̄)</strong></td>
                @for (st of kStats.stageStats; track st.stageId) {
                  <td class="num-col mono-bold">{{ st.mean | number: '1.4-4' }}</td>
                }
                <td class="num-col mono-gold ktotal-cell">
                  {{ kStats.kTotalMean | number: '1.4-4' }}
                </td>
                <td class="num-col mono-bold">
                  {{ kStats.mortalidadeTotalMean | number: '1.2-2' }}%
                </td>
              </tr>
              <tr class="summary-row">
                <td><strong>Desvio Padrão (s)</strong></td>
                @for (st of kStats.stageStats; track st.stageId) {
                  <td class="num-col mono-muted">{{ st.sd | number: '1.4-4' }}</td>
                }
                <td class="num-col mono-muted ktotal-cell">
                  {{ kStats.kTotalSd | number: '1.4-4' }}
                </td>
                <td class="num-col">—</td>
              </tr>
              <tr class="summary-row">
                <td><strong>Erro Padrão (EP = s / √n)</strong></td>
                @for (st of kStats.stageStats; track st.stageId) {
                  <td class="num-col mono-muted">{{ st.se | number: '1.4-4' }}</td>
                }
                <td class="num-col mono-muted ktotal-cell">
                  {{ kStats.kTotalSe | number: '1.4-4' }}
                </td>
                <td class="num-col">—</td>
              </tr>
              <tr class="summary-row">
                <td><strong>Participação (% de K total)</strong></td>
                @for (st of kStats.stageStats; track st.stageId) {
                  <td class="num-col mono-gold">{{ st.pctOfKTotal | number: '1.1-1' }}%</td>
                }
                <td class="num-col mono-gold ktotal-cell">100.0%</td>
                <td class="num-col">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    }
  `,
})
export class MatrizKComponent {
  public readonly lifeTableSvc = inject(LifeTableService);
}
