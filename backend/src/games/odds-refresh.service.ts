import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { GamesService } from './games.service';

@Injectable()
export class OddsRefreshService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OddsRefreshService.name);
  private intervalId?: NodeJS.Timeout;
  private readonly enabled =
    process.env.ODDS_AUTO_REFRESH_ENABLED === 'true';
  private readonly refreshMs = Number(
    process.env.ODDS_REFRESH_MS ?? 15 * 60 * 1000,
  );

  constructor(private readonly gamesService: GamesService) {}

  async onModuleInit() {
    if (!this.enabled) {
      return;
    }
    if (!Number.isFinite(this.refreshMs) || this.refreshMs <= 0) {
      this.logger.warn(
        `Odds auto-refresh disabled due to invalid interval: ${this.refreshMs}`,
      );
      return;
    }
    // Kick off an immediate refresh
    this.runRefresh();

    this.intervalId = setInterval(() => {
      this.runRefresh();
    }, this.refreshMs);

    this.logger.log(
      `Odds auto-refresh enabled every ${this.refreshMs}ms (set ODDS_AUTO_REFRESH_ENABLED=false to disable).`,
    );
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async runRefresh() {
    if (!process.env.ODDS_API_KEY) {
      this.logger.warn('Skipping odds refresh: ODDS_API_KEY is not set.');
      return;
    }
    try {
      await this.gamesService.fetchAndUpsertNextCavsGame();
    } catch (error: any) {
      this.logger.error('Odds auto-refresh failed', {
        message: error?.message,
      });
    }
  }
}
