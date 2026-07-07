import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  tool,
} from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import z from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const system_prompt = `You are an expert SQL assistant that helps users to query their database using natural
    language.
    You have access to following tools:
    1. db tool  - call this tool to query the database. 
    
    Rules:
    -Generate ONLY SELECT queries(NO INSERT< UPDATE< DELETE< DROP)
    -Return valid SQLite syntax
    
    Always respond in a helpfulc conversational tone while being technically accurate.`;

    const result = streamText({
      model: google('gemini-2.5-flash'),
      messages: await convertToModelMessages(messages),
      system: system_prompt,
      tools: {
        weather: tool({
          description: 'Call this tool to query a database.',
          inputSchema: z.object({
            query: z.string().describe('The SQL query to execute'),
          }),
          execute: async ({ query }) => {
            console.log('Query', query);

            // make db call

            return query;
          },
        }),
      },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error: any) {
    console.error("Error in /api/chat route:", error);
    return new Response(
      JSON.stringify({ error: error.message || String(error), stack: error.stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}