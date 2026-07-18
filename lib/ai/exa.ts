import { requireExaApiKey } from "@/lib/env";
import type { ExaAnswerResult, ExaSearchResult, ResearchResult } from "@/types";

const EXA_BASE_URL = "https://api.exa.ai";
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;

type ExaRequestOptions = {
  timeoutMs?: number;
  retries?: number;
};

type SearchParams = {
  query: string;
  numResults?: number;
  includeDomains?: string[];
  type?: "auto" | "neural" | "keyword";
};

type AnswerParams = {
  query: string;
  text?: boolean;
};

type FindSimilarParams = {
  url: string;
  numResults?: number;
};

type ResearchParams = {
  topic: string;
  numResults?: number;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function exaFetch<T>(
  path: string,
  body: Record<string, unknown>,
  options: ExaRequestOptions = {}
): Promise<T> {
  const apiKey = requireExaApiKey();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? MAX_RETRIES;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${EXA_BASE_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Exa API ${path} failed (${response.status}): ${errorText || response.statusText}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.name === "AbortError"
            ? new Error(`Exa API ${path} timed out after ${timeoutMs}ms`)
            : error
          : new Error("Unknown Exa request failure");

      if (attempt < retries) {
        await sleep(400 * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Exa request failed");
}

function mapResults(
  results: Array<Record<string, unknown>> | undefined
): ExaSearchResult[] {
  if (!results?.length) return [];

  return results.map((item) => ({
    title: String(item.title ?? "Untitled"),
    url: String(item.url ?? ""),
    publishedDate: (item.publishedDate as string | null | undefined) ?? null,
    author: (item.author as string | null | undefined) ?? null,
    score: typeof item.score === "number" ? item.score : null,
    text:
      typeof item.text === "string"
        ? item.text
        : typeof (item as { summary?: string }).summary === "string"
          ? (item as { summary?: string }).summary ?? null
          : null,
  }));
}

export async function search(
  params: SearchParams,
  options?: ExaRequestOptions
): Promise<ExaSearchResult[]> {
  const data = await exaFetch<{ results?: Array<Record<string, unknown>> }>(
    "/search",
    {
      query: params.query,
      numResults: params.numResults ?? 6,
      type: params.type ?? "auto",
      includeDomains: params.includeDomains,
      contents: {
        text: { maxCharacters: 1200 },
      },
    },
    options
  );

  return mapResults(data.results);
}

export async function answer(
  params: AnswerParams,
  options?: ExaRequestOptions
): Promise<ExaAnswerResult> {
  const data = await exaFetch<{
    answer?: string;
    citations?: Array<Record<string, unknown>>;
  }>(
    "/answer",
    {
      query: params.query,
      text: params.text ?? true,
    },
    options
  );

  return {
    answer: data.answer?.trim() || "No answer generated.",
    citations: mapResults(data.citations),
  };
}

export async function findSimilar(
  params: FindSimilarParams,
  options?: ExaRequestOptions
): Promise<ExaSearchResult[]> {
  const data = await exaFetch<{ results?: Array<Record<string, unknown>> }>(
    "/findSimilar",
    {
      url: params.url,
      numResults: params.numResults ?? 5,
      contents: {
        text: { maxCharacters: 1000 },
      },
    },
    options
  );

  return mapResults(data.results);
}

export async function research(
  params: ResearchParams,
  options?: ExaRequestOptions
): Promise<ResearchResult> {
  const query = `Ahmedabad Municipal Corporation urban infrastructure: ${params.topic}`;

  const [sources, answerResult] = await Promise.all([
    search(
      {
        query,
        numResults: params.numResults ?? 6,
        includeDomains: [
          "ahmedabadcity.gov.in",
          "gujarat.gov.in",
          "timesofindia.indiatimes.com",
          "indianexpress.com",
        ],
      },
      options
    ).catch(() =>
      search({ query, numResults: params.numResults ?? 6 }, options)
    ),
    answer(
      {
        query: `Provide a concise infrastructure intelligence brief for AMC officers about: ${params.topic}. Focus on Ahmedabad, actionable insights, and risks.`,
      },
      options
    ),
  ]);

  return {
    query,
    answer: answerResult.answer,
    sources: sources.length ? sources : answerResult.citations,
  };
}

export const exa = {
  search,
  answer,
  findSimilar,
  research,
};
