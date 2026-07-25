import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateExperimentAndEvaluationTables1721743000000
  implements MigrationInterface
{
  name = 'CreateExperimentAndEvaluationTables1721743000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'experiment_sessions',
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
            name: 'version_a_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'version_b_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'document',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'extraction_a',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'extraction_b',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'summary_a',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'summary_b',
            type: 'text',
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
      'experiment_sessions',
      new TableForeignKey({
        name: 'FK_experiment_sessions_runtime_id',
        columnNames: ['runtime_id'],
        referencedTableName: 'runtimes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'experiment_sessions',
      new TableForeignKey({
        name: 'FK_experiment_sessions_version_a_id',
        columnNames: ['version_a_id'],
        referencedTableName: 'runtime_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'experiment_sessions',
      new TableForeignKey({
        name: 'FK_experiment_sessions_version_b_id',
        columnNames: ['version_b_id'],
        referencedTableName: 'runtime_versions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('evaluation_test_cases', true);
    await queryRunner.dropTable('experiment_sessions', true);
  }
}
