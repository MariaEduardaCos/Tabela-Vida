import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CenariosAnaliticosComponent } from './components/cenarios-analiticos.component';
import { ColetaDadosComponent } from './components/coleta-dados.component';
import { CorrelacaoRegressaoComponent } from './components/correlacao-regressao.component';
import { GraficosEstagioCriticoComponent } from './components/graficos-estagio-critico.component';
import { ImportarModalComponent } from './components/importar-modal.component';
import { MatrizKComponent } from './components/matriz-k.component';
import { RankingCriticidadeComponent } from './components/ranking-criticidade.component';
import { TabelaMediaComponent } from './components/tabela-media.component';
import { TabelaVidaComponent } from './components/tabela-vida.component';
import { TelaInicialSelecaoComponent } from './components/tela-inicial-selecao.component';
import { LifeTableService } from './life-table.service';
import { SelecaoContextService } from './selecao-context.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TelaInicialSelecaoComponent,
    CenariosAnaliticosComponent,
    ColetaDadosComponent,
    ImportarModalComponent,
    TabelaVidaComponent,
    TabelaMediaComponent,
    MatrizKComponent,
    CorrelacaoRegressaoComponent,
    GraficosEstagioCriticoComponent,
    RankingCriticidadeComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  public readonly lifeTableSvc = inject(LifeTableService);
  public readonly selecaoCtx = inject(SelecaoContextService);

  public readonly activeTab = signal<number>(0);
  public readonly importarModalAberto = signal<boolean>(false);

  public readonly activeTabTitle = computed<string>(() => {
    switch (this.activeTab()) {
      case 0:
        return '0. Central de Cenários & Marchas Analíticas dos Agrônomos';
      case 1:
        return '1. Coleta de Amostras (Entrada de Dados)';
      case 2:
        return '2. Tabela de Vida Ecológica por Talhão';
      case 3:
        return '3. Tabela de Vida Média & Mortalidade Indispensável';
      case 4:
        return '4. Matriz de Valores de k e K total';
      case 5:
        return '5. Correlação de Pearson & ANOVA de Regressão';
      case 6:
        return '6. Determinação do Estágio Crítico & Gráficos';
      case 7:
        return '7. Ranking de Criticidade dos Estágios';
      default:
        return 'Sistema de Tabela de Vida';
    }
  });

  public async ngOnInit(): Promise<void> {
    await this.selecaoCtx.carregarCatalogos();
    await this.lifeTableSvc.carregarCenariosDoBackend();
  }

  public selecionarAba(tab: number): void {
    this.activeTab.set(tab);
  }

  public abrirAssistenteSelecao(): void {
    this.selecaoCtx.abrirAssistente(1);
  }

  public onSelecaoConcluida(): void {
    this.activeTab.set(1);
  }

  public abrirModalImportar(): void {
    this.importarModalAberto.set(true);
  }

  public async restaurarPadrao(): Promise<void> {
    await this.lifeTableSvc.restaurarPadraoBanco();
  }
}

