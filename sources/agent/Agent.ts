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
    #photos: Uint8Array[] = [];
    #state: AgentState = { loading: false };
    #stateCopy: AgentState = { loading: false };
    #stateListeners: (() => void)[] = [];

    async addPhoto(photos: Uint8Array[]) {
        await this.#lock.inLock(async () => {
            this.#photos.push(...photos);
            this.#notify();
        });
    }

    async answer(question: string, photos?: Uint8Array[]) {
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
            if (photos) {
                this.#photos.push(...photos);
            }

            const systemPrompt = `
                You are a smart AI that needs to answer user's questions based on images provided. 
                You can describe the images as precisely as possible. 
                Combine all information from all images to answer the user's questions.
                DO NOT try to generalize or provide possible scenarios.
                ONLY use the information in the images to answer the question.
                BE concise and specific.
            `;
            const userPrompt = question;
            const images = this.#photos;
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