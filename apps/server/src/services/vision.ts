import { ChatOpenAI } from '@langchain/openai';
import { AI_MODELS } from './prompts';

/**
 * Extracts plain text from an image using GPT-4o vision.
 * Shared by both ai.ts and ai-extend.ts to avoid duplication.
 */
export async function extractTextFromImage(imageBase64: string): Promise<string> {
  const visionModel = new ChatOpenAI({
    model: AI_MODELS.vision,
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  });

  const extractionResult = await visionModel.invoke([
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
            detail: 'high',
          },
        },
        {
          type: 'text',
          text: `Extract and transcribe ALL text from this image of study notes or material.

Rules:
- Preserve structure, headings, bullet points, numbered lists, and tables.
- For ALL math, formulas, and equations: output them in LaTeX notation wrapped in $ (inline) or $$ (block/display).
  - Inline example: $E = mc^2$
  - Block example (on its own line):

$$\\int_0^\\infty e^{-x} \\, dx = 1$$

- Use double backslashes for LaTeX commands: \\frac, \\sqrt, \\sum, \\int, \\lim, \\text, etc.
- Do NOT use \\(...\\) or \\[...\\] delimiters — only $ and $$.
- Convert handwritten math symbols into proper LaTeX (e.g. a hand-drawn integral → \\int, summation → \\sum).
- For chemical formulas, use subscripts/superscripts: $H_2O$, $CO_2$, $Fe^{3+}$.
- Preserve any diagrams or figures as text descriptions in [brackets].
- Return only the extracted text — no commentary or explanations.`,
        },
      ],
    },
  ]);

  if (typeof extractionResult.content === 'string') {
    return extractionResult.content;
  }

  const parts = extractionResult.content as Array<{ type: string; text?: string }>;
  return parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n');
}
