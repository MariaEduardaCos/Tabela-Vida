"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifeTableMathEngine = void 0;
const common_1 = require("@nestjs/common");
let LifeTableMathEngine = class LifeTableMathEngine {
    /**
     * Calcula a Tabela de Vida Ecológica para um único talhão (Aba 2).
     * Suporta a dupla convenção de 100rx (RN015):
     * - Padrão por talhão: 100rx = (dx / L0_talhao) * 100
     * - Referência estática da planilha (useStaticRef100rx = true): 100rx da tabela natural usa L0 do Talhão 1 (N$3)
     */
    computeLifeTableForPlot(plot, stages, useStaticRef100rx = false, staticRefL0) {
        const somas = stages.map((st) => {
            const vals = plot.samples[st.id] || [];
            return vals.reduce((acc, v) => acc + (Number(v) || 0), 0);
        });
        // Na metodologia da planilha dados.xlsx:
        // N_i = SUM(M_i : M_last) -> indivíduos vivos acumulados da fase i até Adulto
        // O_i = N_i - N_{i+1} = M_i (para fases pré-adultas)
        const lxNatural = stages.map((_, idx) => {
            let sum = 0;
            for (let j = idx; j < somas.length; j++) {
                sum += somas[j];
            }
            return sum;
        });
        const L0 = lxNatural[0] || 0;
        const refL0 = useStaticRef100rx && staticRefL0 && staticRefL0 > 0 ? staticRefL0 : L0;
        const rows = [];
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
            // RN016: Tratamento seguro de divisões por zero e logaritmos
            const qx100 = lx > 0 ? (dx * 100) / lx : 0;
            const rx100 = refL0 > 0 ? (dx * 100) / refL0 : 0;
            const sx = lx > 0 ? nextLx / lx : 0;
            const mm = qx100;
            // k = -log10(1 - MM/100) = log10(Lx) - log10(Lx+1)
            let k = 0;
            if (lx > 0 && nextLx > 0) {
                const ratio = 1 - mm / 100;
                k = ratio > 0 ? -Math.log10(ratio) : 0;
            }
            // Tabela Padronizada (Base 1.000 Ovos)
            const lx2 = currentLx2;
            const dx2 = lx > 0 ? (lx2 * dx) / lx : 0;
            const qx100_2 = lx2 > 0 ? (dx2 * 100) / lx2 : 0;
            const rx100_2 = 1000 > 0 ? (dx2 * 100) / 1000 : 0;
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
    /**
     * Calcula a Tabela de Vida Média e Mortalidade Indispensável (Aba 3 — RF011 / RN017).
     */
    computeMeanLifeTable(plotTables, stages) {
        const n = plotTables.length;
        if (n === 0) {
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
        // Média de sobreviventes adultos na base 1000
        const lastStageIdx = stages.length - 1;
        const adultLx2Values = plotTables.map((pt) => pt.rows[lastStageIdx]?.lx2 ?? 0);
        const lFinalMean = this.mean(adultLx2Values);
        const rows = [];
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
            const lxMean = this.mean(lx2Vals);
            const lxSd = this.sampleStdDev(lx2Vals);
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
            const dxMean = this.mean(dx2Vals);
            const dxSd = this.sampleStdDev(dx2Vals);
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
            // Mortalidade Indispensável (Pereira et al., 2018 / Southwood):
            // MI_x = L_final * (100qx / (100 - 100qx))
            // %MI_x = (MI_x / 1000) * 100 = MI_x / 10
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
        const mortalidadeTotalMedia = this.mean(mortTotalVals);
        const mortalidadeTotalSd = this.sampleStdDev(mortTotalVals);
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
    /**
     * Matriz de kx e Ktotal por Talhão com Soma, Média, DP, EP e %Ktotal (Aba 4 — RF012 / RN018).
     */
    computeKSummaryStats(plotTables, stages) {
        const immatureStages = stages.filter((s, idx) => !s.isTerminal && idx < stages.length - 1);
        const n = plotTables.length;
        const plotRows = plotTables.map((pt) => {
            const kByStage = {};
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
        const kTotalMean = this.mean(kTotalVals);
        const kTotalSd = this.sampleStdDev(kTotalVals);
        const kTotalSe = n > 0 ? kTotalSd / Math.sqrt(n) : 0;
        const mortalidadeTotalMean = this.mean(plotRows.map((r) => r.mortalidadeTotalPct));
        const stageStats = immatureStages.map((st) => {
            const vals = plotRows.map((r) => r.kByStage[st.id] ?? 0);
            const sum = vals.reduce((a, b) => a + b, 0);
            const mean = this.mean(vals);
            const sd = this.sampleStdDev(vals);
            const se = n > 0 ? sd / Math.sqrt(n) : 0;
            const pctOfKTotal = kTotalSum > 0 ? (sum / kTotalSum) * 100 : 0;
            return {
                stageId: st.id,
                stageLabel: st.label,
                sum,
                mean,
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
    /**
     * Matriz de Correlação Linear de Pearson (r) e Teste t de Student (Aba 5 Parte A — RF013 / RN019).
     */
    computeCorrelationMatrix(plotTables, stages) {
        const immatureStages = stages.filter((s, idx) => !s.isTerminal && idx < stages.length - 1);
        const n = plotTables.length;
        const df = Math.max(1, n - 2);
        const seriesByKey = {};
        for (const st of immatureStages) {
            seriesByKey[st.id] = plotTables.map((pt) => pt.rows.find((r) => r.stageId === st.id)?.k2 ?? 0);
        }
        seriesByKey['K_TOTAL'] = plotTables.map((pt) => pt.kTotal);
        const labels = [
            ...immatureStages.map((s) => ({ id: s.id, label: s.id })),
            { id: 'K_TOTAL', label: 'K total' },
        ];
        const matrix = {};
        for (const row of labels) {
            matrix[row.id] = {};
            for (const col of labels) {
                if (row.id === col.id) {
                    matrix[row.id][col.id] = 1.0;
                }
                else {
                    matrix[row.id][col.id] = this.pearsonR(seriesByKey[row.id] || [], seriesByKey[col.id] || []);
                }
            }
        }
        const vsKTotal = immatureStages.map((st) => {
            const r = this.pearsonR(seriesByKey[st.id] || [], seriesByKey['K_TOTAL'] || []);
            const r2 = r * r;
            let tStat = 0;
            let pValue = 1.0;
            const sumSqY = (seriesByKey[st.id] || []).reduce((acc, v) => acc + Math.abs(v), 0);
            if (sumSqY > 1e-12 && n > 2) {
                if (Math.abs(r) >= 0.99999999) {
                    tStat = r > 0 ? 999.99 : -999.99;
                    pValue = 0.0;
                }
                else {
                    tStat = r * Math.sqrt((n - 2) / Math.max(1e-15, 1 - r2));
                    pValue = this.studentTPValueTwoTailed(tStat, df);
                }
            }
            const significance = pValue < 0.01 ? '**' : pValue < 0.05 ? '*' : 'ns';
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
    /**
     * ANOVA Completa da Regressão Linear Simples de kx (Y) vs Ktotal (X) (Aba 5 Parte B — RF014 / RN020).
     */
    linearRegressionAnova(xValues, yValues, stageId, stageLabel, plotTables) {
        const n = Math.min(xValues.length, yValues.length);
        if (n < 3) {
            const emptyCoef = {
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
        const xMean = this.mean(xValues);
        const yMean = this.mean(yValues);
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
        const points = [];
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
        const pValueF = syy <= 1e-15
            ? 1.0
            : msRes > 1e-15
                ? this.fDistPValue(fStat, dfReg, dfRes)
                : r2 > 0.9999
                    ? 0.0
                    : 1.0;
        // Erros padrão e Intervalos de Confiança (95%) dos coeficientes
        const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);
        const seSlope = sxx > 1e-15 ? Math.sqrt(Math.max(0, msRes / sxx)) : 0;
        const seIntercept = sxx > 1e-15 ? Math.sqrt(Math.max(0, msRes * (sumX2 / (n * sxx)))) : 0;
        const tSlope = seSlope > 1e-15 ? slopeB / seSlope : 0;
        const tIntercept = seIntercept > 1e-15 ? interceptA / seIntercept : 0;
        const pSlope = syy <= 1e-15 ? 1.0 : seSlope > 1e-15 ? this.studentTPValueTwoTailed(tSlope, dfRes) : 1.0;
        const pIntercept = syy <= 1e-15
            ? 1.0
            : seIntercept > 1e-15
                ? this.studentTPValueTwoTailed(tIntercept, dfRes)
                : 1.0;
        const tCrit95 = this.studentTCritical95(dfRes);
        const interceptRow = {
            name: 'Interseção',
            coef: interceptA,
            se: seIntercept,
            tStat: tIntercept,
            pValue: pIntercept,
            ci95Low: interceptA - tCrit95 * seIntercept,
            ci95High: interceptA + tCrit95 * seIntercept,
        };
        const slopeRow = {
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
    /**
     * Executa a análise ecológica e estatística completa de um conjunto de talhões e fases.
     */
    computeCompleteAnalysis(plots, stages, useStaticRef100rx = false) {
        if (!plots || plots.length === 0 || !stages || stages.length === 0) {
            return {
                plotLifeTables: [],
                meanLifeTable: this.computeMeanLifeTable([], stages || []),
                kSummaryStats: this.computeKSummaryStats([], stages || []),
                correlationMatrix: this.computeCorrelationMatrix([], stages || []),
                anovaByStage: [],
                criticalStages: [],
                fatorChaveStage: null,
            };
        }
        // L0 do Talhão 1 para o modo estático de 100rx da planilha
        const firstPlotTable = this.computeLifeTableForPlot(plots[0], stages, false);
        const staticRefL0 = firstPlotTable.totalOvosIniciais;
        const plotLifeTables = plots.map((p) => this.computeLifeTableForPlot(p, stages, useStaticRef100rx, staticRefL0));
        const meanLifeTable = this.computeMeanLifeTable(plotLifeTables, stages);
        const kSummaryStats = this.computeKSummaryStats(plotLifeTables, stages);
        const correlationMatrix = this.computeCorrelationMatrix(plotLifeTables, stages);
        const immatureStages = stages.filter((s, idx) => !s.isTerminal && idx < stages.length - 1);
        const kTotalVector = plotLifeTables.map((pt) => pt.kTotal);
        const anovaByStage = immatureStages.map((st) => {
            const yVec = plotLifeTables.map((pt) => pt.rows.find((r) => r.stageId === st.id)?.k2 ?? 0);
            return this.linearRegressionAnova(kTotalVector, yVec, st.id, st.label, plotLifeTables);
        });
        // Consolida indicadores por estágio para Aba 6 e Aba 7
        const criticalStages = immatureStages.map((st) => {
            const anova = anovaByStage.find((a) => a.stageId === st.id);
            const meanRow = meanLifeTable.rows.find((r) => r.stageId === st.id);
            const kCol = kSummaryStats.stageStats.find((s) => s.stageId === st.id);
            const pValue = anova.slope.pValue;
            const isSignificant = pValue < 0.05 && anova.slope.coef > 0;
            const significanceBadge = pValue < 0.01 ? '**' : pValue < 0.05 ? '*' : 'ns';
            const sx = meanRow?.sx ?? 1;
            const potencialFactor = sx > 1e-6 ? 1 / sx : 1;
            return {
                stageId: st.id,
                stageLabel: st.label,
                slopeB: anova.slope.coef,
                slopeSe: anova.slope.se,
                interceptA: anova.intercept.coef,
                r: anova.r,
                r2: anova.r2,
                fStat: anova.fStat,
                pValue,
                ci95Low: anova.slope.ci95Low,
                ci95High: anova.slope.ci95High,
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
        // Critério de Podoler & Rogers (1975) / Pereira et al. (2018):
        // Prioriza estágios com regressão linear estatisticamente significativa (p < 0.05) e maior inclinação b;
        // caso nenhum tenha p < 0.05, seleciona aquele com maior inclinação positiva b.
        const sigStages = criticalStages.filter((c) => c.isSignificant);
        const pool = sigStages.length > 0 ? sigStages : criticalStages;
        let bestStage = null;
        for (const st of pool) {
            if (!bestStage || st.slopeB > bestStage.slopeB) {
                bestStage = st;
            }
        }
        if (bestStage) {
            bestStage.isCriticalPodoler = true;
        }
        return {
            plotLifeTables,
            meanLifeTable,
            kSummaryStats,
            correlationMatrix,
            anovaByStage,
            criticalStages,
            fatorChaveStage: bestStage,
        };
    }
    // =========================================================================
    // FUNÇÕES ESTATÍSTICAS AUXILIARES (IEEE 754 — 64 bits)
    // =========================================================================
    mean(values) {
        if (!values.length)
            return 0;
        return values.reduce((acc, v) => acc + v, 0) / values.length;
    }
    sampleStdDev(values) {
        const n = values.length;
        if (n <= 1)
            return 0;
        const m = this.mean(values);
        const sumSq = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
        return Math.sqrt(sumSq / (n - 1));
    }
    pearsonR(x, y) {
        const n = Math.min(x.length, y.length);
        if (n <= 1)
            return 0;
        const mx = this.mean(x);
        const my = this.mean(y);
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
        if (dx2 <= 1e-15 || dy2 <= 1e-15)
            return 0;
        return Math.max(-1, Math.min(1, num / Math.sqrt(dx2 * dy2)));
    }
    /**
     * p-valor bilateral exato da distribuição t de Student via função Beta Incompleta Regularizada I_x(a, b)
     */
    studentTPValueTwoTailed(tStat, df) {
        if (df <= 0 || !Number.isFinite(tStat))
            return 1.0;
        const t2 = tStat * tStat;
        const x = df / (df + t2);
        return Math.max(0, Math.min(1, this.regularizedIncompleteBeta(x, df / 2, 0.5)));
    }
    fDistPValue(fStat, df1, df2) {
        if (fStat <= 0 || df1 <= 0 || df2 <= 0 || !Number.isFinite(fStat))
            return 1.0;
        const x = df2 / (df2 + df1 * fStat);
        return Math.max(0, Math.min(1, this.regularizedIncompleteBeta(x, df2 / 2, df1 / 2)));
    }
    /**
     * Quantil t_{0.975, df} para Intervalo de Confiança a 95% via busca binária sobre studentTPValueTwoTailed.
     */
    studentTCritical95(df) {
        if (df <= 0)
            return 1.96;
        let low = 1.0;
        let high = 20.0;
        for (let iter = 0; iter < 60; iter++) {
            const mid = (low + high) / 2;
            const p = this.studentTPValueTwoTailed(mid, df);
            if (p > 0.05) {
                low = mid;
            }
            else {
                high = mid;
            }
        }
        return (low + high) / 2;
    }
    logGamma(z) {
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
    regularizedIncompleteBeta(x, a, b) {
        if (x <= 0)
            return 0;
        if (x >= 1)
            return 1;
        const bt = Math.exp(this.logGamma(a + b) -
            this.logGamma(a) -
            this.logGamma(b) +
            a * Math.log(x) +
            b * Math.log(1 - x));
        if (x < (a + 1) / (a + b + 2)) {
            return (bt * this.betaContinuedFraction(x, a, b)) / a;
        }
        else {
            return 1 - (bt * this.betaContinuedFraction(1 - x, b, a)) / b;
        }
    }
    betaContinuedFraction(x, a, b) {
        const maxIter = 200;
        const eps = 3e-12;
        const fpMin = 1e-30;
        const qab = a + b;
        const qap = a + 1;
        const qam = a - 1;
        let c = 1;
        let d = 1 - (qab * x) / qap;
        if (Math.abs(d) < fpMin)
            d = fpMin;
        d = 1 / d;
        let h = d;
        for (let m = 1; m <= maxIter; m++) {
            const m2 = 2 * m;
            let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
            d = 1 + aa * d;
            if (Math.abs(d) < fpMin)
                d = fpMin;
            c = 1 + aa / c;
            if (Math.abs(c) < fpMin)
                c = fpMin;
            d = 1 / d;
            h *= d * c;
            aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
            d = 1 + aa * d;
            if (Math.abs(d) < fpMin)
                d = fpMin;
            c = 1 + aa / c;
            if (Math.abs(c) < fpMin)
                c = fpMin;
            d = 1 / d;
            const del = d * c;
            h *= del;
            if (Math.abs(del - 1.0) < eps)
                break;
        }
        return h;
    }
};
exports.LifeTableMathEngine = LifeTableMathEngine;
exports.LifeTableMathEngine = LifeTableMathEngine = __decorate([
    (0, common_1.Injectable)()
], LifeTableMathEngine);
