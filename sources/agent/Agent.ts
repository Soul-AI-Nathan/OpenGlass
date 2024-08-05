import * as React from 'react';
import { AsyncLock } from "../utils/lock";
import { imageDescription, llamaFind, describeImagesWithChat } from "./imageDescription"; // Import the new function
import { startAudio } from '../modules/openai';

type AgentState = {
    lastDescription?: string;
    answer?: string;
    loading: boolean;
}

export class Agent {
    #lock = new AsyncLock();
    #photos: { photo: Uint8Array, description: string }[] = [];
    #state: AgentState = { loading: false };
    #stateCopy: AgentState = { loading: false };
    #stateListeners: (() => void)[] = [];

    async addPhoto(photos: Uint8Array[]) {
        await this.#lock.inLock(async () => {

            // Append photos
            let lastDescription: string | null = null;
            for (let p of photos) {
                console.log('Processing photo', p.length);
                let description = await imageDescription(p);
                console.log('Description', description);
                this.#photos.push({ photo: p, description });
                lastDescription = description;
            }

            // TODO: Update summaries

            // Update UI
            if (lastDescription) {
                this.#state.lastDescription = lastDescription;
                this.#notify();
            }
        });
    }

    async answer(question: string) {
        try {
            startAudio();
        } catch (error) {
            console.log("Failed to start audio");
        }
        if (this.#state.loading) {
            return;
        }
        this.#state.loading = true;
        this.#notify();
        await this.#lock.inLock(async () => {
            const systemPrompt = `
                You are a smart AI that needs to read through descriptions of images and answer user's questions.
                DO NOT mention the images, scenes, or descriptions in your answer, just answer the question.
                DO NOT try to generalize or provide possible scenarios.
                ONLY use the information in the description of the images to answer the question.
                BE concise and specific.
            `;
            const userPrompt = question;
            const images = this.#photos.map(p => p.photo);
            console.log('Sending request to describeImagesWithChat:', { systemPrompt, userPrompt, images });
            let answer = await describeImagesWithChat(systemPrompt, userPrompt, images);
            console.log('Received answer from describeImagesWithChat:', answer);
            this.#state.answer = answer;
            this.#state.loading = false;
            this.#notify();
        });
    }

    #notify = () => {
        this.#stateCopy = { ...this.#state };
        for (let l of this.#stateListeners) {
            l();
        }
    }

    use() {
        const [state, setState] = React.useState(this.#stateCopy);
        React.useEffect(() => {
            const listener = () => setState(this.#stateCopy);
            this.#stateListeners.push(listener);
            return () => {
                this.#stateListeners = this.#stateListeners.filter(l => l !== listener);
            }
        }, []);
        return state;
    }
}