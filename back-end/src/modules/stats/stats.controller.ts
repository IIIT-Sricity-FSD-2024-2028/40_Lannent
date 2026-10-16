import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('public')
  @ApiOperation({
    summary: 'Live platform figures for the public landing pages',
    description: 'Counts and totals only — no personal data beyond reviewers\' first names. No sign-in needed.',
  })
  publicStats() {
    return this.stats.publicStats();
  }
}
