import { createAgent, createTool, Tool } from 'orange-agent';
import { createLLM } from 'llm-service';

// Example 1: Create a tool using the createTool helper
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
      // Note: Using eval is not safe for production
      // This is just for demonstration purposes
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

// Example 2: Create a tool by extending the Tool class
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
      // This is a mock implementation
      // In a real application, you would call a weather API
      console.log(`Getting weather for ${params.location}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock data
      return {
        temperature: '72°F',
        conditions: 'Sunny',
        forecast: 'Clear skies for the next 24 hours'
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

// Create LLM service
const llm = createLLM({
  region: 'us-west-2',
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  provider: 'bedrock'
});

// Create agent with our custom tools
const agent = createAgent({
  system: "You are a helpful assistant with access to calculator and weather tools.",
  messages: ["Hello, how can I help you today?"],
  llm: llm,
  tools: [calculatorTool, new WeatherTool()],
  acceptAll: false
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

// Example usage
async function main() {
  try {
    // Run the agent with a question that will use the calculator tool
    let response = await agent.run("What is 42 * 7?");
    console.log("Response:", response);
    
    // Run the agent with a question that will use the weather tool
    response = await agent.run("What's the weather like in Seattle?");
    console.log("Response:", response);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await agent.shutdown();
  }
}

main();
