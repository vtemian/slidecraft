import type {
  PuzzleResponse,
  SolutionRequest,
  SolutionResponse,
  StatsResponse,
  ApiError,
} from '@slidecraft/shared';

const API_BASE = '/api';

class ApiClient {
  private discordUserId: string | null = null;

  setDiscordUserId(userId: string) {
    this.discordUserId = userId;
  }

  private async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.discordUserId) {
      headers['x-discord-user-id'] = this.discordUserId;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  async getTodaysPuzzle(): Promise<PuzzleResponse> {
    return this.fetch<PuzzleResponse>('/puzzle');
  }

  async getPuzzleByDate(date: string): Promise<PuzzleResponse> {
    return this.fetch<PuzzleResponse>(`/puzzle/${date}`);
  }

  async submitSolution(solution: SolutionRequest['solution']): Promise<SolutionResponse> {
    return this.fetch<SolutionResponse>('/solution', {
      method: 'POST',
      body: JSON.stringify({ solution }),
    });
  }

  async getStats(): Promise<StatsResponse> {
    return this.fetch<StatsResponse>('/stats');
  }
}

export const apiClient = new ApiClient();
