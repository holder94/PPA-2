import {
  BlockStatement,
  Expression,
  ForXStatement,
  Program,
  Statement,
  VariableDeclaration,
  variableDeclaration,
} from '@babel/types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ScopeManager from './scope';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getProgramText(fileName: string) {
  const filePath = path.resolve(__dirname, `programs/${fileName}`);
  return fs.readFileSync(filePath, 'utf-8').toString();
}

export function traverseProgram(program: Program, scopeManager: ScopeManager) {
  for (const statement of program.body) {
    traverseStatement(statement, scopeManager);
  }
}

const createTraverser = <T extends Statement = Statement>(
  fn: (statement: T, scopeManager: ScopeManager) => void
) => fn;

const traverseStatement = createTraverser((statement, scopeManager) => {
  switch (statement.type) {
    case 'FunctionDeclaration':
      return;
    case 'VariableDeclaration':
      return;
    case 'IfStatement':
      return;
    case 'BlockStatement':
      scopeManager.enterScope();
      traverseBlockStatement(statement, scopeManager);
      scopeManager.exitScope();
      return;
  }
});

const traverseBlockStatement = createTraverser<BlockStatement>(
  (statement, scopeManager) => {
    for (const node of statement.body) {
      traverseStatement(node, scopeManager);
    }
  }
);

const traverseVariableDeclaration = createTraverser<VariableDeclaration>(
  (stmt, scopeManager) => {
    for (const variableDeclarator of stmt.declarations) {
      if (variableDeclarator.init) {
      }
    }
  }
);

const checkExpression = <E extends Expression>(e: E) => {
  switch (e.type) {
    case 'NumericLiteral':
      break;
    case 'StringLiteral':
      break;
    case 'BooleanLiteral':
      break;
    case 'TemplateLiteral': // less priority
      break;
    case 'NullLiteral':
      break;
  }
};
