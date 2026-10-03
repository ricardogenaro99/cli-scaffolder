import { execSync } from 'node:child_process';
import type { ITemplateProvider } from '../ports/ITemplateProvider.js';
import type { Template, TemplateDiscoveryResult, RateLimitInfo } from '../domain/types.js';
import { TemplateConfigSchema } from '../domain/schemas.js';
import { GitHubAuthError, TemplateNotFoundError } from '../domain/errors.js';

interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  topics: string[];
  owner: {
    login: string;
  };
}

interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepoItem[];
}

export class GitHubTemplateProvider implements ITemplateProvider {
  private readonly targetUser: string;
  private token?: string;

  constructor(targetUser: string = 'ricardogenaro99') {
    this.targetUser = targetUser;
    this.token = this.resolveToken();
  }

  private resolveToken(): string | undefined {
    if (process.env['GITHUB_TOKEN']) {
      return process.env['GITHUB_TOKEN'];
    }
    if (process.env['GH_TOKEN']) {
      return process.env['GH_TOKEN'];
    }
    try {
      const tokenFromCli = execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (tokenFromCli && tokenFromCli.length > 5) {
        return tokenFromCli;
      }
    } catch {
      // Ignorar si gh cli no está logueado
    }
    return undefined;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'scaffolder-cli/@ricardogenaro99',
      Accept: 'application/vnd.github.v3+json',
    };
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    return headers;
  }

  async listTemplates(): Promise<TemplateDiscoveryResult> {
    const query = encodeURIComponent(`user:${this.targetUser} topic:scaffold-template`);
    const url = `https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc`;

    try {
      const res = await fetch(url, { headers: this.getHeaders() });

      const limit = Number(res.headers.get('x-ratelimit-limit') ?? '60');
      const remaining = Number(res.headers.get('x-ratelimit-remaining') ?? '60');
      const resetEpoch = Number(res.headers.get('x-ratelimit-reset') ?? '0');
      const rateLimit: RateLimitInfo = {
        limit,
        remaining,
        resetAt: new Date(resetEpoch * 1000),
      };

      if (res.status === 401 || res.status === 403) {
        if (remaining === 0) {
          throw new GitHubAuthError(
            'Límite de peticiones a la API de GitHub excedido.',
            'Configura la variable GITHUB_TOKEN o inicia sesión con `gh auth login`.',
          );
        }
      }

      if (!res.ok) {
        throw new GitHubAuthError(`Error al consultar GitHub API: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as GitHubSearchResponse;
      const templates: Template[] = [];

      for (const repo of data.items) {
        const config = await this.fetchTemplateConfig(repo.full_name, repo.default_branch, repo.description);
        templates.push({
          id: repo.full_name,
          name: config.name ?? repo.name,
          description: config.description ?? repo.description ?? 'Sin descripción',
          category: config.category ?? 'General',
          order: config.order ?? 99,
          tags: config.tags.length > 0 ? config.tags : repo.topics.filter((t) => t !== 'scaffold-template'),
          source: 'github',
          repositoryUrl: repo.html_url,
          defaultBranch: repo.default_branch,
          config,
        });
      }

      templates.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

      return {
        templates,
        source: 'github',
        rateLimit,
      };
    } catch (err) {
      if (err instanceof GitHubAuthError) throw err;
      throw new GitHubAuthError(`Fallo de red al conectar con GitHub: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getTemplate(id: string): Promise<Template> {
    const listResult = await this.listTemplates();
    const found = listResult.templates.find(
      (t) => t.id.toLowerCase() === id.toLowerCase() || t.id.endsWith(`/${id}`),
    );
    if (!found) {
      throw new TemplateNotFoundError(id);
    }
    return found;
  }

  private async fetchTemplateConfig(
    repoFullName: string,
    defaultBranch: string,
    fallbackDesc: string | null,
  ) {
    const branches = [defaultBranch, 'master', 'main'];
    for (const branch of branches) {
      const configUrl = `https://raw.githubusercontent.com/${repoFullName}/${branch}/template.config.json`;
      try {
        const res = await fetch(configUrl, { headers: this.getHeaders() });
        if (res.ok) {
          const rawJson = await res.json();
          const parsed = TemplateConfigSchema.safeParse(rawJson);
          if (parsed.success) {
            return parsed.data;
          }
        }
      } catch {
        // Continuar buscando en otra rama
      }
    }

    // Configuración por defecto si no tiene template.config.json remoto explícito
    const repoName = repoFullName.split('/')[1] ?? repoFullName;
    return TemplateConfigSchema.parse({
      name: repoName,
      description: fallbackDesc ?? `Plantilla ${repoName}`,
      tags: ['github'],
    });
  }
}
