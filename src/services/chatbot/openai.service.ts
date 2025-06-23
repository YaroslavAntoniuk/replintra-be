import { OpenAI } from 'openai';
import { Service } from 'typedi';

@Service()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async getResponse(
    prompt: string,
    message: string,
    model: string
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: message },
      ],
    });

    return completion.choices[0]?.message?.content || '';
  }

  async getStreamingResponse(prompt: string, message: string, model: string) {
    return this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: message },
      ],
      stream: true,
    });
  }
}
