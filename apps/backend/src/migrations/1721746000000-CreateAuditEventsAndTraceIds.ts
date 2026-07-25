import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAuditEventsAndTraceIds1721746000000
  implements MigrationInterface
{
  name = 'CreateAuditEventsAndTraceIds1721746000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_events',
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
            name: 'event_type',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'entity_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'trace_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
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
      'audit_events',
      new TableForeignKey({
        name: 'FK_audit_events_runtime_id',
        columnNames: ['runtime_id'],
        referencedTableName: 'runtimes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'audit_events',
      new TableIndex({
        name: 'IDX_audit_events_runtime_id_created_at',
        columnNames: ['runtime_id', 'created_at'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE evaluation_results
      ADD COLUMN trace_id varchar(64) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE evaluation_results
      DROP COLUMN trace_id
    `);
    await queryRunner.dropTable('audit_events', true);
  }
}
