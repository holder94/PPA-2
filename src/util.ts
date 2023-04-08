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
import { FlowManager } from './controlFlow';
import { getControlPoints } from '.';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getProgramText(fileName: string) {
  const filePath = path.resolve(__dirname, `programs/${fileName}`);
  return fs.readFileSync(filePath, 'utf-8').toString();
}

export function traverseProgram(
  program: Program,
  scopeManager: ScopeManager,
  flowManager: FlowManager
) {
  scopeManager.enterScope();

  for (const statement of program.body) {
    traverseStatement(statement, scopeManager, flowManager);
  }

  scopeManager.exitScope(program.loc);
}

type StatementTraverser<S extends Statement = Statement> = (
  stmt: S,
  scopeManager: ScopeManager,
  flowManager: FlowManager
) => void;

const traverseStatement: StatementTraverser = (
  statement,
  scopeManager,
  flowManager
) => {
  switch (statement.type) {
    case 'FunctionDeclaration':
      traverseFunctionDeclaration(statement, scopeManager, flowManager);
      break;
    case 'VariableDeclaration':
      traverseVariableDeclaration(statement, scopeManager, flowManager);
      break;
    case 'IfStatement':
      traverseIfStatement(statement, scopeManager, flowManager);
      return;
    case 'SwitchStatement':
      traverseSwitchStatement(statement, scopeManager, flowManager);
      break;
    case 'BlockStatement':
      scopeManager.enterScope();
      traverseBlockStatement(statement, scopeManager, flowManager);
      scopeManager.exitScope(statement.loc);
      break;
    case 'ExpressionStatement':
      handleExpressionValue(
        statement.expression,
        scopeManager,
        flowManager,
        false
      );
      break;
    case 'ReturnStatement':
      traverseReturnStatement(statement, scopeManager, flowManager);
      break;
    case 'ForStatement':
      scopeManager.enterScope();
      traverseForStatement(statement, scopeManager, flowManager);
      scopeManager.exitScope(statement.loc);
      break;
    case 'WhileStatement':
      scopeManager.enterScope();
      traverseWhileStatement(statement, scopeManager, flowManager);
      scopeManager.exitScope(statement.loc);
      break;
    case 'DoWhileStatement':
      scopeManager.enterScope();
      traverseDoWhileStatement(statement, scopeManager, flowManager);
      scopeManager.exitScope(statement.loc);
      break;
    default:
      const error = `Unknown statement type: ${statement.type}`;
      throw new Error(error);
  }
};

const traverseFunctionDeclaration: StatementTraverser<FunctionDeclaration> = (
  stmt,
  scopeManager,
  flowManager
) => {
  if (stmt.id) {
    scopeManager.declareVariable(stmt.id?.name, stmt.id?.loc);
  }
  scopeManager.enterScope();

  stmt.params.forEach((param) => traverseFunctionParam(param, scopeManager));
  traverseStatement(stmt.body, scopeManager, flowManager);

  scopeManager.exitScope(stmt.loc);
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
  scopeManager,
  flowManager
) => {
  for (const node of statement.body) {
    traverseStatement(node, scopeManager, flowManager);
  }
};

const traverseVariableDeclaration: StatementTraverser<VariableDeclaration> = (
  stmt,
  scopeManager,
  flowManager
) => {
  for (const variableDeclarator of stmt.declarations) {
    if (variableDeclarator.id.type !== 'Identifier') {
      throw new Error('Non-Identifier found in variable declarator');
    }

    const variableName = variableDeclarator.id.name;
    scopeManager.declareVariable(variableName, stmt.loc);
    if (variableDeclarator.init) {
      handleExpressionValue(
        variableDeclarator.init,
        scopeManager,
        flowManager,
        true
      );
    }
  }
};

const traverseReturnStatement: StatementTraverser<ReturnStatement> = (
  stmt,
  scopeManager,
  flowManager
) => {
  if (stmt.argument) {
    handleExpressionValue(stmt.argument, scopeManager, flowManager, true);
  }
};

const traverseIfStatement: StatementTraverser<IfStatement> = (
  stmt,
  scopeManager,
  flowManager
) => {
  handleExpressionValue(stmt.test, scopeManager, flowManager, true);

  const stateSnaphot = scopeManager.getSnapshot();
  const shouldGoToIf = flowManager.getFlowDecision();
  if (shouldGoToIf) {
    scopeManager.enterScope();
    traverseStatement(stmt.consequent, scopeManager, flowManager);
    scopeManager.exitScope(stmt.loc);

    if (
      stmt.alternate?.type === 'IfStatement' ||
      stmt.alternate?.type === 'WhileStatement' ||
      stmt.alternate?.type === 'DoWhileStatement'
    ) {
      traverseStatement(stmt.alternate, scopeManager, flowManager);
    }
  } else {
    // let innerControlPoints = getControlPoints(stmt.consequent)
    // while(innerControlPoints--) {
    //   flowManager.getFlowDecision()
    // }
    if (stmt.alternate) {
      traverseStatement(stmt.alternate, scopeManager, flowManager);
    }
  }
};

const traverseSwitchStatement: StatementTraverser<SwitchStatement> = (
  stmt,
  scopeManager,
  flowManager
) => {
  handleExpressionValue(stmt.discriminant, scopeManager, flowManager, true);
  stmt.cases.forEach((switchCase) => {
    if (switchCase.test) {
      handleExpressionValue(switchCase.test, scopeManager, flowManager, true);
    }

    scopeManager.enterScope();

    switchCase.consequent.forEach((stmt) =>
      traverseStatement(stmt, scopeManager, flowManager)
    );

    scopeManager.exitScope(stmt.loc);
  });
};

const traverseForStatement: StatementTraverser<ForStatement> = (
  stmt,
  scopeManager,
  flowManager
) => {
  if (isVariableDeclaration(stmt.init)) {
    traverseVariableDeclaration(stmt.init, scopeManager, flowManager);
  } else if (isExpression(stmt.init)) {
    handleExpressionValue(stmt.init, scopeManager, flowManager, false);
  }

  if (stmt.test) {
    handleExpressionValue(stmt.test, scopeManager, flowManager, true);
  }

  if (stmt.update) {
    handleExpressionValue(stmt.update, scopeManager, flowManager, false);
  }

  const shouldGoInside = flowManager.getFlowDecision();
  if (shouldGoInside) {
    traverseStatement(stmt.body, scopeManager, flowManager);
  }
};

const traverseWhileStatement: StatementTraverser<WhileStatement> = (
  stmt,
  scopeManager,
  flowManager
) => {
  const shouldGoInside = flowManager.getFlowDecision();
  handleExpressionValue(stmt.test, scopeManager, flowManager, true);
  if (shouldGoInside) {
    traverseStatement(stmt.body, scopeManager, flowManager);
  }
};

const traverseDoWhileStatement: StatementTraverser<DoWhileStatement> = (
  stmt,
  scopeManager,
  flowManager
) => {
  traverseStatement(stmt.body, scopeManager, flowManager);
  handleExpressionValue(stmt.test, scopeManager, flowManager, true);
};

const handleExpressionValue = (
  e: Expression,
  scopeManager: ScopeManager,
  flowManager: FlowManager,
  setUsed: boolean
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
      return getBinaryExpressionValue(e, scopeManager, flowManager, setUsed);
    case 'AssignmentExpression':
      return handleAssignmentExpression(e, scopeManager, flowManager, setUsed);
    case 'UpdateExpression':
      return getUpdateExpressionValue(e, scopeManager, flowManager, setUsed);
    case 'ConditionalExpression':
      return getTernaryExpressionValue(e, scopeManager, flowManager, setUsed);
    case 'CallExpression':
      return getCallExpressionValue(e, scopeManager, flowManager);
    case 'LogicalExpression':
      return getLogicalExpressionValue(e, scopeManager, flowManager, setUsed);
    case 'ParenthesizedExpression':
      return handleExpressionValue(
        e.expression,
        scopeManager,
        flowManager,
        setUsed
      );
    case 'SequenceExpression':
      return handleSequenceExpression(e, scopeManager, flowManager, setUsed);
    case 'ArrayExpression':
      return handleArrayExpression(e, scopeManager, flowManager, setUsed);
    case 'FunctionExpression':
      scopeManager.enterScope();
      handleFunctionExpression(e, scopeManager, flowManager);
      scopeManager.exitScope(e.loc);
      break;
    case 'ArrowFunctionExpression':
      scopeManager.enterScope();
      handleArrowFunctionExpression(e, scopeManager, flowManager, setUsed);
      scopeManager.exitScope(e.loc);
      break;
    case 'Identifier':
      scopeManager.setVariableData(e.name, {
        isUsed: setUsed,
        location: e.loc,
        isRedefinedInFlow: false,
      });
      break;
    default:
      const error = `unknown expression type: ${e.type}`;
      throw new Error(error);
  }
};

const getBinaryExpressionValue = (
  expr: BinaryExpression,
  scopeManager: ScopeManager,
  flowManager: FlowManager,
  canBeUsed: boolean
) => {
  if (expr.left.type === 'PrivateName') {
    throw new Error(
      'Type of left operand in binary expression in "PrivateName"'
    );
  }

  handleExpressionValue(expr.left, scopeManager, flowManager, canBeUsed);
  handleExpressionValue(expr.right, scopeManager, flowManager, canBeUsed);
};

const handleAssignmentExpression = (
  expr: AssignmentExpression,
  scopeManager: ScopeManager,
  flowManager: FlowManager,
  setUsed: boolean
) => {
  if (expr.left.type !== 'Identifier') {
    const error = `unknown type in assignmet expression: ${expr.left.type}`;
    throw new Error(error);
  }

  handleExpressionValue(expr.right, scopeManager, flowManager, true);

  if (expr.operator === '=') {
    // console.log(scopeManager.getVariableData(expr.left.name))
    scopeManager.checkVariable(expr.left.name, expr.left.loc);
  }

  console.log(`${expr.loc?.start.line} ${setUsed}`);

  handleExpressionValue(expr.left, scopeManager, flowManager, setUsed);
};

const getUpdateExpressionValue = (
  expr: UpdateExpression,
  scopeManager: ScopeManager,
  flowManager: FlowManager,
  setUsed: boolean
) => {
  handleExpressionValue(expr.argument, scopeManager, flowManager, setUsed);
};

const getCallExpressionValue = (
  expr: CallExpression,
  scopeManager: ScopeManager,
  flowManager: FlowManager
) => {
  if (!isExpression(expr.callee)) {
    throw new Error('CallExpression callee is not an expression');
  }

  handleExpressionValue(expr.callee, scopeManager, flowManager, true);

  expr.arguments.forEach((arg) => {
    if (!isExpression(arg)) {
      throw new Error('CallExpression argument is not an expression!');
    }

    handleExpressionValue(arg, scopeManager, flowManager, true);
  });
};

const getTernaryExpressionValue = (
  expr: ConditionalExpression,
  scopeManager: ScopeManager,
  flowManager: FlowManager,
  canBeUsed: boolean
) => {
  handleExpressionValue(expr.test, scopeManager, flowManager, canBeUsed);
  handleExpressionValue(expr.consequent, scopeManager, flowManager, canBeUsed);
  handleExpressionValue(expr.alternate, scopeManager, flowManager, canBeUsed);
  return undefined;
};

const getLogicalExpressionValue = (
  expr: LogicalExpression,
  scopeManager: ScopeManager,
  flowManager: FlowManager,
  canBeUsed: boolean
) => {
  handleExpressionValue(expr.left, scopeManager, flowManager, canBeUsed);
  handleExpressionValue(expr.right, scopeManager, flowManager, canBeUsed);
  return undefined;
};

const handleSequenceExpression = (
  expr: SequenceExpression,
  scopeManager: ScopeManager,
  flowManager: FlowManager,
  canBeUsed: boolean
) => {
  expr.expressions.forEach((expr) =>
    handleExpressionValue(expr, scopeManager, flowManager, canBeUsed)
  );
  return undefined;
};

const handleArrayExpression = (
  expr: ArrayExpression,
  scopeManager: ScopeManager,
  flowManager: FlowManager,
  canBeUsed: boolean
) => {
  return expr.elements.map((elem) => {
    if (!isExpression(elem)) {
      throw new Error('Expected Expression as an element of ArrayExpression');
    }

    return handleExpressionValue(elem, scopeManager, flowManager, canBeUsed);
  });
};

const handleArrowFunctionExpression = (
  expr: ArrowFunctionExpression,
  scopeManager: ScopeManager,
  flowManager: FlowManager,
  canBeUsed: boolean
) => {
  expr.params.forEach((param) => traverseFunctionParam(param, scopeManager));
  if (isExpression(expr.body)) {
    handleExpressionValue(expr.body, scopeManager, flowManager, canBeUsed);
  } else {
    traverseStatement(expr.body, scopeManager, flowManager);
  }
};

const handleFunctionExpression = (
  expr: FunctionExpression,
  scopeManager: ScopeManager,
  flowManager: FlowManager
) => {
  expr.params.forEach((param) => traverseFunctionParam(param, scopeManager));
  traverseStatement(expr.body, scopeManager, flowManager);
};
