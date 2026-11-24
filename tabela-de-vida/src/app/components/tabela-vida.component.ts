import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LifeTableService } from '../life-table.service';

@Component({
  selector: 'app-tabela-vida',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (currentTable(); as pt) {
      <div class="panel-card">
        <h2 class="section-heading">2. Tabela de Vida Ecológica — {{ pt.plotName }}</h2>
        <p class="section-desc">
          Cálculo das taxas de mortalidade (100qx, 100rx, MM), sobrevivência (lx), mortes (dx) e mortalidade logarítmica (k = -log10(1 - MM/100)).
        </p>

        <!-- Alternância da convenção de cálculo de 100rx (RF010 / RN015) -->
        <div class="mode-toggle-box">
          <label class="checkbox-pill">
            <input
              type="checkbox"
              [ngModel]="lifeTableSvc.useSpreadsheet100rx()"
              (ngModelChange)="lifeTableSvc.setUseSpreadsheet100rx($event)"
            />
            <span>Usar referência 100rx estática da planilha (lx Ovo Talhão 1)</span>
          </label>
        </div>

        <!-- Seletor de Talhão em visualização -->
        <div class="plot-selector-box">
          <div class="active-plot-header">
            <span class="overline-label">TALHÃO EM VISUALIZAÇÃO:</span>
            <span class="active-plot-badge">{{ pt.plotName }}</span>
          </div>

          <div class="plot-tabs-row">
            @for (p of lifeTableSvc.plots(); track p.id; let idx = $index) {
              <button
                type="button"
                class="plot-tab"
                [class.active]="lifeTableSvc.selectedPlotIndex() === idx"
                (click)="lifeTableSvc.selectedPlotIndex.set(idx)"
              >
                <span class="tab-num">{{ (idx + 1).toString().padStart(2, '0') }}</span>
                {{ p.name }}
              </button>
            }
          </div>
        </div>

        <!-- Tabela Dupla: Tabela Natural (Observada) & Tabela Padronizada (Base 1.000 Ovos) -->
        <div class="table-scroll-container">
          <table class="data-table dual-life-table">
            <thead>
              <tr class="group-header-row">
                <th colspan="6" class="natural-group-header">Tabela Natural (Observada)</th>
                <th colspan="6" class="standard-group-header">Tabela Padronizada (Base 1.000 Ovos)</th>
              </tr>
              <tr>
                <th class="col-stage">FASE</th>
                <th class="num-col">SOMA</th>
                <th class="num-col">LX</th>
                <th class="num-col">DX</th>
                <th class="num-col">100QX (%)</th>
                <th class="num-col">100RX (%)</th>
                <th class="num-col border-right-divider">K</th>
                <th class="num-col">LX₂</th>
                <th class="num-col">DX₂</th>
                <th class="num-col">100QX₂ (%)</th>
                <th class="num-col">100RX₂ (%)</th>
                <th class="num-col">MM₂ (%)</th>
                <th class="num-col">K₂</th>
              </tr>
            </thead>
            <tbody>
              @for (row of pt.rows; track row.stageId) {
                <tr [class.terminal-row]="row.isTerminal">
                  <td class="stage-name-cell">
                    <span class="stage-code-pill">{{ row.stageId }}</span>
                    <strong>{{ row.stageLabel }}</strong>
                  </td>
                  <td class="num-col mono-bold">{{ row.soma }}</td>
                  <td class="num-col mono-bold">{{ row.lx }}</td>
                  <td class="num-col mono-muted">
                    {{ row.isTerminal ? '—' : row.dx }}
                  </td>
                  <td class="num-col mono-bold">
                    {{ row.isTerminal ? '—' : (row.qx100 | number: '1.4-4') }}
                  </td>
                  <td class="num-col mono-muted">
                    {{ row.isTerminal ? '—' : (row.rx100 | number: '1.4-4') }}
                  </td>
                  <td class="num-col mono-bold border-right-divider">
                    {{ row.isTerminal ? '—' : (row.k | number: '1.4-4') }}
                  </td>

                  <td class="num-col mono-green">{{ row.lx2 | number: '1.1-1' }}</td>
                  <td class="num-col mono-muted">
                    {{ row.isTerminal ? '—' : (row.dx2 | number: '1.1-1') }}
                  </td>
                  <td class="num-col mono-bold">
                    {{ row.isTerminal ? '—' : (row.qx100_2 | number: '1.4-4') }}
                  </td>
                  <td class="num-col mono-muted">
                    {{ row.isTerminal ? '—' : (row.rx100_2 | number: '1.4-4') }}
                  </td>
                  <td class="num-col mono-bold">
                    {{ row.isTerminal ? '—' : (row.mm2 | number: '1.4-4') }}
                  </td>
                  <td
                    class="num-col mono-gold"
                    [class.max-k-highlight]="!row.isTerminal && row.stageId === pt.maxKStageId"
                  >
                    {{ row.isTerminal ? '—' : (row.k2 | number: '1.4-4') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="kpi-cards-row bottom-kpis">
          <div class="kpi-card danger-tint">
            <span class="kpi-label">MORTALIDADE TOTAL ACUMULADA</span>
            <div class="kpi-value danger">
              {{ pt.mortalidadeTotalPct | number: '1.2-2' }}%
            </div>
          </div>
          <div class="kpi-card gold-tint">
            <span class="kpi-label">K TOTAL (SOMA DAS FASES PRÉ-ADULTAS)</span>
            <div class="kpi-value gold">{{ pt.kTotal | number: '1.4-4' }}</div>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">COORTE INICIAL (L₀) / ADULTOS</span>
            <div class="kpi-value">
              {{ pt.totalOvosIniciais }} → {{ pt.adultosSobreviventes }}
            </div>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">FASE DE MAIOR K PARCIAL</span>
            <div class="kpi-value">{{ pt.maxKStageId }}</div>
          </div>
        </div>
      </div>
    }
  `,
})
export class TabelaVidaComponent {
  public readonly lifeTableSvc = inject(LifeTableService);

  public readonly currentTable = computed(() => {
    const list = this.lifeTableSvc.plotLifeTables();
    const idx = this.lifeTableSvc.selectedPlotIndex();
    return list[idx] || list[0] || null;
  });
}

