import { SourceLocation } from '@babel/types';
import cloneDeep from 'lodash/cloneDeep';

export type ScopeData = {
  variables: Record<string, {
    isUsed: boolean
    lineNumber?: number
  }>;
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

  declareVariable(name: string, location: SourceLocation | null | undefined) {
    this.data.variables[name] = {
      isUsed: false,
      lineNumber: location?.start.line
    }
  }

  assignVariable(name: string) {
    while (!this.data.variables.hasOwnProperty(name) && this.data.parentScope) {
      this.data = this.data.parentScope;
    }

    if (!this.data.variables.hasOwnProperty(name)) {
      const error = `Cannot assign to variable ${name} since it doesn't exist`;
      throw new Error(error);
    }

    this.data.variables[name].isUsed = true;

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
    this.data.childScope = emptyScope(this.data);

    this.data = this.data.childScope;
  }

  exitScope() {
    if (this.data.parentScope === null) {
      throw new Error('No available parent scope');
    }

    this.checkLastScope()

    this.data = this.data.parentScope;
    this.data.childScope = null;
  }

  getState() {
    let currentScope: ScopeData | null = this.data;
    const result = [] as any[];

    while (currentScope) {
      result.unshift(cloneDeep(currentScope.variables));
      currentScope = currentScope.parentScope;
    }

    return result;
  }

  setIsUsed(identifier: string) {
    let currentScope: ScopeData | null = this.data;
    while (currentScope) {
      if (currentScope.variables.hasOwnProperty(identifier)) {
        currentScope.variables[identifier].isUsed = true
        return;
      }
      currentScope = currentScope.parentScope;
    }

    const error = `Identifier "${identifier}" is not in the scope`;
    throw new Error(error);
  }

  checkLastScope() {
    Object.entries(this.data.variables).forEach(([identifier, {isUsed, lineNumber}]) => {
      if (!isUsed) {
        const info = (lineNumber ? `Line ${lineNumber}: ` : '') + `variable "${identifier}" is defined but is not used in any expression`
        console.log(info)
      }
    })
  }
}

export default ScopeManager;
