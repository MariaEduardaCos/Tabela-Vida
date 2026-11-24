import { Module } from '@nestjs/common';
import { CatalogoController } from '../controllers/CatalogoController';
import { CatalogoRepository } from '../repositories/CatalogoRepository';
import { CatalogoService } from '../services/CatalogoService';

@Module({
  controllers: [CatalogoController],
  providers: [CatalogoRepository, CatalogoService],
  exports: [CatalogoRepository, CatalogoService],
})
export class CatalogoModule {}
