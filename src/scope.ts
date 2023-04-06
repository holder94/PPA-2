import { SourceLocation } from '@babel/types';
import cloneDeep from 'lodash/cloneDeep';

export type ScopeData = {
  variables: Record<
    string,
    {
      isUsed: boolean;
      lineNumber?: number;
    }
  >;
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
  result: Array<{ identifier: string; lineNumber?: number }> = [];

  declareVariable(name: string, location: SourceLocation | null | undefined) {
    this.data.variables[name] = {
      isUsed: false,
      lineNumber: location?.start.line,
    };
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

    this.checkLastScope();

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

  setIsUsed(identifier: string, usedValue = true) {
    let currentScope: ScopeData | null = this.data;
    while (currentScope) {
      if (currentScope.variables.hasOwnProperty(identifier)) {
        currentScope.variables[identifier].isUsed = usedValue;
        return;
      }
      currentScope = currentScope.parentScope;
    }

    const error = `Identifier "${identifier}" is not in the scope`;
    throw new Error(error);
  }

  checkLastScope() {
    Object.entries(this.data.variables)
      .map(([identifier, { isUsed, lineNumber }]) =>
        !isUsed ? { identifier, lineNumber } : null
      )
      .filter(isNotNull)
      .forEach((data) => this.result.push({ ...data }));
  }

  printInfo() {
    this.result
      .sort((a, b) => (a.lineNumber || Infinity) - (b.lineNumber || Infinity))
      .forEach(({ identifier, lineNumber }) => {
        const info =
          (lineNumber ? `Line ${lineNumber}: ` : '') +
          `variable "${identifier}" has a value but is not used in any expression`;
        console.log(info);
      });
  }
}

function isNotNull<T>(arg: T): arg is Exclude<T, null> {
  return arg !== null
}

export default ScopeManager;
