import {
  AssignmentExpression,
  BinaryExpression,
  BlockStatement,
  Expression,
  Program,
  Statement,
  VariableDeclaration,
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

type StatementTraverser<S extends Statement = Statement> = (
  stmt: S,
  scopeManager: ScopeManager
) => void;

const traverseStatement: StatementTraverser = (statement, scopeManager) => {
  switch (statement.type) {
    case 'FunctionDeclaration':
      return;
    case 'VariableDeclaration':
      traverseVariableDeclaration(statement, scopeManager)
    case 'IfStatement':
      return;
    case 'BlockStatement':
      scopeManager.enterScope();
      traverseBlockStatement(statement, scopeManager);
      scopeManager.exitScope();
      return;
    case 'ExpressionStatement':
      break;
  }
};

const traverseBlockStatement: StatementTraverser<BlockStatement> = (
  statement,
  scopeManager
) => {
  for (const node of statement.body) {
    traverseStatement(node, scopeManager);
  }
};

const traverseVariableDeclaration: StatementTraverser<VariableDeclaration> = (
  stmt,
  scopeManager
) => {
  for (const variableDeclarator of stmt.declarations) {
    if (variableDeclarator.id.type === 'Identifier') {
      const variableName = variableDeclarator.id.name;
      scopeManager.declareVariable(variableName, undefined);
      if (variableDeclarator.init) {
        scopeManager.assignVariable(
          variableName,
          getExpressionValue(variableDeclarator.init, scopeManager)
        );
      }
    }
  }
};

const getExpressionValue = (e: Expression, scopeManager: ScopeManager): unknown => {
  switch (e.type) {
    case 'NumericLiteral':
      return e.value;
    case 'StringLiteral':
      return e.value;
    case 'BooleanLiteral':
      return e.value;
    case 'TemplateLiteral': // less priority
      return undefined;
    case 'NullLiteral':
      return null;
    case 'BinaryExpression':
      return getBinaryExpressionValue(e, scopeManager)
    case 'AssignmentExpression':
      break;
    case 'Identifier':
      return scopeManager.getVariableValue(e.name)
    default:
      const error = `unknown expression type: ${e.type}`
      throw new Error(error)
  }
};

const getBinaryExpressionValue = (
  expr: BinaryExpression,
  scopeManager: ScopeManager
) => {
  if (expr.left.type === 'PrivateName') {
    throw new Error('Type of left operand in binary expression in "PrivateName"')
  }
  const leftOperandValue = getExpressionValue(expr.left, scopeManager)
  const rightOperandValue = getExpressionValue(expr.right, scopeManager)
  switch (expr.operator) {
    case '!=':
      return leftOperandValue != rightOperandValue
    case '%':
      break;
    case '+':
      break;
    case '-':
      break;
    case '*':
      break;
    case '/':
      break;
    case '==':
      break;
    case '>':
      break;
    case '>=':
      break;
    case '<':
      break;
    case '<=':
      break;
  }
};

enum AssignmentOperator {
  '=',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '**=',
  '<<=',
  '>>=',
  '>>>=',
  ',=',
  '^=',
  '&=',
  '||=',
  '&&=',
  '??=',
}

const handleAssignmentExpression = (
  expr: AssignmentExpression,
  scopeManager: ScopeManager
) => {
  switch (expr.operator) {
    case '=':
      break;
    case '+=':
      break;
    case '-=':
      break;
    case '*=':
      break;
    case '%=':
      break;
    case '/=':
      break;
  }
};
