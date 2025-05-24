
# Resource CLI Tools

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

This document outlines the design and implementation of CLI tools for automated resource scaffolding and management. These tools will generate code from templates and automate repetitive tasks in resource integration.

## CLI Tool Architecture

### Tool Structure
```
scripts/
├── resource-cli/
│   ├── index.js                 # Main CLI entry point
│   ├── commands/
│   │   ├── generate.js          # Resource generation command
│   │   ├── validate.js          # Resource validation command
│   │   └── migrate.js           # Migration command
│   ├── templates/               # Code templates
│   │   ├── typescript/
│   │   ├── database/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── components/
│   │   └── tests/
│   ├── generators/              # Template generators
│   │   ├── TypeScriptGenerator.js
│   │   ├── DatabaseGenerator.js
│   │   ├── ServiceGenerator.js
│   │   ├── ComponentGenerator.js
│   │   └── TestGenerator.js
│   └── utils/
│       ├── fileUtils.js
│       ├── templateUtils.js
│       └── validationUtils.js
└── package.json
```

## Command Line Interface

### Installation and Setup

**File: `scripts/resource-cli/package.json`**
```json
{
  "name": "@enterprise-app/resource-cli",
  "version": "1.0.0",
  "description": "CLI tool for generating enterprise app resources",
  "main": "index.js",
  "bin": {
    "resource": "./index.js"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "inquirer": "^9.2.0",
    "chalk": "^5.3.0",
    "ora": "^7.0.0",
    "fs-extra": "^11.1.1",
    "handlebars": "^4.7.8",
    "pluralize": "^8.0.0"
  },
  "scripts": {
    "test": "jest"
  }
}
```

### Main CLI Entry Point

**File: `scripts/resource-cli/index.js`**
```javascript
#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const generateCommand = require('./commands/generate');
const validateCommand = require('./commands/validate');
const migrateCommand = require('./commands/migrate');

const program = new Command();

program
  .name('resource')
  .description('Enterprise App Resource CLI Tool')
  .version('1.0.0');

// Generate command
program
  .command('generate')
  .alias('g')
  .description('Generate a new resource')
  .argument('<resource-name>', 'Name of the resource to generate')
  .option('-t, --type <type>', 'Resource type (full, api-only, ui-only)', 'full')
  .option('-f, --fields <fields>', 'Comma-separated list of fields')
  .option('--no-tests', 'Skip test generation')
  .option('--no-ui', 'Skip UI component generation')
  .option('--dry-run', 'Show what would be generated without creating files')
  .action(generateCommand);

// Validate command
program
  .command('validate')
  .alias('v')
  .description('Validate existing resource implementation')
  .argument('<resource-name>', 'Name of the resource to validate')
  .option('--fix', 'Attempt to fix validation issues')
  .action(validateCommand);

// Migrate command
program
  .command('migrate')
  .alias('m')
  .description('Generate database migration for resource')
  .argument('<resource-name>', 'Name of the resource')
  .option('--rollback', 'Generate rollback migration')
  .action(migrateCommand);

// List command
program
  .command('list')
  .alias('ls')
  .description('List all resources in the project')
  .action(() => {
    console.log(chalk.blue('📋 Resources in project:'));
    // Implementation to scan and list resources
  });

program.parse();
```

### Generate Command Implementation

**File: `scripts/resource-cli/commands/generate.js`**
```javascript
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const pluralize = require('pluralize');

const TypeScriptGenerator = require('../generators/TypeScriptGenerator');
const DatabaseGenerator = require('../generators/DatabaseGenerator');
const ServiceGenerator = require('../generators/ServiceGenerator');
const ComponentGenerator = require('../generators/ComponentGenerator');
const TestGenerator = require('../generators/TestGenerator');

async function generateCommand(resourceName, options) {
  console.log(chalk.blue(`🚀 Generating resource: ${resourceName}`));
  
  // Normalize resource names
  const resourceConfig = {
    name: resourceName,
    pascalCase: toPascalCase(resourceName),
    camelCase: toCamelCase(resourceName),
    kebabCase: toKebabCase(resourceName),
    plural: pluralize(resourceName),
    pluralPascal: toPascalCase(pluralize(resourceName))
  };

  // Interactive field definition if not provided
  if (!options.fields) {
    const fieldDefinition = await defineFields();
    resourceConfig.fields = fieldDefinition;
  } else {
    resourceConfig.fields = parseFieldString(options.fields);
  }

  // Confirm generation
  if (!options.dryRun) {
    const confirmation = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: `Generate ${resourceConfig.pascalCase} resource with ${resourceConfig.fields.length} fields?`,
        default: true
      }
    ]);

    if (!confirmation.proceed) {
      console.log(chalk.yellow('Generation cancelled.'));
      return;
    }
  }

  const spinner = ora('Generating resource files...').start();

  try {
    const generators = [
      new TypeScriptGenerator(),
      new DatabaseGenerator(),
      new ServiceGenerator(),
      new ComponentGenerator(),
      ...(options.tests !== false ? [new TestGenerator()] : [])
    ];

    const generatedFiles = [];

    for (const generator of generators) {
      const files = await generator.generate(resourceConfig, options);
      generatedFiles.push(...files);
    }

    spinner.succeed(`Generated ${generatedFiles.length} files`);

    // Display generated files
    console.log(chalk.green('\n✅ Generated files:'));
    generatedFiles.forEach(file => {
      console.log(chalk.gray(`  ${file}`));
    });

    // Next steps
    console.log(chalk.blue('\n📋 Next steps:'));
    console.log(chalk.gray('  1. Run database migration'));
    console.log(chalk.gray('  2. Update RBAC permissions'));
    console.log(chalk.gray('  3. Add navigation routes'));
    console.log(chalk.gray('  4. Run tests'));

  } catch (error) {
    spinner.fail('Generation failed');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

async function defineFields() {
  const fields = [];
  let addingFields = true;

  console.log(chalk.blue('\n📝 Define resource fields:'));

  while (addingFields) {
    const fieldInput = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Field name:',
        validate: input => input.trim() !== '' || 'Field name is required'
      },
      {
        type: 'list',
        name: 'type',
        message: 'Field type:',
        choices: [
          'string',
          'number',
          'boolean',
          'date',
          'enum',
          'json',
          'uuid',
          'text',
          'email',
          'url'
        ]
      },
      {
        type: 'confirm',
        name: 'required',
        message: 'Required field?',
        default: false
      },
      {
        type: 'confirm',
        name: 'unique',
        message: 'Unique field?',
        default: false
      }
    ]);

    // Handle enum options
    if (fieldInput.type === 'enum') {
      const enumInput = await inquirer.prompt([
        {
          type: 'input',
          name: 'options',
          message: 'Enum options (comma-separated):',
          validate: input => input.trim() !== '' || 'Enum options are required'
        }
      ]);
      fieldInput.enumOptions = enumInput.options.split(',').map(opt => opt.trim());
    }

    fields.push(fieldInput);

    const continueInput = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Add another field?',
        default: false
      }
    ]);

    addingFields = continueInput.continue;
  }

  return fields;
}

function parseFieldString(fieldsString) {
  return fieldsString.split(',').map(field => {
    const [name, type = 'string'] = field.trim().split(':');
    return {
      name: name.trim(),
      type: type.trim(),
      required: false,
      unique: false
    };
  });
}

function toPascalCase(str) {
  return str.replace(/(\w)(\w*)/g, (_, first, rest) => 
    first.toUpperCase() + rest.toLowerCase()
  );
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

module.exports = generateCommand;
```

### TypeScript Generator

**File: `scripts/resource-cli/generators/TypeScriptGenerator.js`**
```javascript
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

class TypeScriptGenerator {
  constructor() {
    this.templateDir = path.join(__dirname, '../templates/typescript');
  }

  async generate(resourceConfig, options) {
    const generatedFiles = [];
    
    // Generate main interface
    const interfaceContent = await this.generateInterface(resourceConfig);
    const interfacePath = `src/types/${resourceConfig.pascalCase}.ts`;
    
    if (!options.dryRun) {
      await fs.ensureDir(path.dirname(interfacePath));
      await fs.writeFile(interfacePath, interfaceContent);
    }
    
    generatedFiles.push(interfacePath);
    
    return generatedFiles;
  }

  async generateInterface(resourceConfig) {
    const templatePath = path.join(this.templateDir, 'interface.hbs');
    const template = await fs.readFile(templatePath, 'utf8');
    const compiledTemplate = Handlebars.compile(template);
    
    return compiledTemplate({
      resourceName: resourceConfig.pascalCase,
      fields: resourceConfig.fields,
      hasEnumFields: resourceConfig.fields.some(f => f.type === 'enum')
    });
  }
}

module.exports = TypeScriptGenerator;
```

### Database Generator

**File: `scripts/resource-cli/generators/DatabaseGenerator.js`**
```javascript
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

class DatabaseGenerator {
  constructor() {
    this.templateDir = path.join(__dirname, '../templates/database');
  }

  async generate(resourceConfig, options) {
    const generatedFiles = [];
    
    // Generate migration
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const migrationContent = await this.generateMigration(resourceConfig);
    const migrationPath = `src/migrations/${timestamp}_create_${resourceConfig.kebabCase}.sql`;
    
    if (!options.dryRun) {
      await fs.ensureDir(path.dirname(migrationPath));
      await fs.writeFile(migrationPath, migrationContent);
    }
    
    generatedFiles.push(migrationPath);
    
    return generatedFiles;
  }

  async generateMigration(resourceConfig) {
    const templatePath = path.join(this.templateDir, 'migration.hbs');
    const template = await fs.readFile(templatePath, 'utf8');
    const compiledTemplate = Handlebars.compile(template);
    
    return compiledTemplate({
      tableName: resourceConfig.camelCase,
      resourceName: resourceConfig.camelCase,
      fields: resourceConfig.fields.map(field => ({
        ...field,
        sqlType: this.mapTypeToSQL(field.type),
        hasConstraint: field.required || field.unique
      }))
    });
  }

  mapTypeToSQL(type) {
    const mapping = {
      string: 'VARCHAR(255)',
      text: 'TEXT',
      number: 'INTEGER',
      boolean: 'BOOLEAN',
      date: 'TIMESTAMPTZ',
      uuid: 'UUID',
      email: 'VARCHAR(255)',
      url: 'VARCHAR(500)',
      json: 'JSONB',
      enum: 'VARCHAR(50)'
    };
    
    return mapping[type] || 'VARCHAR(255)';
  }
}

module.exports = DatabaseGenerator;
```

## Template System

### Handlebars Templates

**File: `scripts/resource-cli/templates/typescript/interface.hbs`**
```handlebars
import { z } from 'zod';

{{#if hasEnumFields}}
// Enum definitions
{{#each fields}}
{{#if (eq type 'enum')}}
export const {{pascalCase name}}Enum = z.enum([{{#each enumOptions}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}]);
{{/if}}
{{/each}}
{{/if}}

// Zod schema for validation
export const {{resourceName}}Schema = z.object({
  id: z.string().uuid(),
  {{#each fields}}
  {{name}}: {{zodType type required enumOptions}},
  {{/each}}
  owner_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// TypeScript interface
export interface {{resourceName}} extends z.infer<typeof {{resourceName}}Schema> {}

// Create/Update schemas
export const Create{{resourceName}}Schema = {{resourceName}}Schema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const Update{{resourceName}}Schema = Create{{resourceName}}Schema.partial().omit({
  tenant_id: true,
  owner_id: true
});

export interface Create{{resourceName}} extends z.infer<typeof Create{{resourceName}}Schema> {}
export interface Update{{resourceName}} extends z.infer<typeof Update{{resourceName}}Schema> {}
```

**Handlebars Helpers:**
```javascript
// Register Handlebars helpers
Handlebars.registerHelper('zodType', function(type, required, enumOptions) {
  let zodType;
  
  switch (type) {
    case 'string':
      zodType = 'z.string()';
      break;
    case 'number':
      zodType = 'z.number()';
      break;
    case 'boolean':
      zodType = 'z.boolean()';
      break;
    case 'date':
      zodType = 'z.string().datetime()';
      break;
    case 'email':
      zodType = 'z.string().email()';
      break;
    case 'url':
      zodType = 'z.string().url()';
      break;
    case 'uuid':
      zodType = 'z.string().uuid()';
      break;
    case 'enum':
      zodType = `${this.pascalCase(this.name)}Enum`;
      break;
    default:
      zodType = 'z.string()';
  }
  
  if (!required) {
    zodType += '.optional()';
  }
  
  return zodType;
});

Handlebars.registerHelper('pascalCase', function(str) {
  return str.replace(/(\w)(\w*)/g, (_, first, rest) => 
    first.toUpperCase() + rest.toLowerCase()
  );
});

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});
```

## Usage Examples

### Generate a Complete Resource
```bash
# Interactive generation
npx resource generate project

# With predefined fields
npx resource generate project --fields "name:string,description:text,status:enum,budget:number"

# API only (no UI components)
npx resource generate project --type api-only

# Dry run to see what would be generated
npx resource generate project --dry-run
```

### Validate Existing Resource
```bash
# Validate resource implementation
npx resource validate project

# Validate and attempt to fix issues
npx resource validate project --fix
```

### Generate Migration Only
```bash
# Generate database migration
npx resource migrate project

# Generate rollback migration
npx resource migrate project --rollback
```

## Integration with Build Process

### Package.json Scripts
```json
{
  "scripts": {
    "resource:generate": "node scripts/resource-cli/index.js generate",
    "resource:validate": "node scripts/resource-cli/index.js validate",
    "resource:list": "node scripts/resource-cli/index.js list"
  }
}
```

### Pre-commit Hooks
```javascript
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate all resources before commit
npm run resource:validate
```

## Future Enhancements

### Advanced Features
- **Visual Resource Designer**: Web-based UI for resource design
- **Import/Export**: Resource definitions from/to JSON
- **Version Management**: Track resource schema changes
- **Auto-completion**: IDE integration for resource names
- **Dependency Analysis**: Show resource relationships
- **Performance Analysis**: Identify optimization opportunities

### Integration Possibilities
- **CI/CD Pipeline**: Automated resource validation
- **Documentation Generation**: Auto-generate API docs
- **Testing Integration**: Generate comprehensive test suites
- **Deployment Automation**: Deploy resources to environments
- **Monitoring Integration**: Auto-configure monitoring for resources

## Related Documentation

- [Practical Resource Integration Guide](PRACTICAL_RESOURCE_INTEGRATION_GUIDE.md)
- [Resource Code Templates](RESOURCE_CODE_TEMPLATES.md)
- [Resource Integration Checklist](RESOURCE_INTEGRATION_CHECKLIST.md)
- [Core Patterns](../ai-development/CORE_PATTERNS.md)

## Installation Instructions

```bash
# Install CLI globally
npm install -g @enterprise-app/resource-cli

# Or use npx for one-time usage
npx @enterprise-app/resource-cli generate MyResource
```

This CLI tool significantly reduces the time and effort required to integrate new resources into the system while ensuring consistency and following best practices.
