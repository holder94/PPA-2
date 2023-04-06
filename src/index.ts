import * as parser from '@babel/parser';
import { getProgramText, traverseProgram } from './util';
import ScopeManager from './scope';

const programFileName = process.argv[2] || '1.js'
const programText = getProgramText(programFileName);
const ast = parser.parse(programText, {
  createParenthesizedExpressions: true,
});

// for (const node of ast.program.body) {
//   console.dir(node, { depth: 8 });
// }

const scopeManager = new ScopeManager();

traverseProgram(ast.program, scopeManager);

scopeManager.printInfo()
