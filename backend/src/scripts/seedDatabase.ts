import { DatabaseConnection } from '../config/DatabaseConnection';

export class DatabaseSeeder {
  public static async run(): Promise<void> {
    const db = new DatabaseConnection();
    await db.ensureDatabaseAndSchema();
    await db.seedDefaultScript();
    console.log('[DatabaseSeeder] Carga inicial do script.sql aplicada com sucesso.');
  }
}

if (require.main === module) {
  DatabaseSeeder.run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[DatabaseSeeder] Erro ao aplicar seed:', err);
      process.exit(1);
    });
}

