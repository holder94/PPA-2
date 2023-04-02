import {
  AssignmentExpression,
  BinaryExpression,
  BlockStatement,
  Expression,
  IfStatement,
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
      scopeManager.enterScope();
      traverseBlockStatement(statement.body, scopeManager);
      // scopeManager.exitScope();
      break;
    case 'VariableDeclaration':
      traverseVariableDeclaration(statement, scopeManager);
      break;
    case 'IfStatement':
      return;
    case 'BlockStatement':
      scopeManager.enterScope();
      traverseBlockStatement(statement, scopeManager);
      // scopeManager.exitScope();
      break;
    case 'ExpressionStatement':
      getExpressionValue(statement.expression, scopeManager);
      break;
    default:
      const error = `Unknown statement type: ${statement.type}`;
      throw new Error(error);
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
    if (variableDeclarator.id.type !== 'Identifier') {
      throw new Error('Non-Identifier found in variable declarator');
    }

    const variableName = variableDeclarator.id.name;
    scopeManager.declareVariable(variableName, undefined);
    if (variableDeclarator.init) {
      scopeManager.assignVariable(
        variableName,
        getExpressionValue(variableDeclarator.init, scopeManager)
      );
    }
  }
};

const traverseIfStatement: StatementTraverser<IfStatement> = (
  stmt,
  scopeManager
) => {
  
};

const getExpressionValue = (e: Expression, scopeManager: ScopeManager): any => {
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
      return getBinaryExpressionValue(e, scopeManager);
    case 'AssignmentExpression':
      return handleAssignmentExpression(e, scopeManager);
    case 'Identifier':
      return scopeManager.getVariableValue(e.name);
    default:
      const error = `unknown expression type: ${e.type}`;
      throw new Error(error);
  }
};

const getBinaryExpressionValue = (
  expr: BinaryExpression,
  scopeManager: ScopeManager
) => {
  if (expr.left.type === 'PrivateName') {
    throw new Error(
      'Type of left operand in binary expression in "PrivateName"'
    );
  }
  const leftOperandValue = getExpressionValue(expr.left, scopeManager);
  const rightOperandValue = getExpressionValue(expr.right, scopeManager);
  switch (expr.operator) {
    case '!=':
      return leftOperandValue != rightOperandValue;
    case '%':
      return leftOperandValue % rightOperandValue;
    case '+':
      return leftOperandValue + rightOperandValue;
    case '-':
      return leftOperandValue - rightOperandValue;
    case '*':
      return leftOperandValue * rightOperandValue;
    case '/':
      return leftOperandValue / rightOperandValue;
    case '==':
      return leftOperandValue == rightOperandValue;
    case '>':
      return leftOperandValue > rightOperandValue;
    case '>=':
      return leftOperandValue >= rightOperandValue;
    case '<':
      return leftOperandValue < rightOperandValue;
    case '<=':
      return leftOperandValue <= rightOperandValue;
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
  if (expr.left.type !== 'Identifier') {
    const error = `unknown type in assignmet expression: ${expr.left.type}`;
    throw new Error(error);
  }

  const leftOperandValue = getExpressionValue(expr.left, scopeManager);
  const rightOperandValue = getExpressionValue(expr.right, scopeManager);
  switch (expr.operator) {
    case '=':
      scopeManager.assignVariable(expr.left.name, rightOperandValue);
      return rightOperandValue;
    case '+=':
      const result = leftOperandValue + rightOperandValue;
      scopeManager.assignVariable(expr.left.name, result);
      return result;
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
