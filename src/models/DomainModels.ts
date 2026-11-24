export class ApiException extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiException';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ApiException.prototype);
  }
}

export interface UsuarioModel {
  id: number;
  nome: string;
  email: string;
  creaRegistro: string | null;
  instituicao: string;
  cargo: string;
  criadoEm: string;
}

export interface AreaExperimentalModel {
  id: string;
  nome: string;
  nomeCurto: string;
  descricao: string;
  dmsLat: string;
  dmsLng: string;
  latitude: number;
  longitude: number;
}

export interface PragaModel {
  id: string;
  culturaId: string;
  nomeComum: string;
  nomeCientifico: string;
  ordem: string;
  faseCriticaTipica: string;
  descricao: string;
  imagem: string;
  fasesSugeridas: string[];
}

export interface CulturaModel {
  id: string;
  nome: string;
  nomeCientifico: string;
  familia: string;
  descricao: string;
  imagem: string;
  pragas: PragaModel[];
}

export interface FaseDesenvolvimentoModel {
  id: string;
  label: string;
  ordem?: number;
  isInitial: boolean;
  isTerminal: boolean;
  isNymph: boolean;
}

export interface PontoAmostralModel {
  index: number;
  lat: number;
  lng: number;
  timestamp: string;
  label?: string;
}

export interface TalhaoModel {
  id: number;
  name: string;
  areaId?: string | null;
  samples: Record<string, number[]>;
  sampleLocations: PontoAmostralModel[];
}

export interface CenarioAnaliticoModel {
  id: string;
  nome: string;
  criadoPor: string;
  usuarioId?: number | null;
  culturaId: string;
  culturaNome: string;
  culturaCientifico?: string;
  pragaId: string;
  pragaNome: string;
  pragaCientifico: string;
  areaExperimentalId?: string | null;
  criadoEm: string;
  atualizadoEm?: string;
  observacoes: string;
  numTalhoes: number;
  numAmostrasPorTalhao: number;
  ativo: boolean;
  stages: FaseDesenvolvimentoModel[];
  plots: TalhaoModel[];
}

export interface CriarCenarioDTO {
  nome: string;
  criadoPor: string;
  culturaId: string;
  pragaId: string;
  areaExperimentalId?: string;
  numTalhoes: number;
  numAmostrasPorTalhao: number;
  observacoes?: string;
  zerado?: boolean;
  stages?: FaseDesenvolvimentoModel[];
  plots?: TalhaoModel[];
}

export interface AtualizarCenarioMetadadosDTO {
  nome: string;
  criadoPor: string;
  criadoEm?: string;
  observacoes?: string;
  ativo?: boolean;
}

export interface AtualizarContagensTalhaoDTO {
  stages: FaseDesenvolvimentoModel[];
  plots: TalhaoModel[];
  numTalhoes?: number;
  numAmostrasPorTalhao?: number;
  ativo?: boolean;
}

export interface StageLifeRow {
  stageId: string;
  stageLabel: string;
  isTerminal: boolean;
  soma: number;
  lx: number;
  dx: number;
  qx100: number;
  rx100: number;
  sx: number;
  mm: number;
  k: number;
  lx2: number;
  dx2: number;
  qx100_2: number;
  rx100_2: number;
  mm2: number;
  k2: number;
}

export interface PlotLifeTable {
  plotId: number;
  plotName: string;
  areaId?: string | null;
  rows: StageLifeRow[];
  totalOvosIniciais: number;
  adultosSobreviventes: number;
  totalDx: number;
  mortalidadeTotalPct: number;
  kTotal: number;
  maxKStageId: string;
}

export interface MeanLifeRow {
  stageId: string;
  stageLabel: string;
  isTerminal: boolean;
  lxMean: number;
  lxSd: number;
  lxSe: number;
  dxMean: number;
  dxSd: number;
  dxSe: number;
  qx100: number;
  rx100: number;
  sx: number;
  mm: number;
  kMean: number;
  miAbs: number;
  miPct: number;
  aumentoPopPct: number;
}

export interface MeanLifeTableResult {
  rows: MeanLifeRow[];
  mortalidadeTotalMedia: number;
  mortalidadeTotalSd: number;
  mortalidadeTotalSe: number;
  kTotalMedio: number;
  maiorKStage: string;
  maiorMIStage: string;
  sobrevivenciaAdultaMedia: number;
}

export interface KStageColumnStat {
  stageId: string;
  stageLabel: string;
  sum: number;
  mean: number;
  sd: number;
  se: number;
  pctOfKTotal: number;
}

export interface KPlotMatrixRow {
  plotId: number;
  plotName: string;
  kByStage: Record<string, number>;
  kTotal: number;
  mortalidadeTotalPct: number;
  maxStageId: string;
}

export interface KSummaryStatsResult {
  plotRows: KPlotMatrixRow[];
  stageStats: KStageColumnStat[];
  kTotalSum: number;
  kTotalMean: number;
  kTotalSd: number;
  kTotalSe: number;
  mortalidadeTotalMean: number;
}

export interface CorrelationPairCell {
  rowId: string;
  colId: string;
  r: number;
  tStat: number;
  df: number;
  pValue: number;
  significance: '**' | '*' | 'ns';
}

export interface CorrelationMatrixResult {
  labels: { id: string; label: string }[];
  matrix: Record<string, Record<string, number>>;
  vsKTotal: {
    stageId: string;
    stageLabel: string;
    r: number;
    r2: number;
    tStat: number;
    df: number;
    pValue: number;
    significance: '**' | '*' | 'ns';
  }[];
}

export interface AnovaCoefficientRow {
  name: string;
  coef: number;
  se: number;
  tStat: number;
  pValue: number;
  ci95Low: number;
  ci95High: number;
}

export interface AnovaRegressionResult {
  stageId: string;
  stageLabel: string;
  rMultiple: number;
  r: number;
  r2: number;
  r2Adj: number;
  standardError: number;
  observations: number;
  dfReg: number;
  dfRes: number;
  dfTotal: number;
  ssReg: number;
  ssRes: number;
  ssTotal: number;
  msReg: number;
  msRes: number;
  fStat: number;
  pValueF: number;
  intercept: AnovaCoefficientRow;
  slope: AnovaCoefficientRow;
  points: { plotId: number; plotName: string; x: number; y: number; yHat: number }[];
}

export interface CriticalStageComparison {
  stageId: string;
  stageLabel: string;
  slopeB: number;
  slopeSe: number;
  interceptA: number;
  r: number;
  r2: number;
  fStat: number;
  pValue: number;
  ci95Low: number;
  ci95High: number;
  kMean: number;
  kSe: number;
  qx100Mean: number;
  miPct: number;
  miAbs: number;
  aumentoPopPct: number;
  potencialFactor: number;
  isSignificant: boolean;
  isCriticalPodoler: boolean;
  significanceBadge: '**' | '*' | 'ns';
}

export interface CompleteEcologicalAnalysis {
  plotLifeTables: PlotLifeTable[];
  meanLifeTable: MeanLifeTableResult;
  kSummaryStats: KSummaryStatsResult;
  correlationMatrix: CorrelationMatrixResult;
  anovaByStage: AnovaRegressionResult[];
  criticalStages: CriticalStageComparison[];
  fatorChaveStage: CriticalStageComparison | null;
}

