import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateExecutionTables1721745000000 implements MigrationInterface {
  name = 'CreateExecutionTables1721745000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'executions',
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
            name: 'current_step',
            type: 'varchar',
            length: '40',
            isNullable: false,
          },
          {
            name: 'document',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'final_output',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
            isNullable: false,
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
      'executions',
      new TableForeignKey({
        name: 'FK_executions_runtime_id',
        columnNames: ['runtime_id'],
        referencedTableName: 'runtimes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'executions',
      new TableForeignKey({
        name: 'FK_executions_runtime_version_id',
        columnNames: ['runtime_version_id'],
        referencedTableName: 'runtime_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'executions',
      new TableIndex({
        name: 'IDX_executions_runtime_id_started_at',
        columnNames: ['runtime_id', 'started_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'execution_checkpoints',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'execution_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'step',
            type: 'varchar',
            length: '40',
            isNullable: false,
          },
          {
            name: 'output',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'completed_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'execution_checkpoints',
      new TableForeignKey({
        name: 'FK_execution_checkpoints_execution_id',
        columnNames: ['execution_id'],
        referencedTableName: 'executions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'execution_checkpoints',
      new TableIndex({
        name: 'IDX_execution_checkpoints_execution_step',
        columnNames: ['execution_id', 'step'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('execution_checkpoints', true);
    await queryRunner.dropTable('executions', true);
  }
}
