import { randomUUID } from 'crypto';

/**
 * Types of messages in the conversation history
 */
export const MessageType = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL_REQUEST: 'tool-request',
  TOOL_RESULT: 'tool-result',
  INFO: 'info'
};

/**
 * Next action to take based on the last message in the conversation
 */
export const NextAction = {
  SEND_USER_INPUT_TO_LLM: 'SEND_USER_INPUT_TO_LLM',
  WAIT_FOR_LOCAL_USER_INPUT: 'WAIT_FOR_LOCAL_USER_INPUT',
  EXECUTE_LOCAL_TOOL: 'EXECUTE_LOCAL_TOOL',
  SEND_TOOL_RESULT_TO_LLM: 'SEND_TOOL_RESULT_TO_LLM'
};

export const BedrockType = {
  ASSISTANT: 'assistant',
  USER: 'user',
  SYSTEM: 'system'
};

export class ConversationManager {
  constructor() {
    this.messages = new Map();
    this.messageOrder = [];
  }

  /**
   * Get the raw message map and order array
   */
  getHistory() {
    return {
      messages: new Map(this.messages),
      messageOrder: [...this.messageOrder]
    };
  }

  /**
   * Add a message to the store
   */
  addMessage(message) {
    this.messages.set(message.id, message);
    this.messageOrder.push(message.id);
    return message.id;
  }

  /**
   * Add a system message
   */
  addSystemMessage(content) {
    const message = {
      id: randomUUID(),
      timestamp: new Date(),
      type: MessageType.SYSTEM,
      bedrockType: BedrockType.SYSTEM,
      content
    };
    return this.addMessage(message);
  }

  /**
   * Add a user message
   */
  addUserMessage(content) {
    const message = {
      id: randomUUID(),
      timestamp: new Date(),
      type: MessageType.USER,
      bedrockType: BedrockType.USER,
      content
    };
    return this.addMessage(message);
  }

  /**
   * Add an assistant message
   */
  addAssistantMessage(content) {
    const message = {
      id: randomUUID(),
      timestamp: new Date(),
      type: MessageType.ASSISTANT,
      bedrockType: BedrockType.ASSISTANT,
      content
    };
    return this.addMessage(message);
  }

  /**
   * Add a tool request message
   */
  addToolRequestMessage(toolName, toolUseId, input) {
    const message = {
      id: randomUUID(),
      timestamp: new Date(),
      type: MessageType.TOOL_REQUEST,
      bedrockType: BedrockType.ASSISTANT,
      content: [{
        toolUse: {
          toolUseId,
          name: toolName,
          input,
        },
      }],
      toolName,
      toolUseId,
    };
    return this.addMessage(message);
  }

  /**
   * Add a tool result message
   */
  addToolResultMessage(toolUseId, content, error) {
    const message = {
      id: randomUUID(),
      timestamp: new Date(),
      type: MessageType.TOOL_RESULT,
      bedrockType: BedrockType.USER,
      toolUseId,
      content: [{
        toolResult: {
          toolUseId,
          content: [{ json: typeof content === 'string' ? { result: content } : content }],
          status: error ? "error" : "success",
        }
      }],
      error
    };
    return this.addMessage(message);
  }

  /**
   * Add an info message
   */
  addInfoMessage(content) {
    const message = {
      id: randomUUID(),
      timestamp: new Date(),
      type: MessageType.INFO,
      bedrockType: BedrockType.USER,
      content,
      input: content
    };
    return this.addMessage(message);
  }

  /**
   * Get all messages in chronological order
   */
  getAllMessages() {
    return this.messageOrder.map(id => this.messages.get(id));
  }

  /**
   * Get a specific message by ID
   */
  getMessage(id) {
    return this.messages.get(id);
  }

  /**
   * Get messages of a specific type
   */
  getMessagesByType(type) {
    return this.messageOrder
      .map(id => this.messages.get(id))
      .filter(message => message.type === type);
  }

  /**
   * Get the last user message
   */
  getLastUserMessage() {
    const userMessages = this.getMessagesByType(MessageType.USER);
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : undefined;
  }

  /**
   * Get the last message of any type
   */
  getLastMessage() {
    if (this.messageOrder.length === 0) return undefined;
    const lastId = this.messageOrder[this.messageOrder.length - 1];
    return this.messages.get(lastId);
  }

  /**
   * Clear all messages
   */
  clear() {
    this.messages.clear();
    this.messageOrder = [];
  }

  /**
   * Determine the next action to take based on the last message
   */
  getNextAction() {
    const lastMessage = this.getLastMessage();
    
    if (!lastMessage) {
      return NextAction.WAIT_FOR_LOCAL_USER_INPUT;
    }

    switch (lastMessage.type) {
      case MessageType.USER:
        return NextAction.SEND_USER_INPUT_TO_LLM;
      case MessageType.ASSISTANT:
        return NextAction.WAIT_FOR_LOCAL_USER_INPUT;
      case MessageType.TOOL_REQUEST:
        return NextAction.EXECUTE_LOCAL_TOOL;
      case MessageType.TOOL_RESULT:
        return NextAction.SEND_TOOL_RESULT_TO_LLM;
      case MessageType.SYSTEM:
        return NextAction.WAIT_FOR_LOCAL_USER_INPUT;
      case MessageType.INFO:
        // Look at previous non-INFO message
        const messages = this.getAllMessages();
        for (let i = messages.length - 2; i >= 0; i--) {
          if (messages[i].type !== MessageType.INFO) {
            const tempMessage = messages[i];
            return this.getNextActionForType(tempMessage.type);
          }
        }
        return NextAction.WAIT_FOR_LOCAL_USER_INPUT;
      default:
        return NextAction.WAIT_FOR_LOCAL_USER_INPUT;
    }
  }

  getNextActionForType(type) {
    switch (type) {
      case MessageType.USER:
        return NextAction.SEND_USER_INPUT_TO_LLM;
      case MessageType.ASSISTANT:
        return NextAction.WAIT_FOR_LOCAL_USER_INPUT;
      case MessageType.TOOL_REQUEST:
        return NextAction.EXECUTE_LOCAL_TOOL;
      case MessageType.TOOL_RESULT:
        return NextAction.SEND_TOOL_RESULT_TO_LLM;
      default:
        return NextAction.WAIT_FOR_LOCAL_USER_INPUT;
    }
  }
}
