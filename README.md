# Orange Agent

Core module for AI agent applications. This module provides the core functionality for managing conversations, tools, and events in AI agent applications.

## Features

- Conversation management
- Tool execution
- Event handling

## Installation

```bash
npm install orange-agent
```

## Usage

```javascript
import { createAgent } from 'orange-agent';
import { createLLM } from 'llm-service';

// Create LLM service
const llm = createLLM({
  region: 'us-west-2',
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  provider: 'bedrock'
});

// Create tools
const tools = [
  // Your tools here
];

// Create agent
const agent = createAgent({
  system: "You are a helpful assistant",
  messages: ["Hello, how can I help you today?"],
  llm: llm,
  tools: tools,
  acceptAll: false // Optional: whether to accept all tool executions without confirmation
});

// Set up event listeners
agent.on({
  'start': (event) => console.log('Agent started'),
  'toolStart': (event) => console.log('Tool started:', event.toolName),
  'toolConfirmation': (event) => console.log('Tool confirmation requested:', event.toolName),
  'toolEnd': (event) => console.log('Tool completed:', event.toolName),
  'userSent': (event) => console.log('User message sent:', event.content),
  'assistantReceive': (event) => console.log('Assistant message received:', event.content)
});

// Run the agent with user input
const response = await agent.run("What's the weather like today?");
console.log("Response:", response);

// Access all messages
console.log("All messages:", agent.messages);
```

## Creating Custom Tools

Orange Agent provides a simple way to create custom tools. You can either implement the `Tool` interface directly or use the `createTool` helper function.

### Using the `createTool` Helper

```javascript
import { createTool } from 'orange-agent';

// Create a simple calculator tool
const calculatorTool = createTool({
  name: 'calculator',
  description: 'Performs basic calculations',
  parameters: {
    type: 'object',
    properties: {
      expression: { 
        type: 'string', 
        description: 'Math expression to evaluate' 
      }
    },
    required: ['expression']
  },
  execute: async (params) => {
    try {
      // Use a safer approach than eval in production
      const result = eval(params.expression);
      return { result };
    } catch (error) {
      return { error: error.message };
    }
  },
  // Optional: Custom validation
  validate: (params) => {
    if (!params.expression) {
      return { ok: false, error: 'Expression is required' };
    }
    return { ok: true };
  },
  // Optional: Check if tool requires user confirmation
  requiresAcceptance: (params) => {
    // For example, require confirmation for complex expressions
    return params.expression.length > 50;
  }
});
```

### Implementing the Tool Interface

For more complex tools, you can extend the `Tool` class:

```javascript
import { Tool } from 'orange-agent';

class WeatherTool extends Tool {
  getName() {
    return 'weather';
  }

  getDescription() {
    return 'Gets the current weather for a location';
  }

  getParameters() {
    return {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name or zip code'
        }
      },
      required: ['location']
    };
  }

  validate(params) {
    if (!params.location) {
      return { ok: false, error: 'Location is required' };
    }
    return { ok: true };
  }

  async execute(params) {
    try {
      // Call a weather API
      const response = await fetch(`https://api.weather.com?location=${params.location}`);
      const data = await response.json();
      return {
        temperature: data.temperature,
        conditions: data.conditions,
        forecast: data.forecast
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  requiresAcceptance(params) {
    // No need for confirmation
    return false;
  }
}
```

## Tool Interface

All tools must implement the following interface:

| Method | Description |
|--------|-------------|
| `getName()` | Returns the name of the tool |
| `getDescription()` | Returns a description of what the tool does |
| `getParameters()` | Returns a JSON Schema object describing the parameters |
| `validate(params)` | Validates the parameters and returns `{ ok: true }` or `{ ok: false, error: 'message' }` |
| `execute(params)` | Executes the tool with the given parameters and returns a result object |
| `requiresAcceptance(params)` | Optional: Returns true if the tool requires user confirmation before execution |

## Components

### Agent

The main class that orchestrates the conversation flow, tool execution, and LLM interactions.

### ConversationManager

Manages conversation messages and state in a single component.

### EventBus

Handles events between components.

## License

ISC
