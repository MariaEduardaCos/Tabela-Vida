import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LifeTableService } from '../life-table.service';

@Component({
  selector: 'app-tabela-media',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (lifeTableSvc.meanLifeTable(); as meanTbl) {
      <div class="panel-card">
        <h2 class="section-heading">
          3. Tabela de Vida Média & Mortalidade Indispensável (Pereira et al., 2018)
        </h2>
        <p class="section-desc">
          Média consolidada entre todos os {{ lifeTableSvc.plots().length }} talhões (padronizada para 1.000 ovos), Desvio Padrão (DP), Erro Padrão (EP = DP / √N), Mortalidade Indispensável (MI) e Aumento Populacional Esperado (%).
        </p>

        <div class="table-scroll-container">
          <table class="data-table mean-life-table">
            <thead>
              <tr>
                <th class="col-stage">FASE</th>
                <th class="num-col">LX (MÉDIA ± EP)</th>
                <th class="num-col">DX (MÉDIA ± EP)</th>
                <th class="num-col">DESVIO PADRÃO LX</th>
                <th class="num-col">100QX (%)</th>
                <th class="num-col">100RX (%)</th>
                <th class="num-col">MM (%)</th>
                <th class="num-col">K MÉDIO</th>
                <th class="num-col mi-col">MI (%)</th>
                <th class="num-col mi-col">AUMENTO POP. (%)</th>
              </tr>
            </thead>
            <tbody>
              @for (row of meanTbl.rows; track row.stageId) {
                <tr [class.terminal-row]="row.isTerminal">
                  <td class="stage-name-cell">
                    <span class="stage-code-pill">{{ row.stageId }}</span>
                    <strong>{{ row.stageLabel }}</strong>
                  </td>
                  <td class="num-col mono-bold">
                    <div>{{ row.lxMean | number: '1.2-2' }} ±</div>
                    <div>{{ row.lxSe | number: '1.2-2' }}</div>
                  </td>
                  <td class="num-col mono-muted">
                    @if (row.isTerminal) {
                      —
                    } @else {
                      <div>{{ row.dxMean | number: '1.2-2' }} ±</div>
                      <div>{{ row.dxSe | number: '1.2-2' }}</div>
                    }
                  </td>
                  <td class="num-col mono-muted">{{ row.lxSd | number: '1.2-2' }}</td>
                  <td class="num-col mono-bold">
                    {{ row.isTerminal ? '—' : (row.qx100 | number: '1.4-4') }}
                  </td>
                  <td class="num-col mono-muted">
                    {{ row.isTerminal ? '—' : (row.rx100 | number: '1.4-4') }}
                  </td>
                  <td class="num-col mono-bold">
                    {{ row.isTerminal ? '—' : (row.mm | number: '1.4-4') }}
                  </td>
                  <td class="num-col mono-gold">
                    {{ row.isTerminal ? '—' : (row.kMean | number: '1.4-4') }}
                  </td>
                  <td class="num-col mono-gold mi-cell">
                    {{ row.isTerminal ? '—' : (row.miPct | number: '1.2-2') + '%' }}
                  </td>
                  <td class="num-col mono-gold mi-cell">
                    {{ row.isTerminal ? '—' : '+' + (row.aumentoPopPct | number: '1.1-1') + '%' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="kpi-cards-row bottom-kpis">
          <div class="kpi-card danger-tint">
            <span class="kpi-label">MORTALIDADE TOTAL MÉDIA</span>
            <div class="kpi-value danger">
              {{ meanTbl.mortalidadeTotalMedia | number: '1.2-2' }}% ± {{ meanTbl.mortalidadeTotalSe | number: '1.2-2' }}%
            </div>
          </div>
          <div class="kpi-card gold-tint">
            <span class="kpi-label">K TOTAL MÉDIO</span>
            <div class="kpi-value gold">{{ meanTbl.kTotalMedio | number: '1.4-4' }}</div>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">MAIOR K MÉDIO / MAIOR MI</span>
            <div class="kpi-value">{{ meanTbl.maiorKStage }}</div>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">SOBREVIVÊNCIA ADULTA MÉDIA</span>
            <div class="kpi-value">
              {{ meanTbl.sobrevivenciaAdultaMedia | number: '1.2-2' }}%
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class TabelaMediaComponent {
  public readonly lifeTableSvc = inject(LifeTableService);
}

