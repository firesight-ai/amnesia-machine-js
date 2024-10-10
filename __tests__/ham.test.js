const { VectorClock, State, Dup, HAM } = require('../src/ham');

describe('VectorClock', () => {
  test('should increment correctly', () => {
    const vc = new VectorClock();
    vc.increment('node1');
    expect(vc.clock.get('node1')).toBe(1);
  });
});

describe('HAM', () => {
  test('should initialize with a nodeId', () => {
    const ham = new HAM('node1');
    expect(ham.nodeId).toBe('node1');
  });
});

// Add more tests for other classes and methods
