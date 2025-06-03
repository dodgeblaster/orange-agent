# Creating Custom Tools for Orange Agent

This guide explains how to create custom tools for the Orange Agent framework.

## Tool Interface

All tools in Orange Agent must implement the following interface:

| Method | Description |
|--------|-------------|
| `getName()` | Returns the name of the tool |
| `getDescription()` | Returns a description of what the tool does |
| `getParameters()` | Returns a JSON Schema object describing the parameters |
| `validate(params)` | Validates the parameters and returns `{ ok: true }` or `{ ok: false, error: 'message' }` |
| `execute(params)` | Executes the tool with the given parameters and returns a result object |
| `requiresAcceptance(params)` | Optional: Returns true if the tool requires user confirmation before execution |

## Creating Tools

There are two main ways to create tools in Orange Agent:

1. Using the `createTool` helper function (recommended for simple tools)
2. Extending the `Tool` class (recommended for complex tools)

### Using the `createTool` Helper

The `createTool` helper function is the simplest way to create a tool:

```javascript
import { createTool } from 'orange-agent';

const myTool = createTool({
  name: 'myTool',
  description: 'Does something useful',
  parameters: {
    type: 'object',
    properties: {
      param1: { 
        type: 'string', 
        description: 'First parameter' 
      },
      param2: { 
        type: 'number', 
        description: 'Second parameter' 
      }
    },
    required: ['param1']
  },
  execute: async (params) => {
    try {
      // Your tool implementation here
      const result = doSomething(params.param1, params.param2);
      return { result };
    } catch (error) {
      return { error: error.message };
    }
  },
  // Optional: Custom validation
  validate: (params) => {
    if (!params.param1) {
      return { ok: false, error: 'param1 is required' };
    }
    if (params.param2 && params.param2 < 0) {
      return { ok: false, error: 'param2 must be non-negative' };
    }
    return { ok: true };
  },
  // Optional: Check if tool requires user confirmation
  requiresAcceptance: (params) => {
    // For example, require confirmation for certain operations
    return params.param1 === 'dangerous-operation';
  }
});
```

### Extending the Tool Class

For more complex tools, you can extend the `Tool` class:

```javascript
import { Tool } from 'orange-agent';

class MyComplexTool extends Tool {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.client = new SomeApiClient(apiKey);
  }

  getName() {
    return 'myComplexTool';
  }

  getDescription() {
    return 'Does something complex with an external API';
  }

  getParameters() {
    return {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query to send to the API'
        },
        options: {
          type: 'object',
          description: 'Additional options',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of results'
            },
            filter: {
              type: 'string',
              description: 'Filter criteria'
            }
          }
        }
      },
      required: ['query']
    };
  }

  validate(params) {
    if (!params.query) {
      return { ok: false, error: 'Query is required' };
    }
    if (params.options?.limit && params.options.limit > 100) {
      return { ok: false, error: 'Limit cannot exceed 100' };
    }
    return { ok: true };
  }

  async execute(params) {
    try {
      const results = await this.client.search(
        params.query, 
        params.options?.limit || 10,
        params.options?.filter
      );
      
      return {
        results: results.map(r => ({
          id: r.id,
          title: r.title,
          summary: r.summary
        })),
        count: results.length,
        totalAvailable: results.totalCount
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  requiresAcceptance(params) {
    // Require confirmation for expensive API calls
    return params.options?.limit > 50;
  }
}
```

## Best Practices for Tool Development

### 1. Clear Naming and Description

- Use clear, descriptive names for your tools
- Provide detailed descriptions that explain what the tool does
- Use consistent naming conventions across your tools

### 2. Well-Defined Parameters

- Use JSON Schema to clearly define the parameters your tool accepts
- Include descriptions for each parameter
- Specify which parameters are required
- Use appropriate types (string, number, boolean, object, array)

### 3. Robust Validation

- Validate all parameters before execution
- Return clear error messages when validation fails
- Check for missing required parameters
- Validate parameter types and ranges

### 4. Error Handling

- Wrap your execute method in try/catch blocks
- Return errors in a consistent format: `{ error: 'Error message' }`
- Provide helpful error messages that guide the user to fix the issue

### 5. Security Considerations

- Use `requiresAcceptance` for potentially dangerous operations
- Sanitize inputs to prevent injection attacks
- Be careful with file system operations, command execution, etc.
- Don't expose sensitive information in error messages

### 6. Performance

- Keep tools focused on a single responsibility
- Optimize for performance, especially for frequently used tools
- Consider caching results when appropriate
- Use async/await for asynchronous operations

## Example: File System Tool

Here's a complete example of a tool that interacts with the file system:

```javascript
import { Tool } from 'orange-agent';
import fs from 'fs/promises';
import path from 'path';

class FileSystemTool extends Tool {
  getName() {
    return 'fileSystem';
  }

  getDescription() {
    return 'Performs file system operations like reading and writing files';
  }

  getParameters() {
    return {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'Operation to perform: read, write, list',
          enum: ['read', 'write', 'list']
        },
        path: {
          type: 'string',
          description: 'File or directory path'
        },
        content: {
          type: 'string',
          description: 'Content to write (for write operation)'
        }
      },
      required: ['operation', 'path']
    };
  }

  validate(params) {
    if (!params.operation) {
      return { ok: false, error: 'Operation is required' };
    }
    
    if (!params.path) {
      return { ok: false, error: 'Path is required' };
    }
    
    if (params.operation === 'write' && !params.content) {
      return { ok: false, error: 'Content is required for write operation' };
    }
    
    return { ok: true };
  }

  async execute(params) {
    try {
      switch (params.operation) {
        case 'read':
          const content = await fs.readFile(params.path, 'utf8');
          return { content };
          
        case 'write':
          await fs.writeFile(params.path, params.content, 'utf8');
          return { success: true, message: `File written to ${params.path}` };
          
        case 'list':
          const files = await fs.readdir(params.path);
          const fileStats = await Promise.all(
            files.map(async (file) => {
              const filePath = path.join(params.path, file);
              const stats = await fs.stat(filePath);
              return {
                name: file,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modified: stats.mtime
              };
            })
          );
          return { files: fileStats };
          
        default:
          return { error: `Unknown operation: ${params.operation}` };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  requiresAcceptance(params) {
    // Require confirmation for write operations
    return params.operation === 'write';
  }
}
```

## Using Your Tools with Orange Agent

Once you've created your tools, you can use them with Orange Agent:

```javascript
import { createAgent } from 'orange-agent';
import { createLLM } from 'llm-service';
import { MyTool } from './my-tool.js';

// Create LLM service
const llm = createLLM({
  region: 'us-west-2',
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  provider: 'bedrock'
});

// Create your tools
const myTool = new MyTool();

// Create agent with your tools
const agent = createAgent({
  system: "You are a helpful assistant with access to custom tools.",
  messages: ["Hello, how can I help you today?"],
  llm: llm,
  tools: [myTool],
  acceptAll: false
});

// Run the agent
const response = await agent.run("Can you help me with...");
```
