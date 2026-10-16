import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiHeader, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import { Throttle } from '@nestjs/throttler';
import { FilesService } from './files.service';
import { uploadOptions } from './upload.config';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';

@ApiTags('Files')
@Controller('files')
@UseGuards(RoleGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles(ROLES.CLIENT, ROLES.WORKER, ROLES.EXPERT, ROLES.SUPERUSER, ROLES.REVENUE_ADMIN, ROLES.INTAKE_ADMIN, ROLES.COMPLIANCE_ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file and get back the reference to store' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        taskId: { type: 'string' },
        milestoneId: { type: 'string' },
        purpose: { type: 'string', example: 'deliverable' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  upload(
    @UploadedFile() file: any,
    @Body() body: { taskId?: string; milestoneId?: string; purpose?: string },
    @CurrentActor() actor: Actor,
  ) {
    // Only these purposes come from a signed-in upload; 'expert-application'
    // is the public route's alone.
    const purpose = ['deliverable', 'message', 'document'].includes(String(body?.purpose)) ? body.purpose : 'document';
    return this.filesService.create(file, actor, { taskId: body?.taskId || undefined, milestoneId: body?.milestoneId || undefined, purpose });
  }

  /**
   * The one upload that has no session behind it: an Expert Reviewer applicant
   * has no account until their application is approved, so a résumé cannot be
   * attached any other way.
   *
   * Deliberately narrow — the purpose is forced, there is no uploader to
   * inherit access from, and `canView` gives a file with no task and no
   * uploader to staff only. It is still an unauthenticated write, so it wants
   * the strict rate limit from the middleware stage before it faces the world.
   */
  @Post('application')
  // The one unauthenticated write in the app: no session, no uploader, open to
  // the world. The rate limit is what keeps it from being a free file host.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a résumé or certificate with an expert application (public)' })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  uploadForApplication(@UploadedFile() file: any) {
    return this.filesService.create(file, {}, { purpose: 'expert-application' });
  }

  @Get(':id/meta')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @ApiOperation({ summary: 'Get a file reference without downloading it' })
  meta(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.filesService.meta(id, actor);
  }

  @Get(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @ApiOperation({ summary: 'Download a file (scoped to the people on the project)' })
  download(
    @Param('id') id: string,
    @CurrentActor() actor: Actor,
    @Res() res: Response,
  ) {
    const { path, record } = this.filesService.pathFor(id, actor);

    // `attachment` and nosniff together: whatever the file claims to be, the
    // browser saves it rather than rendering it on this origin. An uploaded
    // .svg or .html would otherwise run as same-origin script.
    res.setHeader('Content-Type', record.mime || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', String(record.size));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${sanitizeHeader(record.name)}"; filename*=UTF-8''${encodeURIComponent(record.name)}`,
    );
    createReadStream(path).pipe(res);
  }

  @Delete(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @ApiOperation({ summary: 'Delete a file (uploader or staff only)' })
  remove(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.filesService.remove(id, actor);
  }
}

/** A filename reaches a response header, so quotes and control characters go. */
function sanitizeHeader(name: string): string {
  return String(name || 'download').replace(/["\\\r\n]/g, '_').slice(0, 120);
}
