import { EventBus } from './event_bus.mjs';
import { ConversationManager, NextAction } from './conversation_manager.mjs';

/**
 * Factory function that creates an agent to manage conversations with an LLM
 * @param {Object} config - Configuration object
 * @param {string} config.system - System message for the conversation
 * @param {Array<string>} [config.messages] - Initial messages for the conversation
 * @param {Object} config.llm - LLM service instance
 * @param {Array} [config.tools] - Array of tool instances
 * @param {boolean} [config.acceptAll=false] - Whether to accept all tool executions without confirmation
 * @returns {Object} Agent object with public methods
 */
export function createAgent(config) {
  // Private variables
  const system = config.system;
  const initialMessages = config.messages || [];
  const llm = config.llm;
  const tools = config.tools || [];
  const acceptAll = config.acceptAll || false;
  
  const eventBus = new EventBus();
  const conversation = new ConversationManager();
  
  // Register tools with LLM service
  llm.registerTools(tools);
  
  // Initialize the agent
  function initialize() {
    // Add system message
    conversation.addSystemMessage(system);

    // Add initial messages if provided
    for (const message of initialMessages) {
      conversation.addUserMessage(message);
    }
  }
  
  // Initialize immediately
  initialize();
  
  /**
   * Process the conversation based on the current state
   * @returns {Promise<void>}
   */
  async function processConversation() {
    const nextAction = conversation.getNextAction();
    
    switch (nextAction) {
      case NextAction.SEND_USER_INPUT_TO_LLM:
      case NextAction.SEND_TOOL_RESULT_TO_LLM:
        await sendToLLM();
        break;
      
      case NextAction.EXECUTE_LOCAL_TOOL:
        await executeNextTool();
        break;
      
      case NextAction.WAIT_FOR_LOCAL_USER_INPUT:
        // Nothing to do, waiting for user input
        break;
    }
  }

  /**
   * Send the current conversation to the LLM
   * @returns {Promise<void>}
   */
  async function sendToLLM() {
    try {
      const messages = conversation.getAllMessages();
      
      const response = await llm.invokeModel(messages);

      if (response.type === 'ASSISTANT_TOOL_REQUEST') {
        await validateAndProcessTools(response.toolCalls || []);
      } else {
        conversation.addAssistantMessage(response.content);
        
        eventBus.emit('assistantReceive', {
          timestamp: Date.now(),
          messageId: Date.now().toString(),
          content: response.content
        });
      }
      
      // Continue processing if needed
      await processConversation();
    } catch (error) {
      console.error('Error in sendToLLM:', error);
      
      eventBus.emit('error', {
        timestamp: Date.now(),
        error: error.message
      });
    }
  }

  /**
   * Validate and process tool calls
   * @param {Array} toolCalls - Array of tool calls
   * @returns {Promise<void>}
   */
  async function validateAndProcessTools(toolCalls) {
    for (const toolCall of toolCalls) {
      const tool = tools.find(x => x.getName() === toolCall.name);
      if (!tool) continue;

      conversation.addToolRequestMessage(
        toolCall.name,
        toolCall.toolUseId,
        toolCall.input
      );

      if (!tool.validate(toolCall.input).ok) {
        const error = tool.validate(toolCall.input).error;
        emitToolError(toolCall, error);
        conversation.addToolResultMessage(
          toolCall.toolUseId,
          { error },
          error
        );
        return;
      }

      if (!acceptAll && needsConfirmation(toolCall, tool)) {
        requestConfirmation(toolCall);
        return;
      }

      await executeValidatedTool(toolCall.toolUseId);
    }
  }

  /**
   * Execute the next tool in the conversation
   * @returns {Promise<void>}
   */
  async function executeNextTool() {
    const messages = conversation.getAllMessages();
    const toolRequest = messages.find(msg => 
      msg.type === 'tool-request' && 
      !messages.some(m => m.type === 'tool-result' && m.toolUseId === msg.toolUseId)
    );

    if (toolRequest) {
      await executeValidatedTool(toolRequest.toolUseId);
    }
  }

  /**
   * Check if a tool call needs confirmation
   * @param {Object} toolCall - Tool call object
   * @param {Object} tool - Tool instance
   * @returns {boolean} Whether the tool call needs confirmation
   */
  function needsConfirmation(toolCall, tool) {
    if (toolCall.name === 'execute_bash' && tool.requiresAcceptance(toolCall.input)) {
      return true;
    }
    if (toolCall.name === 'fs_write') {
      return true;
    }
    return false;
  }

  /**
   * Request confirmation for a tool call
   * @param {Object} toolCall - Tool call object
   */
  function requestConfirmation(toolCall) {
    eventBus.emit('toolConfirmation', {
      timestamp: Date.now(),
      toolUseId: toolCall.toolUseId,
      toolName: toolCall.name,
      input: toolCall.input,
      dangerous: true
    });
  }

  /**
   * Execute a validated tool
   * @param {string} toolUseId - Tool use ID
   * @returns {Promise<void>}
   */
  async function executeValidatedTool(toolUseId) {
    const messages = conversation.getAllMessages();
    const toolRequest = messages.find(msg => 
      msg.type === 'tool-request' && 
      msg.toolUseId === toolUseId
    );

    if (!toolRequest) return;

    eventBus.emit('toolStart', {
      timestamp: Date.now(),
      toolUseId: toolRequest.toolUseId,
      toolName: toolRequest.toolName,
      input: toolRequest.content[0].toolUse.input
    });

    try {
      const result = await llm.processToolCalls([toolRequest.content[0].toolUse]);
      
      eventBus.emit('toolEnd', {
        timestamp: Date.now(),
        toolUseId: toolRequest.toolUseId,
        toolName: toolRequest.toolName,
        result: result,
        duration: 0
      });

      for (const res of result) {
        const content = res.content;
        conversation.addToolResultMessage(
          res.toolUseId,
          res.content,
          content.error
        );
      }
      
      // Continue processing
      await processConversation();
    } catch (error) {
      console.error(`Error executing tool: ${error.message}`);
      emitToolError(toolRequest, error.message);
      
      // Add a tool result message with the error
      conversation.addToolResultMessage(
        toolRequest.toolUseId,
        { error: error.message },
        error.message
      );
      
      // Continue processing
      await processConversation();
    }
  }

  /**
   * Emit a tool error event
   * @param {Object} toolCall - Tool call object
   * @param {string} error - Error message
   */
  function emitToolError(toolCall, error) {
    eventBus.emit('error', {
      timestamp: Date.now(),
      toolUseId: toolCall.toolUseId,
      toolName: toolCall.name,
      error: error
    });
  }

  // Return the public API
  return {
    /**
     * Register event handlers
     * @param {Object} handlers - Event handlers object
     * @returns {Object} This agent instance for method chaining
     */
    on(handlers) {
      // Core events from requirements
      if (handlers.start) {
        eventBus.on('start', handlers.start);
      }
      if (handlers.toolStart) {
        eventBus.on('toolStart', handlers.toolStart);
      }
      if (handlers.toolConfirmation) {
        eventBus.on('toolConfirmation', handlers.toolConfirmation);
      }
      if (handlers.toolEnd) {
        eventBus.on('toolEnd', handlers.toolEnd);
      }
      if (handlers.userSent) {
        eventBus.on('userSent', handlers.userSent);
      }
      if (handlers.assistantReceive) {
        eventBus.on('assistantReceive', handlers.assistantReceive);
      }
      
      // Additional events
      if (handlers.error) {
        eventBus.on('error', handlers.error);
      }
      if (handlers.fileNewContent) {
        eventBus.on('file:newContentSuggestion', handlers.fileNewContent);
      }
      if (handlers.fileUpdateContent) {
        eventBus.on('file:updateContentSuggestion', handlers.fileUpdateContent);
      }
      if (handlers.tokenUsage) {
        eventBus.on('llm:tokenUsage', handlers.tokenUsage);
      }
      if (handlers.systemClosed) {
        eventBus.on('system:closed', handlers.systemClosed);
      }
      
      return this;
    },

    /**
     * Run the agent with user input
     * @param {string} input - User input
     * @returns {Promise<string>} The last assistant message
     */
    async run(input) {
      // Add user message
      conversation.addUserMessage(input);
      
      // Emit userSent event
      eventBus.emit('userSent', {
        timestamp: Date.now(),
        messageId: Date.now().toString(),
        content: input
      });
      
      // Process the conversation
      await processConversation();
      
      // Return the last assistant message
      const assistantMessages = conversation.getMessagesByType('assistant');
      return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].content : '';
    },

    /**
     * Handle tool confirmation from user
     * @param {string} toolUseId - Tool use ID
     * @param {boolean} confirmed - Whether the tool execution was confirmed
     * @returns {Promise<void>}
     */
    async handleToolConfirmation(toolUseId, confirmed) {
      if (confirmed) {
        await executeValidatedTool(toolUseId);
      } else {
        conversation.addToolResultMessage(
          toolUseId,
          { error: "Tool use was cancelled by the user." },
          'Tool use was cancelled by the user.'
        );
        conversation.addUserMessage('No, do not execute this tool. Lets do something else.');
        await processConversation();
      }
    },

    /**
     * Get all messages in the conversation
     * @returns {Array} All messages in the conversation
     */
    get messages() {
      return conversation.getAllMessages();
    },

    /**
     * Shutdown the agent and clean up resources
     * @returns {Promise<void>}
     */
    async shutdown() {
      // Clear event listeners
      eventBus.clearAllListeners();
    }
  };
}
