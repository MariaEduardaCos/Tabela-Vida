import {
  AnovaCoefficientRow,
  AnovaRegressionResult,
  CorrelationMatrixResult,
  CriticalStageComparison,
  KPlotMatrixRow,
  KStageColumnStat,
  KSummaryStatsResult,
  MeanLifeRow,
  MeanLifeTableResult,
  PlotData,
  PlotLifeTable,
  StageDefinition,
  StageLifeRow,
} from './life-table.models';

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function sampleStdDev(values: number[]): number {
  const n = values.length;
  if (n <= 1) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return Math.sqrt(sumSq / (n - 1));
}

export function pearsonR(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n <= 1) return 0;
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  if (dx2 <= 1e-15 || dy2 <= 1e-15) return 0;
  return Math.max(-1, Math.min(1, num / Math.sqrt(dx2 * dy2)));
}

function logGamma(z: number): number {
  const coef = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -0.000005395239384953,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < coef.length; j++) {
    y += 1;
    ser += coef[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const maxIter = 200;
  const eps = 3e-12;
  const fpMin = 1e-30;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpMin) d = fpMin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1.0) < eps) break;
  }
  return h;
}

export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x)
  );

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(x, a, b)) / a;
  } else {
    return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
  }
}

export function studentTPValueTwoTailed(tStat: number, df: number): number {
  if (df <= 0 || !Number.isFinite(tStat)) return 1.0;
  const t2 = tStat * tStat;
  const x = df / (df + t2);
  return Math.max(0, Math.min(1, regularizedIncompleteBeta(x, df / 2, 0.5)));
}

export function fDistPValue(fStat: number, df1: number, df2: number): number {
  if (fStat <= 0 || df1 <= 0 || df2 <= 0 || !Number.isFinite(fStat)) return 1.0;
  const x = df2 / (df2 + df1 * fStat);
  return Math.max(0, Math.min(1, regularizedIncompleteBeta(x, df2 / 2, df1 / 2)));
}

export function studentTCritical95(df: number): number {
  if (df <= 0) return 1.96;
  let low = 1.0;
  let high = 20.0;
  for (let iter = 0; iter < 60; iter++) {
    const mid = (low + high) / 2;
    const p = studentTPValueTwoTailed(mid, df);
    if (p > 0.05) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}

export function computeLifeTableForPlot(
  plot: PlotData,
  stages: StageDefinition[],
  useStaticRef100rx: boolean = false,
  staticRefL0?: number
): PlotLifeTable {
  const somas = stages.map((st) => {
    const vals = plot.samples[st.id] || [];
    return vals.reduce((acc, v) => acc + (Number(v) || 0), 0);
  });

  const lxNatural: number[] = stages.map((_, idx) => {
    let sum = 0;
    for (let j = idx; j < somas.length; j++) {
      sum += somas[j];
    }
    return sum;
  });

  const L0 = lxNatural[0] || 0;
  const refL0 = useStaticRef100rx && staticRefL0 && staticRefL0 > 0 ? staticRefL0 : L0;

  const rows: StageLifeRow[] = [];
  let currentLx2 = L0 > 0 ? 1000 : 0;
  let kTotal = 0;
  let maxKVal = -1;
  let maxKStageId = stages[0]?.id || 'Ov';
  let totalDx = 0;

  for (let i = 0; i < stages.length; i++) {
    const st = stages[i];
    const isTerminal = st.isTerminal || i === stages.length - 1;
    const soma = somas[i];
    const lx = lxNatural[i];

    if (isTerminal) {
      rows.push({
        stageId: st.id,
        stageLabel: st.label,
        isTerminal: true,
        soma,
        lx,
        dx: 0,
        qx100: 0,
        rx100: 0,
        sx: 1,
        mm: 0,
        k: 0,
        lx2: currentLx2,
        dx2: 0,
        qx100_2: 0,
        rx100_2: 0,
        mm2: 0,
        k2: 0,
      });
      continue;
    }

    const nextLx = lxNatural[i + 1] ?? 0;
    const dx = Math.max(0, lx - nextLx);
    totalDx += dx;

    const qx100 = lx > 0 ? (dx * 100) / lx : 0;
    const rx100 = refL0 > 0 ? (dx * 100) / refL0 : 0;
    const sx = lx > 0 ? nextLx / lx : 0;
    const mm = qx100;

    let k = 0;
    if (lx > 0 && nextLx > 0) {
      const ratio = 1 - mm / 100;
      k = ratio > 0 ? -Math.log10(ratio) : 0;
    }

    const lx2 = currentLx2;
    const dx2 = lx > 0 ? (lx2 * dx) / lx : 0;
    const qx100_2 = lx2 > 0 ? (dx2 * 100) / lx2 : 0;
    const rx100_2 = (dx2 * 100) / 1000;
    const mm2 = qx100_2;
    let k2 = 0;
    if (lx2 > 0 && lx2 - dx2 > 0) {
      const ratio2 = 1 - mm2 / 100;
      k2 = ratio2 > 0 ? -Math.log10(ratio2) : 0;
    }

    currentLx2 = Math.max(0, lx2 - dx2);
    kTotal += k2;

    if (k2 > maxKVal) {
      maxKVal = k2;
      maxKStageId = st.id;
    }

    rows.push({
      stageId: st.id,
      stageLabel: st.label,
      isTerminal: false,
      soma,
      lx,
      dx,
      qx100,
      rx100,
      sx,
      mm,
      k,
      lx2,
      dx2,
      qx100_2,
      rx100_2,
      mm2,
      k2,
    });
  }

  const adultosSobreviventes = lxNatural[stages.length - 1] ?? 0;
  const mortalidadeTotalPct = L0 > 0 ? ((1000 - currentLx2) * 100) / 1000 : 0;

  return {
    plotId: plot.id,
    plotName: plot.name,
    areaId: plot.areaId,
    rows,
    totalOvosIniciais: L0,
    adultosSobreviventes,
    totalDx,
    mortalidadeTotalPct,
    kTotal,
    maxKStageId,
  };
}

export function computeMeanLifeTable(
  plotTables: PlotLifeTable[],
  stages: StageDefinition[]
): MeanLifeTableResult {
  const n = plotTables.length;
  if (n === 0 || !stages.length) {
    return {
      rows: [],
      mortalidadeTotalMedia: 0,
      mortalidadeTotalSd: 0,
      mortalidadeTotalSe: 0,
      kTotalMedio: 0,
      maiorKStage: '',
      maiorMIStage: '',
      sobrevivenciaAdultaMedia: 0,
    };
  }

  const lastStageIdx = stages.length - 1;
  const adultLx2Values = plotTables.map((pt) => pt.rows[lastStageIdx]?.lx2 ?? 0);
  const lFinalMean = mean(adultLx2Values);

  const rows: MeanLifeRow[] = [];
  let kTotalMedio = 0;
  let maiorKVal = -1;
  let maiorKStage = '';
  let maiorMIVal = -1;
  let maiorMIStage = '';

  for (let i = 0; i < stages.length; i++) {
    const st = stages[i];
    const isTerminal = st.isTerminal || i === lastStageIdx;
    const lx2Vals = plotTables.map((pt) => pt.rows[i]?.lx2 ?? 0);
    const dx2Vals = plotTables.map((pt) => pt.rows[i]?.dx2 ?? 0);

    const lxMean = mean(lx2Vals);
    const lxSd = sampleStdDev(lx2Vals);
    const lxSe = n > 0 ? lxSd / Math.sqrt(n) : 0;

    if (isTerminal) {
      rows.push({
        stageId: st.id,
        stageLabel: st.label,
        isTerminal: true,
        lxMean,
        lxSd,
        lxSe,
        dxMean: 0,
        dxSd: 0,
        dxSe: 0,
        qx100: 0,
        rx100: 0,
        sx: 1,
        mm: 0,
        kMean: 0,
        miAbs: 0,
        miPct: 0,
        aumentoPopPct: 0,
      });
      continue;
    }

    const dxMean = mean(dx2Vals);
    const dxSd = sampleStdDev(dx2Vals);
    const dxSe = n > 0 ? dxSd / Math.sqrt(n) : 0;

    const qx100 = lxMean > 0 ? (dxMean * 100) / lxMean : 0;
    const rx100 = (dxMean * 100) / 1000;
    const sx = lxMean > 0 ? (lxMean - dxMean) / lxMean : 0;
    const mm = qx100;

    let kMean = 0;
    if (100 - mm > 0) {
      kMean = -Math.log10(1 - mm / 100);
    }
    kTotalMedio += kMean;

    const miAbs = 100 - qx100 > 1e-9 ? lFinalMean * (qx100 / (100 - qx100)) : 0;
    const miPct = (miAbs / 1000) * 100;
    const aumentoPopPct = 100 - qx100 > 1e-9 ? (qx100 / (100 - qx100)) * 100 : 0;

    if (kMean > maiorKVal) {
      maiorKVal = kMean;
      maiorKStage = st.label;
    }
    if (miPct > maiorMIVal) {
      maiorMIVal = miPct;
      maiorMIStage = st.label;
    }

    rows.push({
      stageId: st.id,
      stageLabel: st.label,
      isTerminal: false,
      lxMean,
      lxSd,
      lxSe,
      dxMean,
      dxSd,
      dxSe,
      qx100,
      rx100,
      sx,
      mm,
      kMean,
      miAbs,
      miPct,
      aumentoPopPct,
    });
  }

  const mortTotalVals = plotTables.map((pt) => pt.mortalidadeTotalPct);
  const mortalidadeTotalMedia = mean(mortTotalVals);
  const mortalidadeTotalSd = sampleStdDev(mortTotalVals);
  const mortalidadeTotalSe = n > 0 ? mortalidadeTotalSd / Math.sqrt(n) : 0;

  return {
    rows,
    mortalidadeTotalMedia,
    mortalidadeTotalSd,
    mortalidadeTotalSe,
    kTotalMedio,
    maiorKStage,
    maiorMIStage,
    sobrevivenciaAdultaMedia: (lFinalMean / 1000) * 100,
  };
}

export function computeKSummaryStats(
  plotTables: PlotLifeTable[],
  stages: StageDefinition[]
): KSummaryStatsResult {
  const immatureStages = stages.filter((s, idx) => !s.isTerminal && idx < stages.length - 1);
  const n = plotTables.length;

  const plotRows: KPlotMatrixRow[] = plotTables.map((pt) => {
    const kByStage: Record<string, number> = {};
    let maxK = -1;
    let maxStageId = immatureStages[0]?.id || '';
    for (const st of immatureStages) {
      const row = pt.rows.find((r) => r.stageId === st.id);
      const kVal = row ? row.k2 : 0;
      kByStage[st.id] = kVal;
      if (kVal > maxK) {
        maxK = kVal;
        maxStageId = st.id;
      }
    }
    return {
      plotId: pt.plotId,
      plotName: pt.plotName,
      kByStage,
      kTotal: pt.kTotal,
      mortalidadeTotalPct: pt.mortalidadeTotalPct,
      maxStageId,
    };
  });

  const kTotalVals = plotRows.map((r) => r.kTotal);
  const kTotalSum = kTotalVals.reduce((a, b) => a + b, 0);
  const kTotalMean = mean(kTotalVals);
  const kTotalSd = sampleStdDev(kTotalVals);
  const kTotalSe = n > 0 ? kTotalSd / Math.sqrt(n) : 0;
  const mortalidadeTotalMean = mean(plotRows.map((r) => r.mortalidadeTotalPct));

  const stageStats: KStageColumnStat[] = immatureStages.map((st) => {
    const vals = plotRows.map((r) => r.kByStage[st.id] ?? 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const m = mean(vals);
    const sd = sampleStdDev(vals);
    const se = n > 0 ? sd / Math.sqrt(n) : 0;
    const pctOfKTotal = kTotalSum > 0 ? (sum / kTotalSum) * 100 : 0;
    return {
      stageId: st.id,
      stageLabel: st.label,
      sum,
      mean: m,
      sd,
      se,
      pctOfKTotal,
    };
  });

  return {
    plotRows,
    stageStats,
    kTotalSum,
    kTotalMean,
    kTotalSd,
    kTotalSe,
    mortalidadeTotalMean,
  };
}

export function computeCorrelationMatrix(
  plotTables: PlotLifeTable[],
  stages: StageDefinition[]
): CorrelationMatrixResult {
  const immatureStages = stages.filter((s, idx) => !s.isTerminal && idx < stages.length - 1);
  const n = plotTables.length;
  const df = Math.max(1, n - 2);

  const seriesByKey: Record<string, number[]> = {};
  for (const st of immatureStages) {
    seriesByKey[st.id] = plotTables.map(
      (pt) => pt.rows.find((r) => r.stageId === st.id)?.k2 ?? 0
    );
  }
  seriesByKey['K_TOTAL'] = plotTables.map((pt) => pt.kTotal);

  const labels = [
    ...immatureStages.map((s) => ({ id: s.id, label: s.id })),
    { id: 'K_TOTAL', label: 'K total' },
  ];

  const matrix: Record<string, Record<string, number>> = {};
  for (const row of labels) {
    matrix[row.id] = {};
    for (const col of labels) {
      if (row.id === col.id) {
        matrix[row.id][col.id] = 1.0;
      } else {
        matrix[row.id][col.id] = pearsonR(
          seriesByKey[row.id] || [],
          seriesByKey[col.id] || []
        );
      }
    }
  }

  const vsKTotal = immatureStages.map((st) => {
    const r = pearsonR(seriesByKey[st.id] || [], seriesByKey['K_TOTAL'] || []);
    const r2 = r * r;
    let tStat = 0;
    let pValue = 1.0;

    const sumSqY = (seriesByKey[st.id] || []).reduce((acc, v) => acc + Math.abs(v), 0);
    if (sumSqY > 1e-12 && n > 2) {
      if (Math.abs(r) >= 0.99999999) {
        tStat = r > 0 ? 999.99 : -999.99;
        pValue = 0.0;
      } else {
        tStat = r * Math.sqrt((n - 2) / Math.max(1e-15, 1 - r2));
        pValue = studentTPValueTwoTailed(tStat, df);
      }
    }

    const significance: '**' | '*' | 'ns' =
      pValue < 0.01 ? '**' : pValue < 0.05 ? '*' : 'ns';

    return {
      stageId: st.id,
      stageLabel: st.label,
      r,
      r2,
      tStat,
      df,
      pValue,
      significance,
    };
  });

  return {
    labels,
    matrix,
    vsKTotal,
  };
}

export function linearRegressionAnova(
  xValues: number[],
  yValues: number[],
  stageId: string,
  stageLabel: string,
  plotTables: PlotLifeTable[]
): AnovaRegressionResult {
  const n = Math.min(xValues.length, yValues.length);
  if (n < 3) {
    const emptyCoef: AnovaCoefficientRow = {
      name: '',
      coef: 0,
      se: 0,
      tStat: 0,
      pValue: 1,
      ci95Low: 0,
      ci95High: 0,
    };
    return {
      stageId,
      stageLabel,
      rMultiple: 0,
      r: 0,
      r2: 0,
      r2Adj: 0,
      standardError: 0,
      observations: n,
      dfReg: 1,
      dfRes: Math.max(0, n - 2),
      dfTotal: Math.max(0, n - 1),
      ssReg: 0,
      ssRes: 0,
      ssTotal: 0,
      msReg: 0,
      msRes: 0,
      fStat: 0,
      pValueF: 1,
      intercept: { ...emptyCoef, name: 'Interseção' },
      slope: { ...emptyCoef, name: 'K total (Slope)' },
      points: [],
    };
  }

  const xMean = mean(xValues);
  const yMean = mean(yValues);

  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  for (let i = 0; i < n; i++) {
    const dx = xValues[i] - xMean;
    const dy = yValues[i] - yMean;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const slopeB = sxx > 1e-15 ? sxy / sxx : 0;
  const interceptA = yMean - slopeB * xMean;

  let ssReg = 0;
  let ssRes = 0;
  const points: { plotId: number; plotName: string; x: number; y: number; yHat: number }[] = [];

  for (let i = 0; i < n; i++) {
    const yHat = interceptA + slopeB * xValues[i];
    ssReg += (yHat - yMean) * (yHat - yMean);
    ssRes += (yValues[i] - yHat) * (yValues[i] - yHat);
    points.push({
      plotId: plotTables[i]?.plotId ?? i + 1,
      plotName: plotTables[i]?.plotName ?? `Talhão ${i + 1}`,
      x: xValues[i],
      y: yValues[i],
      yHat,
    });
  }

  const ssTotal = syy;
  const dfReg = 1;
  const dfRes = n - 2;
  const dfTotal = n - 1;

  const msReg = ssReg / dfReg;
  const msRes = dfRes > 0 ? ssRes / dfRes : 0;

  const r = sxx > 1e-15 && syy > 1e-15 ? sxy / Math.sqrt(sxx * syy) : 0;
  const r2 = syy > 1e-15 ? Math.max(0, Math.min(1, ssReg / ssTotal)) : 0;
  const rMultiple = Math.sqrt(r2);
  const r2Adj = syy > 1e-15 && dfRes > 0 ? 1 - ((1 - r2) * (n - 1)) / dfRes : 0;
  const standardError = Math.sqrt(Math.max(0, msRes));

  const fStat = msRes > 1e-15 ? msReg / msRes : 0;
  const pValueF =
    syy <= 1e-15
      ? 1.0
      : msRes > 1e-15
      ? fDistPValue(fStat, dfReg, dfRes)
      : r2 > 0.9999
      ? 0.0
      : 1.0;

  const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);
  const seSlope = sxx > 1e-15 ? Math.sqrt(Math.max(0, msRes / sxx)) : 0;
  const seIntercept =
    sxx > 1e-15 ? Math.sqrt(Math.max(0, msRes * (sumX2 / (n * sxx)))) : 0;

  const tSlope = seSlope > 1e-15 ? slopeB / seSlope : 0;
  const tIntercept = seIntercept > 1e-15 ? interceptA / seIntercept : 0;

  const pSlope =
    syy <= 1e-15 ? 1.0 : seSlope > 1e-15 ? studentTPValueTwoTailed(tSlope, dfRes) : 1.0;
  const pIntercept =
    syy <= 1e-15
      ? 1.0
      : seIntercept > 1e-15
      ? studentTPValueTwoTailed(tIntercept, dfRes)
      : 1.0;

  const tCrit95 = studentTCritical95(dfRes);

  const interceptRow: AnovaCoefficientRow = {
    name: 'Interseção',
    coef: interceptA,
    se: seIntercept,
    tStat: tIntercept,
    pValue: pIntercept,
    ci95Low: interceptA - tCrit95 * seIntercept,
    ci95High: interceptA + tCrit95 * seIntercept,
  };

  const slopeRow: AnovaCoefficientRow = {
    name: 'K total (Slope)',
    coef: slopeB,
    se: seSlope,
    tStat: tSlope,
    pValue: pSlope,
    ci95Low: slopeB - tCrit95 * seSlope,
    ci95High: slopeB + tCrit95 * seSlope,
  };

  return {
    stageId,
    stageLabel,
    rMultiple,
    r,
    r2,
    r2Adj,
    standardError,
    observations: n,
    dfReg,
    dfRes,
    dfTotal,
    ssReg,
    ssRes,
    ssTotal,
    msReg,
    msRes,
    fStat,
    pValueF,
    intercept: interceptRow,
    slope: slopeRow,
    points,
  };
}

export function computeCriticalStageAnalysis(
  plotTables: PlotLifeTable[],
  stages: StageDefinition[],
  meanLifeTable: MeanLifeTableResult,
  kSummaryStats: KSummaryStatsResult,
  anovaByStage: AnovaRegressionResult[]
): CriticalStageComparison[] {
  const immatureStages = stages.filter((s, idx) => !s.isTerminal && idx < stages.length - 1);

  const criticalStages: CriticalStageComparison[] = immatureStages.map((st) => {
    const anova = anovaByStage.find((a) => a.stageId === st.id);
    const meanRow = meanLifeTable.rows.find((r) => r.stageId === st.id);
    const kCol = kSummaryStats.stageStats.find((s) => s.stageId === st.id);

    const pValue = anova?.slope.pValue ?? 1;
    const slopeB = anova?.slope.coef ?? 0;
    const isSignificant = pValue < 0.05 && slopeB > 0;
    const significanceBadge: '**' | '*' | 'ns' =
      pValue < 0.01 ? '**' : pValue < 0.05 ? '*' : 'ns';

    const sx = meanRow?.sx ?? 1;
    const potencialFactor = sx > 1e-6 ? 1 / sx : 1;

    return {
      stageId: st.id,
      stageLabel: st.label,
      slopeB,
      slopeSe: anova?.slope.se ?? 0,
      interceptA: anova?.intercept.coef ?? 0,
      r: anova?.r ?? 0,
      r2: anova?.r2 ?? 0,
      fStat: anova?.fStat ?? 0,
      pValue,
      ci95Low: anova?.slope.ci95Low ?? 0,
      ci95High: anova?.slope.ci95High ?? 0,
      kMean: kCol?.mean ?? 0,
      kSe: kCol?.se ?? 0,
      qx100Mean: meanRow?.qx100 ?? 0,
      miPct: meanRow?.miPct ?? 0,
      miAbs: meanRow?.miAbs ?? 0,
      aumentoPopPct: meanRow?.aumentoPopPct ?? 0,
      potencialFactor,
      isSignificant,
      isCriticalPodoler: false,
      significanceBadge,
    };
  });

  const sigStages = criticalStages.filter((c) => c.isSignificant);
  const pool = sigStages.length > 0 ? sigStages : criticalStages;
  let bestStage: CriticalStageComparison | null = null;
  for (const st of pool) {
    if (!bestStage || st.slopeB > bestStage.slopeB) {
      bestStage = st;
    }
  }
  if (bestStage) {
    bestStage.isCriticalPodoler = true;
  }

  return criticalStages;
}

