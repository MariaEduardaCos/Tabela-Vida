import { Global, Module } from '@nestjs/common';
import { DatabaseConnection } from '../config/DatabaseConnection';

@Global()
@Module({
  providers: [DatabaseConnection],
  exports: [DatabaseConnection],
})
export class DatabaseModule {}
