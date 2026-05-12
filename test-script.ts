import { runICSA } from "./lib/microgrid/icsa-optimizer"
import { IEEE_33_NETWORK, LOAD_PROFILES, DEFAULT_ECONOMIC_PARAMS } from "./lib/microgrid/ieee-test-cases"

const config = {
    numGDs: 3,
    populationSize: 10,
    maxIterations: 2,
    flightLength: 2.0,
    maxPvKw: 2400,
    seed: 42
}

console.log("Iniciando prueba rápida de algoritmo...");

const result = runICSA(
    IEEE_33_NETWORK,
    LOAD_PROFILES["zni-rural"],
    DEFAULT_ECONOMIC_PARAMS,
    config,
    (iter, total, bestFit) => console.log(`Iter ${iter}/${total} | Fit: ${bestFit}`)
);

console.log("Costo Base (Sin FV): $" + result.baseCost.toFixed(2));
console.log("Pérdidas Base: " + result.baselineLossesKwh.toFixed(4) + " kWh/dia");
console.log("Costo Optimizado: $" + result.optimizedCost.toFixed(2));
console.log("Mejores Nodos: " + result.optimalNodes.join(", "));
console.log("Mejores Tamaños: " + result.optimalSizes.map(s => s.toFixed(2)).join(", "));
console.log("Tiempo de computo: " + result.computeTimeMs.toFixed(2) + " ms");
