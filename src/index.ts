import * as parser from '@babel/parser';
import { getProgramText } from './util';
import ScopeManager from './scope';

const programText = getProgramText('first.js');
const parseResult = parser.parse(programText);

for (const node of parseResult.program.body) {
  console.dir(node, { depth: 6 });
}

const scopeManager = new ScopeManager();
function testManager(manager: ScopeManager) {
  manager.setVariable('a', 1);
  manager.enterScope();
  manager.setVariable('b', 2);
  manager.enterScope();
  manager.setVariable('c', 3);
  manager.exitScope();
  manager.setVariable('d', 4);
  manager.enterScope();
  manager.setVariable('e', 5);
  manager.exitScope();
  manager.exitScope();
}

testManager(scopeManager);

console.dir(scopeManager.data, { depth: 6 });
