import {
  ArrayExpression,
  ArrowFunctionExpression,
  AssignmentExpression,
  BinaryExpression,
  BlockStatement,
  CallExpression,
  ConditionalExpression,
  Expression,
  ForStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  IfStatement,
  LogicalExpression,
  Pattern,
  Program,
  RestElement,
  ReturnStatement,
  SequenceExpression,
  Statement,
  UpdateExpression,
  VariableDeclaration,
  WhileStatement,
  isArrayPattern,
  isAssignmentPattern,
  isExpression,
  isIdentifier,
  isObjectPattern,
  isRestElement,
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
      traverseFunctionDeclaration(statement, scopeManager);
      scopeManager.exitScope();
      break;
    case 'VariableDeclaration':
      traverseVariableDeclaration(statement, scopeManager);
      break;
    case 'IfStatement':
      return;
    case 'BlockStatement':
      scopeManager.enterScope();
      traverseBlockStatement(statement, scopeManager);
      scopeManager.exitScope();
      break;
    case 'ExpressionStatement':
      getExpressionValue(statement.expression, scopeManager);
      break;
    case 'ReturnStatement':
      traverseReturnStatement(statement, scopeManager);
      break;
    case 'ForStatement':
      scopeManager.enterScope();
      traverseForStatement(statement, scopeManager);
      scopeManager.exitScope();
      break;
    default:
      const error = `Unknown statement type: ${statement.type}`;
      throw new Error(error);
  }
};

const traverseFunctionDeclaration: StatementTraverser<FunctionDeclaration> = (
  stmt,
  scopeManager
) => {
  traverseBlockStatement(stmt.body, scopeManager);
  stmt.params.forEach((param) => traverseFunctionParam(param, scopeManager));
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

    const variableValue = scopeManager.getVariableValue(variableName);

    console.log(scopeManager.getState());
  }
};

const traverseFunctionParam = (
  param: Identifier | Pattern | RestElement,
  scopeManager: ScopeManager
) => {
  if (isIdentifier(param)) {
    scopeManager.declareVariable(param.name, undefined);
  } else if (isAssignmentPattern(param)) {
    if (
      isArrayPattern(param.left) ||
      isObjectPattern(param.left) ||
      isIdentifier(param.left)
    ) {
      traverseFunctionParam(param.left, scopeManager);
    } else {
      const error = `unknown function param type "${param.type}"`;
      throw new Error(error);
    }
  } else if (isRestElement(param)) {
    if (
      isArrayPattern(param.argument) ||
      isObjectPattern(param.argument) ||
      isIdentifier(param.argument)
    ) {
      traverseFunctionParam(param.argument, scopeManager);
    } else {
      const error = `unknown function param type "${param.type}"`;
      throw new Error(error);
    }
  }
};

const traverseReturnStatement: StatementTraverser<ReturnStatement> = (
  stmt,
  scopeManager
) => {
  if (stmt.argument) {
    getExpressionValue(stmt.argument, scopeManager);
  }
};

const traverseIfStatement: StatementTraverser<IfStatement> = (
  stmt,
  scopeManager
) => {
  const testResult = Boolean(getExpressionValue(stmt.test, scopeManager)); // тут начинается control flow
  const beforeConsequentState = scopeManager.getSnaphot();

  traverseStatement(stmt.consequent, scopeManager);

  if (stmt.alternate) {
    traverseStatement(stmt.alternate, scopeManager);
  }
};

const traverseForStatement: StatementTraverser<ForStatement> = (
  stmt,
  scopeManager
) => {
  if (stmt.init?.type === 'VariableDeclaration') {
    traverseVariableDeclaration(stmt.init, scopeManager);
    const variableName = stmt.init;
  } else if (stmt.init) {
    const initValue = getExpressionValue(stmt.init, scopeManager);
  }
  let testResult = stmt.test
    ? getExpressionValue(stmt.test, scopeManager)
    : null;
  let updateResult = stmt.update
    ? getExpressionValue(stmt.update, scopeManager)
    : null;

  traverseStatement(stmt.body, scopeManager);
};

const traverseWhileStatement: StatementTraverser<WhileStatement> = (
  stmt,
  scopeManager
) => {
  const testResult = getExpressionValue(stmt.test, scopeManager);
  traverseStatement(stmt.body, scopeManager);
};

const getExpressionValue = (e: Expression, scopeManager: ScopeManager): any => {
  switch (e.type) {
    case 'NumericLiteral':
      return e.value;
    case 'StringLiteral':
      return e.value;
    case 'BooleanLiteral':
      return e.value;
    case 'NullLiteral':
      return null;
    case 'BinaryExpression':
      return getBinaryExpressionValue(e, scopeManager);
    case 'AssignmentExpression':
      return handleAssignmentExpression(e, scopeManager);
    case 'UpdateExpression':
      return getUpdateExpressionValue(e, scopeManager);
    case 'ConditionalExpression':
      return getTernaryExpressionValue(e, scopeManager);
    case 'CallExpression':
      return getCallExpressionValue(e, scopeManager);
    case 'LogicalExpression':
      return getLogicalExpressionValue(e, scopeManager);
    case 'ParenthesizedExpression':
      return getExpressionValue(e.expression, scopeManager);
    case 'SequenceExpression':
      return handleSequenceExpression(e, scopeManager);
    case 'ArrayExpression':
      return handleArrayExpression(e, scopeManager);
    case 'FunctionExpression':
      return handleFunctionExpression(e, scopeManager);
    case 'ArrowFunctionExpression':
      return handleArrowFunctionExpression(e, scopeManager);
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
      const result1 = leftOperandValue - rightOperandValue;
      scopeManager.assignVariable(expr.left.name, result1);
      return result1;
    case '*=':
      const result2 = leftOperandValue * rightOperandValue;
      scopeManager.assignVariable(expr.left.name, result2);
      return result2;
    case '%=':
      const result3 = leftOperandValue % rightOperandValue;
      scopeManager.assignVariable(expr.left.name, result3);
      return result3;
    case '/=':
      const result4 = leftOperandValue / rightOperandValue;
      scopeManager.assignVariable(expr.left.name, result4);
      return result4;
  }
};

const getUpdateExpressionValue = (
  expr: UpdateExpression,
  scopeManager: ScopeManager
) => {
  const argumentValue = getExpressionValue(expr.argument, scopeManager);
  const identifierName =
    expr.argument.type === 'Identifier' ? expr.argument.name : null;
  const newValue =
    expr.operator === '++' ? argumentValue + 1 : argumentValue - 1;

  if (identifierName) {
    scopeManager.assignVariable(identifierName, newValue);
  }

  return expr.prefix ? newValue : argumentValue;
};

const getCallExpressionValue = (
  expr: CallExpression,
  scopeManager: ScopeManager
) => {
  if (!isExpression(expr.callee)) {
    throw new Error('CallExpression callee is not an expression');
  }

  getExpressionValue(expr.callee, scopeManager);

  expr.arguments.forEach((arg) => {
    if (!isExpression(arg)) {
      throw new Error('CallExpression argument is not an expression!');
    }

    getExpressionValue(arg, scopeManager);
  });

  return undefined;
};

const getTernaryExpressionValue = (
  expr: ConditionalExpression,
  scopeManager: ScopeManager
) => {
  getExpressionValue(expr.test, scopeManager);
  getExpressionValue(expr.consequent, scopeManager);
  getExpressionValue(expr.alternate, scopeManager);
  return undefined;
};

const getLogicalExpressionValue = (
  expr: LogicalExpression,
  scopeManager: ScopeManager
) => {
  getExpressionValue(expr.left, scopeManager);
  getExpressionValue(expr.right, scopeManager);
  return undefined;
};

const handleSequenceExpression = (
  expr: SequenceExpression,
  scopeManager: ScopeManager
) => {
  expr.expressions.forEach((expr) => getExpressionValue(expr, scopeManager));
  return undefined;
};

const handleArrayExpression = (
  expr: ArrayExpression,
  scopeManager: ScopeManager
) => {
  return expr.elements.map((elem) => {
    if (!isExpression(elem)) {
      throw new Error('Expected Expression as an element of ArrayExpression');
    }

    return getExpressionValue(elem, scopeManager);
  });
};

const handleArrowFunctionExpression = (
  expr: ArrowFunctionExpression,
  scopeManager: ScopeManager
) => {
  if (isExpression(expr.body)) {
    getExpressionValue(expr.body, scopeManager);
  } else {
    traverseStatement(expr.body, scopeManager);
  }
};

const handleFunctionExpression = (
  expr: FunctionExpression,
  scopeManager: ScopeManager
) => {
  traverseStatement(expr.body, scopeManager);
};
