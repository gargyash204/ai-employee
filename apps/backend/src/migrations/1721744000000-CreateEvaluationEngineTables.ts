import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { randomUUID } from 'node:crypto';

export class CreateEvaluationEngineTables1721744000000
  implements MigrationInterface
{
  name = 'CreateEvaluationEngineTables1721744000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'evaluation_datasets',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'runtime_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'evaluation_datasets',
      new TableForeignKey({
        name: 'FK_evaluation_datasets_runtime_id',
        columnNames: ['runtime_id'],
        referencedTableName: 'runtimes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'evaluation_datasets',
      new TableIndex({
        name: 'IDX_evaluation_datasets_runtime_name',
        columnNames: ['runtime_id', 'name'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'evaluation_cases',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'dataset_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'document',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'question',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'expected_answer',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'tags',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'source_session_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'evaluation_cases',
      new TableForeignKey({
        name: 'FK_evaluation_cases_dataset_id',
        columnNames: ['dataset_id'],
        referencedTableName: 'evaluation_datasets',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'evaluation_runs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'dataset_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'runtime_version_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'total_tests',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'passed',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'failed',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'started_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'completed_at',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'evaluation_runs',
      new TableForeignKey({
        name: 'FK_evaluation_runs_dataset_id',
        columnNames: ['dataset_id'],
        referencedTableName: 'evaluation_datasets',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'evaluation_runs',
      new TableForeignKey({
        name: 'FK_evaluation_runs_runtime_version_id',
        columnNames: ['runtime_version_id'],
        referencedTableName: 'runtime_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'evaluation_results',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'evaluation_run_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'evaluation_case_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'expected_answer',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'actual_answer',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'passed',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'latency',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'evaluation_results',
      new TableForeignKey({
        name: 'FK_evaluation_results_run_id',
        columnNames: ['evaluation_run_id'],
        referencedTableName: 'evaluation_runs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'evaluation_results',
      new TableForeignKey({
        name: 'FK_evaluation_results_case_id',
        columnNames: ['evaluation_case_id'],
        referencedTableName: 'evaluation_cases',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    const legacyExists = await queryRunner.hasTable('evaluation_test_cases');
    if (legacyExists) {
      const legacyRows: Array<{
        id: string;
        runtime_id: string;
        document: string;
        question: string;
        expected_answer: string;
        tags: string | null;
        source_session_id: string | null;
        created_at: Date;
      }> = await queryRunner.query(
        `SELECT id, runtime_id, document, question, expected_answer, tags, source_session_id, created_at FROM evaluation_test_cases`,
      );

      const datasetByRuntime = new Map<string, string>();

      for (const row of legacyRows) {
        let datasetId = datasetByRuntime.get(row.runtime_id);
        if (!datasetId) {
          datasetId = randomUUID();
          datasetByRuntime.set(row.runtime_id, datasetId);
          await queryRunner.query(
            `INSERT INTO evaluation_datasets (id, runtime_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)`,
            [
              datasetId,
              row.runtime_id,
              'Default',
              'Migrated from Experiment Studio saves',
              row.created_at,
            ],
          );
        }

        const name =
          row.question.length > 80
            ? `${row.question.slice(0, 77)}...`
            : row.question;

        await queryRunner.query(
          `INSERT INTO evaluation_cases (id, dataset_id, name, document, question, expected_answer, tags, source_session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            datasetId,
            name || 'Untitled case',
            row.document,
            row.question,
            row.expected_answer,
            row.tags,
            row.source_session_id,
            row.created_at,
          ],
        );
      }

      await queryRunner.dropTable('evaluation_test_cases', true);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('evaluation_results', true);
    await queryRunner.dropTable('evaluation_runs', true);

    await queryRunner.createTable(
      new Table({
        name: 'evaluation_test_cases',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'runtime_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'document',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'question',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'expected_answer',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'tags',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'source_session_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'evaluation_test_cases',
      new TableForeignKey({
        name: 'FK_evaluation_test_cases_runtime_id',
        columnNames: ['runtime_id'],
        referencedTableName: 'runtimes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    const cases: Array<{
      id: string;
      dataset_id: string;
      document: string;
      question: string;
      expected_answer: string;
      tags: string | null;
      source_session_id: string | null;
      created_at: Date;
    }> = await queryRunner.query(
      `SELECT id, dataset_id, document, question, expected_answer, tags, source_session_id, created_at FROM evaluation_cases`,
    );

    for (const row of cases) {
      const datasets: Array<{ runtime_id: string }> = await queryRunner.query(
        `SELECT runtime_id FROM evaluation_datasets WHERE id = ? LIMIT 1`,
        [row.dataset_id],
      );
      const runtimeId = datasets[0]?.runtime_id;
      if (!runtimeId) {
        continue;
      }

      await queryRunner.query(
        `INSERT INTO evaluation_test_cases (id, runtime_id, document, question, expected_answer, tags, source_session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          runtimeId,
          row.document,
          row.question,
          row.expected_answer,
          row.tags,
          row.source_session_id,
          row.created_at,
        ],
      );
    }

    await queryRunner.dropTable('evaluation_cases', true);
    await queryRunner.dropTable('evaluation_datasets', true);
  }
}
