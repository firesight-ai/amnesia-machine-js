// version 0.1.4

class HAMError extends Error {
    constructor(message) {
        super(message);
        this.name = "HAMError";
    }
}

function validateType(value, type) {
    if (typeof value !== type) {
        throw new HAMError(`Expected ${type}, got ${typeof value}`);
    }
}

function validateVectorClock(value) {
    if (!(value instanceof VectorClock)) {
        throw new HAMError(`Expected VectorClock, got ${typeof value}`);
    }
}

class VectorClock {
    constructor(clock = {}) {
        this.clock = new Map(Object.entries(clock));
    }

    increment(nodeId) {
        const currentValue = this.clock.get(nodeId) || 0;
        this.clock.set(nodeId, currentValue + 1);
    }

    merge(otherClock) {
        for (const [nodeId, timestamp] of otherClock.clock) {
            if (!this.clock.has(nodeId) || this.clock.get(nodeId) < timestamp) {
                this.clock.set(nodeId, timestamp);
            }
        }
    }

    compare(otherClock) {
        let isGreater = false;
        let isLess = false;

        const allNodeIds = new Set([...this.clock.keys(), ...otherClock.clock.keys()]);

        for (const nodeId of allNodeIds) {
            const thisTime = this.clock.get(nodeId) || 0;
            const otherTime = otherClock.clock.get(nodeId) || 0;

            if (thisTime > otherTime) isGreater = true;
            if (thisTime < otherTime) isLess = true;
        }

        if (isGreater && !isLess) return 1;  // this happens-after other
        if (isLess && !isGreater) return -1; // this happens-before other
        if (!isLess && !isGreater) return 0; // equal
        return null; // concurrent
    }

    toString() {
        return JSON.stringify(Object.fromEntries(this.clock));
    }

    static gunStateToVectorClock(gunState) {
        const vectorClock = new VectorClock();
        for (const [nodeId, timestamp] of Object.entries(gunState)) {
            vectorClock.clock.set(nodeId, timestamp);
        }
        return vectorClock;
    }

    static vectorClockToGunState(vectorClock) {
        return Object.fromEntries(vectorClock.clock);
    }
}

class State {
    static is(node, key) {
        validateType(node, 'object');
        validateType(key, 'string');
        return node && node._ && node._['>'] && node._['>'][key] instanceof VectorClock;
    }

    static ify(node, key, state, val, soul) {
        validateType(node, 'object');
        validateType(key, 'string');
        validateVectorClock(state);
        if(!node || !node._){ throw new HAMError('Invalid node structure') }
        const states = node._['>'] = node._['>'] || {};
        if(!states[key] || state.compare(states[key]) === 1){
            states[key] = state;
            if(val !== undefined){
                node[key] = val;
                if(soul){ node._['#'] = soul }
            }
        }
        return node;
    }

    static getState(node, key) {
        validateType(node, 'object');
        validateType(key, 'string');
        return (node && node._ && node._['>'] && node._['>'][key]) || new VectorClock();
    }
}

class Dup {
    constructor(options = {}) {
        this.s = new Map();
        this.ttl = options.ttl || 300000; // 5 minutes default
    }

    track(id) {
        validateType(id, 'string');
        if(!id){ return }
        if(!this.s.has(id)){
            this.s.set(id, { ts: Date.now(), clock: new VectorClock() });
        }
        return this.s.get(id);
    }

    check(id) {
        validateType(id, 'string');
        if(!id){ return }
        return this.s.get(id);
    }

    free() {
        const now = Date.now();
        for(const [id, data] of this.s){
            if(data.ts && (now - data.ts) > this.ttl){
                this.s.delete(id);
            }
        }
    }
}

class HAM {
    constructor(nodeId) {
        this.nodeId = nodeId;
        this.debugMode = false;
    }

    ham(machineState, incomingState, currentState, incomingValue, currentValue) {
        validateVectorClock(machineState);
        validateVectorClock(incomingState);
        validateVectorClock(currentState);

        const comparison = incomingState.compare(currentState);

        if(machineState.compare(incomingState) === 1){
            return {defer: true};
        }
        if(comparison === -1){
            return {historical: true};
        }
        if(comparison === 1){
            return {converge: true, incoming: true};
        }
        if(comparison === 0){
            incomingValue = this.unwrap(incomingValue);
            currentValue = this.unwrap(currentValue);
            if(incomingValue === currentValue){
                return {state: true};
            }
            if(String(incomingValue) < String(currentValue)){
                return {converge: true, current: true};
            }
            if(String(currentValue) < String(incomingValue)){
                return {converge: true, incoming: true};
            }
        }
        return {err: new HAMError("Concurrent updates detected: "+ incomingValue +" and "+ currentValue)};
    }

    unwrap(val) {
        if(val && val['#'] && val['.'] && val['>']){
            return val[':'];
        }
        return val;
    }

    union(vertex, node) {
        validateType(vertex, 'object');
        validateType(node, 'object');

        if (!vertex) return node;
        if (!node) return vertex;

        const machineState = this.machineState();

        // Handle Gun's metadata
        if (node._ && node._['#']) {
            vertex._ = vertex._ || {};
            vertex._['#'] = node._['#'];
        }

        for (let key in node) {
            if (key === '_') continue;

            const incomingState = State.getState(node, key);
            const currentState = State.getState(vertex, key);
            const incomingValue = node[key];
            const currentValue = vertex[key];

            const result = this.ham(machineState, incomingState, currentState, incomingValue, currentValue);

            if (result.err) {
                this.log('error', result.err.message);
                continue;
            }

            if (result.state || result.historical || result.current) continue;

            if (result.defer || result.incoming) {
                State.ify(vertex, key, incomingState, incomingValue);
            }
        }

        return vertex;
    }

    machineState() {
        const state = new VectorClock();
        state.increment(this.nodeId);
        return state;
    }

    graph(graph, soul, key, val, state) {
        validateType(graph, 'object');
        validateType(soul, 'string');
        validateType(key, 'string');
        validateVectorClock(state);
        graph[soul] = State.ify(graph[soul], key, state, val, soul);
        return graph;
    }

    graphOperation(graph, soul, key, val, state) {
        validateType(graph, 'object');
        validateType(soul, 'string');
        validateType(key, 'string');
        validateVectorClock(state);

        if (!graph[soul]) {
            graph[soul] = { _: { '#': soul, '>': {} } };
        }

        return this.graph(graph, soul, key, val, state);
    }

    log(level, message) {
        if (this.debugMode) {
            console.log(`[HAM ${level.toUpperCase()}] ${message}`);
        }
    }

    setDebugMode(mode) {
        this.debugMode = mode;
    }

    mergeGraphs(localGraph, incomingGraph) {
        validateType(localGraph, 'object');
        validateType(incomingGraph, 'object');

        const mergedGraph = { ...localGraph };

        for (const soul in incomingGraph) {
            if (soul === '_') continue;

            if (!mergedGraph[soul]) {
                mergedGraph[soul] = incomingGraph[soul];
            } else {
                mergedGraph[soul] = this.union(mergedGraph[soul], incomingGraph[soul]);
            }
        }

        return mergedGraph;
    }
}

module.exports = {
    VectorClock,
    State,
    Dup,
    HAM
};
