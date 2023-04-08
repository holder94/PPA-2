import { AST, getControlPoints } from '.';
import ScopeManager from './scope';
import { traverseProgram } from './util';
import cloneDeep from 'lodash/cloneDeep';

type Bit = 1 | 0;
type Flow = Bit[];

export class FlowManager {
  controlIdx = 0;
  flow: Flow;

  constructor(flow: Flow) {
    this.flow = flow;
  }

  getFlowDecision() {
    if (this.controlIdx === this.flow.length) {
      throw new Error('control index reached its maximum value');
    }

    return this.flow[this.controlIdx++];
  }
}

export class ControlFlow {
  private flows: Flow[];
  private ast: AST;

  constructor(ast: AST) {
    this.ast = cloneDeep(ast);
    const controlPoints = getControlPoints(ast);
    this.flows = getFlows(controlPoints);

    console.log('flows:', this.flows);

  }

  private executeFlow(flow: Flow) {
    console.log(`executing flow ${flow}`);

    const flowManager = new FlowManager(flow);
    const scopeManager = new ScopeManager();
    traverseProgram(this.ast.program, scopeManager, flowManager);

    scopeManager.printLog();
  }

  executeFlows() {
    this.flows.forEach(this.executeFlow.bind(this));
  }
}

// const controlFlow = new ControlFlow(ast)

// controlFlow.executeFlows()

function getFlows(n: number): Flow[] {
  const result = [] as Flow[];

  function getCombinations(n: number, state: Bit[] = []) {
    if (n == 0) {
      result.push(state);
      return;
    }
    getCombinations(n - 1, [...state, 0]);
    getCombinations(n - 1, [...state, 1]);
  }

  getCombinations(n);
  return result;
}
