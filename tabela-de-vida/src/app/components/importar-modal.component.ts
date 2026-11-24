import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LifeTableService } from '../life-table.service';

@Component({
  selector: 'app-importar-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (aberto) {
      <div class="modal-backdrop" (click)="fechar.emit()">
        <div class="import-modal-card" (click)="$event.stopPropagation()">
          <div class="import-header">
            <h3>Importar / Colar Dados de Amostras do Excel</h3>
            <button type="button" class="btn-close" (click)="fechar.emit()">×</button>
          </div>

          <div class="import-body">
            <p class="import-instructions">
              Copie diretamente as células da planilha Excel (com o cabeçalho
              <code>Talhão X</code> e linhas de fases com 10 amostras numéricas tabuladas):
            </p>

            <div class="import-mode-row">
              <label class="radio-label">
                <input type="radio" name="importMode" value="replace" [(ngModel)]="modo" />
                <span>Substituir todos os talhões</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="importMode" value="append" [(ngModel)]="modo" />
                <span>Adicionar como novos talhões</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="importMode" value="single" [(ngModel)]="modo" />
                <span>Importar no Talhão {{ lifeTableSvc.selectedPlotIndex() + 1 }}</span>
              </label>
              <button type="button" class="btn-fill-sample" (click)="preencherExemplo()">
                Preencher Exemplo de Teste
              </button>
            </div>

            <textarea
              class="import-textarea"
              rows="9"
              [(ngModel)]="textoBruto"
              placeholder="Talhão 1	Fases	1	2	3	4	5	6	7	8	9	10
	Ov	9	0	8	6	5	2	5	0	0	2
	N1	0	0	0	0	0	3	0	0	0	0..."
            ></textarea>
          </div>

          <div class="import-footer">
            <button type="button" class="btn-outline" (click)="fechar.emit()">
              Cancelar
            </button>
            <button type="button" class="btn-primary-dark" (click)="importar()">
              Processar e Carregar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ImportarModalComponent {
  public readonly lifeTableSvc = inject(LifeTableService);

  @Input() public aberto = false;
  @Output() public readonly fechar = new EventEmitter<void>();

  public modo: 'replace' | 'append' | 'single' = 'replace';
  public textoBruto = `Talhão 1\tFases\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10
\tOv\t9\t0\t8\t6\t5\t2\t5\t0\t0\t2
\tN1\t0\t0\t0\t0\t0\t3\t0\t0\t0\t0
\tN2\t0\t0\t2\t0\t0\t0\t1\t1\t0\t0
\tN3\t1\t0\t1\t0\t2\t1\t3\t8\t0\t5
\tN4\t0\t0\t0\t0\t0\t0\t0\t0\t0\t0
\tAd\t4\t4\t4\t0\t4\t4\t4\t4\t4\t4`;

  public preencherExemplo(): void {
    this.textoBruto = `Talhão 1\tFases\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10
\tOv\t9\t0\t8\t6\t5\t2\t5\t0\t0\t2
\tN1\t0\t0\t0\t0\t0\t3\t0\t0\t0\t0
\tN2\t0\t0\t2\t0\t0\t0\t1\t1\t0\t0
\tN3\t1\t0\t1\t0\t2\t1\t3\t8\t0\t5
\tN4\t0\t0\t0\t0\t0\t0\t0\t0\t0\t0
\tAd\t4\t4\t4\t0\t4\t4\t4\t4\t4\t4

Talhão 2\tFases\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10
\tOv\t9\t0\t8\t6\t5\t2\t5\t0\t0\t2
\tN1\t0\t0\t0\t0\t0\t3\t0\t0\t0\t0
\tN2\t0\t0\t2\t0\t0\t0\t1\t1\t0\t0
\tN3\t1\t0\t1\t0\t2\t1\t3\t8\t0\t5
\tN4\t0\t0\t0\t0\t0\t2\t0\t0\t0\t1
\tAd\t4\t4\t4\t0\t4\t4\t4\t4\t4\t4`;
  }

  public importar(): void {
    const ok = this.lifeTableSvc.importFromTSV(
      this.textoBruto,
      this.modo,
      this.lifeTableSvc.selectedPlotIndex()
    );
    if (ok) {
      this.fechar.emit();
    }
  }
}

