import "dotenv/config";
import OpenAI from "openai";

async function testOpenAIConnection() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: "Test OpenAI connection from the United States",
    });

    console.log("OpenAI connection successful");
    console.log(
      "Embedding length:",
      response.data[0].embedding.length
    );
  } catch (error) {
    console.error("OpenAI connection failed:");
    console.error(error);
  }
}

testOpenAIConnection();