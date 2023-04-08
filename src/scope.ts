import { SourceLocation, identifier } from '@babel/types';
import cloneDeep from 'lodash/cloneDeep';

type Location = SourceLocation | null | undefined;

export type VariableData = {
  isUsed: boolean;
  isRedefinedInFlow: boolean
  location: Location;
};

export type ScopeData = {
  variables: Record<string, VariableData>;
  childScope: ScopeData | null;
  parentScope: ScopeData | null;
};

type LogData = {
  identifier: string;
  assignmentLoc: Location;
  deadLoc: Location;
};

const emptyScope = (parentScope?: ScopeData) => ({
  variables: {},
  childScope: null,
  parentScope: parentScope || null,
});

class ScopeManager {
  data: ScopeData = emptyScope();
  result: Array<{ identifier: string; lineNumber?: number }> = [];
  logs: LogData[] = [];

  declareVariable(name: string, location: Location) {
    this.data.variables[name] = {
      isUsed: false,
      isRedefinedInFlow: false,
      location,
    };
  }

  getVariableData(identifier: string) {
    let currentScope: ScopeData | null = this.data;
    let result: VariableData | null = null;

    while (currentScope) {
      if (currentScope.variables.hasOwnProperty(identifier)) {
        result = currentScope.variables[identifier];
        break;
      }

      currentScope = currentScope.parentScope;
    }

    if (result === null) {
      const error = `variable "${identifier}" is not in the scope`;
      throw new Error(error);
    }

    return { ...result };
  }

  enterScope() {
    this.data.childScope = emptyScope(this.data);

    this.data = this.data.childScope;
  }

  exitScope(location: Location) {
    if (this.data.parentScope === null) {
      throw new Error('No available parent scope');
    }

    Object.keys(this.data.variables).forEach(identifier => this.checkVariable(identifier, location))

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

  /**
   * @deprecated
   */
  updateVariable(identifier: string, location: Location) {
    const currentScope: ScopeData | null = this.data;
    const variableData = {
      isUsed: false,
      location,
    };

    while (currentScope) {
      if (currentScope.variables.hasOwnProperty(identifier)) {
        // currentScope.variables[identifier] = variableData;
        return;
      }
    }

    // this.data.variables[identifier] = variableData;
  }

  checkVariable(identifier: string, location: Location) {
    const varData = this.getVariableData(identifier);
    if (!varData.isUsed) {
      this.logs.push({
        identifier,
        assignmentLoc: varData.location,
        deadLoc: location,
      });
    }
  }

  setVariableData(identifier: string, data: VariableData) {
    let currentScope: ScopeData | null = this.data;
    while (currentScope) {
      if (currentScope.variables.hasOwnProperty(identifier)) {
        currentScope.variables[identifier] = { ...data };
        return;
      }

      currentScope = currentScope.parentScope;
    }

    const error = `Can not set variable "${identifier}"`;
    throw new Error(error);
  }

  getSnapshot() {
    return cloneDeep(this.data)
  }

  applySnaphot(data: ScopeData) {
    this.data = data
  }

  

  printLog() {
    this.logs
      .map((log) => ({
        identifier: log.identifier,
        assignmentLine: log.assignmentLoc?.start.line,
        deadLine: log.deadLoc?.end.line,
      }))
      .sort(
        (a, b) =>
          (a.assignmentLine || Infinity) - (b.assignmentLine || Infinity)
      )
      .forEach((log) => {
        const { identifier, assignmentLine, deadLine } = log;
        const assignmentInfo = assignmentLine
          ? `is defined at line ${assignmentLine}`
          : 'is defined';
        const deadInfo = deadLine
          ? `but dead at line ${deadLine}`
          : 'but dead';

        const info = `variable "${identifier}" ${assignmentInfo} ${deadInfo}`;
        console.log(info);
      });
  }
}

function isNotNull<T>(arg: T): arg is Exclude<T, null> {
  return arg !== null;
}

export default ScopeManager;
