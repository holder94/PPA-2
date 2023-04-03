import {
  ArrayExpression,
  ArrowFunctionExpression,
  AssignmentExpression,
  BinaryExpression,
  BlockStatement,
  CallExpression,
  ConditionalExpression,
  DoWhileStatement,
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
  SwitchStatement,
  UpdateExpression,
  VariableDeclaration,
  WhileStatement,
  isArrayPattern,
  isAssignmentPattern,
  isExpression,
  isIdentifier,
  isObjectPattern,
  isRestElement,
  isVariableDeclaration,
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
  scopeManager.enterScope();

  for (const statement of program.body) {
    traverseStatement(statement, scopeManager);
  }

  scopeManager.exitScope();
}

type StatementTraverser<S extends Statement = Statement> = (
  stmt: S,
  scopeManager: ScopeManager
) => void;

const traverseStatement: StatementTraverser = (statement, scopeManager) => {
  switch (statement.type) {
    case 'FunctionDeclaration':
      traverseFunctionDeclaration(statement, scopeManager);
      break;
    case 'VariableDeclaration':
      traverseVariableDeclaration(statement, scopeManager);
      break;
    case 'IfStatement':
      scopeManager.enterScope();
      traverseIfStatement(statement, scopeManager);
      scopeManager.exitScope();
      return;
    case 'SwitchStatement':
      traverseSwitchStatement(statement, scopeManager);
      break;
    case 'BlockStatement':
      scopeManager.enterScope();
      traverseBlockStatement(statement, scopeManager);
      scopeManager.exitScope();
      break;
    case 'ExpressionStatement':
      handleExpressionValue(statement.expression, scopeManager, false);
      break;
    case 'ReturnStatement':
      traverseReturnStatement(statement, scopeManager);
      break;
    case 'ForStatement':
      scopeManager.enterScope();
      traverseForStatement(statement, scopeManager);
      scopeManager.exitScope();
      break;
    case 'WhileStatement':
      scopeManager.enterScope();
      traverseWhileStatement(statement, scopeManager);
      scopeManager.exitScope();
      break;
    case 'DoWhileStatement':
      scopeManager.enterScope();
      traverseDoWhileStatement(statement, scopeManager);
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
  if (stmt.id) {
    scopeManager.declareVariable(stmt.id?.name, stmt.id?.loc);
  }
  scopeManager.enterScope();

  stmt.params.forEach((param) => traverseFunctionParam(param, scopeManager));
  traverseStatement(stmt.body, scopeManager);

  scopeManager.exitScope();
};

const traverseFunctionParam = (
  param: Identifier | Pattern | RestElement,
  scopeManager: ScopeManager
) => {
  if (isIdentifier(param)) {
    scopeManager.declareVariable(param.name, param.loc);
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
    scopeManager.declareVariable(variableName, stmt.loc);
    if (variableDeclarator.init) {
      handleExpressionValue(variableDeclarator.init, scopeManager, true);
    }
  }
};

const traverseReturnStatement: StatementTraverser<ReturnStatement> = (
  stmt,
  scopeManager
) => {
  if (stmt.argument) {
    handleExpressionValue(stmt.argument, scopeManager, true);
  }
};

const traverseIfStatement: StatementTraverser<IfStatement> = (
  stmt,
  scopeManager
) => {
  handleExpressionValue(stmt.test, scopeManager, true);
  traverseStatement(stmt.consequent, scopeManager);

  if (stmt.alternate) {
    traverseStatement(stmt.alternate, scopeManager);
  }
};

const traverseSwitchStatement: StatementTraverser<SwitchStatement> = (
  stmt,
  scopeManager
) => {
  handleExpressionValue(stmt.discriminant, scopeManager, true);
  stmt.cases.forEach((switchCase) => {
    if (switchCase.test) {
      handleExpressionValue(switchCase.test, scopeManager, true);
    }

    scopeManager.enterScope();

    switchCase.consequent.forEach((stmt) =>
      traverseStatement(stmt, scopeManager)
    );

    scopeManager.exitScope();
  });
};

const traverseForStatement: StatementTraverser<ForStatement> = (
  stmt,
  scopeManager
) => {
  if (isVariableDeclaration(stmt.init)) {
    traverseVariableDeclaration(stmt.init, scopeManager);
  }

  if (stmt.test) {
    handleExpressionValue(stmt.test, scopeManager, true);
  }

  if (stmt.update) {
    handleExpressionValue(stmt.update, scopeManager, false);
  }

  traverseStatement(stmt.body, scopeManager);
};

const traverseWhileStatement: StatementTraverser<WhileStatement> = (
  stmt,
  scopeManager
) => {
  handleExpressionValue(stmt.test, scopeManager, true);
  traverseStatement(stmt.body, scopeManager);
};

const traverseDoWhileStatement: StatementTraverser<DoWhileStatement> = (
  stmt,
  scopeManager
) => {
  traverseStatement(stmt.body, scopeManager);
  handleExpressionValue(stmt.test, scopeManager, true);
};

const handleExpressionValue = (
  e: Expression,
  scopeManager: ScopeManager,
  canBeUsed: boolean
): any => {
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
      return getBinaryExpressionValue(e, scopeManager, canBeUsed);
    case 'AssignmentExpression':
      return handleAssignmentExpression(e, scopeManager, canBeUsed);
    case 'UpdateExpression':
      return getUpdateExpressionValue(e, scopeManager, canBeUsed);
    case 'ConditionalExpression':
      return getTernaryExpressionValue(e, scopeManager, canBeUsed);
    case 'CallExpression':
      return getCallExpressionValue(e, scopeManager, canBeUsed);
    case 'LogicalExpression':
      return getLogicalExpressionValue(e, scopeManager, canBeUsed);
    case 'ParenthesizedExpression':
      return handleExpressionValue(e.expression, scopeManager, canBeUsed);
    case 'SequenceExpression':
      return handleSequenceExpression(e, scopeManager, canBeUsed);
    case 'ArrayExpression':
      return handleArrayExpression(e, scopeManager, canBeUsed);
    case 'FunctionExpression':
      scopeManager.enterScope();
      handleFunctionExpression(e, scopeManager);
      scopeManager.exitScope();
      break;
    case 'ArrowFunctionExpression':
      scopeManager.enterScope();
      handleArrowFunctionExpression(e, scopeManager, canBeUsed);
      scopeManager.exitScope();
      break;
    case 'Identifier':
      scopeManager.setIsUsed(e.name, canBeUsed);
      return scopeManager.getVariableValue(e.name);
    default:
      const error = `unknown expression type: ${e.type}`;
      throw new Error(error);
  }
};

const getBinaryExpressionValue = (
  expr: BinaryExpression,
  scopeManager: ScopeManager,
  canBeUsed: boolean
) => {
  if (expr.left.type === 'PrivateName') {
    throw new Error(
      'Type of left operand in binary expression in "PrivateName"'
    );
  }
  handleExpressionValue(expr.left, scopeManager, canBeUsed);
  handleExpressionValue(expr.right, scopeManager, canBeUsed);
  switch (expr.operator) {
    case '!=':
      // return leftOperandValue != rightOperandValue;
      break;
    case '%':
      // return leftOperandValue % rightOperandValue;
      break;
    case '+':
      // return leftOperandValue + rightOperandValue;
      break;
    case '-':
      // return leftOperandValue - rightOperandValue;
      break;
    case '*':
      // return leftOperandValue * rightOperandValue;
      break;
    case '/':
      // return leftOperandValue / rightOperandValue;
      break;
    case '==':
      // return leftOperandValue == rightOperandValue;
      break;
    case '>':
      // return leftOperandValue > rightOperandValue;
      break;
    case '>=':
      // return leftOperandValue >= rightOperandValue;
      break;
    case '<':
      // return leftOperandValue < rightOperandValue;
      break;
    case '<=':
      // return leftOperandValue <= rightOperandValue;
      break;
  }
};

const handleAssignmentExpression = (
  expr: AssignmentExpression,
  scopeManager: ScopeManager,
  canBeUsed: boolean
) => {
  if (expr.left.type !== 'Identifier') {
    const error = `unknown type in assignmet expression: ${expr.left.type}`;
    throw new Error(error);
  }

  const identifierWasUsed = scopeManager.getVariableValue(expr.left.name);
  handleExpressionValue(expr.right, scopeManager, true);
  if (!identifierWasUsed)
    handleExpressionValue(expr.left, scopeManager, canBeUsed);

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

const getUpdateExpressionValue = (
  expr: UpdateExpression,
  scopeManager: ScopeManager,
  canBeUsed: boolean
) => {
  handleExpressionValue(expr.argument, scopeManager, canBeUsed);
};

const getCallExpressionValue = (
  expr: CallExpression,
  scopeManager: ScopeManager,
  canBeUsed: boolean
) => {
  if (!isExpression(expr.callee)) {
    throw new Error('CallExpression callee is not an expression');
  }

  handleExpressionValue(expr.callee, scopeManager, canBeUsed);

  expr.arguments.forEach((arg) => {
    if (!isExpression(arg)) {
      throw new Error('CallExpression argument is not an expression!');
    }

    handleExpressionValue(arg, scopeManager, canBeUsed);
  });
};

const getTernaryExpressionValue = (
  expr: ConditionalExpression,
  scopeManager: ScopeManager,
  canBeUsed: boolean
) => {
  handleExpressionValue(expr.test, scopeManager, canBeUsed);
  handleExpressionValue(expr.consequent, scopeManager, canBeUsed);
  handleExpressionValue(expr.alternate, scopeManager, canBeUsed);
  return undefined;
};

const getLogicalExpressionValue = (
  expr: LogicalExpression,
  scopeManager: ScopeManager,
  canBeUsed: boolean
) => {
  handleExpressionValue(expr.left, scopeManager, canBeUsed);
  handleExpressionValue(expr.right, scopeManager, canBeUsed);
  return undefined;
};

const handleSequenceExpression = (
  expr: SequenceExpression,
  scopeManager: ScopeManager,
  canBeUsed: boolean
) => {
  expr.expressions.forEach((expr) =>
    handleExpressionValue(expr, scopeManager, canBeUsed)
  );
  return undefined;
};

const handleArrayExpression = (
  expr: ArrayExpression,
  scopeManager: ScopeManager,
  canBeUsed: boolean
) => {
  return expr.elements.map((elem) => {
    if (!isExpression(elem)) {
      throw new Error('Expected Expression as an element of ArrayExpression');
    }

    return handleExpressionValue(elem, scopeManager, canBeUsed);
  });
};

const handleArrowFunctionExpression = (
  expr: ArrowFunctionExpression,
  scopeManager: ScopeManager,
  canBeUsed: boolean
) => {
  expr.params.forEach((param) => traverseFunctionParam(param, scopeManager));
  if (isExpression(expr.body)) {
    handleExpressionValue(expr.body, scopeManager, canBeUsed);
  } else {
    traverseStatement(expr.body, scopeManager);
  }
};

const handleFunctionExpression = (
  expr: FunctionExpression,
  scopeManager: ScopeManager
) => {
  expr.params.forEach((param) => traverseFunctionParam(param, scopeManager));
  traverseStatement(expr.body, scopeManager);
};
