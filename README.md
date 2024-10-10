# amnesia-machine 0.1.4

A robust implementation of the Hypothetical Amnesia Machine (HAM) algorithm with Vector Clocks for advanced conflict resolution in distributed systems.

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Installation](#installation)
4. [Usage](#usage)
5. [API Reference](#api-reference)
6. [Compatibility with Gun](#compatibility-with-gun)
7. [Advanced Concepts](#advanced-concepts)
8. [Contributing](#contributing)
9. [License](#license)

## Introduction

amnesia-machine is an advanced implementation of the Hypothetical Amnesia Machine (HAM) algorithm, designed to provide robust conflict resolution for distributed systems. It extends the original HAM concept by incorporating Vector Clocks, offering more precise handling of concurrent updates in a distributed environment.

This library is particularly useful for developers working with decentralized applications, peer-to-peer systems, or any scenario where data consistency across distributed nodes is crucial.

## Features

- Vector Clock-based conflict resolution
- Compatibility with Gun's data structures
- Deduplication mechanism
- Graph operations for distributed data
- Custom error handling
- Debug mode for easier troubleshooting
- Conversion utilities between Gun's state format and Vector Clocks

## Installation

```bash
npm install amnesia-machine
```

## Usage

Here's a basic example of how to use amnesia-machine:

```javascript
const { HAM, VectorClock } = require('amnesia-machine/src');

// Initialize HAM with a unique node ID
const ham = new HAM('node1');

// Create some vector clocks
const machineState = new VectorClock({ node1: 1 });
const incomingState = new VectorClock({ node2: 1 });
const currentState = new VectorClock({ node1: 1 });

// Resolve a conflict
const result = ham.ham(machineState, incomingState, currentState, 'incoming value', 'current value');

console.log(result);
```

## API Reference

### HAM Class

#### `constructor(nodeId)`
- Initializes a new HAM instance with the given node ID.

#### `ham(machineState, incomingState, currentState, incomingValue, currentValue)`
- Resolves conflicts based on the HAM algorithm and Vector Clock comparisons.

#### `union(vertex, node)`
- Merges two nodes, resolving conflicts using the HAM algorithm.

#### `graph(graph, soul, key, val, state)`
- Performs a graph operation, updating the given key-value pair with the provided state.

#### `setDebugMode(mode)`
- Enables or disables debug mode for detailed logging.

### VectorClock Class

#### `constructor(clock = {})`
- Creates a new Vector Clock instance.

#### `increment(nodeId)`
- Increments the clock for the specified node.

#### `merge(otherClock)`
- Merges this clock with another Vector Clock.

#### `compare(otherClock)`
- Compares this clock with another Vector Clock.

## Compatibility with Gun

amnesia-machine is designed to be compatible with Gun's data structures and can serve as a drop-in replacement or enhancement for Gun's existing HAM implementation. It provides methods to convert between Gun's state format and Vector Clocks:

```javascript
const gunState = { node1: 1, node2: 2 };
const vectorClock = VectorClock.gunStateToVectorClock(gunState);

const backToGunState = VectorClock.vectorClockToGunState(vectorClock);
```

## Advanced Concepts

### Vector Clocks

Vector Clocks are used instead of simple timestamps to provide a partial ordering of events in a distributed system. They allow for more accurate detection and resolution of concurrent updates.

### Conflict Resolution Strategy

The conflict resolution strategy in amnesia-machine is based on the following principles:

1. If the incoming update is from the future (compared to the machine state), it's deferred.
2. If the incoming update is from the past (compared to the current state), it's considered historical.
3. If the incoming update is concurrent with the current state, the lexicographically greater value is chosen.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Attribution

The Hypothetical Amnesia Machine is an invention of Mark Nadal. It was originally created to facilitate conflict resolution in [gundb](https://github.com/amark/gun)

## License

This project is licensed under the Apache-2.0 License.
