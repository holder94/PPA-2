import * as parser from '@babel/parser';
import { getProgramText, traverseProgram } from './util';
import ScopeManager from './scope';
import _traverse, { Node } from '@babel/traverse'
import { ControlFlow } from './controlFlow';
import cloneDeep from 'lodash/cloneDeep';

type Traverse = typeof _traverse

// @ts-ignore
const traverse: Traverse = _traverse.default

export function getControlPoints(ast: Node): number {
  let count = 0
  traverse(ast, {
    IfStatement(a, b) {
      count++
    },
    WhileStatement(a, b) {
      count++
    },
    ForStatement(a, b) {
      count++
    }
  })
  return count
}


const programFileName = process.argv[2] || '1.js'
const programText = getProgramText(programFileName);
const ast = parser.parse(programText, {
  createParenthesizedExpressions: true,
});

// console.log(ast)

export type AST = typeof ast

const controlFlow = new ControlFlow(cloneDeep(ast))

controlFlow.executeFlows()



// for (const node of ast.program.body) {
//   console.dir(node, { depth: 8 });
// }


// const scopeManager = new ScopeManager();

// traverseProgram(ast.program, scopeManager);

// scopeManager.printLog()
