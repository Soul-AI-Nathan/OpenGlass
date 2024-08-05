import { KnownModel, ollamaInference } from "../modules/ollama";
import { groqRequest } from "../modules/groq-llama3";
import { gptRequest } from "../modules/openai";
import { describeImageWithChat } from "../modules/openai"; // Import the function

export async function imageDescription(src: Uint8Array, model: KnownModel = 'moondream:1.8b-v2-fp16'): Promise<string> {
    return ollamaInference({
        model: model,
        messages: [{
            role: 'system',
            content: 'You are a very advanced model and your task is to describe the image as precisely as possible. Transcribe any text you see.'
        }, {
            role: 'user',
            content: 'Describe the scene',
            images: [src],
        }]
    });
}

export async function llamaFind(question: string, images: string): Promise<string> {
    return groqRequest(
             `
                You are a smart AI that need to read through description of a images and answer user's questions.

                This are the provided images:
                ${images}

                DO NOT mention the images, scenes or descriptions in your answer, just answer the question.
                DO NOT try to generalize or provide possible scenarios.
                ONLY use the information in the description of the images to answer the question.
                BE concise and specific.
            `
        ,
            question
    );
}

export async function openAIFind(question: string, images: string): Promise<string> {
    return gptRequest(
             `
                You are a smart AI that need to read through description of a images and answer user's questions.

                This are the provided images:
                ${images}

                DO NOT mention the images, scenes or descriptions in your answer, just answer the question.
                DO NOT try to generalize or provide possible scenarios.
                ONLY use the information in the description of the images to answer the question.
                BE concise and specific.
            `
        ,
            question
    );
}

// New function to process images and user questions at once using describeImageWithChat
export async function describeImagesWithChat(systemPrompt: string, userPrompt: string, images: Uint8Array[]): Promise<string> {
    const base64Images = images.map(image => Buffer.from(image).toString('base64'));
    const response = await describeImageWithChat(systemPrompt, userPrompt, base64Images);
    return response; // Adjust this according to the actual response structure
}