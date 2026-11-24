import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CenarioAnalitico } from '../life-table.models';
import { LifeTableService } from '../life-table.service';
import { SelecaoContextService } from '../selecao-context.service';

@Component({
  selector: 'app-cenarios-analiticos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel-card">
      <div class="cenarios-toolbar">
        <h2 class="section-heading">Cenários Analíticos</h2>
        <div class="toolbar-controls">
          <input
            type="text"
            class="search-input"
            [(ngModel)]="busca"
            (ngModelChange)="buscaSignal.set($event)"
            placeholder="Buscar cenário, usuário, cultura ou praga..."
          />
          <button
            type="button"
            class="btn-primary-dark"
            (click)="abrirNovoCenario()"
          >
            + Novo Cenário
          </button>
        </div>
      </div>

      <!-- LISTA MINIMALISTA EM LINHA ÚNICA COM EXPANSÃO EM ACORDEÃO (RF004 / RN002 / RN004) -->
      <div class="accordion-list">
        @for (c of cenariosFiltrados(); track c.id) {
          @let diag = getDiagnosis(c);
          <div
            class="accordion-item"
            [class.active-item]="lifeTableSvc.activeCenario()?.id === c.id"
            [class.expanded]="isExpanded(c.id)"
          >
            <!-- Linha única do acordeão recolhido -->
            <div class="accordion-summary" (click)="toggleExpand(c.id)">
              <div class="summary-left">
                <span class="chevron">{{ isExpanded(c.id) ? '▾' : '▸' }}</span>
                <span
                  class="status-dot"
                  [class.active]="lifeTableSvc.activeCenario()?.id === c.id"
                ></span>
                <span class="cenario-title">{{ c.nome }}</span>
              </div>

              <div class="summary-right" (click)="$event.stopPropagation()">
                <span class="pill-culture">{{ c.culturaNome }} • {{ c.pragaNome }}</span>
                <span class="pill-dim">{{ c.plots.length }}T × {{ c.numAmostrasPorTalhao }}A</span>
                <span class="meta-author">{{ c.criadoPor }}</span>
                <span class="meta-date">{{ c.criadoEm }}</span>
                <button
                  type="button"
                  class="btn-open-coleta"
                  (click)="abrirColeta(c)"
                >
                  Abrir Coleta →
                </button>
              </div>
            </div>

            <!-- Corpo expandido do acordeão -->
            @if (isExpanded(c.id)) {
              <div class="accordion-body">
                <div class="details-grid">
                  <div class="detail-box">
                    <span class="detail-label">NOME DO CENÁRIO</span>
                    <div class="detail-val">{{ c.nome }}</div>
                  </div>
                  <div class="detail-box">
                    <span class="detail-label">CRIADO POR (USUÁRIO)</span>
                    <div class="detail-val">{{ c.criadoPor }}</div>
                  </div>
                  <div class="detail-box">
                    <span class="detail-label">CULTURA</span>
                    <div class="detail-val">
                      {{ c.culturaNome }}
                      @if (c.culturaCientifico) {
                        <em>({{ c.culturaCientifico }})</em>
                      }
                    </div>
                  </div>
                  <div class="detail-box">
                    <span class="detail-label">PRAGA</span>
                    <div class="detail-val">
                      {{ c.pragaNome }} <em>({{ c.pragaCientifico }})</em>
                    </div>
                  </div>
                  <div class="detail-box">
                    <span class="detail-label">TALHÕES</span>
                    <div class="detail-val">{{ c.plots.length }} talhões</div>
                  </div>
                  <div class="detail-box">
                    <span class="detail-label">AMOSTRAS POR TALHÃO</span>
                    <div class="detail-val">
                      {{ c.numAmostrasPorTalhao }} amostras ({{
                        c.plots.length * c.numAmostrasPorTalhao
                      }} pontos)
                    </div>
                  </div>
                  <div class="detail-box">
                    <span class="detail-label">DATA E HORA DE CRIAÇÃO</span>
                    <div class="detail-val">{{ c.criadoEm }}</div>
                  </div>
                  <div class="detail-box">
                    <span class="detail-label">ESTÁGIO CRÍTICO / MORTALIDADE</span>
                    <div class="detail-val">
                      {{ diag.criticalStageLabel }} • {{ diag.mortalityPct | number: '1.1-1' }}% (K = {{ diag.kTotalMean | number: '1.4-4' }})
                    </div>
                  </div>
                </div>

                <!-- Navegação direta para etapas da marcha analítica -->
                <div class="step-shortcuts-box">
                  <div class="shortcut-overline">IR PARA ETAPA DA MARCHA ANALÍTICA:</div>
                  <div class="shortcut-buttons">
                    <button type="button" class="step-btn primary" (click)="irParaAba(c, 1)">
                      1. Coleta & Amostras
                    </button>
                    <button type="button" class="step-btn" (click)="irParaAba(c, 2)">
                      2. Tabela de Vida
                    </button>
                    <button type="button" class="step-btn" (click)="irParaAba(c, 3)">
                      3. Tabela Média & MI
                    </button>
                    <button type="button" class="step-btn" (click)="irParaAba(c, 4)">
                      4. Matriz de k
                    </button>
                    <button type="button" class="step-btn" (click)="irParaAba(c, 5)">
                      5. Correlação & Regressão
                    </button>
                    <button type="button" class="step-btn" (click)="irParaAba(c, 6)">
                      6. Gráficos Críticos
                    </button>
                    <button type="button" class="step-btn" (click)="irParaAba(c, 7)">
                      7. Ranking
                    </button>
                  </div>
                </div>

                <!-- Formulário inline de edição de metadados (RF005 / RN007) -->
                @if (editingId() === c.id) {
                  <div class="edit-form-box">
                    <input
                      type="text"
                      [(ngModel)]="editNome"
                      placeholder="Nome do cenário"
                    />
                    <input
                      type="text"
                      [(ngModel)]="editCriadoPor"
                      placeholder="Usuário / Agrônomo responsável"
                    />
                    <button type="button" class="btn-save" (click)="salvarEdicao(c.id)">
                      Salvar
                    </button>
                    <button type="button" class="btn-cancel" (click)="cancelarEdicao()">
                      Cancelar
                    </button>
                  </div>
                }

                <div class="accordion-actions">
                  <div class="actions-left">
                    <button type="button" class="link-action" (click)="iniciarEdicao(c)">
                      Editar nome/usuário
                    </button>
                    <span>•</span>
                    <button type="button" class="link-action" (click)="duplicar(c.id)">
                      Duplicar cenário
                    </button>
                  </div>
                  <button
                    type="button"
                    class="link-action danger"
                    (click)="remover(c.id)"
                  >
                    Excluir cenário
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class CenariosAnaliticosComponent {
  public readonly lifeTableSvc = inject(LifeTableService);
  private readonly selecaoCtx = inject(SelecaoContextService);

  @Output() public readonly navegarParaAba = new EventEmitter<number>();

  public busca = '';
  public readonly buscaSignal = signal<string>('');
  public readonly expandedIds = signal<Set<string>>(new Set());
  public readonly editingId = signal<string | null>(null);
  public editNome = '';
  public editCriadoPor = '';

  public readonly cenariosFiltrados = computed<CenarioAnalitico[]>(() => {
    const q = this.buscaSignal().trim().toLowerCase();
    const all = this.lifeTableSvc.cenarios();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.criadoPor.toLowerCase().includes(q) ||
        c.culturaNome.toLowerCase().includes(q) ||
        c.pragaNome.toLowerCase().includes(q) ||
        (c.observacoes || '').toLowerCase().includes(q)
    );
  });

  public isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  public toggleExpand(id: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedIds.set(next);
  }

  public getDiagnosis(c: CenarioAnalitico) {
    return this.lifeTableSvc.computeScenarioSummaryDiagnosis(c);
  }

  public abrirNovoCenario(): void {
    this.selecaoCtx.abrirAssistente(1);
  }

  public async abrirColeta(c: CenarioAnalitico): Promise<void> {
    await this.lifeTableSvc.ativarCenario(c.id);
    this.navegarParaAba.emit(1);
  }

  public async irParaAba(c: CenarioAnalitico, aba: number): Promise<void> {
    await this.lifeTableSvc.ativarCenario(c.id);
    this.navegarParaAba.emit(aba);
  }

  public iniciarEdicao(c: CenarioAnalitico): void {
    this.editingId.set(c.id);
    this.editNome = c.nome;
    this.editCriadoPor = c.criadoPor;
  }

  public cancelarEdicao(): void {
    this.editingId.set(null);
  }

  public async salvarEdicao(id: string): Promise<void> {
    if (!this.editNome.trim()) return;
    await this.lifeTableSvc.atualizarMetadadosCenario(id, {
      nome: this.editNome.trim(),
      criadoPor: this.editCriadoPor.trim() || 'Eng. Agr. Dr. Sérgio',
    });
    this.editingId.set(null);
  }

  public async duplicar(id: string): Promise<void> {
    await this.lifeTableSvc.duplicarCenario(id);
  }

  public async remover(id: string): Promise<void> {
    await this.lifeTableSvc.excluirCenario(id);
  }
}
