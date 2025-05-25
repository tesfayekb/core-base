
// AST Parser Service for accurate code analysis
// Enhanced AI Context System - AST-based parsing

import * as ts from 'typescript';

export interface ASTAnalysisResult {
  exports: ExportInfo[];
  imports: ImportInfo[];
  functions: FunctionInfo[];
  components: ComponentInfo[];
  classes: ClassInfo[];
  interfaces: InterfaceInfo[];
  dependencies: DependencyGraph;
  complexity: ComplexityMetrics;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'const' | 'default';
  isDefault: boolean;
  documentation?: string;
  location: SourceLocation;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isTypeOnly: boolean;
  location: SourceLocation;
}

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  documentation?: string;
  location: SourceLocation;
}

export interface ComponentInfo {
  name: string;
  props: ParameterInfo[];
  isReactComponent: boolean;
  hooks: string[];
  location: SourceLocation;
}

export interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  extends?: string;
  implements: string[];
  location: SourceLocation;
}

export interface InterfaceInfo {
  name: string;
  properties: PropertyInfo[];
  extends: string[];
  location: SourceLocation;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  optional: boolean;
  visibility: 'public' | 'private' | 'protected';
}

export interface SourceLocation {
  line: number;
  column: number;
  file: string;
}

export interface DependencyGraph {
  internal: string[];
  external: string[];
  circular: string[];
  unused: string[];
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
}

export class ASTParser {
  private program: ts.Program | null = null;
  private checker: ts.TypeChecker | null = null;

  constructor() {
    this.initializeCompiler();
  }

  private initializeCompiler(): void {
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      allowJs: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: false,
      forceConsistentCasingInFileNames: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true
    };

    // In a real implementation, we'd scan the actual file system
    // For now, we'll work with the provided content
    this.program = ts.createProgram([], compilerOptions);
    this.checker = this.program.getTypeChecker();
  }

  analyzeCode(content: string, fileName: string): ASTAnalysisResult {
    try {
      const sourceFile = ts.createSourceFile(
        fileName,
        content,
        ts.ScriptTarget.ES2020,
        true,
        ts.ScriptKind.TSX
      );

      return {
        exports: this.extractExports(sourceFile),
        imports: this.extractImports(sourceFile),
        functions: this.extractFunctions(sourceFile),
        components: this.extractComponents(sourceFile),
        classes: this.extractClasses(sourceFile),
        interfaces: this.extractInterfaces(sourceFile),
        dependencies: this.analyzeDependencies(sourceFile),
        complexity: this.calculateComplexity(sourceFile)
      };
    } catch (error) {
      console.warn(`AST parsing failed for ${fileName}:`, error);
      return this.getEmptyAnalysis();
    }
  }

  private extractExports(sourceFile: ts.SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isExportDeclaration(node)) {
        // Handle export { ... } declarations
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach(element => {
            exports.push({
              name: element.name.text,
              type: 'const',
              isDefault: false,
              location: this.getLocation(element, sourceFile)
            });
          });
        }
      } else if (ts.isExportAssignment(node)) {
        // Handle export default declarations
        exports.push({
          name: 'default',
          type: 'default',
          isDefault: true,
          location: this.getLocation(node, sourceFile)
        });
      } else if (node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
        // Handle exported declarations
        if (ts.isFunctionDeclaration(node) && node.name) {
          exports.push({
            name: node.name.text,
            type: 'function',
            isDefault: false,
            location: this.getLocation(node, sourceFile)
          });
        } else if (ts.isClassDeclaration(node) && node.name) {
          exports.push({
            name: node.name.text,
            type: 'class',
            isDefault: false,
            location: this.getLocation(node, sourceFile)
          });
        } else if (ts.isInterfaceDeclaration(node)) {
          exports.push({
            name: node.name.text,
            type: 'interface',
            isDefault: false,
            location: this.getLocation(node, sourceFile)
          });
        } else if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name)) {
              exports.push({
                name: decl.name.text,
                type: 'const',
                isDefault: false,
                location: this.getLocation(decl, sourceFile)
              });
            }
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return exports;
  }

  private extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const moduleSpecifier = node.moduleSpecifier.text;
        const importNames: string[] = [];

        if (node.importClause) {
          // Default import
          if (node.importClause.name) {
            importNames.push(node.importClause.name.text);
          }

          // Named imports
          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              node.importClause.namedBindings.elements.forEach(element => {
                importNames.push(element.name.text);
              });
            } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              importNames.push(node.importClause.namedBindings.name.text);
            }
          }
        }

        imports.push({
          module: moduleSpecifier,
          imports: importNames,
          isTypeOnly: node.importClause?.isTypeOnly || false,
          location: this.getLocation(node, sourceFile)
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  private extractFunctions(sourceFile: ts.SourceFile): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        functions.push({
          name: node.name.text,
          parameters: this.extractParameters(node.parameters),
          returnType: node.type ? node.type.getText() : undefined,
          isAsync: node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) || false,
          isExported: node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false,
          location: this.getLocation(node, sourceFile)
        });
      } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        // Handle arrow functions and function expressions
        const parent = node.parent;
        if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
          functions.push({
            name: parent.name.text,
            parameters: this.extractParameters(node.parameters),
            returnType: node.type ? node.type.getText() : undefined,
            isAsync: node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) || false,
            isExported: false,
            location: this.getLocation(node, sourceFile)
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return functions;
  }

  private extractComponents(sourceFile: ts.SourceFile): ComponentInfo[] {
    const components: ComponentInfo[] = [];

    const visit = (node: ts.Node) => {
      // React function components
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        if (this.isReactComponent(node, name)) {
          components.push({
            name,
            props: this.extractParameters(node.parameters),
            isReactComponent: true,
            hooks: this.extractReactHooks(node),
            location: this.getLocation(node, sourceFile)
          });
        }
      }

      // Arrow function components
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        if (node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
          if (this.isReactComponent(node.initializer, name)) {
            components.push({
              name,
              props: this.extractParameters(node.initializer.parameters),
              isReactComponent: true,
              hooks: this.extractReactHooks(node.initializer),
              location: this.getLocation(node, sourceFile)
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return components;
  }

  private extractClasses(sourceFile: ts.SourceFile): ClassInfo[] {
    const classes: ClassInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const methods: FunctionInfo[] = [];
        const properties: PropertyInfo[] = [];

        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            methods.push({
              name: member.name.text,
              parameters: this.extractParameters(member.parameters),
              returnType: member.type ? member.type.getText() : undefined,
              isAsync: member.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) || false,
              isExported: false,
              location: this.getLocation(member, sourceFile)
            });
          } else if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            properties.push({
              name: member.name.text,
              type: member.type ? member.type.getText() : undefined,
              optional: member.questionToken !== undefined,
              visibility: this.getVisibility(member)
            });
          }
        });

        classes.push({
          name: node.name.text,
          methods,
          properties,
          extends: node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)?.types[0]?.expression.getText(),
          implements: node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ImplementsKeyword)?.types.map(type => type.expression.getText()) || [],
          location: this.getLocation(node, sourceFile)
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return classes;
  }

  private extractInterfaces(sourceFile: ts.SourceFile): InterfaceInfo[] {
    const interfaces: InterfaceInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node)) {
        const properties: PropertyInfo[] = [];

        node.members.forEach(member => {
          if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
            properties.push({
              name: member.name.text,
              type: member.type ? member.type.getText() : undefined,
              optional: member.questionToken !== undefined,
              visibility: 'public'
            });
          }
        });

        interfaces.push({
          name: node.name.text,
          properties,
          extends: node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)?.types.map(type => type.expression.getText()) || [],
          location: this.getLocation(node, sourceFile)
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return interfaces;
  }

  private analyzeDependencies(sourceFile: ts.SourceFile): DependencyGraph {
    const internal: string[] = [];
    const external: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const moduleName = node.moduleSpecifier.text;
        if (moduleName.startsWith('.') || moduleName.startsWith('@/')) {
          internal.push(moduleName);
        } else {
          external.push(moduleName);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      internal: [...new Set(internal)],
      external: [...new Set(external)],
      circular: [], // Would require cross-file analysis
      unused: [] // Would require usage analysis
    };
  }

  private calculateComplexity(sourceFile: ts.SourceFile): ComplexityMetrics {
    let cyclomaticComplexity = 1; // Base complexity
    const content = sourceFile.getFullText();
    const linesOfCode = content.split('\n').filter(line => line.trim().length > 0).length;

    const visit = (node: ts.Node) => {
      // Increase complexity for decision points
      if (ts.isIfStatement(node) || 
          ts.isWhileStatement(node) || 
          ts.isForStatement(node) || 
          ts.isForInStatement(node) || 
          ts.isForOfStatement(node) || 
          ts.isSwitchStatement(node) || 
          ts.isCatchClause(node) || 
          ts.isConditionalExpression(node)) {
        cyclomaticComplexity++;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Simple maintainability index calculation
    const maintainabilityIndex = Math.max(0, 
      171 - 5.2 * Math.log(linesOfCode) - 0.23 * cyclomaticComplexity
    );

    return {
      cyclomaticComplexity,
      linesOfCode,
      maintainabilityIndex: Math.round(maintainabilityIndex)
    };
  }

  private extractParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): ParameterInfo[] {
    return parameters.map(param => ({
      name: param.name.getText(),
      type: param.type ? param.type.getText() : undefined,
      optional: param.questionToken !== undefined,
      defaultValue: param.initializer ? param.initializer.getText() : undefined
    }));
  }

  private isReactComponent(node: ts.Node, name: string): boolean {
    // Check if name starts with uppercase (React convention)
    if (!/^[A-Z]/.test(name)) return false;

    // Check for JSX return or React elements
    const hasJSXReturn = this.containsJSX(node);
    const hasReactReturn = this.containsReactElements(node);

    return hasJSXReturn || hasReactReturn;
  }

  private containsJSX(node: ts.Node): boolean {
    let hasJSX = false;

    const visit = (child: ts.Node) => {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
        hasJSX = true;
        return;
      }
      ts.forEachChild(child, visit);
    };

    visit(node);
    return hasJSX;
  }

  private containsReactElements(node: ts.Node): boolean {
    const text = node.getText();
    return /React\.createElement|jsx\s*\(/.test(text);
  }

  private extractReactHooks(node: ts.Node): string[] {
    const hooks: string[] = [];
    const hookPattern = /use[A-Z]\w*/g;
    const text = node.getText();
    let match;

    while ((match = hookPattern.exec(text)) !== null) {
      hooks.push(match[0]);
    }

    return [...new Set(hooks)];
  }

  private getVisibility(member: ts.ClassElement): 'public' | 'private' | 'protected' {
    if (member.modifiers?.some(mod => mod.kind === ts.SyntaxKind.PrivateKeyword)) {
      return 'private';
    }
    if (member.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ProtectedKeyword)) {
      return 'protected';
    }
    return 'public';
  }

  private getLocation(node: ts.Node, sourceFile: ts.SourceFile): SourceLocation {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return {
      line: pos.line + 1,
      column: pos.character + 1,
      file: sourceFile.fileName
    };
  }

  private getEmptyAnalysis(): ASTAnalysisResult {
    return {
      exports: [],
      imports: [],
      functions: [],
      components: [],
      classes: [],
      interfaces: [],
      dependencies: { internal: [], external: [], circular: [], unused: [] },
      complexity: { cyclomaticComplexity: 0, linesOfCode: 0, maintainabilityIndex: 0 }
    };
  }
}

export const astParser = new ASTParser();
