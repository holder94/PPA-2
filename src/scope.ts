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

// TODO добавить поиск переменных из родительских скоупов
class ScopeManager {
  data: ScopeData = emptyScope();

  getCurrentScopeData() {
    return this.data;
  }

  enterScope() {
    if (this.data.childScope === null) {
      this.data.childScope = emptyScope(this.data);
    }

    this.data = this.data.childScope;
  }

  setVariable(name: string, value: any) {
    this.data.variables[name] = value;
  }

  exitScope() {
    if (this.data.parentScope === null) {
      throw new Error('No avalable parent scope');
    }

    this.data = this.data.parentScope;
  }
}

export default ScopeManager;
