import axios from "axios";
import fs from "fs";
import { keys } from "../keys";

// Function to convert image to base64
function imageToBase64(path: string) {
    const image = fs.readFileSync(path, { encoding: 'base64' });
    return `data:image/jpeg;base64,${image}`; // Adjust the MIME type if necessary (e.g., image/png)
}

export async function transcribeAudio(audioPath: string) {
    const audioBase64 = fs.readFileSync(audioPath, { encoding: 'base64' });
    try {
        const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", {
            audio: audioBase64,
        }, {
            headers: {
                'Authorization': `Bearer ${keys.openai}`,  // Replace YOUR_API_KEY with your actual OpenAI API key
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error in transcribeAudio:", error);
        return null; // or handle error differently
    }
}

let audioContext: AudioContext;

export async function startAudio() {
    audioContext = new AudioContext();
}

export async function textToSpeech(text: string) {
    try {
        const response = await axios.post("https://api.openai.com/v1/audio/speech", {
            input: text,    // Use 'input' instead of 'text'
            voice: "nova",
            model: "tts-1",
        }, {
            headers: {
                'Authorization': `Bearer ${keys.openai}`,  // Replace YOUR_API_KEY with your actual OpenAI API key
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'  // This will handle the binary data correctly
        });

        // Decode the audio data asynchronously
        const audioBuffer = await audioContext.decodeAudioData(response.data);

        // Create an audio source
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();  // Play the audio immediately

        return response.data;
    } catch (error) {
        console.error("Error in textToSpeech:", error);
        return null; // or handle error differently
    }
}

// Function to describe image
export async function describeImage(imagePath: string) {
    const imageBase64 = imageToBase64(imagePath);
    try {
        const response = await axios.post("https://api.openai.com/v1/images/descriptions", {
            image: imageBase64,
        }, {
            headers: {
                'Authorization': `Bearer ${keys.openai}`,  // Replace YOUR_API_KEY with your actual OpenAI API key
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error in describeImage:", error);
        return null; // or handle error differently
    }
}


// Function to describe images using gpt-4o-mini
export async function describeImageWithChat(systemPrompt: string, userPrompt: string, imagesBase64: string[]) {
    const messages = imagesBase64.map((imageBase64, index) => ({
        type: "image_url",
        image_url: {
            url: `data:image/jpeg;base64,${imageBase64}` // Ensure the base64 string is correctly formatted
        }
    }));
    
    try {
        const response = await axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: userPrompt
                        },
                        ...messages
                    ]
                }
            ],
            max_tokens: 300
        }, {
            headers: {
                'Authorization': `Bearer ${keys.openai}`,  // Replace YOUR_API_KEY with your actual OpenAI API key
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error in describeImageWithChat:", error);
        return null; // or handle error differently
    }
}

export async function gptRequest(systemPrompt: string, userPrompt: string) {
    try {
        const response = await axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${keys.openai}`,  // Replace YOUR_API_KEY with your actual OpenAI API key
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error in gptRequest:", error);
        return null; // or handle error differently
    }
}

// Example usage of the new describeImageWithChat function
const imagePaths = ["path_to_your_image1.jpg", "path_to_your_image2.jpg"];
const systemPrompt = `
    You are a smart AI that needs to read through descriptions of images and answer user's questions.
    DO NOT mention the images, scenes, or descriptions in your answer, just answer the question.
    DO NOT try to generalize or provide possible scenarios.
    ONLY use the information in the description of the images to answer the question.
    BE concise and specific.
`;
const userPrompt = "What’s in these images?";
describeImageWithChat(systemPrompt, userPrompt, imagePaths)
    .then(response => console.log(response))
    .catch(error => console.error(error));

textToSpeech("Hello I am an agent")
console.info(gptRequest(
    `
        You are a smart AI that needs to read through description of images and answer user's questions.

        These are the provided images:
        The image features a woman standing in an open space with a metal roof, possibly at a train station or another large building.
        She is wearing a hat and appears to be looking up towards the sky.
        The scene captures her attention as she gazes upwards, perhaps admiring something above her or simply enjoying the view from this elevated position.

        DO NOT mention the images, scenes, or descriptions in your answer, just answer the question.
        DO NOT try to generalize or provide possible scenarios.
        ONLY use the information in the description of the images to answer the question.
        BE concise and specific.
    `,
    'where is the person?'
));