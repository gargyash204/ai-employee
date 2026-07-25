import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateRuntimeConfigurationsTable1721741000000
  implements MigrationInterface
{
  name = 'CreateRuntimeConfigurationsTable1721741000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'runtime_configurations',
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
            name: 'instructions',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'questions',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_runtime_configurations_runtime_id',
            columnNames: ['runtime_id'],
          }),
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'runtime_configurations',
      new TableForeignKey({
        name: 'FK_runtime_configurations_runtime_id',
        columnNames: ['runtime_id'],
        referencedTableName: 'runtimes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('runtime_configurations', true);
  }
}
