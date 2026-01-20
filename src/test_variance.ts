import { simulateLap } from './engine/race';
import { generateTrack } from './engine/track';
import { formatTime } from './engine/mathUtils';
import { type Driver } from './engine/grid';

// Mock Drivers
const createDriver = (consistency: number): Driver => ({
    id: `driver-${consistency}`,
    name: `Driver Cons-${consistency}`,
    teamId: 'test-team',
    stats: {
        Cornering: 50,
        Overtaking: 50,
        Braking: 50,
        Instincts: 50,
        Acceleration: 50,
        Consistency: consistency,
        Pace: 50
    },
    totalStats: 450 + consistency,
    championshipPoints: 0
});

const driverLow = createDriver(1);
const driverMax = createDriver(100);

const track = generateTrack();
console.log(`Track: ${track.name} (${track.laps} laps)`);

const runTest = (driver: Driver, iterations: number = 1000) => {
    console.log(`\nTesting ${driver.name} for ${iterations} laps...`);
    let times: number[] = [];
    let baseTime = 0;

    for (let i = 0; i < iterations; i++) {
        // We pass 0 for qualyTime and null for conditions as we only test variance
        const result = simulateLap(driver, track, 0, null);
        times.push(result.lapTime);
        if (i === 0) baseTime = result.analysis.baseTime;
    }

    const min = Math.min(...times);
    const max = Math.max(...times);
    const avg = times.reduce((a, b) => a + b, 0) / iterations;
    const varianceRange = max - min;
    const variancePercent = (varianceRange / baseTime) * 100;
    // Observed swing is roughly Range / 2 (since it's +/-)
    const halfWindow = variancePercent / 2;

    console.log(`Base Time: ${formatTime(baseTime)}`);
    console.log(`Min Time:  ${formatTime(min)}`);
    console.log(`Max Time:  ${formatTime(max)}`);
    console.log(`Avg Time:  ${formatTime(avg)}`);
    console.log(`Range:     ${varianceRange.toFixed(3)}s`);
    console.log(`Observed Swing: ~±${halfWindow.toFixed(2)}%`);
};

runTest(driverLow);
runTest(driverMax);
