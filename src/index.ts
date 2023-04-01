
import * as parser from '@babel/parser';
import { getProgramText } from './util';
import ScopeManager, { ScopeData } from './scope';

const programText = getProgramText('first.js');
const parseResult = parser.parse(programText);

for (const node of parseResult.program.body) {
  console.dir(node, { depth: 6 });
}

const scopeManager = new ScopeManager();
function testManager(scopeData: ScopeData) {
  scopeData.variables['a'] = 1;
  const childScope = { variables: {}, childScope: null, parentScope: scopeData };
  scopeData.childScope = childScope;
  scopeData = childScope;
  scopeData.variables['b'] = 2;
  const childScope2 = { variables: {}, childScope: null, parentScope: scopeData };
  scopeData.childScope = childScope2;
  scopeData = childScope2;
  scopeData.variables['c'] = 3;
  scopeData = scopeData.parentScope as ScopeData;
  scopeData.variables['d'] = 4;
  const childScope3 = { variables: {}, childScope: null, parentScope: scopeData };
  scopeData.childScope = childScope3;
  scopeData = childScope3;
  scopeData.variables['e'] = 5;
  scopeData = scopeData.parentScope as ScopeData;
  scopeData = scopeData.parentScope as ScopeData;
}

testManager(scopeManager.getCurrentScopeData());

console.dir(scopeManager.getCurrentScopeData(), { depth: 6 });
