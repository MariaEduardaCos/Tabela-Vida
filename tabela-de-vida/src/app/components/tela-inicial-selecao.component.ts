import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CulturaInfo, PragaInfo } from '../culturas-pragas.models';
import { LifeTableService } from '../life-table.service';
import { SelecaoContextService } from '../selecao-context.service';

@Component({
  selector: 'app-tela-inicial-selecao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (selecaoCtx.modalAberto()) {
      <div class="modal-backdrop" (click)="fechar()">
        <div class="wizard-modal" (click)="$event.stopPropagation()">
          <!-- ETAPA 1: SELEÇÃO DA CULTURA AGRÍCOLA (RF001) -->
          @if (selecaoCtx.etapaModal() === 1) {
            <div class="wizard-header">
              <div>
                <div class="stepper-bar">ETAPA 1 DE 3</div>
                <h2 class="wizard-title">Selecione a Cultura Agrícola</h2>
                <p class="wizard-subtitle">
                  Escolha a cultura hospedeira para parametrizar a tabela de vida e análise de fator-chave.
                </p>
              </div>
              <button class="btn-close" type="button" (click)="fechar()">×</button>
            </div>

            <div class="wizard-body">
              <div class="catalog-grid">
                @for (c of selecaoCtx.culturas(); track c.id) {
                  <button
                    type="button"
                    class="cultura-card"
                    [class.selected]="selecaoCtx.culturaSelecionada()?.id === c.id"
                    (click)="selecionarCultura(c)"
                  >
                    <div class="card-image-wrap">
                      <img [src]="c.imagem" [alt]="c.nome" />
                      <span class="family-badge">{{ c.familia }}</span>
                    </div>
                    <div class="card-content">
                      <h3 class="card-title">{{ c.nome }}</h3>
                      <div class="card-sci">{{ c.nomeCientifico }}</div>
                      <p class="card-desc">{{ c.descricao }}</p>
                      <div class="card-footer">
                        <span class="pest-count">{{ c.pragas.length }} pragas catalogadas</span>
                        <span class="select-link">Selecionar →</span>
                      </div>
                    </div>
                  </button>
                }
              </div>
            </div>
          }

          <!-- ETAPA 2: SELEÇÃO DA PRAGA-ALVO POR CULTURA (RF002) -->
          @if (selecaoCtx.etapaModal() === 2) {
            <div class="wizard-header">
              <div>
                <div class="stepper-bar">ETAPA 2 DE 3</div>
                <h2 class="wizard-title">Selecione a Praga-Alvo</h2>
                <p class="wizard-subtitle">
                  Defina a praga monitorada em {{ selecaoCtx.culturaSelecionada()?.nome }} para prosseguir ao dimensionamento.
                </p>
              </div>
              <div class="header-actions">
                <button type="button" class="btn-outline" (click)="voltarParaCulturas()">
                  Trocar Cultura
                </button>
                <button class="btn-close" type="button" (click)="fechar()">×</button>
              </div>
            </div>

            @if (selecaoCtx.culturaSelecionada(); as cult) {
              <div class="cultura-selected">
                <img [src]="cult.imagem" [alt]="cult.nome" class="banner-thumb" />
                <div>
                  <div class="banner-overline">CULTURA SELECIONADA</div>
                  <div class="banner-title">
                    <strong>{{ cult.nome }}</strong> <em>({{ cult.nomeCientifico }})</em>
                  </div>
                  <div class="banner-desc">{{ cult.descricao }}</div>
                </div>
              </div>
            }

            <div class="wizard-body">
              <div class="catalog-grid">
                @for (p of selecaoCtx.pragasDaCultura(); track p.id) {
                  <button
                    type="button"
                    class="praga-card"
                    [class.selected]="selecaoCtx.pragaSelecionada()?.id === p.id"
                    (click)="selecionarPraga(p)"
                  >
                    <div class="card-image-wrap">
                      <img [src]="p.imagem" [alt]="p.nomeComum" />
                      <span class="critical-badge">Crítico: {{ p.faseCriticaTipica }}</span>
                    </div>
                    <div class="card-content">
                      <h3 class="card-title">{{ p.nomeComum }}</h3>
                      <div class="card-sci">{{ p.nomeCientifico }}</div>
                      <div class="card-order">{{ p.ordem }}</div>
                      <p class="card-desc">{{ p.descricao }}</p>
                      <div class="stage-pills-row">
                        @for (f of p.fasesSugeridas; track f) {
                          <span class="stage-pill">{{ f }}</span>
                        }
                      </div>
                      <div class="card-footer">
                        <span class="select-link highlight">Dimensionar Amostragem →</span>
                      </div>
                    </div>
                  </button>
                }
              </div>
            </div>
          }

          <!-- ETAPA 3: IDENTIFICAÇÃO DO CENÁRIO E DIMENSIONAMENTO AMOSTRAL (RF003) -->
          @if (selecaoCtx.etapaModal() === 3) {
            <div class="wizard-header">
              <div>
                <div class="stepper-bar">ETAPA 3 DE 3</div>
                <h2 class="wizard-title">Dimensionamento Amostral (Talhões e Amostras)</h2>
                <p class="wizard-subtitle">
                  Defina a quantidade de talhões avaliados e o número de amostras coletadas por talhão para {{ selecaoCtx.pragaSelecionada()?.nomeComum }}.
                </p>
              </div>
              <div class="header-actions">
                <button type="button" class="btn-outline" (click)="voltarParaPragas()">
                  ← Trocar Praga
                </button>
                <button type="button" class="btn-outline" (click)="voltarParaCulturas()">
                  Trocar Cultura
                </button>
                <button class="btn-close" type="button" (click)="fechar()">×</button>
              </div>
            </div>

            <div class="context-dual-banner">
              @if (selecaoCtx.culturaSelecionada(); as cult) {
                <div class="context-item">
                  <img [src]="cult.imagem" [alt]="cult.nome" class="banner-thumb" />
                  <div>
                    <div class="banner-overline">CULTURA SELECIONADA</div>
                    <div class="banner-title">
                      <strong>{{ cult.nome }}</strong> <em>({{ cult.nomeCientifico }})</em>
                    </div>
                    <div class="banner-desc">{{ cult.descricao }}</div>
                  </div>
                </div>
              }
              @if (selecaoCtx.pragaSelecionada(); as prg) {
                <div class="context-item">
                  <img [src]="prg.imagem" [alt]="prg.nomeComum" class="banner-thumb" />
                  <div>
                    <div class="banner-overline">PRAGA-ALVO SELECIONADA</div>
                    <div class="banner-title">
                      <strong>{{ prg.nomeComum }}</strong> <em>({{ prg.nomeCientifico }})</em>
                    </div>
                    <div class="banner-desc">
                      {{ prg.ordem }} • Fase crítica típica: {{ prg.faseCriticaTipica }}
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="wizard-body step3-body">
              <div class="form-card meta-grid">
                <div class="field-group">
                  <label>NOME DO CENÁRIO ANALÍTICO (MARCHA ANALÍTICA):</label>
                  <input
                    type="text"
                    [(ngModel)]="nomeCenario"
                    placeholder="Ex.: Monitoramento Percevejo-marrom em Soja — UniRV"
                  />
                </div>
                <div class="field-group">
                  <label>CRIADO POR (USUÁRIO / AGRÔNOMO RESPONSÁVEL):</label>
                  <input
                    type="text"
                    [(ngModel)]="criadoPor"
                    placeholder="Ex.: Eng. Agr. Dr. Sérgio"
                  />
                </div>
              </div>

              <div class="dimension-grid">
                <!-- Número de Talhões -->
                <div class="form-card">
                  <span class="pill-tag">UNIDADES DE ÁREA</span>
                  <h3>Número de Talhões</h3>
                  <p class="dim-help">
                    Quantidade de talhões avaliados no experimento (mínimo de 2 talhões para cálculo de regressão linear e erro padrão).
                  </p>
                  <div class="stepper-control">
                    <button type="button" (click)="ajustarTalhoes(-1)">−</button>
                    <input
                      type="number"
                      min="2"
                      max="50"
                      [(ngModel)]="numTalhoes"
                    />
                    <button type="button" (click)="ajustarTalhoes(1)">+</button>
                    <span class="unit-label">talhões</span>
                  </div>
                  <div class="quick-values">
                    <span class="quick-label">VALORES RÁPIDOS:</span>
                    <div class="chips-row">
                      @for (v of [2, 4, 5, 8, 10, 12, 15, 20]; track v) {
                        <button
                          type="button"
                          class="chip-btn"
                          [class.active]="numTalhoes === v"
                          (click)="numTalhoes = v"
                        >
                          {{ v }}
                        </button>
                      }
                    </div>
                  </div>
                </div>

                <!-- Número de Amostras por Talhão -->
                <div class="form-card">
                  <span class="pill-tag">PONTOS DE COLETA</span>
                  <h3>Número de Amostras por Talhão</h3>
                  <p class="dim-help">
                    Quantidade de pontos amostrais georreferenciados coletados dentro de cada talhão.
                  </p>
                  <div class="stepper-control">
                    <button type="button" (click)="ajustarAmostras(-1)">−</button>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      [(ngModel)]="numAmostras"
                    />
                    <button type="button" (click)="ajustarAmostras(1)">+</button>
                    <span class="unit-label">amostras / talhão</span>
                  </div>
                  <div class="quick-values">
                    <span class="quick-label">VALORES RÁPIDOS:</span>
                    <div class="chips-row">
                      @for (v of [3, 5, 8, 10, 12, 15, 20, 25]; track v) {
                        <button
                          type="button"
                          class="chip-btn"
                          [class.active]="numAmostras === v"
                          (click)="numAmostras = v"
                        >
                          {{ v }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-card effort-summary">
                <div class="effort-row">
                  <span>Talhões: <strong>{{ numTalhoes }}</strong></span>
                  <span>×</span>
                  <span>Amostras / Talhão: <strong>{{ numAmostras }}</strong></span>
                  <span>=</span>
                  <span class="total-points-badge">
                    Total de Pontos Amostrais: <strong>{{ numTalhoes * numAmostras }} pontos</strong>
                  </span>
                </div>
                <label class="checkbox-row">
                  <input type="checkbox" [(ngModel)]="iniciarZerado" />
                  <span>Iniciar tabela com contagens zeradas (em branco para novo levantamento)</span>
                </label>
              </div>

              <div class="wizard-footer">
                <button type="button" class="btn-outline" (click)="voltarParaPragas()">
                  ← Voltar para Pragas
                </button>
                <button
                  type="button"
                  class="btn-confirm"
                  (click)="confirmarParametrizacao()"
                >
                  Confirmar e Iniciar Análise ({{ numTalhoes }} Talhões × {{ numAmostras }} Amostras) →
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class TelaInicialSelecaoComponent {
  public readonly selecaoCtx = inject(SelecaoContextService);
  private readonly lifeTableSvc = inject(LifeTableService);

  @Output() public readonly selecaoConcluida = new EventEmitter<void>();

  public nomeCenario = 'Monitoramento Percevejo-marrom em Soja — UniRV';
  public criadoPor = 'Eng. Agr. Dr. Sérgio';
  public numTalhoes = 10;
  public numAmostras = 10;
  public iniciarZerado = false;

  public selecionarCultura(c: CulturaInfo): void {
    this.selecaoCtx.culturaSelecionada.set(c);
    if (c.pragas.length > 0) {
      this.selecaoCtx.pragaSelecionada.set(c.pragas[0]);
    }
    this.selecaoCtx.etapaModal.set(2);
  }

  public selecionarPraga(p: PragaInfo): void {
    this.selecaoCtx.pragaSelecionada.set(p);
    const cult = this.selecaoCtx.culturaSelecionada();
    this.nomeCenario = `Monitoramento ${p.nomeComum} em ${cult?.nome || 'Campo'} — UniRV`;
    this.selecaoCtx.etapaModal.set(3);
  }

  public voltarParaCulturas(): void {
    this.selecaoCtx.etapaModal.set(1);
  }

  public voltarParaPragas(): void {
    this.selecaoCtx.etapaModal.set(2);
  }

  public ajustarTalhoes(delta: number): void {
    this.numTalhoes = Math.max(2, Math.min(50, (Number(this.numTalhoes) || 10) + delta));
  }

  public ajustarAmostras(delta: number): void {
    this.numAmostras = Math.max(1, Math.min(100, (Number(this.numAmostras) || 10) + delta));
  }

  public async confirmarParametrizacao(): Promise<void> {
    const cult = this.selecaoCtx.culturaSelecionada();
    const prg = this.selecaoCtx.pragaSelecionada();
    if (!cult || !prg) return;

    await this.lifeTableSvc.criarCenario({
      nome:
        this.nomeCenario.trim() ||
        `Monitoramento ${prg.nomeComum} em ${cult.nome} — UniRV`,
      criadoPor: this.criadoPor.trim() || 'Eng. Agr. Dr. Sérgio',
      culturaId: cult.id,
      pragaId: prg.id,
      numTalhoes: Math.max(2, Math.min(50, Number(this.numTalhoes) || 10)),
      numAmostrasPorTalhao: Math.max(1, Math.min(100, Number(this.numAmostras) || 10)),
      zerado: this.iniciarZerado,
    });

    this.selecaoCtx.fecharAssistente();
    this.selecaoConcluida.emit();
  }

  public fechar(): void {
    this.selecaoCtx.fecharAssistente();
  }
}

