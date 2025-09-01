
      import { OpenAIClient } from "@azure/openai";
      import { AzureKeyCredential } from "@azure/core-auth";
      import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
      import 'dotenv/config';

      export async function main() {
          const endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
          const azureApiKey = process.env["AZURE_OPENAI_API_KEY"];
          const deploymentId = process.env["AZURE_OPENAI_DEPLOYMENT_ID"];
          const searchEndpoint = process.env["AZURE_SEARCH_ENDPOINT"];
          const searchKey = process.env["AZURE_SEARCH_API_KEY"];
          const searchIndex = process.env["AZURE_AI_SEARCH_INDEX"];

          if (!endpoint || !azureApiKey || !deploymentId || !searchEndpoint || !searchKey || !searchIndex) {
              console.error("Please set the required environment variables.");
              return;
          }

          const client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));

          const messages = [
              { role: "system", content: "You are an AI assistant that helps people find information." },
              { role: "user", content: "" }
          ];
          console.log(`Message: ${messages.map((m) => m.content).join("\n")}`);

          const events = await client.streamChatCompletions(deploymentId, messages, {
              pastMessages: 10,
              maxTokens: 13107,
              temperature: 0.7,
              topP: 0.95,
              frequencyPenalty: 0,
              presencePenalty: 0,
              
              azureExtensionOptions: {
                  extensions: [
                      {
                          type: "AzureCognitiveSearch",
                          endpoint: searchEndpoint,
                          key: searchKey,
                          indexName: searchIndex,
                      },
                  ],
              },
          });

          let response = "";
          for await (const event of events) {
              for (const choice of event.choices) {
                  const newText = choice.delta?.content;
                  if (!!newText) {
                      response += newText;
                      // To see streaming results as they arrive, uncomment line below
                      // console.log(newText);
                  }
              }
          }
          console.log(response);
      }

      main().catch((err) => {
          console.error("The sample encountered an error:", err);
      });
