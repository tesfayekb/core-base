
// Simplified AST Parser Service
// Enhanced AI Context System - Code structure analysis without TypeScript compiler API

export interface ParsedFile {
  path: string;
  functions: ParsedFunction[];
  components: ParsedComponent[];
  imports: ParsedImport[];
  exports: ParsedExport[];
  dependencies: string[];
}

export interface ParsedFunction {
  name: string;
  isAsync: boolean;
  parameters: string[];
  isExported: boolean;
  lineNumber: number;
}

export interface ParsedComponent {
  name: string;
  isReactComponent: boolean;
  props: string[];
  isExported: boolean;
  lineNumber: number;
}

export interface ParsedImport {
  source: string;
  imports: string[];
  isDefault: boolean;
  lineNumber: number;
}

export interface ParsedExport {
  name: string;
  isDefault: boolean;
  type: 'function' | 'component' | 'variable' | 'type';
  lineNumber: number;
}

export interface DependencyGraph {
  nodes: string[];
  edges: Array<{ from: string; to: string; type: string }>;
}

class ASTParserService {
  async parseFile(filePath: string, content: string): Promise<ParsedFile> {
    const lines = content.split('\n');
    
    return {
      path: filePath,
      functions: this.parseFunctions(content, lines),
      components: this.parseComponents(content, lines),
      imports: this.parseImports(content, lines),
      exports: this.parseExports(content, lines),
      dependencies: this.extractDependencies(content)
    };
  }

  private parseFunctions(content: string, lines: string[]): ParsedFunction[] {
    const functions: ParsedFunction[] = [];
    
    // Match function declarations and arrow functions
    const functionPatterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g,
      /(\w+)\s*:\s*(?:async\s+)?\(([^)]*)\)\s*=>/g
    ];

    functionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        const params = match[2] ? match[2].split(',').map(p => p.trim()).filter(Boolean) : [];
        const lineNumber = this.getLineNumber(content, match.index, lines);
        const isAsync = match[0].includes('async');
        const isExported = match[0].includes('export');

        functions.push({
          name,
          isAsync,
          parameters: params,
          isExported,
          lineNumber
        });
      }
    });

    return functions;
  }

  private parseComponents(content: string, lines: string[]): ParsedComponent[] {
    const components: ParsedComponent[] = [];
    
    // Match React components (functions starting with capital letter)
    const componentPattern = /(?:export\s+(?:default\s+)?)?(?:const\s+|function\s+)([A-Z][A-Za-z0-9]*)\s*(?:\(([^)]*)\)|=\s*\(([^)]*)\))/g;
    
    let match;
    while ((match = componentPattern.exec(content)) !== null) {
      const name = match[1];
      const params = match[2] || match[3] || '';
      const lineNumber = this.getLineNumber(content, match.index, lines);
      const isExported = match[0].includes('export');
      
      // Check if it returns JSX
      const functionBody = this.extractFunctionBody(content, match.index);
      const isReactComponent = this.isReactComponent(functionBody);
      
      if (isReactComponent) {
        const props = this.extractProps(params);
        
        components.push({
          name,
          isReactComponent,
          props,
          isExported,
          lineNumber
        });
      }
    }

    return components;
  }

  private parseImports(content: string, lines: string[]): ParsedImport[] {
    const imports: ParsedImport[] = [];
    const importPattern = /import\s+(?:(\w+)|{([^}]+)}|\*\s+as\s+(\w+))\s+from\s+['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      const defaultImport = match[1];
      const namedImports = match[2];
      const namespaceImport = match[3];
      const source = match[4];
      const lineNumber = this.getLineNumber(content, match.index, lines);
      
      let importsList: string[] = [];
      let isDefault = false;
      
      if (defaultImport) {
        importsList = [defaultImport];
        isDefault = true;
      } else if (namedImports) {
        importsList = namedImports.split(',').map(imp => imp.trim()).filter(Boolean);
      } else if (namespaceImport) {
        importsList = [namespaceImport];
      }
      
      imports.push({
        source,
        imports: importsList,
        isDefault,
        lineNumber
      });
    }

    return imports;
  }

  private parseExports(content: string, lines: string[]): ParsedExport[] {
    const exports: ParsedExport[] = [];
    
    // Match various export patterns
    const exportPatterns = [
      /export\s+default\s+(?:function\s+)?(\w+)/g,
      /export\s+(?:const|let|var)\s+(\w+)/g,
      /export\s+function\s+(\w+)/g,
      /export\s+class\s+(\w+)/g,
      /export\s+{([^}]+)}/g
    ];

    exportPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index, lines);
        
        if (index === 4) { // Named exports in braces
          const namedExports = match[1].split(',').map(exp => exp.trim()).filter(Boolean);
          namedExports.forEach(exportName => {
            exports.push({
              name: exportName,
              isDefault: false,
              type: 'variable',
              lineNumber
            });
          });
        } else {
          const name = match[1];
          const isDefault = match[0].includes('default');
          let type: 'function' | 'component' | 'variable' | 'type' = 'variable';
          
          if (match[0].includes('function')) type = 'function';
          else if (match[0].includes('class') || /^[A-Z]/.test(name)) type = 'component';
          
          exports.push({
            name,
            isDefault,
            type,
            lineNumber
          });
        }
      }
    });

    return exports;
  }

  private extractDependencies(content: string): string[] {
    const dependencies = new Set<string>();
    const importPattern = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      const source = match[1];
      if (!source.startsWith('.')) { // External dependencies
        dependencies.add(source.split('/')[0]); // Get package name
      }
    }

    return Array.from(dependencies);
  }

  buildDependencyGraph(files: ParsedFile[]): DependencyGraph {
    const nodes = files.map(f => f.path);
    const edges: Array<{ from: string; to: string; type: string }> = [];

    files.forEach(file => {
      file.imports.forEach(imp => {
        if (imp.source.startsWith('.')) {
          // Local import
          const targetPath = this.resolvePath(file.path, imp.source);
          if (nodes.includes(targetPath)) {
            edges.push({
              from: file.path,
              to: targetPath,
              type: 'import'
            });
          }
        }
      });
    });

    return { nodes, edges };
  }

  private getLineNumber(content: string, index: number, lines: string[]): number {
    const beforeIndex = content.substring(0, index);
    return beforeIndex.split('\n').length;
  }

  private extractFunctionBody(content: string, startIndex: number): string {
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          return content.substring(startIndex, i + 1);
        }
      }
    }
    
    return '';
  }

  private isReactComponent(functionBody: string): boolean {
    // Check for JSX patterns
    return /return\s*\(?\s*</.test(functionBody) || 
           /jsx/i.test(functionBody) ||
           /<\w+/.test(functionBody);
  }

  private extractProps(paramsString: string): string[] {
    if (!paramsString.trim()) return [];
    
    // Simple prop extraction - could be enhanced
    const propsMatch = paramsString.match(/{\s*([^}]+)\s*}/);
    if (propsMatch) {
      return propsMatch[1].split(',').map(prop => prop.trim()).filter(Boolean);
    }
    
    return [paramsString.trim()];
  }

  private resolvePath(currentPath: string, relativePath: string): string {
    // Simple path resolution - could be enhanced
    const pathParts = currentPath.split('/');
    pathParts.pop(); // Remove filename
    
    const relativeParts = relativePath.split('/');
    relativeParts.forEach(part => {
      if (part === '..') {
        pathParts.pop();
      } else if (part !== '.') {
        pathParts.push(part);
      }
    });
    
    return pathParts.join('/');
  }
}

export const astParser = new ASTParserService();
