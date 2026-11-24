import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CulturaInfo, PragaInfo, UnirvExperimentalArea } from './culturas-pragas.models';

@Injectable({
  providedIn: 'root',
})
export class SelecaoContextService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api';

  // Sinais reativos carregados exclusivamente da API REST (RN023: Zero Dados Mocados)
  public readonly culturas = signal<CulturaInfo[]>([]);
  public readonly areasUnirv = signal<UnirvExperimentalArea[]>([]);
  public readonly carregandoCatalogo = signal<boolean>(false);
  public readonly erroCatalogo = signal<string | null>(null);

  public readonly culturaSelecionada = signal<CulturaInfo | null>(null);
  public readonly pragaSelecionada = signal<PragaInfo | null>(null);
  public readonly modalAberto = signal<boolean>(false);
  public readonly etapaModal = signal<1 | 2 | 3>(1);

  public readonly pragasDaCultura = computed<PragaInfo[]>(() => {
    const c = this.culturaSelecionada();
    return c ? c.pragas : [];
  });

  public async carregarCatalogos(): Promise<void> {
    this.carregandoCatalogo.set(true);
    this.erroCatalogo.set(null);
    try {
      const [culturasList, areasList] = await Promise.all([
        firstValueFrom(this.http.get<CulturaInfo[]>(`${this.apiUrl}/catalogo/culturas`)),
        firstValueFrom(
          this.http.get<UnirvExperimentalArea[]>(`${this.apiUrl}/catalogo/areas-unirv`)
        ),
      ]);
      this.culturas.set(culturasList || []);
      this.areasUnirv.set(areasList || []);

      if (!this.culturaSelecionada() && culturasList.length > 0) {
        const soja = culturasList.find((c) => c.id === 'soja') || culturasList[0];
        const praga =
          soja.pragas.find((p) => p.id === 'euschistus-heros') || soja.pragas[0] || null;
        this.culturaSelecionada.set(soja);
        this.pragaSelecionada.set(praga);
      }
    } catch (error) {
      console.error('[SelecaoContextService] Erro ao carregar catálogos do PostgreSQL:', error);
      this.erroCatalogo.set(
        'Não foi possível conectar ao servidor backend (http://localhost:3000/api).'
      );
    } finally {
      this.carregandoCatalogo.set(false);
    }
  }

  public sincronizarComCenario(culturaId: string, pragaId: string): void {
    const lista = this.culturas();
    const cult = lista.find((c) => c.id === culturaId);
    if (cult) {
      this.culturaSelecionada.set(cult);
      const prg = cult.pragas.find((p) => p.id === pragaId) || cult.pragas[0] || null;
      this.pragaSelecionada.set(prg);
    }
  }

  public abrirAssistente(etapa: 1 | 2 | 3 = 1): void {
    this.etapaModal.set(etapa);
    this.modalAberto.set(true);
  }

  public fecharAssistente(): void {
    this.modalAberto.set(false);
  }
}

