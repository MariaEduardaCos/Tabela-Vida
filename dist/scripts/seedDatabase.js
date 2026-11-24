"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseSeeder = void 0;
const DatabaseConnection_1 = require("../config/DatabaseConnection");
class DatabaseSeeder {
    static async run() {
        const db = new DatabaseConnection_1.DatabaseConnection();
        await db.ensureDatabaseAndSchema();
        await db.seedDefaultScript();
        console.log('[DatabaseSeeder] Carga inicial do script.sql aplicada com sucesso.');
    }
}
exports.DatabaseSeeder = DatabaseSeeder;
if (require.main === module) {
    DatabaseSeeder.run()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error('[DatabaseSeeder] Erro ao aplicar seed:', err);
        process.exit(1);
    });
}
