import { Container, Service } from 'typedi';
import { PromptBuilderService } from './promptBuilder';

@Service()
export class PromptService {
  private promptBuilder: PromptBuilderService;

  constructor() {
    this.promptBuilder = Container.get(PromptBuilderService);
  }

  async buildPrompt(
    chatbotId: string,
    message: string,
    context: string[],
    model: string
  ) {
    return this.promptBuilder.buildPrompt({
      chatbotId,
      userMessage: message,
      chunks: context,
      model,
      maxTokens: 4096,
    });
  }
}
