export type Flow = {
  variables: Record<string, any[]>;
  childFlow: Flow | null;
  parentFlow: Flow | null;
};

const newFlow = (parentFlow: Flow | null = null) => ({
  variables: {},
  childFlow: null,
  parentFlow,
});

class ControlFlow {
  flow: Flow = newFlow();

  /**
   * @deprecated - use extendFlowState
   */
  addNewFlowState(identifier: string, value: any) {
    if (this.flow.variables.hasOwnProperty(identifier)) {
      const error = `Current flow already has dat for identifier "${identifier}". Use "extendFlowState" instead`;
      throw new Error(error);
    }
    this.flow.variables[identifier] = [value];
  }

  rewriteFlowState(identifier: string, value: any) {
    while (
      !this.flow.variables.hasOwnProperty(identifier) &&
      this.flow.parentFlow
    ) {
      this.flow = this.flow.parentFlow;
    }

    if (!this.flow.variables.hasOwnProperty(identifier)) {
      const error = `Identifier "${identifier}" doesn't present in flow`;
      throw new Error(error);
    }

    this.flow.variables[identifier] = [value];
  }

  extendFlowState(identifier: string, value: any) {
    while (
      !this.flow.variables.hasOwnProperty(identifier) &&
      this.flow.parentFlow
    ) {
      this.flow = this.flow.parentFlow;
    }

    if (!this.flow.variables.hasOwnProperty(identifier)) {
      while (this.flow.childFlow) {
        this.flow = this.flow.childFlow;
      }

      this.flow.variables[identifier] = [value];
      return
    }

    this.flow.variables[identifier].push(value);

    while (this.flow.childFlow) {
      this.flow = this.flow.childFlow;
    }
  }

  checkLastFlow() {
    Object.entries(this.flow.variables).forEach(([key, value]) => {
      if (value.length === 0) {
        const error = `Found empty array of values for identifier "${key}"`;
        throw new Error(error);
      }

      const alwaysSameValue = value.every((val) => val === value[0]);
      if (alwaysSameValue) {
        console.log(`identifier ${key} always has the same value: ${value[0]}`);
      }
    });
  }

  createNewFlow() {
    this.flow.childFlow = newFlow(this.flow);
    this.flow = this.flow.childFlow;
  }

  exitFlow() {
    if (this.flow.parentFlow === null) {
      throw new Error('No parent flow found');
    }

    this.flow = this.flow.parentFlow;
    this.flow.childFlow = null;
  }

  getState() {
    let currentFlow: Flow | null = this.flow;
    const result: any[] = [];
    while (currentFlow) {
      result.unshift({ ...currentFlow.variables });
      currentFlow = currentFlow.parentFlow;
    }

    return result;
  }
}

export default ControlFlow;
