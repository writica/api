import { openai } from '@ai-sdk/openai';
export let agent = [];

const baseModel = {
    name: "gpt-4.1-mini-2025-04-14",
    model: "gpt-4.1-mini-2025-04-14",
    system: "You are a helpful assistant.",
    maxSteps: 10,
    temperature: 0.7,
};

export const initAgent = async (options={}) => {
    let config = {
        ...baseModel,
        ...options,
    };

    if(agent[config.name]) return agent[config.name];

    agent[config.name] = {
        model: await openai(config.model),
        system: config.system || "You are a helpful assistant.",
        maxSteps: 10,
    };
    return agent[config.name];
};