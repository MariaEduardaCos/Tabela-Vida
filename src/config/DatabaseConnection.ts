import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private readonly dbName: string;

  public constructor() {
    this.dbName = process.env.PGDATABASE || 'tabela_de_vida';
    this.pool = this.createPool(this.dbName);
    DatabaseConnection.instance = this;
  }

  private createPool(database: string): Pool {
    return new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async ensureDatabaseAndSchema(): Promise<void> {
    // 1. Garante que o banco de dados existe
    const adminPool = this.createPool('postgres');
    try {
      const checkDb = await adminPool.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [this.dbName]
      );
      if (checkDb.rowCount === 0) {
        await adminPool.query(`CREATE DATABASE "${this.dbName}"`);
        console.log(`[DatabaseConnection] Banco de dados "${this.dbName}" criado.`);
      }
    } finally {
      await adminPool.end();
    }

    // 2. Verifica se as tabelas já foram criadas
    try {
      const tableCheck = await this.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'cenarios_analiticos'
        ) AS exists`
      );
      const exists = tableCheck.rows[0]?.exists;
      if (!exists) {
        console.log('[DatabaseConnection] Esquema não encontrado. Executando script.sql...');
        await this.seedDefaultScript();
      } else {
        const countCheck = await this.query<{ total: string }>('SELECT COUNT(*) AS total FROM culturas');
        if (Number(countCheck.rows[0]?.total || 0) === 0) {
          console.log('[DatabaseConnection] Tabelas vazias. Executando script.sql...');
          await this.seedDefaultScript();
        }
      }
    } catch (err) {
      console.warn('[DatabaseConnection] Aplicando script.sql de inicialização...', err);
      await this.seedDefaultScript();
    }
  }

  public async seedDefaultScript(): Promise<void> {
    const candidates = [
      path.resolve(__dirname, '../../database/script.sql'),
      path.resolve(__dirname, '../../../script.sql'),
    ];
    const scriptPath = candidates.find((p) => fs.existsSync(p));
    if (!scriptPath) {
      throw new Error('Arquivo script.sql não encontrado.');
    }
    await this.executeSqlScript(scriptPath);
  }

  public async query<T extends QueryResultRow = any>(
    sql: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  public async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async executeSqlScript(filePath: string): Promise<void> {
    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    const client = await this.pool.connect();
    try {
      await client.query(sqlContent);
      console.log(`[DatabaseConnection] Script SQL executado com sucesso: ${filePath}`);
    } finally {
      client.release();
    }
  }

  public async checkHealth(): Promise<{ connected: boolean; database: string; timestamp: string }> {
    const res = await this.query<{ now: string }>('SELECT NOW()::text AS now');
    return {
      connected: true,
      database: this.dbName,
      timestamp: res.rows[0]?.now || new Date().toISOString(),
    };
  }
}

