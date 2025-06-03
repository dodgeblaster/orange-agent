/**
 * Base Tool class that defines the interface for all tools
 */
export class Tool {
  /**
   * Get the name of the tool
   * @returns {string} The tool name
   */
  getName() {
    throw new Error('Tool must implement getName()');
  }

  /**
   * Get the description of the tool
   * @returns {string} The tool description
   */
  getDescription() {
    throw new Error('Tool must implement getDescription()');
  }

  /**
   * Get the parameters schema for the tool
   * @returns {Object} The parameters schema in JSON Schema format
   */
  getParameters() {
    throw new Error('Tool must implement getParameters()');
  }

  /**
   * Validate parameters against the schema
   * @param {Object} params The parameters to validate
   * @returns {Object} Validation result with { ok: boolean, error?: string }
   */
  validate(params) {
    throw new Error('Tool must implement validate()');
  }

  /**
   * Execute the tool with the given parameters
   * @param {Object} params The parameters to execute the tool with
   * @returns {Promise<Object>} The tool execution result
   */
  async execute(params) {
    throw new Error('Tool must implement execute()');
  }

  /**
   * Check if the tool requires user acceptance before execution
   * @param {Object} params The parameters to check
   * @returns {boolean} Whether the tool requires acceptance
   */
  requiresAcceptance(params) {
    return false;
  }
}

/**
 * Create a tool from a simple function
 * @param {Object} config Tool configuration
 * @param {string} config.name Tool name
 * @param {string} config.description Tool description
 * @param {Object} config.parameters JSON Schema for parameters
 * @param {Function} config.execute Function to execute the tool
 * @param {Function} [config.validate] Function to validate parameters
 * @param {Function} [config.requiresAcceptance] Function to check if tool requires acceptance
 * @returns {Tool} A tool instance
 */
export function createTool(config) {
  return new class extends Tool {
    getName() {
      return config.name;
    }

    getDescription() {
      return config.description;
    }

    getParameters() {
      return config.parameters;
    }

    validate(params) {
      if (config.validate) {
        return config.validate(params);
      }
      
      // Basic validation - check required parameters
      const required = config.parameters?.required || [];
      for (const param of required) {
        if (params[param] === undefined) {
          return { ok: false, error: `Missing required parameter: ${param}` };
        }
      }
      
      return { ok: true };
    }

    async execute(params) {
      return await config.execute(params);
    }

    requiresAcceptance(params) {
      if (config.requiresAcceptance) {
        return config.requiresAcceptance(params);
      }
      return false;
    }
  };
}
