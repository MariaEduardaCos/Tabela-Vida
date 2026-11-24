import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { UnirvExperimentalArea } from '../culturas-pragas.models';
import { LifeTableService } from '../life-table.service';
import { SelecaoContextService } from '../selecao-context.service';

@Component({
  selector: 'app-mapa-coleta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel-card map-section-card">
      <div class="map-header-block">
        <h2 class="section-heading">
          Mapeamento Geolocalizado de Amostras — Áreas Experimentais UniRV (Rio Verde - GO)
        </h2>
        <p class="section-desc">
          Selecione uma amostra abaixo e clique no mapa para registrar o ponto GPS de coleta no
          <strong>{{ plotName() }}</strong> nos arredores das fazendas e estações experimentais da Universidade de Rio Verde (UniRV).
        </p>
      </div>

      <!-- Botões de modo de visão e camadas -->
      <div class="map-btn-group">
        <button
          type="button"
          class="map-pill-btn"
          [class.active]="mapLayer() === 'satellite'"
          (click)="setMapLayer('satellite')"
        >
          Visão Mapa (Satélite)
        </button>
        <button
          type="button"
          class="map-pill-btn"
          [class.active]="mapLayer() === 'streets'"
          (click)="setMapLayer('streets')"
        >
          Mapa de Ruas
        </button>
        <button type="button" class="map-pill-btn" (click)="capturarGpsAtual()">
          Capturar GPS Atual
        </button>
        <button type="button" class="map-pill-btn" (click)="enquadrarTalhaoAtual()">
          Enquadrar Talhão
        </button>
        <button type="button" class="map-pill-btn" (click)="enquadrarTodosTalhoes()">
          Todos os Talhões
        </button>
        <button type="button" class="map-pill-btn" (click)="visaoGeralUnirv()">
          Visão Geral UniRV
        </button>
      </div>

      <!-- Painel das 4 Áreas Experimentais da UniRV carregadas do PostgreSQL (RF007) -->
      <div class="unirv-stations-box">
        <div class="stations-header">
          <span class="green-badge">ÁREAS EXPERIMENTAIS UNIRV (RIO VERDE - GO)</span>
          <span class="stations-hint">
            Clique em uma estação para navegar até a área ou posicionar as
            {{ sampleCount() }} amostras do
            {{ plotName() }}:
          </span>
        </div>

        <div class="unirv-areas-grid">
          @for (area of areasOrdenadas(); track area.id) {
            <div
              class="unirv-area-card"
              [class.active-area]="plotAreaId() === area.id || focusedAreaId() === area.id"
            >
              <div class="area-title">{{ area.nomeCurto }}</div>
              <div class="area-dms">{{ area.dmsLat }} | {{ area.dmsLng }}</div>
              <div class="area-dec">
                ({{ area.latitude | number: '1.6-6' }}°, {{ area.longitude | number: '1.6-6' }}°)
                • {{ contarTalhoesNaArea(area.id) }} talhão(ões)
              </div>
              <div class="area-actions">
                <button type="button" class="btn-area-view" (click)="voarParaArea(area)">
                  Ver no Mapa
                </button>
                <button
                  type="button"
                  class="btn-area-alloc"
                  (click)="alocarTalhaoNaArea(area)"
                >
                  Alocar {{ plotName() }} Aqui
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Seletor do modo de clique no mapa (RF008 / RN012) -->
      <div class="click-mode-banner">
        <div class="click-mode-row">
          <span class="click-label">Ao clicar no mapa:</span>
          <div class="mode-toggle-group">
            <button
              type="button"
              class="btn-click-region"
              [class.active]="moveAllOnClick()"
              (click)="moveAllOnClick.set(true)"
            >
              Trazer Todos os Pontos do Talhão ({{ sampleCount() }} Amostras)
            </button>
            <button
              type="button"
              class="btn-click-region"
              [class.active]="!moveAllOnClick()"
              (click)="moveAllOnClick.set(false)"
            >
              Posicionar Apenas Amostra Ativa (#{{ activeSampleIdx() + 1 }})
            </button>
          </div>
        </div>
        <div class="click-mode-help">
          @if (moveAllOnClick()) {
            Clique em qualquer área do mapa para trazer todas as
            {{ sampleCount() }} amostras do
            <strong>{{ plotName() }}</strong> para a região clicada.
          } @else {
            Clique no mapa para atualizar exclusivamente a coordenada GPS da
            <strong>Amostra #{{ activeSampleIdx() + 1 }}</strong> do
            <strong>{{ plotName() }}</strong>.
          }
        </div>
      </div>

      <!-- Seletor de amostra em foco -->
      <div class="sample-focus-bar">
        <span class="focus-label">Amostra em foco:</span>
        <div class="sample-pills">
          @for (loc of sampleLocations(); track loc.index; let idx = $index) {
            <button
              type="button"
              class="sample-focus-pill"
              [class.active]="activeSampleIdx() === idx"
              (click)="focarAmostra(idx)"
            >
              <span>{{ idx + 1 }}</span> Amostra {{ idx + 1 }}
              <span class="green-dot"></span>
            </button>
          }
        </div>
      </div>

      <!-- Canvas do Mapa Leaflet 1.9 -->
      <div
        #mapContainer
        id="leaflet-coleta-map"
        class="leaflet-canvas-box"
      ></div>

      <!-- Gaveta expansível para ajuste fino de latitude/longitude decimal (RF008) -->
      <div class="coords-drawer-box">
        <div class="drawer-header" (click)="showCoordsGrid.set(!showCoordsGrid())">
          <span>
            {{ showCoordsGrid() ? '▾' : '▸' }} Coordenadas GPS por Ponto Amostral ({{
              plotName()
            }}
            — Datum WGS84)
          </span>
          <span class="drawer-hint">Clique para expandir/editar latitude e longitude (6 casas decimais)</span>
        </div>

        @if (showCoordsGrid()) {
          <div class="coords-grid">
            @for (loc of sampleLocations(); track loc.index; let idx = $index) {
              <div
                class="coord-item-card"
                [class.focused]="activeSampleIdx() === idx"
                (click)="activeSampleIdx.set(idx)"
              >
                <div class="coord-card-title">Amostra #{{ idx + 1 }}</div>
                <div class="coord-inputs">
                  <label>
                    <span>Lat:</span>
                    <input
                      type="number"
                      step="0.0001"
                      [ngModel]="loc.lat"
                      (change)="onManualCoordChange(idx, $any($event.target).value, loc.lng)"
                    />
                  </label>
                  <label>
                    <span>Lng:</span>
                    <input
                      type="number"
                      step="0.0001"
                      [ngModel]="loc.lng"
                      (change)="onManualCoordChange(idx, loc.lat, $any($event.target).value)"
                    />
                  </label>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class MapaColetaComponent implements AfterViewInit, OnDestroy {
  public readonly lifeTableSvc = inject(LifeTableService);
  public readonly selecaoCtx = inject(SelecaoContextService);

  @ViewChild('mapContainer', { static: true })
  public mapContainer!: ElementRef<HTMLDivElement>;

  public readonly moveAllOnClick = signal<boolean>(true);
  public readonly activeSampleIdx = signal<number>(0);
  public readonly mapLayer = signal<'satellite' | 'streets'>('satellite');
  public readonly focusedAreaId = signal<string>('fontes-do-saber');
  public readonly showCoordsGrid = signal<boolean>(false);

  private map: L.Map | null = null;
  private satelliteTileLayer: L.TileLayer | null = null;
  private streetsTileLayer: L.TileLayer | null = null;
  private overlayLayerGroup: L.LayerGroup | null = null;

  public readonly currentPlot = computed(() => {
    const plots = this.lifeTableSvc.plots();
    const idx = this.lifeTableSvc.selectedPlotIndex();
    return plots[idx] || plots[0] || null;
  });

  public readonly plotName = computed(() => this.currentPlot()?.name || 'Talhão 1');
  public readonly plotAreaId = computed(() => this.currentPlot()?.areaId || 'fontes-do-saber');
  public readonly sampleLocations = computed(() => this.currentPlot()?.sampleLocations || []);
  public readonly sampleCount = computed(() => this.sampleLocations().length || 10);

  public readonly areasOrdenadas = computed<UnirvExperimentalArea[]>(() => {
    const areas = this.selecaoCtx.areasUnirv();
    const order = ['area-1-pos', 'area-2-pos', 'ctc-comigo', 'fontes-do-saber'];
    return [...areas].sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id)
    );
  });

  constructor() {
    effect(() => {
      const _plots = this.lifeTableSvc.plots();
      const _idx = this.lifeTableSvc.selectedPlotIndex();
      const _areas = this.selecaoCtx.areasUnirv();
      const _sampleIdx = this.activeSampleIdx();
      if (this.map) {
        this.renderizarCamadasMapa();
      }
    });
  }

  public ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  public ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private inicializarMapa(): void {
    const plot = this.currentPlot();
    const initialLat = plot?.sampleLocations[0]?.lat ?? -17.785303;
    const initialLng = plot?.sampleLocations[0]?.lng ?? -50.964869;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: true,
    });

    this.satelliteTileLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '© Esri World Imagery | UniRV Rio Verde - GO',
        maxZoom: 19,
      }
    );

    this.streetsTileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors | UniRV',
        maxZoom: 19,
      }
    );

    this.satelliteTileLayer.addTo(this.map);
    this.overlayLayerGroup = L.layerGroup().addTo(this.map);

    // Listener de clique para realocação espacial de talhão ou amostra (RF008 / RN012)
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.moverTalhaoAtualParaPonto(e.latlng.lat, e.latlng.lng);
    });

    this.renderizarCamadasMapa();
    setTimeout(() => {
      this.map?.invalidateSize();
      this.enquadrarTalhaoAtual();
    }, 200);
  }

  public setMapLayer(mode: 'satellite' | 'streets'): void {
    this.mapLayer.set(mode);
    if (!this.map || !this.satelliteTileLayer || !this.streetsTileLayer) return;

    if (mode === 'satellite') {
      if (this.map.hasLayer(this.streetsTileLayer)) {
        this.map.removeLayer(this.streetsTileLayer);
      }
      this.satelliteTileLayer.addTo(this.map);
    } else {
      if (this.map.hasLayer(this.satelliteTileLayer)) {
        this.map.removeLayer(this.satelliteTileLayer);
      }
      this.streetsTileLayer.addTo(this.map);
    }
  }

  public contarTalhoesNaArea(areaId: string): number {
    return this.lifeTableSvc
      .plots()
      .filter((p) => (p.areaId || 'fontes-do-saber') === areaId).length;
  }

  public voarParaArea(area: UnirvExperimentalArea): void {
    this.focusedAreaId.set(area.id);
    this.map?.flyTo([area.latitude, area.longitude], 16, { duration: 0.7 });
  }

  public async alocarTalhaoNaArea(area: UnirvExperimentalArea): Promise<void> {
    this.focusedAreaId.set(area.id);
    const idx = this.lifeTableSvc.selectedPlotIndex();
    await this.lifeTableSvc.movePlotToCoordinates(idx, area.latitude, area.longitude, {
      areaId: area.id,
      moveAllSamples: true,
    });
    this.map?.flyTo([area.latitude, area.longitude], 16, { duration: 0.7 });
  }

  public async moverTalhaoAtualParaPonto(lat: number, lng: number): Promise<void> {
    const idx = this.lifeTableSvc.selectedPlotIndex();
    await this.lifeTableSvc.movePlotToCoordinates(idx, lat, lng, {
      moveAllSamples: this.moveAllOnClick(),
      sampleIndex: this.activeSampleIdx(),
    });
  }

  public focarAmostra(idx: number): void {
    this.activeSampleIdx.set(idx);
    const loc = this.currentPlot()?.sampleLocations[idx];
    if (loc && this.map) {
      this.map.panTo([loc.lat, loc.lng]);
    }
  }

  public enquadrarTalhaoAtual(): void {
    const plot = this.currentPlot();
    if (!plot || !plot.sampleLocations.length || !this.map) return;
    const bounds = L.latLngBounds(
      plot.sampleLocations.map((p) => [p.lat, p.lng] as [number, number])
    );
    this.map.fitBounds(bounds.pad(0.35), { maxZoom: 17 });
  }

  public enquadrarTodosTalhoes(): void {
    if (!this.map) return;
    const allCoords: [number, number][] = [];
    for (const p of this.lifeTableSvc.plots()) {
      for (const s of p.sampleLocations) {
        allCoords.push([s.lat, s.lng]);
      }
    }
    if (allCoords.length > 0) {
      this.map.fitBounds(L.latLngBounds(allCoords).pad(0.25), { maxZoom: 16 });
    }
  }

  public visaoGeralUnirv(): void {
    if (!this.map) return;
    const areas = this.selecaoCtx.areasUnirv();
    if (!areas.length) return;
    const bounds = L.latLngBounds(
      areas.map((a) => [a.latitude, a.longitude] as [number, number])
    );
    this.map.fitBounds(bounds.pad(0.25));
  }

  public capturarGpsAtual(): void {
    const area =
      this.selecaoCtx
        .areasUnirv()
        .find((a) => a.id === (this.currentPlot()?.areaId || 'fontes-do-saber')) ||
      this.selecaoCtx.areasUnirv()[0];
    if (area) {
      this.voarParaArea(area);
    }
  }

  public onManualCoordChange(sampleIdx: number, rawLat: unknown, rawLng: unknown): void {
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    this.lifeTableSvc.updateSingleSampleCoordinates(
      this.lifeTableSvc.selectedPlotIndex(),
      sampleIdx,
      lat,
      lng
    );
  }

  private renderizarCamadasMapa(): void {
    if (!this.map || !this.overlayLayerGroup) return;
    this.overlayLayerGroup.clearLayers();

    // 1. Círculos tracejados e rótulos das 4 Áreas Experimentais da UniRV
    for (const area of this.selecaoCtx.areasUnirv()) {
      L.circle([area.latitude, area.longitude], {
        radius: 260,
        color: '#34d399',
        weight: 1.8,
        dashArray: '6, 6',
        fillColor: '#10b981',
        fillOpacity: 0.08,
      }).addTo(this.overlayLayerGroup);

      const labelIcon = L.divIcon({
        className: 'unirv-station-label',
        html: `<div class="station-pill-map"><strong>UniRV</strong> ${area.nomeCurto}</div>`,
        iconSize: [230, 26],
        iconAnchor: [115, 13],
      });
      L.marker([area.latitude, area.longitude], {
        icon: labelIcon,
        interactive: false,
      }).addTo(this.overlayLayerGroup);
    }

    // 2. Polígonos dos demais talhões em segundo plano
    const activeIdx = this.lifeTableSvc.selectedPlotIndex();
    const plots = this.lifeTableSvc.plots();

    plots.forEach((plot, idx) => {
      if (idx === activeIdx || plot.sampleLocations.length < 3) return;
      const hull = this.calcularEnvoltoriaTalhao(plot.sampleLocations);
      L.polygon(hull, {
        color: '#94a3b8',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#64748b',
        fillOpacity: 0.12,
      })
        .bindTooltip(plot.name)
        .addTo(this.overlayLayerGroup!);
    });

    // 3. Polígono destacado e marcadores A1..An do talhão ativo
    const current = this.currentPlot();
    if (!current || !current.sampleLocations.length) return;

    if (current.sampleLocations.length >= 3) {
      const hull = this.calcularEnvoltoriaTalhao(current.sampleLocations);
      L.polygon(hull, {
        color: '#f59e0b',
        weight: 2.5,
        fillColor: '#fbbf24',
        fillOpacity: 0.2,
      }).addTo(this.overlayLayerGroup);
    }

    const activeSample = this.activeSampleIdx();
    current.sampleLocations.forEach((loc, sIdx) => {
      const isFocused = sIdx === activeSample;
      const pinIcon = L.divIcon({
        className: 'sample-map-pin',
        html: `<div class="pin-badge ${isFocused ? 'focused' : ''}">A${sIdx + 1}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: pinIcon });
      marker.bindTooltip(
        `<strong>${current.name} — Amostra #${sIdx + 1}</strong><br/>Lat: ${loc.lat.toFixed(
          6
        )} | Lng: ${loc.lng.toFixed(6)}`
      );
      marker.on('click', () => {
        this.activeSampleIdx.set(sIdx);
      });
      marker.addTo(this.overlayLayerGroup!);
    });
  }

  private calcularEnvoltoriaTalhao(
    locs: { lat: number; lng: number }[]
  ): [number, number][] {
    const lats = locs.map((l) => l.lat);
    const lngs = locs.map((l) => l.lng);
    const minLat = Math.min(...lats) - 0.0001;
    const maxLat = Math.max(...lats) + 0.0001;
    const minLng = Math.min(...lngs) - 0.0001;
    const maxLng = Math.max(...lngs) + 0.0001;
    return [
      [minLat, minLng],
      [minLat, maxLng],
      [maxLat, maxLng],
      [maxLat, minLng],
    ];
  }
}
