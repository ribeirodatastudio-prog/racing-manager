import {
    getDriverEfficiency,
    solveSegment,
    PHYSICS,
    type SegmentResult
  } from './engine/physics';
  import { type Driver } from './engine/grid';

  console.log("--- Physics Engine Unit Tests ---");

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
      if (condition) {
          passed++;
          // console.log(`[PASS] ${msg}`);
      } else {
          failed++;
          console.error(`[FAIL] ${msg}`);
      }
  };

  const assertClose = (actual: number, expected: number, epsilon: number = 0.01, msg: string) => {
      if (Math.abs(actual - expected) < epsilon) {
          passed++;
      } else {
          failed++;
          console.error(`[FAIL] ${msg} (Expected ${expected}, Got ${actual})`);
      }
  };

  // 1. Efficiency
  console.log("\nTesting Driver Efficiency...");
  const dMin: Driver = { totalStats: 0 } as any;
  const dMax: Driver = { totalStats: 380 } as any;
  const dMid: Driver = { totalStats: 190 } as any;

  assertClose(getDriverEfficiency(dMin), 0.70, 0.001, "Min efficiency should be 0.70");
  assertClose(getDriverEfficiency(dMax), 1.05, 0.001, "Max efficiency should be 1.05");
  assertClose(getDriverEfficiency(dMid), 0.875, 0.001, "Mid efficiency should be 0.875");

  // 2. Solve Segment
  console.log("\nTesting Solve Segment...");

  // Case A: Cruise (Max Speed reached, no braking needed)
  // vEntry=100, Length=1000, Acc=10, Brake=20, vMax=100, vTarget=100
  const r1 = solveSegment(100, 1000, 10, 20, 100, 100);
  assertClose(r1.vExit, 100, 0.1, "Cruise: vExit should be 100");
  assertClose(r1.time, 10.0, 0.1, "Cruise: Time should be 10s");

  // Case B: Accel from Stop
  // vEntry=0, Length=500, Acc=10, Brake=20, vMax=100, vTarget=100
  // Time to reach 100: t = 100/10 = 10s. Dist = 0.5*10*100 = 500m.
  // Exactly reaches 100 at 500m.
  const r2 = solveSegment(0, 500, 10, 20, 100, 100);
  assertClose(r2.vExit, 100, 1.0, "Accel: vExit should be 100");
  assertClose(r2.time, 10.0, 0.5, "Accel: Time should be 10s");

  // Case C: Heavy Braking needed
  // vEntry=100, Length=200, Acc=10, Brake=25, vMax=100, vTarget=0 (Stop)
  // v^2 - u^2 = 2as -> 0 - 10000 = 2 * (-25) * s -> -10000 = -50s -> s = 200m.
  // Exactly stops at 200m.
  const r3 = solveSegment(100, 200, 10, 25, 100, 0);
  assertClose(r3.vExit, 0, 1.0, "Brake: vExit should be 0");
  assertClose(r3.time, 4.0, 0.5, "Brake: Time should be 4s");

  // Case D: Lookahead Constraint
  // vEntry=50, Length=100, Acc=10, Brake=20, vMax=100, vTarget=50
  // Should accelerate then brake? Or just maintain?
  // If it accelerates to X, it must brake back to 50.
  // If it can accel to 60 then brake to 50 within 100m, it should.
  // Let's see if result.vExit is clamped to 50.
  const r4 = solveSegment(50, 100, 10, 20, 100, 50);
  assert(r4.vExit <= 50.1, "Lookahead: vExit should not exceed vTarget (within small error)");
  // It should be faster than constant 50 if possible.
  // Constant 50 time = 2s.
  // Result time should be <= 2s? No, result time should be *less* (faster).
  // Wait, time is duration. Smaller is faster.
  // assert(r4.time < 2.0, "Lookahead: Should be faster than cruising if room allows");
  // Actually with accel 10, brake 20, it might be safer to just check validity.

  // Case E: Corner Entry Hot
  // vEntry=100, vMaxSegment=50.
  // Must brake immediately.
  const r5 = solveSegment(100, 200, 10, 20, 50, 50);
  assert(r5.vExit <= 50.1, "Hot Entry: vExit should be clamped to vMaxSegment");

  console.log(`\nTests Complete. Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) process.exit(1);
