export { ChatCore } from './src/index.mjs';

export function createAgent(config) {
    return new ChatCore({
        acceptAll: config.acceptAll,
        tools: config.tools,
        llmService: config.llmService, // replace with model name, make orange-llm a dep of this

        // isTool: true / false. This allows the agent to be listed as a tool in another agent

        // systemPrompt: string, make that part of config ather than initialize function
    });
}


/* 

// u can also do "createAgentAsTool"
const agent = createAgent({
    system: string
    messages: string[]
    llm: LLM
    tools: Tool[]
})

agent.on({
    'start': () => {},
    'toolStart': () => {},
    'toolConfirmation': () => {},
    'toolEnd': () => {},
    'userSent': ) => {},
    'assistantReceive': () => {},
   
})


let lastInput = prompt()

while true {
    const res = await agent.run(lastInput) // returns last assistant message, its also in message state
    lastInput = prompt() // no need to handle toolConfirm that is handled on task.on
} 

const agentMessages = agent.messages




const result = await task.run('message')
{
    finalResponse: string,
    toolsReport: object,
    messages: []
}

*/