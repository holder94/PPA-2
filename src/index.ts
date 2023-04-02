import * as parser from '@babel/parser';
import { getProgramText, traverseProgram } from './util';
import ScopeManager from './scope';

const programText = getProgramText('first.js');
const ast = parser.parse(programText);

for (const node of ast.program.body) {
  console.dir(node, { depth: 8 });
}

const scopeManager = new ScopeManager()
traverseProgram(ast.program, scopeManager)

const manager = new ScopeManager();
function testManager(manager: ScopeManager) {
  manager.declareVariable('a', 1);
  manager.enterScope();
  manager.declareVariable('b', 2);
  manager.enterScope();
  manager.declareVariable('c', 3);
  manager.declareVariable('d', 4);
  manager.enterScope();
  manager.declareVariable('e', 5);
  manager.assignVariable('d', 10);
}

testManager(manager);

console.log(manager.getVariableValue('a'))
console.log(manager.getVariableValue('c'))

console.dir(scopeManager.getState(), { depth: 3 })
