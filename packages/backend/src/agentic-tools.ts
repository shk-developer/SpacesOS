import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/**
 * Agentic Tools
 *
 * - Loads config from (in order): path argument -> AGENTIC_CONFIG env var -> ./agentic-config.yaml -> ./agentic-config.json
 * - Exposes:
 *    - searchSpaces(query)
 *    - searchPapers(query)
 *    - searchModels(query, filters?)
 *    - getModelDetails(modelId)
 *    - searchDatasets(query, filters?)
 *    - getDatasetDetails(datasetId)
 *    - runSpaceAsMCP(spaceId, payload)  // proxy/run call to a Space MCP endpoint
 *    - callModel(options)  // unified inference call with BYOK + fallback routing
 *
 * NOTE: This module purposely returns parsed JSON and does not print secrets.
 * Make sure your runtime provides global fetch (Node 18+). For older Node, use node-fetch/polyfill.
 */

type ProviderConfig = {
  huggingface?: {
    token?: string;
    mcp_url?: string;
  };
  openrouter?: {
    api_key?: string;
    priority?: boolean;
    fallback?: boolean;
    url?: string; // optional custom openrouter url
    always_use_this_key?: boolean;
  };
  sheikh?: {
    api_key?: string;
    url?: string;
    priority?: boolean;
  };
  // generic providers (map of providerName -> { api_key, url, priority, fallback, always_use_this_key })
  providers?: Record<
    string,
    {
      api_key?: string;
      url?: string;
      priority?: boolean;
      fallback?: boolean;
      always_use_this_key?: boolean;
    }
  >;
  openrouter_shared_credit_url?: string; // optional fallback route
};

type CallModelOptions = {
  provider?: string; // "huggingface" | "openrouter" | "sheikh" | custom provider key from providers
  model?: string; // model id string for provider
  input: any; // request payload body (structured per provider)
  prefer?: string[]; // provider preference list used to override default priority
  timeoutMs?: number;
  // provider-specific flags
  alwaysUseKey?: boolean;
};

const DEFAULT_CONFIG_FILES = [
  process.env.AGENTIC_CONFIG || "",
  "./agentic-config.yaml",
  "./agentic-config.yml",
  "./agentic-config.json",
];

export class AgenticTools {
  config: ProviderConfig;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
  }

  // ----- Config loader -----
  loadConfig(configPath?: string): ProviderConfig {
    const tried = new Set<string>();

    const tryLoad = (p: string) => {
      if (!p) return undefined;
      if (tried.has(p)) return undefined;
      tried.add(p);
      try {
        const content = fs.readFileSync(path.resolve(p), "utf8");
        if (p.endsWith(".yaml") || p.endsWith(".yml")) {
          return yaml.load(content) as ProviderConfig;
        } else {
          return JSON.parse(content) as ProviderConfig;
        }
      } catch (err) {
        return undefined;
      }
    };

    if (configPath) {
      const conf = tryLoad(configPath);
      if (conf) return conf;
    }

    for (const f of DEFAULT_CONFIG_FILES) {
      const conf = tryLoad(f);
      if (conf) return conf;
    }

    // Fallback to environment variables
    const envConf: ProviderConfig = {};
    if (process.env.HF_TOKEN) {
      envConf.huggingface = { token: process.env.HF_TOKEN, mcp_url: process.env.HF_MCP_URL };
    }
    if (process.env.OPENROUTER_KEY) {
      envConf.openrouter = { api_key: process.env.OPENROUTER_KEY, url: process.env.OPENROUTER_URL };
    }
    if (process.env.SHEIKH_KEY) {
      envConf.sheikh = { api_key: process.env.SHEIKH_KEY, url: process.env.SHEIKH_URL };
    }
    // If still empty, return empty object
    return envConf;
  }

  // ----- Helpers -----
  private async _fetch(url: string, opts: RequestInit = {}) {
    // Simple wrapper for fetch with minimal error handling
    const res = await fetch(url, opts);
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      (err as any).status = res.status;
      (err as any).body = body;
      throw err;
    }
    return body;
  }

  // ----- High-level Search / Tools (these use HF public APIs by default) -----
  async searchSpaces(query: string, limit = 10) {
    // Hugging Face Spaces search API (public web endpoint)
    // Note: rate-limits apply. This uses HF web search endpoint.
    const url = `https://huggingface.co/api/spaces?search=${encodeURIComponent(query)}&limit=${limit}`;
    return this._fetch(url, { method: "GET" });
  }

  async searchPapers(query: string, limit = 10) {
    const url = `https://huggingface.co/api/papers?search=${encodeURIComponent(query)}&limit=${limit}`;
    return this._fetch(url, { method: "GET" });
  }

  async searchModels(query: string, filters?: Record<string, string>, limit = 12) {
    const params = new URLSearchParams();
    params.set("search", query);
    if (limit) params.set("limit", String(limit));
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => params.set(k, v));
    }
    const url = `https://huggingface.co/api/models?${params.toString()}`;
    return this._fetch(url, { method: "GET" });
  }

  async getModelDetails(modelId: string) {
    const url = `https://huggingface.co/api/models/${encodeURIComponent(modelId)}`;
    return this._fetch(url, { method: "GET" });
  }

  async searchDatasets(query: string, filters?: Record<string, string>, limit = 12) {
    const params = new URLSearchParams();
    params.set("search", query);
    if (limit) params.set("limit", String(limit));
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => params.set(k, v));
    }
    const url = `https://huggingface.co/api/datasets?${params.toString()}`;
    return this._fetch(url, { method: "GET" });
  }

  async getDatasetDetails(datasetId: string) {
    const url = `https://huggingface.co/api/datasets/${encodeURIComponent(datasetId)}`;
    return this._fetch(url, { method: "GET" });
  }

  /**
   * runSpaceAsMCP
   * - Uses huggingface.mcp_url if provided in config
   * - Or attempts to call a Space's inference endpoint directly (if public)
   */
  async runSpaceAsMCP(spaceId: string, pathSuffix = "api/predict", body: any = {}) {
    const mcpUrl = this.config.huggingface?.mcp_url;
    if (mcpUrl) {
      const url = new URL(mcpUrl);
      // Compose path: /mcp/spaces/{spaceId}/...
      url.pathname = path.posix.join(url.pathname, "spaces", spaceId, pathSuffix);
      return this._fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.config.huggingface?.token ?? ""}` },
        body: JSON.stringify(body),
      });
    }

    // Fallback: call the Space's api endpoint directly (works for many Gradio/Streamlit apps)
    const url = `https://hf.space/embed/${encodeURIComponent(spaceId)}/${pathSuffix}`;
    return this._fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  /**
   * callModel
   * - Unified model caller
   * - Orders providers by prefer[] -> configured priority flags -> default order
   * - honors provider.always_use_this_key to prevent fallback
   */
  async callModel(opts: CallModelOptions) {
    const prefer = opts.prefer ?? [];
    // Build candidate list in order:
    const candidates: { name: string; type: string; cfg: any }[] = [];

    // Helper to push provider if config exists
    const pushIf = (name: string, cfg: any) => {
      if (!cfg) return;
      candidates.push({ name, type: name, cfg });
    };

    // 1) preferred explicit list
    for (const p of prefer) {
      if (p === "huggingface" && this.config.huggingface) pushIf("huggingface", this.config.huggingface);
      if (p === "openrouter" && this.config.openrouter) pushIf("openrouter", this.config.openrouter);
      if (p === "sheikh" && this.config.sheikh) pushIf("sheikh", this.config.sheikh);
      if (this.config.providers && this.config.providers[p]) pushIf(p, this.config.providers[p]);
    }

    // 2) providers flagged as priority
    if (this.config.openrouter?.priority && !candidates.find((c) => c.name === "openrouter") && this.config.openrouter) {
      pushIf("openrouter", this.config.openrouter);
    }
    if (this.config.sheikh?.priority && !candidates.find((c) => c.name === "sheikh") && this.config.sheikh) {
      pushIf("sheikh", this.config.sheikh);
    }

    // 3) known provider defaults in preferred order: huggingface -> openrouter -> sheikh -> others
    if (!candidates.find((c) => c.name === "huggingface") && this.config.huggingface) pushIf("huggingface", this.config.huggingface);
    if (!candidates.find((c) => c.name === "openrouter") && this.config.openrouter) pushIf("openrouter", this.config.openrouter);
    if (!candidates.find((c) => c.name === "sheikh") && this.config.sheikh) pushIf("sheikh", this.config.sheikh);
    if (this.config.providers) {
      for (const [k, v] of Object.entries(this.config.providers)) {
        if (!candidates.find((c) => c.name === k)) pushIf(k, v);
      }
    }

    // If explicit provider requested, prioritize it first
    if (opts.provider) {
      const idx = candidates.findIndex((c) => c.name === opts.provider);
      if (idx >= 0) {
        const [p] = candidates.splice(idx, 1);
        candidates.unshift(p);
      } else {
        // add requested provider stub (may be external)
        const cfg = (this.config.providers && this.config.providers[opts.provider]) || {};
        candidates.unshift({ name: opts.provider, type: opts.provider, cfg });
      }
    }

    // Try each candidate applying fallback rules
    let lastErr: Error | null = null;
    for (const cand of candidates) {
      try {
        // If always_use_this_key is true and there's no api_key, skip
        if (cand.cfg.always_use_this_key && !cand.cfg.api_key && cand.name !== "huggingface" && cand.name !== "sheikh") {
          // must skip — misconfigured
          continue;
        }

        if (cand.name === "huggingface") {
          const token = cand.cfg.token;
          if (!token) {
            // If no token, HF infra routing may still work — call public inference endpoint if model supports
            // We'll attempt a web inference call for convenience (this is limited/fragile)
            return await this.callHuggingFaceInference(opts.model!, opts.input, undefined);
          } else {
            return await this.callHuggingFaceInference(opts.model!, opts.input, token);
          }
        }

        if (cand.name === "openrouter") {
          // OpenRouter expects JSON body with model + input etc using their API; default URL if not provided
          return await this.callOpenRouter(opts.model!, opts.input, cand.cfg.api_key, cand.cfg.url);
        }

        if (cand.name === "sheikh") {
          return await this.callCustomProvider(cand.cfg.url, cand.cfg.api_key, opts.model!, opts.input);
        }

        // generic provider
        if (cand.cfg.url && cand.cfg.api_key) {
          return await this.callCustomProvider(cand.cfg.url, cand.cfg.api_key, opts.model!, opts.input);
        }
      } catch (err: any) {
        lastErr = err;
        // if provider had always_use_this_key true -> do not fallback further
        if (cand.cfg && cand.cfg.always_use_this_key) {
          throw new Error(`Provider ${cand.name} failed and is marked always_use_this_key; aborting. Cause: ${err?.message || err}`);
        }
        // Otherwise continue to next provider (fallback)
      }
    }

    // final fallback: openrouter shared credits (if configured)
    if (this.config.openrouter?.fallback && this.config.openrouter?.url) {
      try {
        return await this.callOpenRouter(opts.model!, opts.input, undefined, this.config.openrouter.url);
      } catch (err) {
        lastErr = err as Error;
      }
    }

    throw new Error(`All candidate providers failed. Last error: ${lastErr?.message || "unknown"}`);
  }

  // ----- Provider-specific methods -----
  private async callHuggingFaceInference(modelId: string, input: any, token?: string) {
    // Common HF inference endpoint: https://api-inference.huggingface.co/models/{model}
    const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this._fetch(url, { method: "POST", headers, body: JSON.stringify(input) });
  }

  private async callOpenRouter(modelId: string, input: any, apiKey?: string, baseUrl?: string) {
    // Example OpenRouter-compatible wrapper:
    // POST { model, input } -> returned JSON
    const url = baseUrl ?? "https://api.openrouter.ai/v1/chat/completions";
    const headers: any = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const body = { model: modelId, input };
    return this._fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  }

  private async callCustomProvider(url: string, apiKey: string | undefined, modelId: string, input: any) {
    if (!url) throw new Error("Provider URL missing");
    const headers: any = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const body = { model: modelId, input };
    return this._fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  }
}

export default AgenticTools;
