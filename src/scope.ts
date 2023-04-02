import ControlFlow from './controlFlow';
import cloneDeep from 'lodash/cloneDeep';

export type ScopeData = {
  variables: Record<string, unknown>;
  childScope: ScopeData | null;
  parentScope: ScopeData | null;
};

const emptyScope = (parentScope?: ScopeData) => ({
  variables: {},
  childScope: null,
  parentScope: parentScope || null,
});

class ScopeManager {
  data: ScopeData = emptyScope();

  declareVariable(name: string, value: any) {
    this.data.variables[name] = value;
  }

  assignVariable(name: string, value: any) {
    while (!this.data.variables.hasOwnProperty(name) && this.data.parentScope) {
      this.data = this.data.parentScope;
    }

    if (!this.data.variables.hasOwnProperty(name)) {
      const error = `Cannot assign to variable ${name} since it doesn't exist`;
      throw new Error(error);
    }

    this.data.variables[name] = value;

    while (this.data.childScope) this.data = this.data.childScope;
  }

  getVariableValue(variableName: string) {
    while (!this.data.variables.hasOwnProperty(variableName)) {
      if (this.data.parentScope === null) {
        const error = `no variable with name "${variableName}" was found`;
        throw new Error(error);
      }

      this.data = this.data.parentScope;
    }

    const result = this.data.variables[variableName];
    while (this.data.childScope) this.data = this.data.childScope;

    return result;
  }

  enterScope() {
    if (this.data.childScope === null) {
      this.data.childScope = emptyScope(this.data);
    }

    this.data = this.data.childScope;
  }

  exitScope() {
    if (this.data.parentScope === null) {
      throw new Error('No available parent scope');
    }

    this.data = this.data.parentScope;
    this.data.childScope = null;
  }

  getState() {
    let currentScope: ScopeData | null = this.data;
    const result = [] as any[];

    while (currentScope) {
      result.unshift({ ...currentScope.variables });
      currentScope = currentScope.parentScope;
    }

    return result;
  }

  /**
   * 
   * @returns копия всего скопа с указателем на последний
   */
  getSnaphot() {
    return cloneDeep(this.data);
  }

  /**
   * 
   * @param newScope - новый скоуп с указателем на последний
   */
  applySnapshot(newScope: ScopeData) {
    this.data = newScope;
  }
}

export default ScopeManager;
