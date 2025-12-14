import { Body, Controller, Get, Post } from '@nestjs/common';
import { TokenImportDto } from './dto';
import { RepositoryService } from './repository/repository.service';

@Controller()
export class AppController {
  constructor(private readonly repository: RepositoryService) {}

  @Get()
  health(): string {
    return 'OK';
  }

  @Post('token')
  async importToken(@Body() dto: TokenImportDto) {
    await this.repository.addToken(dto.address);
  }
}
