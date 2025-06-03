# Step 1
I need this package to expose an api like this:


```mjs
const agent = createAgent({
    system: string
    messages: string[]
    llm: LLM
    tools: Tool[]
})

```

- system is the system message
- essages is the array of messages to start the conversation with.
- llm is a `createLLM` result. same as what is currently the "llmService" righ now
- tools is an array of tools to use.


# Step 2

The agent should expose an event listener like so:

```mjs

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
```

the user can register event handlers.


# Step 3

The agent should stop when it yeilds control back to the user in a "waiting for user" state. The user can run the agent a loop to accomplish a conversation session. Here is how it would be done:

```mjs

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
```

The last assistant message will be emitted as an event, but it will also be returned as the result or return value of running `await agent.run(message)`