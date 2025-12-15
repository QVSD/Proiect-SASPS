import { $Enums } from 'generated/prisma/client';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const TokenImportSchema = z.object({
  address: z.string().length(42), // Ethereum address length
});

export class TokenImportDto extends createZodDto(TokenImportSchema) {}

const TradingPairImportSchema = z.object({
  exchange: z.nativeEnum($Enums.Exchange),
  poolAddress: z.string().length(42),
  quoteAddress: z.string().length(42),
});

export class TradingPairImportDto extends createZodDto(
  TradingPairImportSchema,
) {}
